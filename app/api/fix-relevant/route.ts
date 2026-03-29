import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// One-time fix: Mark wasRelevant=true for all leads that are currently on a relevant status
// or that have a disqualificationReason (meaning they went through the process and were evaluated).
// A lead with a disqualificationReason like "אין עילה רפואית", "מתחרים/לקח עו"ד אחר", "לא מעוניין"
// means someone actually spoke to them and evaluated their case - so they were "relevant" at some point.
// Only "אין מענה חוזר", "טעות במספר" mean they were never truly contacted/relevant.

const RELEVANT_STATUSES = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם'];
const NON_RELEVANT_DISQUALIFICATION_REASONS = ['אין מענה חוזר', 'טעות במספר'];

export async function GET() {
  try {
    // First, let's see the current state
    const beforeRes = await sql`
      SELECT 
        data->>'status' as status,
        data->>'wasRelevant' as was_relevant,
        data->>'disqualificationReason' as dq_reason,
        data->>'clientName' as name,
        id
      FROM leads
      ORDER BY created_at DESC
    `;

    const allLeads = beforeRes.rows;
    let fixedCount = 0;
    const fixedLeads: string[] = [];

    for (const lead of allLeads) {
      const status = lead.status || '';
      const wasRelevant = lead.was_relevant === 'true';
      const dqReason = lead.dq_reason || '';
      
      // Skip if already marked
      if (wasRelevant) continue;

      // Should be marked as relevant if:
      // 1. Current status is one of the relevant ones
      // 2. Has a disqualification reason that implies they were evaluated (not just "no answer" or "wrong number")
      const isCurrentlyRelevant = RELEVANT_STATUSES.includes(status);
      const wasEvaluated = dqReason && !NON_RELEVANT_DISQUALIFICATION_REASONS.includes(dqReason);

      if (isCurrentlyRelevant || wasEvaluated) {
        // Update the lead's data to include wasRelevant: true
        const updateRes = await sql`
          UPDATE leads 
          SET data = data || '{"wasRelevant": true}'::jsonb
          WHERE id = ${lead.id}
        `;
        fixedCount++;
        fixedLeads.push(`${lead.name || 'ללא שם'} (${status}) ${dqReason ? `[סיבת פסילה: ${dqReason}]` : ''}`);
      }
    }

    // Now get the updated count
    const afterRes = await sql`
      SELECT 
        count(*) FILTER (WHERE (data->>'wasRelevant')::boolean = true OR data->>'status' IN ('גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם')) as relevant_count
      FROM leads
    `;

    return NextResponse.json({
      success: true,
      message: `תוקנו ${fixedCount} לידים`,
      fixedLeads,
      totalRelevantNow: parseInt(afterRes.rows[0].relevant_count),
      allLeadsSummary: allLeads.map(l => ({
        name: l.name,
        status: l.status,
        wasRelevant: l.was_relevant,
        dqReason: l.dq_reason
      }))
    });

  } catch (error: any) {
    console.error("Fix relevant error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
