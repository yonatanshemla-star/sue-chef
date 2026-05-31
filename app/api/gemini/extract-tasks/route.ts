import { NextResponse } from "next/server";

const SYSTEM_INSTRUCTION = `You are a professional Israeli legal/medical rights dashboard task manager.
Your job is to read a Lead's current Status, their Notes (general or live call notes), and the current Israeli local time, and extract actionable follow-up tasks or reminders.

TASK RULES:
1. Determine if there is a clear actionable task described in the notes or implied by the status and notes combined.
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
5. Output format: You must return ONLY a JSON object containing an array called "tasks" with the following structure:
{
  "tasks": [
    {
      "text": "Task description in Hebrew",
      "dueDate": "ISO8601 string or null",
      "type": "call" | "document" | "followup" | "general"
    }
  ]
}
Return an empty array if there are absolutely no actionable tasks or reminders in the notes. Do not include markdown wraps (like \`\`\`json) in your raw response, just return the JSON text directly.`;

export async function POST(req: Request) {
  try {
    const { status, notes, currentLocalTime } = await req.json();

    if (!notes || notes.trim().length < 3) {
      return NextResponse.json({ success: true, tasks: [] });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing");
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const prompt = `Current status of lead: "${status}"
Notes: "${notes}"
Current local time in Israel: "${currentLocalTime}"

Generate the JSON list of tasks following the rules.`;

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
    const tasks = (parsed.tasks || []).map((t: any, index: number) => ({
      id: `task-${Date.now()}-${index}-${Math.random().toString(36).substr(2, 5)}`,
      text: t.text || "",
      dueDate: t.dueDate || null,
      type: t.type || "general",
      completed: false,
      createdAt: new Date().toISOString()
    }));

    return NextResponse.json({ success: true, tasks });
  } catch (error: any) {
    console.error("Gemini Task Extraction Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
