import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getLeads, updateLead } from "@/utils/storage";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `אתה עוזר חכם למשרד עורכי דין לזכויות רפואיות והחזרי מס.
תפקידך לנתח את הערות שיחת הטלפון שנכתבו על ידי הנציג, ולחלץ מתוכן שלושה נתונים מדויקים וקצרים בעברית:
1. שכר חודשי (salary) - למשל: "8,000 ש"ח", "מובטל ללא הכנסה", "לא צוין".
2. מצב תעסוקתי (employmentStatus) - למשל: "שכיר", "עצמאי", "מובטל", "פנסיונר", "מקבל קצבה", "לא צוין".
3. מצב רפואי (medicalStatus) - סיכום קצר ביותר של הבעיות הרפואיות שהועלו, למשל: "עבר אירוע מוחי לפני שנה, חולשה בחצי גוף ימין", "סרטן ריאות בטיפול פעיל", "בעיות גב וברכיים קשות", "לא צוין".

החזר אך ורק אובייקט JSON תקין (ללא סימוני markdown של קוד, ללא \`\`\`json וללא תווים נוספים לפני או אחרי) בפורמט הבא:
{
  "salary": "ערך שכר קצר או 'לא צוין'",
  "employmentStatus": "ערך מצב תעסוקתי קצר או 'לא צוין'",
  "medicalStatus": "ערך מצב רפואי קצר או 'לא צוין'"
}`;

export async function POST(req: Request) {
  try {
    const { text, id } = await req.json();

    if (!text || text.trim().length < 5) {
      return NextResponse.json({
        success: true,
        data: { salary: "", employmentStatus: "", medicalStatus: "" }
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const model = "gemini-2.0-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    let resultJson: any = { salary: "", employmentStatus: "", medicalStatus: "" };
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nהנה הערות השיחה:\n${text}` }] }]
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        let aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        // Clean markdown JSON wrapper if present
        aiText = aiText.replace(/```json/g, "").replace(/```/g, "").trim();
        try {
          const parsed = JSON.parse(aiText);
          if (parsed.salary) resultJson.salary = parsed.salary !== 'לא צוין' ? parsed.salary : '';
          if (parsed.employmentStatus) resultJson.employmentStatus = parsed.employmentStatus !== 'לא צוין' ? parsed.employmentStatus : '';
          if (parsed.medicalStatus) resultJson.medicalStatus = parsed.medicalStatus !== 'לא צוין' ? parsed.medicalStatus : '';
        } catch (parseError) {
          console.error("AI JSON Parse Error:", parseError, "AI Text was:", aiText);
        }
      } else {
        throw new Error(data.error?.message || `Status ${response.status}`);
      }
    } catch (e: any) {
      console.error(`AI Extraction Error:`, e.message);
      // Don't fail the whole request, just return empty data
    }

    // Save extracted data directly to DB if ID is provided
    if (id) {
      const leads = await getLeads();
      const existingIndex = leads.findIndex(l => l.id === id);
      if (existingIndex !== -1) {
        const lead = leads[existingIndex];
        const updatedLead = {
          ...lead,
          salary: resultJson.salary || lead.salary || "",
          employmentStatus: resultJson.employmentStatus || lead.employmentStatus || "",
          medicalStatus: resultJson.medicalStatus || lead.medicalStatus || "",
          lastContacted: new Date().toISOString()
        };
        await updateLead(updatedLead);
      }
    }

    return NextResponse.json({ success: true, data: resultJson });
  } catch (error: any) {
    console.error("Analyze call API error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
