import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const statsRes = await sql`
      SELECT 
        count(*) as total,
        count(*) FILTER (WHERE data->>'status' NOT IN ('חדש', 'לא ענה', 'אין מענה חוזר', 'מספר שגוי') OR (data->>'callCount')::int > 0 AND data->>'status' NOT IN ('חדש', 'לא ענה')) as contacted,
        count(*) FILTER (WHERE (data->>'status' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב')) OR (data->>'wasRelevant' = 'true')) as relevant,
        count(*) FILTER (WHERE (data->>'status') = 'חתם') as signed,
        count(*) FILTER (WHERE (data->>'status') = 'חתם' AND (data->>'callCount')::int > 0 AND (data->>'callCount')::int <= 3) as quick_signed,
        AVG((data->>'callCount')::int) FILTER (WHERE (data->>'status') = 'חתם' AND (data->>'callCount')::int > 0) as avg_calls_to_sign,
        AVG((data->>'callCount')::int) FILTER (WHERE (data->>'disqualificationReason') = 'אין מענה חוזר' AND (data->>'callCount')::int > 0) as avg_calls_no_answer
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
