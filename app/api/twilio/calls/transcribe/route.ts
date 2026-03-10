import { NextResponse } from 'next/server';

export const maxDuration = 60; // AI transcription can take time

export async function POST(req: Request) {
  try {
    const { recordingUrl, leadId } = await req.json();
    
    if (!recordingUrl) {
      return NextResponse.json({ success: false, error: "No recording URL provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY not found" }, { status: 500 });
    }

    // Gemini 2.0 Flash is great for audio/multimodal
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    // We can pass the recording URL to Gemini if it's publicly accessible, 
    // but Twilio recordings usually require auth or are private.
    // To make it work easily, we fetch the audio ourselves and send it as inlineData.
    
    const audioRes = await fetch(recordingUrl);
    if (!audioRes.ok) throw new Error("Failed to fetch audio from Twilio");
    const audioBuffer = await audioRes.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    const prompt = `אתה עוזר אישי של עורך דין. הקשב להקלטת השיחה הזאת עם לקוח פוטנציאלי.
חלץ את הפרטים הבאים בפורמט JSON:
- summary: סיכום קצר של השיחה (2-3 משפטים).
- sentiment: האם הלקוח נראה מעוניין? (חיובי/ניטרלי/שלילי).
- nextSteps: מה הצעדים הבאים שצריך לעשות?
- keyDetails: פרטים חשובים שעלו (גיל, מצב רפואי, האם יש קצבה).
- fullTranscription: תמלול מלא של המילים שנאמרו בשיחה, מילה במילה.

החזר רק JSON.`;

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
          temperature: 0.2,
          responseMimeType: "application/json"
        }
      })
    });

    const geminiData: any = await geminiResponse.json();
    if (!geminiResponse.ok) {
       console.error("Gemini Error:", geminiData);
       throw new Error("Gemini API failed");
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    const result = JSON.parse(responseText.replace(/```json|```/gi, "").trim());

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
