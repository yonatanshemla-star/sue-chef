import { NextResponse, NextRequest } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET(request: NextRequest) {
  try {
    const timeframe = request.nextUrl.searchParams.get('timeframe') || 'lifetime';
    
    // Determine the days limit dynamically based on requested timeframe
    let daysLimit = 999999;
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
    // Fetching all leads is extremely fast (614 rows total) and guarantees 
    // we capture signed dates that fall in the timeframe even if created_at was earlier.
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
    let cutoffDate = new Date(0); // Lifetime
    if (timeframe === '30days') {
      cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else if (timeframe === '7days') {
      cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (timeframe === 'currentMonth') {
      cutoffDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Helper functions
    function wasEverContactedReal(lead: any): boolean {
      const currentStatus = lead.status;
      
      // If current status is one of the non-contacted states, definitely not contacted
      if (['חדש', 'לא ענה', 'אין מענה חוזר', 'מספר שגוי', 'במעקב'].includes(currentStatus)) {
        return false;
      }
      
      // If current status is "לחזור אליו"
      if (currentStatus === 'לחזור אליו') {
        const history = lead.statusHistory || [];
        if (history.length === 0) {
          return false;
        }
        
        const basicStatuses = ['חדש', 'ממתין לעדכון', 'לא ענה', 'לחזור אליו'];
        // If they only ever transitioned between basicStatuses, they were not contacted
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
      
      // Check if current status is relevant, or if it has the wasRelevant marker
      let isRelevant = relevantStatuses.includes(currentStatus) || 
                       lead.wasRelevant === true || 
                       lead.wasRelevant === 'true';
                       
      // Fallback: check history if they ever transitioned to a relevant status
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

    function getSalaryBracket(salaryStr: string) {
      if (!salaryStr) return 'לא צוין';
      const clean = salaryStr.trim();
      if (clean === '' || clean === 'null' || clean === 'undefined') return 'לא צוין';
      const digits = clean.replace(/[^0-9]/g, '');
      if (!digits) return 'לא צוין';
      let val = parseFloat(digits);
      if (val < 100) val = val * 1000;
      if (val < 10000) return 'עד 10,000 ₪';
      if (val <= 20000) return '10,000 ₪ - 20,000 ₪';
      return 'מעל 20,000 ₪';
    }

    function getNormalizedEmploymentStatus(empStr: string): string {
      if (!empStr) return 'לא צוין';
      const clean = empStr.trim().toLowerCase();
      if (clean === '' || clean === 'null' || clean === 'undefined' || clean === 'לא צוין') {
        return 'לא צוין';
      }

      if (clean.includes('קצב') || clean.includes('נכות') || clean.includes('ביטוח לאומי') || clean.includes('אובדן כושר')) {
        return 'מקבל/ת קצבה';
      }
      
      if (clean.includes('מובטל') || clean.includes('לא עובד') || clean.includes('אבטלה') || clean.includes('בלי עבודה') || clean.includes('לא עובדת')) {
        return 'לא עובד/ת';
      }

      if (clean.includes('שכיר') || clean.includes('שכירה')) {
        return 'שכיר/ה';
      }

      if (clean.includes('עצמאי') || clean.includes('עצמאית') || clean.includes('עסק')) {
        return 'עצמאי/ת';
      }

      if (clean.includes('פנסיונ') || clean.includes('פנסיה')) {
        return 'פנסיונר/ית';
      }

      if (clean.includes('סטודנט')) {
        return 'סטודנט/ית';
      }

      if (clean.includes('חייל') || clean.includes('חיילת') || clean.includes('צבא') || clean.includes('שירות לאומי')) {
        return 'חייל/ת או שירות לאומי';
      }

      return empStr.charAt(0).toUpperCase() + empStr.slice(1);
    }

    function getPeriodString(dateStr: string): string {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return '';
      if (timeframe === 'lifetime') {
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const y = d.getFullYear();
        return `${m}/${y}`;
      } else {
        const day = String(d.getDate()).padStart(2, '0');
        const m = String(d.getMonth() + 1).padStart(2, '0');
        return `${day}/${m}`;
      }
    }

    // Calculation variables
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
    const leadsSeriesMap = new Map<string, number>();
    const signaturesSeriesMap = new Map<string, number>();

    const campaignsMap = new Map<string, { campaign: string; total: number; signed: number }>();
    const employmentMap = new Map<string, { status: string; total: number; signed: number }>();
    const salaryMap = new Map<string, { bracket: string; total: number; signed: number }>();
    
    const salaryBracketsList = ['עד 10,000 ₪', '10,000 ₪ - 20,000 ₪', 'מעל 20,000 ₪', 'לא צוין'];
    for (const b of salaryBracketsList) {
      salaryMap.set(b, { bracket: b, total: 0, signed: 0 });
    }

    // Process leads
    for (const lead of leads) {
      const leadCreatedDate = new Date(lead.createdAt);
      const createdInTimeframe = leadCreatedDate >= cutoffDate;
      
      const signedDate = new Date(lead.signedAt || lead.createdAt);
      const signedInTimeframe = lead.status === 'חתם' && signedDate >= cutoffDate;

      if (createdInTimeframe) {
        totalLeads++;
        
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

        // Campaigns
        const campName = (lead.campaign || '').trim() || 'ללא קמפיין';
        const campData = campaignsMap.get(campName) || { campaign: campName, total: 0, signed: 0 };
        campData.total += 1;
        if (lead.status === 'חתם') campData.signed += 1;
        campaignsMap.set(campName, campData);

        // Employment
        const empName = getNormalizedEmploymentStatus(lead.employmentStatus || '');
        const empData = employmentMap.get(empName) || { status: empName, total: 0, signed: 0 };
        empData.total += 1;
        if (lead.status === 'חתם') empData.signed += 1;
        employmentMap.set(empName, empData);

        // Salary
        const salBracket = getSalaryBracket(lead.salary || '');
        const salData = salaryMap.get(salBracket)!;
        salData.total += 1;
        if (lead.status === 'חתם') salData.signed += 1;
        salaryMap.set(salBracket, salData);

        // Time Series
        const period = getPeriodString(lead.createdAt);
        if (period) {
          leadsSeriesMap.set(period, (leadsSeriesMap.get(period) || 0) + 1);
        }
      }

      // Signatures Series (can be created before cutoff but signed within cutoff)
      if (signedInTimeframe) {
        signedLeads++;
        
        if (lead.callCount > 0) {
          sumCallsToSign += lead.callCount;
          countSignedWithCalls++;
          if (lead.callCount <= 3) {
            quickSignedLeads++;
          }
        }

        const period = getPeriodString(lead.signedAt || lead.createdAt);
        if (period) {
          signaturesSeriesMap.set(period, (signaturesSeriesMap.get(period) || 0) + 1);
        }
      }
    }

    // Time Series Gap Filling
    let leadsTimeSeries = Array.from(leadsSeriesMap.entries()).map(([period, count]) => ({ period, count }));
    let signaturesTimeSeries = Array.from(signaturesSeriesMap.entries()).map(([period, count]) => ({ period, count }));
    
    if (timeframe === 'lifetime') {
      const earliestDate = leads.length > 0 ? new Date(leads[0].createdAt) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const fillMissingMonths = (dataMap: Map<string, number>, start: Date) => {
        const result = [];
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const end = new Date();
        
        while (current <= end) {
          const monthStr = String(current.getMonth() + 1).padStart(2, '0');
          const yearStr = current.getFullYear();
          const period = `${monthStr}/${yearStr}`;
          result.push({
            period,
            count: dataMap.get(period) || 0
          });
          current.setMonth(current.getMonth() + 1);
        }
        return result;
      };
      
      leadsTimeSeries = fillMissingMonths(leadsSeriesMap, earliestDate);
      signaturesTimeSeries = fillMissingMonths(signaturesSeriesMap, earliestDate);
    } else {
      let actualDays = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : 30;
      if (timeframe === 'currentMonth') {
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        actualDays = Math.ceil((now.getTime() - startOfMonth.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      }
      
      const fillMissingDays = (dataMap: Map<string, number>, count: number) => {
        const result = [];
        for (let i = count - 1; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayStr = String(d.getDate()).padStart(2, '0');
          const monthStr = String(d.getMonth() + 1).padStart(2, '0');
          const period = `${dayStr}/${monthStr}`;
          result.push({
            period,
            count: dataMap.get(period) || 0
          });
        }
        return result;
      };
      
      leadsTimeSeries = fillMissingDays(leadsSeriesMap, actualDays);
      signaturesTimeSeries = fillMissingDays(signaturesSeriesMap, actualDays);
    }

    const disqualificationReasons = Array.from(disqualificationReasonsMap.entries())
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count);

    const campaigns = Array.from(campaignsMap.values()).sort((a, b) => b.total - a.total);
    const employment = Array.from(employmentMap.values()).sort((a, b) => b.total - a.total);
    const salaryBrackets = salaryBracketsList.map(b => salaryMap.get(b)!);

    const avgCallsPerSigned = countSignedWithCalls > 0 ? (sumCallsToSign / countSignedWithCalls).toFixed(1) : "0.0";
    const avgCallsNoAnswer = countNoAnswerWithCalls > 0 ? (sumCallsNoAnswer / countNoAnswerWithCalls).toFixed(1) : "0.0";
    const quickSignedRate = signedLeads > 0 ? Math.round((quickSignedLeads / signedLeads) * 100) : 0;
    const leadQualityRatio = contactedLeads > 0 ? Math.round((relevantLeads / contactedLeads) * 100) : 0;

    return NextResponse.json({
      success: true,
      data: {
        funnel: {
          total: totalLeads,
          contacted: contactedLeads,
          relevant: relevantLeads,
          signed: signedLeads
        },
        disqualificationReasons,
        insights: {
          avgCallsPerSigned,
          avgCallsNoAnswer,
          quickSignedRate,
          leadQualityRatio
        },
        leadsTimeSeries,
        signaturesTimeSeries,
        campaigns,
        employment,
        salaryBrackets
      }
    });

  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
