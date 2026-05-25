import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || 'lifetime';
    
    // Determine the days limit dynamically based on requested timeframe
    let daysLimit = 999999; // Represent lifetime as a massive interval
    if (timeframe === '30days') {
      daysLimit = 30;
    } else if (timeframe === '7days') {
      daysLimit = 7;
    } else if (timeframe === 'currentMonth') {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      daysLimit = Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    }

    // 1. Fetch KPI metrics and funnel stages filtered by timeframe
    const statsRes = await sql`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE data->>'status' NOT IN ('חדש', 'לא ענה', 'אין מענה חוזר', 'מספר שגוי') OR (data->>'callCount')::int > 0 AND data->>'status' NOT IN ('חדש', 'לא ענה')) as contacted,
        count(*) FILTER (WHERE (data->>'status' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב')) OR (data->>'wasRelevant' = 'true') OR EXISTS (SELECT 1 FROM jsonb_array_elements(COALESCE(data->'statusHistory', '[]'::jsonb)) AS sh WHERE sh->>'to' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב'))) as relevant,
        count(*) FILTER (WHERE (data->>'status') = 'חתם') as signed,
        count(*) FILTER (WHERE (data->>'status') = 'חתם' AND (data->>'callCount')::int > 0 AND (data->>'callCount')::int <= 3) as quick_signed,
        AVG((data->>'callCount')::int) FILTER (WHERE (data->>'status') = 'חתם' AND (data->>'callCount')::int > 0) as avg_calls_to_sign,
        AVG((data->>'callCount')::int) FILTER (WHERE (data->>'disqualificationReason') = 'אין מענה חוזר' AND (data->>'callCount')::int > 0) as avg_calls_no_answer
      FROM leads
      WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval
    `;
    
    const stats = statsRes.rows[0];
    const totalLeads = parseInt(stats.total) || 0;
    const contactedLeads = parseInt(stats.contacted) || 0;
    const relevantLeads = parseInt(stats.relevant) || 0;
    const signedLeads = parseInt(stats.signed) || 0;
    const quickSignedLeads = parseInt(stats.quick_signed) || 0;
    const avgCallsPerSigned = stats.avg_calls_to_sign ? parseFloat(stats.avg_calls_to_sign).toFixed(1) : "0.0";
    const avgCallsNoAnswer = stats.avg_calls_no_answer ? parseFloat(stats.avg_calls_no_answer).toFixed(1) : "0.0";

    // 2. Fetch disqualification reasons breakdown filtered by timeframe
    const disqualificationRes = await sql`
      SELECT data->>'disqualificationReason' as reason, count(*) as count
      FROM leads 
      WHERE (data->>'disqualificationReason') IS NOT NULL
        AND created_at >= NOW() - (${daysLimit} || ' days')::interval
      GROUP BY data->>'disqualificationReason'
      ORDER BY count DESC
    `;
    const disqualificationReasons = disqualificationRes.rows.map(r => ({
      reason: r.reason,
      count: parseInt(r.count)
    }));

    // 3. Fetch employment status aggregates
    const employmentRes = await sql`
      SELECT data->>'employmentStatus' as status, count(*) as count
      FROM leads
      WHERE (data->>'employmentStatus') IS NOT NULL AND (data->>'employmentStatus') != ''
        AND created_at >= NOW() - (${daysLimit} || ' days')::interval
      GROUP BY data->>'employmentStatus'
      ORDER BY count DESC
    `;
    const employmentBreakdown = employmentRes.rows.map(r => ({
      status: r.status,
      count: parseInt(r.count)
    }));

    // 4. Fetch salary aggregates
    const salaryRes = await sql`
      SELECT data->>'salary' as salary, count(*) as count
      FROM leads
      WHERE (data->>'salary') IS NOT NULL AND (data->>'salary') != ''
        AND created_at >= NOW() - (${daysLimit} || ' days')::interval
      GROUP BY data->>'salary'
      ORDER BY count DESC
    `;
    const salaryBreakdown = salaryRes.rows.map(r => ({
      salary: r.salary,
      count: parseInt(r.count)
    }));

    // 5. Fetch anonymized sample of recent leads to provide qualitative context
    const recentLeadsRes = await sql`
      SELECT 
        (CASE 
          WHEN (data->>'clientName') IS NULL THEN 'ליד אנונימי'
          ELSE SUBSTRING(data->>'clientName' FROM 1 FOR 1) || '***' || SUBSTRING(data->>'clientName' FROM LENGTH(data->>'clientName') FOR 1)
         END) as name,
        data->>'status' as status,
        data->>'disqualificationReason' as disqual_reason,
        data->>'salary' as salary,
        data->>'employmentStatus' as employment_status,
        (CASE 
          WHEN (data->>'notes') IS NULL THEN ''
          ELSE SUBSTRING(data->>'notes' FROM 1 FOR 150)
         END) as notes_snippet
      FROM leads
      WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval
      ORDER BY created_at DESC
      LIMIT 15
    `;
    const recentLeads = recentLeadsRes.rows;

    // Check Gemini API key
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in environment variables.");
    }

    const model = "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const promptText = `
You are a Senior Business Intelligence & Legal Operations Consultant for a boutique medical rights and tax refund law firm in Israel.
Analyze the CRM leads data for the selected timeframe ("${timeframe}") and output a highly detailed, professional strategic report.

Context Rules & Target Audience:
- The user is Gil, a medical rights attorney.
- He represents clients for medical disability claims, National Insurance (Bituach Leumi) representation, and income tax refunds due to severe illness.
- Key disqualification triggers: "אין מספיק מס הכנסה" (must pay at least 1,000 ILS income tax for tax refunds, or worked during illness if oncology claim), "אין עילה רפואית" (no medical grounds for disability), "אין מענה חוזר" (no answer after multiple attempts).
- Focus on practical, actionable steps Gil can take.

---
DATABASE STATISTICS FOR TIMEFRAME "${timeframe}":
1. Funnel Summary:
   - Total Leads Received: ${totalLeads}
   - Contacted Leads: ${contactedLeads}
   - Relevant Leads (had medical/tax grounds): ${relevantLeads} (Relevance Rate: ${contactedLeads > 0 ? Math.round((relevantLeads / contactedLeads) * 100) : 0}%)
   - Signed Contracts: ${signedLeads} (Conversion from total: ${totalLeads > 0 ? Math.round((signedLeads / totalLeads) * 100) : 0}%, Conversion from relevant: ${relevantLeads > 0 ? Math.round((signedLeads / relevantLeads) * 100) : 0}%)

2. Disqualification Reasons:
${JSON.stringify(disqualificationReasons, null, 2)}

3. Demographics & Financial Parameters (Parsed from Call Summaries):
   - Employment Status Distribution:
${JSON.stringify(employmentBreakdown, null, 2)}
   - Monthly Salaries Distribution:
${JSON.stringify(salaryBreakdown, null, 2)}

4. Call Efficiency & Effort Metrics:
   - Average calls to sign up a lead: ${avgCallsPerSigned} calls
   - Average calls wasted on non-responding leads (disqualified on "אין מענה חוזר"): ${avgCallsNoAnswer} calls
   - Quick signups (signed in 1-3 calls): ${quickSignedLeads} leads (out of ${signedLeads} total signed)

5. Recent 15 Leads Context (Anonymized name, status, reason, notes snippet):
${JSON.stringify(recentLeads, null, 2)}
---

OUTPUT SPECIFICATION:
You MUST return a JSON object with the exact keys described below. Everything must be written in professional, polished Hebrew suitable for a lawyer.

JSON Schema to follow:
{
  "summary": "Short 2-3 sentence executive summary of the crm state for this timeframe.",
  "metrics_evaluation": {
    "relevance_rate_commentary": "Analysis of the lead relevance rate. Is it too low (like 28%)? Why? Explain how marketing filters affect this.",
    "conversion_rate_commentary": "Analysis of the sign-up conversion rate from relevant leads."
  },
  "diagnostics": [
    {
      "title": "איכות ומקורות הלידים",
      "status": "success" | "warning" | "danger",
      "explanation": "Detailed explanation of lead relevance, analyzing if the incoming flow is too cold and how to fix marketing filters."
    },
    {
      "title": "אבחון תעסוקה ושכר (דמוגרפיה פיננסית)",
      "status": "success" | "warning" | "danger",
      "explanation": "Deep analysis of the salaries and employment status distribution. For example, explain the proportion of self-employed vs. salaried employees and what this means for tax refund potential. Point out if oncology cases show adequate wage levels to file claims."
    },
    {
      "title": "פוטנציאל אבוד וחלופות פיננסיות",
      "status": "success" | "warning" | "danger",
      "explanation": "Analysis of disqualified leads. E.g., for leads disqualified due to 'אין מספיק מס הכנסה' or 'אין עילה', did we offer Kupat Cholim nursing insurance or pension withdrawals? Show how cross-selling can recoup advertising costs from leads who don't pay enough income tax."
    },
    {
      "title": "יעילות שיחות וזמן עבודה",
      "status": "success" | "warning" | "danger",
      "explanation": "Analysis of call logs. If avg calls to no-answer is high, highlight the time wasted chasing dead leads, and advise setting a strict 3-strike rule."
    }
  ],
  "action_items": [
    {
      "priority": "high" | "medium" | "low",
      "action": "Brief title of action item (e.g., 'הצעת מסלולי קצבה לנמוכי שכר')",
      "impact": "Expected impact in Hebrew (e.g., 'הגדלת מחזור העסקאות ב-15% על ידי הצלבת תביעות פנסיוניות')",
      "explanation": "Detailed step-by-step instructions on how Gil should implement this (e.g., if a lead has cancer but no income tax, pivot immediately to claiming Bituach Leumi general disability or a lump sum pension release due to severe illness)."
    }
  ],
  "leads_trend_insight": "A comprehensive summary of the current weekly/monthly trend."
}

Do not include any markdown comments, conversational preambles, or wrapping besides the JSON object.
`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error?.message || `Status ${response.status}`);
    }

    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    const parsedAnalysis = JSON.parse(textResponse);

    return NextResponse.json({
      success: true,
      timeframe,
      analysis: parsedAnalysis
    });

  } catch (error: any) {
    console.error("Error in AI Analytics diagnostic API:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to generate strategic AI diagnostic. Please make sure the database is accessible and Gemini API key is correct." 
    }, { status: 500 });
  }
}
