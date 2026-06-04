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
        signaturesTimeSeries
      }
    });

  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
