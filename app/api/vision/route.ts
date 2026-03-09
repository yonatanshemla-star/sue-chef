import { NextResponse } from 'next/server';

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { imageBase64 } = await req.json();
    
    if (!imageBase64) {
      return NextResponse.json({ success: false, error: "No image provided" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "GEMINI_API_KEY not found" }, { status: 500 });
    }

    // Clean base64 string and detect mime type
    let mimeType = "image/png";
    const mimeMatch = imageBase64.match(/^data:image\/(png|jpeg|webp|gif|bmp);base64,/);
    if (mimeMatch) mimeType = `image/${mimeMatch[1]}`;
    const base64Data = imageBase64.replace(/^data:image\/(png|jpeg|webp|gif|bmp);base64,/, "");

    const prompt = `הסתכל על התמונה הזאת. היא מכילה שם של אדם ומספר טלפון.
חלץ את השם ואת מספר הטלפון שמופיעים בתמונה.
הטקסט בעברית. מספר הטלפון הוא מספר ישראלי שמתחיל ב-0 (כמו 050, 052, 053, 054, 058, 072 וכו').
החזר רק אובייקט JSON עם שני מפתחות: "name" ו-"phone".
דוגמה:
{"name": "חיים שושן", "phone": "0505305707"}`;

    // Use direct Gemini API call (same approach as webhook - more reliable)
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    
    const geminiResponse = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
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
      console.error("Gemini API Error:", JSON.stringify(geminiData));
      return NextResponse.json({ success: false, error: `Gemini error: ${geminiResponse.status}` }, { status: 500 });
    }

    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!responseText) {
      console.error("Empty Gemini response:", JSON.stringify(geminiData));
      return NextResponse.json({ success: false, error: "Empty AI response" }, { status: 500 });
    }

    try {
      // Clean and parse JSON
      let jsonStr = responseText.replace(/```json|```/gi, "").trim();
      const jsonStart = jsonStr.indexOf('{');
      const jsonEnd = jsonStr.lastIndexOf('}');
      if (jsonStart !== -1 && jsonEnd !== -1) {
        jsonStr = jsonStr.substring(jsonStart, jsonEnd + 1);
      }
      const extractedData = JSON.parse(jsonStr);
      console.log("OCR Result:", extractedData);
      return NextResponse.json({ success: true, data: extractedData });
    } catch (e) {
      console.error("Failed to parse Gemini JSON:", responseText);
      return NextResponse.json({ success: false, error: "AI response was not valid format", raw: responseText }, { status: 500 });
    }

  } catch (error: any) {
    console.error("Vision API error:", error);
    return NextResponse.json({ success: false, error: error.message || "Failed to process image" }, { status: 500 });
  }
}
