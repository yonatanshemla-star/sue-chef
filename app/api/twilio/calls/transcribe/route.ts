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
    
    // Twilio recordings require HTTP Basic Auth
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authString = `${accountSid}:${process.env.TWILIO_AUTH_TOKEN}`;
    const auth = btoa(authString);
    
    // Fetch with manual redirect to avoid sending Authorization header to AWS S3
    let audioRes = await fetch(recordingUrl, {
      headers: { 'Authorization': `Basic ${auth}` },
      redirect: 'manual'
    });
    
    // Follow redirect manually without the auth header if Twilio redirects to S3
    if (audioRes.status >= 300 && audioRes.status < 400) {
      const location = audioRes.headers.get('location');
      if (location) {
        audioRes = await fetch(location); 
      }
    }
    
    if (!audioRes.ok) {
       console.error("Twilio audio fetch failed:", audioRes.status, audioRes.statusText);
       throw new Error("Failed to fetch audio from Twilio (Unauthorized or Not Found)");
    }
    
    const audioBuffer = await audioRes.arrayBuffer();
    const base64Audio = arrayBufferToBase64(audioBuffer);

    const prompt = `אתה עוזר אישי של עורך דין. הקשב להקלטת השיחה הזאת עם לקוח פוטנציאלי.
חלץ את הפרטים הבאים בפורמט JSON:
- summary: סיכום קצר של השיחה (2-3 משפטים).
- sentiment: האם הלקוח נראה מעוניין? (חיובי/ניטרלי/שלילי).
- nextSteps: מה הצעדים הבאים שצריך לעשות?
- keyDetails: פרטים חשובים שעלו (גיל, מצב רפואי, האם יש קצבה).
- fullTranscription: תמלול מלא של המילים שנאמרו בשיחה, מילה במילה.

השתמש בשפה המדוברת בהקלטה (עברית). החזר רק JSON תקין.`;

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
       console.error("Gemini Error:", geminiData);
       throw new Error("Gemini API failed: " + (geminiData.error?.message || "Unknown error"));
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) throw new Error("No response from Gemini");

    let result;
    try {
      // Handle potential JSON markdown or extra characters
      const cleanJson = responseText.replace(/```json|```/gi, "").trim();
      result = JSON.parse(cleanJson);
    } catch (e) {
      console.error("JSON Parse Error. Data:", responseText);
      throw new Error("Failed to parse AI response as JSON");
    }

    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error("Transcription error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
