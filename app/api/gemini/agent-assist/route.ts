import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

const SYSTEM_INSTRUCTION = `You are a Real-Time Agent Assistant for a medical rights and tax refund law firm in Israel.
The agent is on a live call, typing notes. Analyze the notes and output missing questions to ask.

FIRM RULES:
1. Core Info Needed: Full name, exact Age, medical diagnosis, onset date, current allowances/pensions.
2. Tax Refunds: The lead MUST pay more than 1000 ILS in income tax. If they had cancer, they MUST have worked during the illness/treatments.
3. Medical/Nursing: If functioning is severely impaired, ask about Kupat Cholim nursing insurance. If they stopped working, ask if they have a pension fund to withdraw from.
4. Stroke: Requires exact dates, hospitalization details, impairments (speech/movement), and rehab history.

OUTPUT FORMAT:
Output EXACTLY 1 to 2 RED alerts, and EXACTLY 1 ORANGE alert in Hebrew. Maximum 1 short sentence per alert. Do not use markdown formatting like asterisks, just the emoji and text.

🔴 קריטי: [Missing deal-breaker info, e.g., income tax amount, work status during cancer, exact age/diagnosis]
🟠 כדאי לברר: [Value-add follow-up, e.g., nursing insurance, pension withdrawal, hospitalization length]`;

export async function POST(req: Request) {
  try {
    const { notes } = await req.json();

    if (!notes || notes.trim().length < 5) {
      return NextResponse.json({ 
        success: true, 
        alerts: [
          { emoji: "🔴", text: "קריטי: חסר מידע ליבה (שם, גיל, אבחנה)" },
          { emoji: "🟠", text: "כדאי לברר: סטטוס תעסוקתי ומס הכנסה" }
        ] 
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY is missing");

    const endpoints = ["v1beta"];
    const models = ["gemini-2.0-flash", "gemini-2.5-flash"];

    let text = "";
    let lastError = null;

    for (const v of endpoints) {
      for (const m of models) {
        try {
          const url = `https://generativelanguage.googleapis.com/${v}/models/${m}:generateContent?key=${apiKey}`;
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${SYSTEM_INSTRUCTION}\n\nהנה הערות השיחה:\n${notes}` }] }]
            })
          });

          const data = await response.json();
          
          if (response.ok) {
            text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
            if (text) break;
          } else {
            lastError = new Error(data.error?.message || `Status ${response.status} for ${v}/${m}`);
          }
        } catch (e: any) {
          lastError = e;
        }
      }
      if (text) break;
    }

    if (!text && lastError) throw lastError;

    // Parse the response lines and filter for lines with our expected emojis
    const lines = text.split('\n').filter(l => l.includes('🔴') || l.includes('🟠'));
    
    let alerts = lines.map(line => {
      const emoji = line.includes('🔴') ? '🔴' : '🟠';
      const cleanText = line.trim().replace(/^[🔴🟠]\s*/, '').replace(/[🔴🟠]/g, '').trim();
      return { emoji, text: cleanText };
    });

    // Fallback if no emojis found but text exists
    if (alerts.length === 0 && text.trim().length > 10) {
      alerts = [{ emoji: "🟠", text: text.trim().substring(0, 100) }];
    }

    return NextResponse.json({ success: true, alerts });
  } catch (error: any) {
    console.error("Gemini Agent Assist Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
