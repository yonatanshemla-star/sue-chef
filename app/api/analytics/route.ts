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
        count(*) FILTER (WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval) as total,
        count(*) FILTER (
          WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval 
            AND (data->>'status' NOT IN ('חדש', 'לא ענה', 'אין מענה חוזר', 'מספר שגוי') 
                 OR (data->>'callCount')::int > 0 
                 AND data->>'status' NOT IN ('חדש', 'לא ענה')
            )
        ) as contacted,
        count(*) FILTER (
          WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval 
            AND (
              (data->>'status' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב')) 
              OR (data->>'wasRelevant' = 'true')
            )
            AND NOT (
              data->>'status' = 'לא רלוונטי'
              OR (
                data->>'status' = 'נגמר'
                AND data->>'disqualificationReason' IN ('אין עילה רפואית', 'אין מספיק מס הכנסה', 'טעות במספר')
              )
            )
        ) as relevant,
        count(*) FILTER (
          WHERE (data->>'status') = 'חתם' 
            AND COALESCE(data->>'signedAt', created_at::text)::timestamp >= NOW() - (${daysLimit} || ' days')::interval
        ) as signed,
        count(*) FILTER (
          WHERE (data->>'status') = 'חתם' 
            AND COALESCE(data->>'signedAt', created_at::text)::timestamp >= NOW() - (${daysLimit} || ' days')::interval
            AND (data->>'callCount')::int > 0 
            AND (data->>'callCount')::int <= 3
        ) as quick_signed,
        AVG((data->>'callCount')::int) FILTER (
          WHERE (data->>'status') = 'חתם' 
            AND COALESCE(data->>'signedAt', created_at::text)::timestamp >= NOW() - (${daysLimit} || ' days')::interval
            AND (data->>'callCount')::int > 0
        ) as avg_calls_to_sign,
        AVG((data->>'callCount')::int) FILTER (
          WHERE (data->>'disqualificationReason') = 'אין מענה חוזר' 
            AND created_at >= NOW() - (${daysLimit} || ' days')::interval
            AND (data->>'callCount')::int > 0
        ) as avg_calls_no_answer
      FROM leads
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

    // 3. Time Series for Leads Received
    let groupByFormat = 'DD/MM';
    if (timeframe === 'lifetime') {
      groupByFormat = 'MM/YYYY';
    }

    const leadsSeriesRes = await sql`
      SELECT 
        TO_CHAR(created_at, ${groupByFormat}) as period,
        count(*) as count,
        MIN(created_at) as min_date
      FROM leads
      WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval
      GROUP BY period
      ORDER BY min_date ASC
    `;

    // 4. Time Series for Signatures
    const signaturesSeriesRes = await sql`
      SELECT 
        TO_CHAR(
          COALESCE(
            CASE 
              WHEN (data->>'signedAt') IS NOT NULL AND (data->>'signedAt') != '' AND (data->>'signedAt') != 'null'
              THEN (data->>'signedAt')::timestamp 
              ELSE NULL 
            END, 
            created_at
          ), 
          ${groupByFormat}
        ) as period,
        count(*) as count,
        MIN(created_at) as min_date
      FROM leads
      WHERE (data->>'status') = 'חתם'
        AND COALESCE(
          CASE 
            WHEN (data->>'signedAt') IS NOT NULL AND (data->>'signedAt') != '' AND (data->>'signedAt') != 'null'
            THEN (data->>'signedAt')::timestamp 
            ELSE NULL 
          END, 
          created_at
        ) >= NOW() - (${daysLimit} || ' days')::interval
      GROUP BY period
      ORDER BY min_date ASC
    `;

    let leadsTimeSeries = leadsSeriesRes.rows.map(r => ({
      period: r.period,
      count: parseInt(r.count) || 0
    }));

    let signaturesTimeSeries = signaturesSeriesRes.rows.map(r => ({
      period: r.period,
      count: parseInt(r.count) || 0
    }));

    // Fill missing periods
    if (timeframe === 'lifetime') {
      const earliestLeadRes = await sql`SELECT MIN(created_at) as earliest FROM leads`;
      const earliestDate = earliestLeadRes.rows[0]?.earliest ? new Date(earliestLeadRes.rows[0].earliest) : new Date(Date.now() - 365 * 24 * 60 * 60 * 1000);
      
      const fillMissingMonths = (data: { period: string, count: number }[], start: Date) => {
        const result = [];
        const dataMap = new Map(data.map(item => [item.period, item.count]));
        
        const current = new Date(start.getFullYear(), start.getMonth(), 1);
        const end = new Date();
        
        // Loop through all months from start to end
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

      leadsTimeSeries = fillMissingMonths(leadsTimeSeries, earliestDate);
      signaturesTimeSeries = fillMissingMonths(signaturesTimeSeries, earliestDate);
    } else {
      // Days-based timeframe
      const daysCount = timeframe === '7days' ? 7 : timeframe === '30days' ? 30 : daysLimit;
      
      const fillMissingDays = (data: { period: string, count: number }[], count: number) => {
        const result = [];
        const dataMap = new Map(data.map(item => [item.period, item.count]));
        
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

      leadsTimeSeries = fillMissingDays(leadsTimeSeries, daysCount);
      signaturesTimeSeries = fillMissingDays(signaturesTimeSeries, daysCount);
    }

    // Fetch all leads raw fields for JS aggregation
    const rawLeadsRes = await sql`
      SELECT 
        COALESCE(data->>'campaign', '') as campaign,
        COALESCE(data->>'employmentStatus', '') as employment_status,
        COALESCE(data->>'salary', '') as salary,
        data->>'status' as status
      FROM leads
      WHERE created_at >= NOW() - (${daysLimit} || ' days')::interval;
    `;
    const rawLeads = rawLeadsRes.rows;

    // Aggregate Campaigns
    const campaignsMap = new Map<string, { campaign: string; total: number; signed: number }>();
    // Aggregate Employment
    const employmentMap = new Map<string, { status: string; total: number; signed: number }>();
    // Aggregate Salary Brackets
    const salaryMap = new Map<string, { bracket: string; total: number; signed: number }>();
    
    // Initialize salary brackets
    const salaryBracketsList = ['עד 10,000 ₪', '10,000 ₪ - 20,000 ₪', 'מעל 20,000 ₪', 'לא צוין'];
    for (const b of salaryBracketsList) {
      salaryMap.set(b, { bracket: b, total: 0, signed: 0 });
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

      // Check for stipends/disability
      if (clean.includes('קצב') || clean.includes('נכות') || clean.includes('ביטוח לאומי') || clean.includes('אובדן כושר')) {
        return 'מקבל/ת קצבה';
      }
      
      // Unemployed/not working
      if (clean.includes('מובטל') || clean.includes('לא עובד') || clean.includes('אבטלה') || clean.includes('בלי עבודה') || clean.includes('לא עובדת')) {
        return 'לא עובד/ת';
      }

      // Employed
      if (clean.includes('שכיר') || clean.includes('שכירה')) {
        return 'שכיר/ה';
      }

      // Self-employed
      if (clean.includes('עצמאי') || clean.includes('עצמאית') || clean.includes('עסק')) {
        return 'עצמאי/ת';
      }

      // Pensioner
      if (clean.includes('פנסיונ') || clean.includes('פנסיה')) {
        return 'פנסיונר/ית';
      }

      // Student
      if (clean.includes('סטודנט')) {
        return 'סטודנט/ית';
      }

      // Soldier / National Service
      if (clean.includes('חייל') || clean.includes('חיילת') || clean.includes('צבא') || clean.includes('שירות לאומי')) {
        return 'חייל/ת או שירות לאומי';
      }

      // Return clean original capitalised or styled word
      return empStr.charAt(0).toUpperCase() + empStr.slice(1);
    }

    for (const row of rawLeads) {
      const isSigned = row.status === 'חתם';

      // 1. Campaign
      const campName = row.campaign.trim() || 'ללא קמפיין';
      const campData = campaignsMap.get(campName) || { campaign: campName, total: 0, signed: 0 };
      campData.total += 1;
      if (isSigned) campData.signed += 1;
      campaignsMap.set(campName, campData);

      // 2. Employment
      const empName = getNormalizedEmploymentStatus(row.employment_status);
      const empData = employmentMap.get(empName) || { status: empName, total: 0, signed: 0 };
      empData.total += 1;
      if (isSigned) empData.signed += 1;
      employmentMap.set(empName, empData);

      // 3. Salary
      const salBracket = getSalaryBracket(row.salary);
      const salData = salaryMap.get(salBracket)!;
      salData.total += 1;
      if (isSigned) salData.signed += 1;
      salaryMap.set(salBracket, salData);
    }

    const campaigns = Array.from(campaignsMap.values()).sort((a, b) => b.total - a.total);
    const employment = Array.from(employmentMap.values()).sort((a, b) => b.total - a.total);
    const salaryBrackets = salaryBracketsList.map(b => salaryMap.get(b)!);

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
          quickSignedRate: signedLeads > 0 ? Math.round((quickSignedLeads / signedLeads) * 100) : 0,
          leadQualityRatio: contactedLeads > 0 ? Math.round((relevantLeads / contactedLeads) * 100) : 0
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
