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

    // Fetch all leads from the database
    const rawLeadsRes = await sql`
      SELECT 
        data,
        created_at
      FROM leads
      ORDER BY created_at ASC;
    `;
    const rows = rawLeadsRes.rows;

    const leads = rows.map((r: any) => {
      const lead = typeof r.data === 'string' ? JSON.parse(r.data) : r.data;
      return {
        ...lead,
        createdAt: lead.createdAt || r.created_at.toISOString(),
      };
    });

    // Timeframe cutoff calculations
    const now = new Date();
    let cutoffDate = new Date(0); // Default to lifetime
    if (timeframe === '30days') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '7days') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'currentMonth') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Helper functions (100% matching route.ts)
    function wasEverContactedReal(lead: any): boolean {
      const currentStatus = lead.status;
      if (['חדש', 'לא ענה', 'אין מענה חוזר', 'מספר שגוי', 'במעקב'].includes(currentStatus)) {
        return false;
      }
      if (currentStatus === 'לחזור אליו') {
        const history = lead.statusHistory || [];
        if (history.length === 0) {
          return false;
        }
        const basicStatuses = ['חדש', 'ממתין לעדכון', 'לא ענה', 'לחזור אליו'];
        const hadRealContact = history.some((entry: any) => 
          !basicStatuses.includes(entry.to) || !basicStatuses.includes(entry.from)
        );
        if (!hadRealContact) {
          return false;
        }
      }
      return true;
    }

    function isLeadRelevant(lead: any, contacted: boolean): boolean {
      if (!contacted) return false;
      
      const currentStatus = lead.status;
      const relevantStatuses = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב', 'בבדיקה עם גילי'];
      
      let isRelevant = relevantStatuses.includes(currentStatus) || 
                       lead.wasRelevant === true || 
                       lead.wasRelevant === 'true';
                       
      if (!isRelevant && lead.statusHistory && Array.isArray(lead.statusHistory)) {
        isRelevant = lead.statusHistory.some((entry: any) => 
          relevantStatuses.includes(entry.to)
        );
      }
      
      if (!isRelevant) {
        return false;
      }
      
      if (currentStatus === 'לא רלוונטי') {
        return false;
      }
      
      if (currentStatus === 'נגמר') {
        const disqualificationReason = lead.disqualificationReason;
        if (['אין עילה רפואית', 'אין מספיק מס הכנסה', 'טעות במספר'].includes(disqualificationReason)) {
          return false;
        }
      }
      
      return true;
    }

    let totalLeads = 0;
    let contactedLeads = 0;
    let relevantLeads = 0;
    let signedLeads = 0;
    let quickSignedLeads = 0;
    
    let sumCallsToSign = 0;
    let countSignedWithCalls = 0;
    let sumCallsNoAnswer = 0;
    let countNoAnswerWithCalls = 0;

    const disqualificationReasonsMap = new Map<string, number>();
    const employmentMap = new Map<string, number>();
    const salaryMap = new Map<string, number>();
    const filteredLeadsForRecent: any[] = [];

    for (const lead of leads) {
      const leadCreatedDate = new Date(lead.createdAt);
      const createdInTimeframe = leadCreatedDate >= cutoffDate;
      const signedDate = new Date(lead.signedAt || lead.createdAt);
      const signedInTimeframe = lead.status === 'חתם' && signedDate >= cutoffDate;

      if (createdInTimeframe) {
        totalLeads++;
        filteredLeadsForRecent.push(lead);

        const contacted = wasEverContactedReal(lead);
        if (contacted) {
          contactedLeads++;
          if (isLeadRelevant(lead, true)) {
            relevantLeads++;
          }
        }

        if (lead.disqualificationReason) {
          const reason = lead.disqualificationReason.trim();
          disqualificationReasonsMap.set(reason, (disqualificationReasonsMap.get(reason) || 0) + 1);
        }

        if (lead.disqualificationReason === 'אין מענה חוזר' && lead.callCount > 0) {
          sumCallsNoAnswer += lead.callCount;
          countNoAnswerWithCalls++;
        }

        if (lead.employmentStatus && lead.employmentStatus.trim() !== '') {
          const emp = lead.employmentStatus.trim();
          employmentMap.set(emp, (employmentMap.get(emp) || 0) + 1);
        }

        if (lead.salary && lead.salary.trim() !== '') {
          const sal = lead.salary.trim();
          salaryMap.set(sal, (salaryMap.get(sal) || 0) + 1);
        }
      }

      if (signedInTimeframe) {
        signedLeads++;
        if (lead.callCount > 0) {
          sumCallsToSign += lead.callCount;
          countSignedWithCalls++;
          if (lead.callCount <= 3) {
            quickSignedLeads++;
          }
        }
      }
    }

    const disqualificationReasons = Array.from(disqualificationReasonsMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const employmentBreakdown = Array.from(employmentMap.entries())
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count);

    const salaryBreakdown = Array.from(salaryMap.entries())
      .map(([salary, count]) => ({ salary, count }))
      .sort((a, b) => b.count - a.count);

    const avgCallsPerSigned = countSignedWithCalls > 0 ? (sumCallsToSign / countSignedWithCalls).toFixed(1) : "0.0";
    const avgCallsNoAnswer = countNoAnswerWithCalls > 0 ? (sumCallsNoAnswer / countNoAnswerWithCalls).toFixed(1) : "0.0";

    const recentLeads = filteredLeadsForRecent
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 15)
      .map(lead => ({
        name: lead.clientName ? (lead.clientName.substring(0, 1) + '***' + lead.clientName.substring(lead.clientName.length - 1)) : 'ליד אנונימי',
        status: lead.status,
        disqual_reason: lead.disqualificationReason || null,
        salary: lead.salary || null,
        employment_status: lead.employmentStatus || null,
        notes_snippet: lead.generalNotes ? lead.generalNotes.substring(0, 150) : ''
      }));

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
      analysis: parsedAnalysis,
      raw_metrics: {
        disqualificationReasons,
        employmentBreakdown,
        salaryBreakdown,
        stats: {
          totalLeads,
          contactedLeads,
          relevantLeads,
          signedLeads,
          relevanceRate: contactedLeads > 0 ? Math.round((relevantLeads / contactedLeads) * 100) : 0,
          conversionRate: relevantLeads > 0 ? Math.round((signedLeads / relevantLeads) * 100) : 0
        }
      }
    });

  } catch (error: any) {
    console.error("Error in AI Analytics diagnostic API:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Failed to generate strategic AI diagnostic. Please make sure the database is accessible and Gemini API key is correct." 
    }, { status: 500 });
  }
}
