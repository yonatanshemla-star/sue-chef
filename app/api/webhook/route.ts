import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { saveLead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const logFile = 'webhook.log';
function logInfo(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
}

const GEMINI_API_KEY = 'AIzaSyCHMH9hlEtkhXE2_hgTgP2iRwDcqp3g3Ac';
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

export async function POST(req: Request) {
  try {
    logInfo('Incoming Webhook POST');
    
    // DIAGNOSTIC: List Models
    try {
      const diagRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${GEMINI_API_KEY}`);
      const diagData = await diagRes.json();
      const modelNames = diagData.models?.map((m: any) => m.name).join(', ');
      logInfo(`DIAGNOSTIC Models available: ${modelNames}`);
    } catch (e: any) {
      logInfo(`DIAGNOSTIC Models failed: ${e.message}`);
    }

    const formData = await req.formData();
    const keys = Array.from(formData.keys());
    logInfo(`Webhook received keys: ${keys.join(', ')}`);
    const recordingUrl = formData.get('RecordingUrl') as string;
    logInfo(`RecordingUrl: ${recordingUrl}`);
    
    if (!recordingUrl) {
      logInfo('ERROR: Missing RecordingUrl');
      return NextResponse.json({ error: 'Missing RecordingUrl' }, { status: 400 });
    }

    // Twilio recordings don't always have extensions attached in the URL, appending .wav ensures format
    // But for testing generic URLs, we check if it already has an extension
    const audioUrl = recordingUrl.includes('.') && !recordingUrl.includes('twilio') ? recordingUrl : `${recordingUrl}.wav`;
    
    // 1. Download Audio from Twilio
    // Twilio recordings require basic auth to download if "Auth Token for Recording" is enabled (default)
    const auth = Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64');
    
    const audioResponse = await fetch(audioUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });
    
    if (!audioResponse.ok) {
      logInfo(`ERROR: Failed to fetch audio. Status: ${audioResponse.status} ${audioResponse.statusText}`);
      throw new Error(`Failed to fetch audio from Twilio: ${audioResponse.statusText}`);
    }
    
    const audioBuffer = Buffer.from(await audioResponse.arrayBuffer());
    
    // 2. Prepare for Gemini (Base64)
    const base64Audio = audioBuffer.toString('base64');
    
    // 3. Process with Gemini via Fetch (Direct API call for better control)
    logInfo('Attempting Gemini with Fetch (v1beta/gemini-1.5-flash)');
    
    const prompt = `אתה עוזר למשרד עורכי דין שאחראי על סינון הודעות קוליות מלידים.
קבל את קובץ האודיו המצורף שמכיל הודעה קולית של לקוח.
עליך למלא את הנתונים הבאים מתוך הנאמר, באופן תמציתי:
- "clientName": שם איש הקשר במלואו, או "" אם לא נאמר.
- "generalNotes": סיכום של כל מה שהלקוח אמר או ביקש בהודעה הקולית שלו. תשתדל לכתוב במשפט או שניים.
- "urgency": "נמוכה", "בינונית" או "גבוהה".

השב בלוק JSON בלבד הכולל את 3 השדות האלו בדיוק, ועוד שדה 4 בשם "transcription" שבו יופיע התמלול המלא של השיחה.
השדות ב-JSON צריכים להיות: clientName, generalNotes, urgency, transcription.`;

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Audio,
                mimeType: "audio/wav"
              }
            }
          ]
        }],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const geminiData: any = await geminiResponse.json();

    if (!geminiResponse.ok) {
      logInfo(`FATAL ERROR: Gemini API returned ${geminiResponse.status}. Body: ${JSON.stringify(geminiData)}`);
      throw new Error(`Gemini API Error: ${geminiResponse.statusText}`);
    }

    logInfo('SUCCESS: Gemini call succeeded');
    
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      logInfo(`ERROR: Empty response from Gemini. Body: ${JSON.stringify(geminiData)}`);
      throw new Error('Empty response from Gemini');
    }

    logInfo(`Gemini Response: ${responseText.substring(0, 100)}...`);

    // Manual JSON extraction (as a safety measure)
    let cleanJsonText = responseText;
    const jsonStart = responseText.indexOf('{');
    const jsonEnd = responseText.lastIndexOf('}');
    if (jsonStart !== -1 && jsonEnd !== -1) {
      cleanJsonText = responseText.substring(jsonStart, jsonEnd + 1);
    }
    
    const parsedData = JSON.parse(cleanJsonText);

    // 4. Save to Storage
    const newLead = {
      id: uuidv4(),
      clientName: parsedData.clientName || 'שיחה קולית',
      phone: formData.get('From') as string || null,
      source: 'Twilio' as const,
      createdAt: new Date().toISOString(),
      lastContacted: null,
      status: 'חדש' as const,
      followUpDate: null,
      generalNotes: parsedData.generalNotes || 'הושארה הודעה קולית',
      liveCallNotes: '',
      recordingUrl: recordingUrl,
      transcription: parsedData.transcription || 'לא תומלל',
      urgency: parsedData.urgency || 'בינונית',
    };

    await saveLead(newLead as any);
    logInfo(`SUCCESS: Saved lead ${newLead.id}`);

    return NextResponse.json({ success: true, lead: newLead });
  } catch (error: any) {
    logInfo(`FATAL ERROR: ${error.message}`);
    
    // FALLBACK: Save lead even if processing fails
    try {
      if (error.message.includes('Too Many Requests') || error.message.includes('429')) {
        const formData = await req.formData().catch(() => new FormData());
        const fallbackLead = {
          id: uuidv4(),
          clientName: 'שיחה קולית (עיבוד נכשל)',
          phone: formData.get('From') as string || 'לא ידוע',
          source: 'Twilio' as const,
          createdAt: new Date().toISOString(),
          lastContacted: null,
          status: 'חדש' as const,
          followUpDate: null,
          generalNotes: `עיבוד ה-AI נכשל עקב עומס. ניתן להאזין להקלטה ידנית. (שיחה מ: ${formData.get('From') || 'לא ידוע'})`,
          liveCallNotes: '',
          recordingUrl: req.formData ? (await req.formData()).get('RecordingUrl') as string : null,
          transcription: 'חסר עקב שגיאת AI - אנא האזן להקלטה.',
          urgency: 'בינונית',
        };
        await saveLead(fallbackLead as any);
        logInfo(`FALLBACK: Saved basic lead info after AI failure.`);
      }
    } catch (fallbackErr) {
      logInfo(`FALLBACK FAILED: ${fallbackErr}`);
    }

    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
