import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // Combined Query for Funnel and Effort Metrics
    const statsRes = await sql`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE (data->>'callCount')::int > 0 OR (data->>'status') != 'חדש') as contacted,
        count(*) FILTER (WHERE (data->'wasRelevant')::boolean = true) as relevant,
        count(*) FILTER (WHERE (data->>'status') = 'חתם') as signed,
        AVG((data->>'callCount')::int) FILTER (WHERE (data->>'status') = 'חתם') as avg_calls
      FROM leads
    `;
    
    const stats = statsRes.rows[0];
    const totalLeads = parseInt(stats.total);
    const contactedLeads = parseInt(stats.contacted);
    const relevantLeads = parseInt(stats.relevant);
    const signedLeads = parseInt(stats.signed);
    const avgCallsPerSigned = parseFloat(stats.avg_calls || "0").toFixed(1);

    // 2. Disqualification Reasons Analysis (Keep separate for clarity/grouping)
    const disqualificationRes = await sql`
      SELECT data->>'disqualificationReason' as reason, count(*) as count
      FROM leads 
      WHERE (data->>'disqualificationReason') IS NOT NULL
      GROUP BY data->>'disqualificationReason'
      ORDER BY count DESC
    `;
    const disqualificationReasons = disqualificationRes.rows.map(r => ({
      reason: r.reason,
      count: parseInt(r.count)
    }));

    return NextResponse.json({
      success: true,
      data: {
        funnel: {
          total: totalLeads,
          contacted: contactedLeads,
          relevant: relevantLeads,
          signed: signedLeads,
          rates: {
            contactedToRelevant: contactedLeads > 0 ? ((relevantLeads / contactedLeads) * 100).toFixed(1) : "0",
            relevantToSigned: relevantLeads > 0 ? ((signedLeads / relevantLeads) * 100).toFixed(1) : "0",
            totalToSigned: totalLeads > 0 ? ((signedLeads / totalLeads) * 100).toFixed(1) : "0"
          }
        },
        disqualificationReasons,
        effortMetrics: {
          avgCallsPerSigned
        }
      }
    });

  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
