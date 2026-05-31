import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `You are a professional Israeli legal/medical rights dashboard task manager.
Your job is to read a list of active Leads (each with its ID, current Status, and Notes), and the current Israeli local time, and extract actionable follow-up tasks or reminders for each.

TASK RULES:
1. For each lead in the list, determine if there is a clear actionable task described in its notes or implied by its status and notes.
2. Task Types:
   - 'call': If a call or return call is scheduled (e.g. "לחזור ב-14:00", "להתקשר ביום ראשון").
   - 'document': If waiting for or needing to send/receive documents (e.g. "צריך לשלוח טפסים", "מחכה לאבחון").
   - 'followup': If a general follow-up is needed at a certain time.
   - 'general': Any other generic task or reminder.
3. Due Date Resolution:
   - Calculate the absolute due date and time in ISO format with +03:00 timezone based on the 'Current local time in Israel' provided.
   - For example: if current time is "2026-05-31T15:00:00+03:00" (Sunday) and notes say "לחזור ביום שלישי בבוקר", set the dueDate to "2026-06-02T09:00:00+03:00".
   - If notes say "לחזור עוד שעה", set the dueDate to 1 hour from current time.
   - If no specific date/time is mentioned, set 'dueDate' to null (this makes it a general, undated reminder).
4. Language: Always write the task 'text' in clear, professional, and concise Hebrew (e.g. "להתקשר ללקוח להמשך בירור", "לוודא קבלת מסמכים רפואיים").
5. Output format: You must return ONLY a JSON object containing an object called "results" where keys are lead IDs and values are arrays of tasks.
{
  "results": {
    "lead_id_here": [
      {
        "text": "Task description in Hebrew",
        "dueDate": "ISO8601 string or null",
        "type": "call" | "document" | "followup" | "general"
      }
    ]
  }
}
Return an empty array for a lead if there are absolutely no actionable tasks or reminders in its notes. Do not include markdown wraps (like \`\`\`json) in your raw response, just return the JSON text directly.`;

export async function POST(req: Request) {
  try {
    const { leads, currentLocalTime } = await req.json();

    if (!leads || !Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ success: true, results: {} });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Leads List:
${leads.map((l: any, i: number) => `${i + 1}. ID: "${l.id}" | Status: "${l.status}" | Notes: "${l.notes}"`).join("\n")}

Current local time in Israel: "${currentLocalTime}"

Generate the JSON results following the rules.`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: `${SYSTEM_INSTRUCTION}\n\n${prompt}`
              }
            ]
          }
        ]
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Status ${response.status}`);
    }

    let text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Clean up any markdown blocks if the model ignored instructions
    text = text.replace(/```json/g, "").replace(/```/g, "").trim();

    const parsed = JSON.parse(text);
    const rawResults = parsed.results || {};
    const formattedResults: { [leadId: string]: any[] } = {};

    Object.keys(rawResults).forEach((leadId) => {
      const leadTasks = rawResults[leadId] || [];
      formattedResults[leadId] = leadTasks.map((t: any, index: number) => ({
        id: `task-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
        text: t.text || "",
        dueDate: t.dueDate || null,
        type: t.type || "general",
        completed: false,
        createdAt: new Date().toISOString()
      }));
    });

    return NextResponse.json({ success: true, results: formattedResults });
  } catch (error: any) {
    console.error("Gemini Batch Task Extraction Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
