import { NextResponse } from 'next/server';

export const runtime = 'edge';
export const maxDuration = 30; // Max allowed for hobby on Edge

function arrayBufferToBase64(buffer: ArrayBuffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  
  // For very large buffers, this loop might be slow, but it's safe for edge
  // A chunked approach is better for huge files to avoid call stack limits, but manual looping avoids the apply() size limit
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

export async function POST(req: Request) {
  const logPrefix = `[AI-Transcribe]`;
  try {
    const { recordingUrl, leadId } = await req.json();
    console.log(`${logPrefix} Started for lead: ${leadId}, URL: ${recordingUrl}`);
    
    if (!recordingUrl) {
      return NextResponse.json({ success: false, error: "No recording URL provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error(`${logPrefix} Missing GEMINI_API_KEY`);
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY not found" }, { status: 500 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    
    if (!accountSid || !authToken) {
       console.error(`${logPrefix} Missing Twilio credentials`);
       return NextResponse.json({ success: false, error: "Twilio credentials missing" }, { status: 500 });
    }

    // Modern Gemini 2.0 Flash URL
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // Auth for Twilio
    const authString = `${accountSid}:${authToken}`;
    const auth = btoa(authString);
    
    console.log(`${logPrefix} Fetching audio from Twilio...`);
    let audioRes = await fetch(recordingUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
      redirect: 'manual'
    });
    
    // Manual redirect handling for Twilio -> AWS S3
    if (audioRes.status >= 300 && audioRes.status < 400) {
      const location = audioRes.headers.get('location');
      if (location) {
        console.log(`${logPrefix} Following redirect to S3...`);
        audioRes = await fetch(location); // No auth header for S3
      }
    }
    
    if (!audioRes.ok) {
       const errText = await audioRes.text();
       console.error(`${logPrefix} Audio fetch failed:`, audioRes.status, errText.substring(0, 100));
       throw new Error(`נכשל בהורדת ההקלטה מ-Twilio: ${audioRes.status}`);
    }
    
    const audioBuffer = await audioRes.arrayBuffer();
    console.log(`${logPrefix} Audio downloaded, size: ${audioBuffer.byteLength} bytes`);

    if (audioBuffer.byteLength < 1000) {
       throw new Error("הקלטה קצרה מדי או ריקה");
    }

    const base64Audio = arrayBufferToBase64(audioBuffer);

    const prompt = `אתה עוזר אישי של עורך דין. הקשב להקלטת השיחה הזאת עם לקוח פוטנציאלי.
חלץ את הפרטים הבאים בפורמט JSON בלבד:
{
  "summary": "סיכום קצר של השיחה (2-3 משפטים)",
  "sentiment": "חיובי/ניטרלי/שלילי",
  "nextSteps": "מה הצעדים הבאים",
  "keyDetails": "פרטים חשובים שעלו",
  "fullTranscription": "תמלול מלא של המילים שנאמרו בשיחה, מילה במילה"
}

השתמש בשפה המדוברת בהקלטה (עברית). החזר אך ורק JSON תקין ללא הסברים נוספים.`;

    console.log(`${logPrefix} Calling Gemini API...`);
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Audio,
                mimeType: "audio/mpeg"
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
       console.error(`${logPrefix} Gemini error:`, JSON.stringify(geminiData));
       throw new Error(`שגיאת AI מול גוגל: ${geminiData.error?.message || "Unknown"}`);
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("לא התקבלה תשובה מ-AI");

    console.log(`${logPrefix} Parsing AI response...`);
    let result;
    try {
      const cleanJson = responseText.replace(/```json|```/gi, "").trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error(`${logPrefix} JSON parse error:`, responseText);
      throw new Error("נכשל בפענוח נתוני ה-AI");
    }

    console.log(`${logPrefix} Success! Returning result.`);
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error(`${logPrefix} CRITICAL ERROR:`, error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
