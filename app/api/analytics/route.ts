import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const statsRes = await sql`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE COALESCE((data->>'callCount')::int, 0) > 0 OR (data->>'status') != 'חדש') as contacted,
        count(*) FILTER (WHERE data->>'status' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'במעקב', 'חתם')) as relevant,
        count(*) FILTER (WHERE (data->>'status') = 'חתם') as signed,
        count(*) FILTER (WHERE (data->>'status') = 'חתם' AND COALESCE((data->>'callCount')::int, 0) <= 3) as quick_signed,
        AVG(COALESCE((data->>'callCount')::int, 0)) FILTER (WHERE (data->>'status') = 'חתם') as avg_calls_to_sign,
        AVG(COALESCE((data->>'callCount')::int, 0)) FILTER (WHERE (data->>'disqualificationReason') = 'אין מענה חוזר') as avg_calls_no_answer
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
          signed: signedLeads
        },
        disqualificationReasons,
        insights: {
          avgCallsPerSigned,
          avgCallsNoAnswer,
          quickSignedRate: signedLeads > 0 ? Math.round((quickSignedLeads / signedLeads) * 100) : 0,
          leadQualityRatio: contactedLeads > 0 ? Math.round((relevantLeads / contactedLeads) * 100) : 0
        }
      }
    });

  } catch (error) {
    console.error("Error in analytics API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch analytics" }, { status: 500 });
  }
}
