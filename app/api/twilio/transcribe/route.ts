import { NextRequest, NextResponse } from 'next/server';
import { getLeads, saveLead } from '@/utils/storage';

export async function POST(req: NextRequest) {
  try {
    const { leadId, recordingUrl, callSid } = await req.json();
    
    if (!leadId || !recordingUrl) {
      return NextResponse.json({ success: false, error: "Missing parameters" }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!accountSid || !authToken || !apiKey) {
      return NextResponse.json({ success: false, error: "Missing credentials" }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // 1. Download audio from Twilio
    let audioRes = await fetch(recordingUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
      redirect: 'manual'
    });
    
    // Handle redirection to S3
    if (audioRes.status >= 300 && audioRes.status < 400) {
      const location = audioRes.headers.get('location');
      if (location) {
        audioRes = await fetch(location); 
      }
    }
    
    if (!audioRes.ok) {
      throw new Error(`Failed to fetch audio: ${audioRes.status}`);
    }
    
    const audioBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    // 2. Send to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    
    const prompt = `אתה עוזר אישי של עורך דין. הקשב להקלטת השיחה הזאת עם לקוח פוטנציאלי.
חלץ את הפרטים הבאים בפורמט JSON בלבד (ללא הקדמות או תוספות):
- aiSummary: סיכום קצר של השיחה (2-3 משפטים).
- sentiment: האם הלקוח נראה מעוניין? (חיובי/ניטרלי/שלילי).
- fullTranscription: תמלול מלא של המילים שנאמרו בשיחה, מילה במילה.
- keyDetails: פרטים חשובים שעלו (גיל, מצב רפואי, הכנסות וכו').

השתמש בשפה המדוברת בהקלטה (עברית). החזר רק JSON תקין ומדויק.`;

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

    if (!geminiResponse.ok) {
      let errorDetail = "Unknown Gemini error";
      try {
        const errorData = await geminiResponse.json();
        console.error("Gemini Error Data:", JSON.stringify(errorData, null, 2));
        errorDetail = errorData.error?.message || JSON.stringify(errorData);
      } catch (e) {
        errorDetail = `HTTP ${geminiResponse.status}: ${geminiResponse.statusText}`;
      }
      throw new Error(`Gemini API failed: ${errorDetail}`);
    }

    const geminiData = await geminiResponse.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!responseText) throw new Error("Empty response from Gemini");
    
    const result = JSON.parse(responseText.replace(/```json|```/gi, "").trim());

    // 3. Update the lead in DB
    const leads = await getLeads();
    const lead = leads.find(l => l.id === leadId);
    
    if (!lead) throw new Error("Lead not found");

    const updatedLead = {
      ...lead,
      transcription: result.fullTranscription,
      aiSummary: result.aiSummary,
      sentiment: result.sentiment,
      liveCallNotes: (lead.liveCallNotes || '') + `\n\n--- תמלול אוטומטי (${new Date().toLocaleDateString('he-IL')}) ---\n${result.aiSummary}\n\nפרטים מרכזיים: ${result.keyDetails}\n`
    };

    await saveLead(updatedLead);

    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error("Transcription API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
