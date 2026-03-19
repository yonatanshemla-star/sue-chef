import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    // 1. Funnel Calculation (Steps 1-4)
    // Step 1: Total Leads
    const totalLeadsRes = await sql`SELECT count(*) FROM leads`;
    const totalLeads = parseInt(totalLeadsRes.rows[0].count);

    // Step 2: Contacted (callCount > 0 OR status is not 'חדש')
    const contactedRes = await sql`
      SELECT count(*) FROM leads 
      WHERE (data->>'callCount')::int > 0 
      OR (data->>'status') != 'חדש'
    `;
    const contactedLeads = parseInt(contactedRes.rows[0].count);

    // Step 3: Relevant (wasRelevant is true)
    const relevantRes = await sql`
      SELECT count(*) FROM leads 
      WHERE (data->'wasRelevant')::boolean = true
    `;
    const relevantLeads = parseInt(relevantRes.rows[0].count);

    // Step 4: Signed (status is 'חתם')
    const signedRes = await sql`
      SELECT count(*) FROM leads 
      WHERE (data->>'status') = 'חתם'
    `;
    const signedLeads = parseInt(signedRes.rows[0].count);

    // 2. Disqualification Reasons Analysis
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

    // 3. Effort vs Value (Avg. calls to get 'Signed')
    const effortRes = await sql`
      SELECT AVG((data->>'callCount')::int) as avg_calls 
      FROM leads 
      WHERE (data->>'status') = 'חתם'
    `;
    const avgCallsPerSigned = parseFloat(effortRes.rows[0].avg_calls || "0").toFixed(1);

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
