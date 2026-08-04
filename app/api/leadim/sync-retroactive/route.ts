import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';
import fs from 'fs';

const logFile = 'webhook.log';
function logSync(msg: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [LEADIM-RETRO] ${msg}`;
  console.log(logLine);
  try {
    fs.appendFileSync(logFile, `${logLine}\n`, 'utf8');
  } catch (e) {}
}

const LEADIM_STATUS_MAP: Record<string, string | null> = {
  'חדש': 'חדש',
  'לא ענה': 'אין מענה',
  'לחזור אליו': 'ליד יונתן',
  'גילי צריך לדבר איתו': 'ליד יונתן',
  'בבדיקה עם גילי': 'ליד יונתן',
  'מחכה לחתימה': 'ליד יונתן',
  'חתם': 'נסגרה עסקה',
  'רלוונטי - לעקוב': 'רלוונטי',
  'ממתין לעדכון': null,
  'אחר': 'ליד יונתן',
  'במעקב': 'רלוונטי',
  'נגמר': 'פסול - לא רלוונטי',
  'לא רלוונטי': 'פסול - לא רלוונטי',
  'מספר שגוי': 'פסול - לא רלוונטי',
};

export async function GET(req: NextRequest) {
  try {
    const leads = await getLeads();
    logSync(`Starting retroactive sync for ${leads.length} total leads...`);

    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // Step 1: Login to Lead.IM
    const loginRes = await fetch(`https://sys.lead.im/a/${accountId}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ username, password, email: username }).toString(),
    });

    const setCookieHeader = loginRes.headers.get('set-cookie');
    if (!setCookieHeader) {
      logSync('Failed to get session cookie from Lead.IM');
      return NextResponse.json({ success: false, error: 'Lead.IM login failed' });
    }
    logSync('Successfully logged into Lead.IM!');

    // Filter leads with status 'נגמר', 'לא רלוונטי', 'מספר שגוי'
    const targetLeads = leads.filter(l => l.status === 'נגמר' || l.status === 'לא רלוונטי' || l.status === 'מספר שגוי');
    logSync(`Found ${targetLeads.length} leads with archived/disqualified status to sync retroactively.`);

    let updatedCount = 0;
    for (const lead of targetLeads) {
      const targetLeadimStatus = LEADIM_STATUS_MAP[lead.status];
      if (!targetLeadimStatus) continue;

      logSync(`Syncing lead: ${lead.clientName} (${lead.phone || lead.leadimId}) -> ${targetLeadimStatus}`);
      try {
        const updateRes = await fetch(`https://sys.lead.im/a/${accountId}/ajax/update_status`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Cookie': setCookieHeader,
          },
          body: new URLSearchParams({
            lead_id: lead.leadimId || '',
            phone: lead.phone || '',
            status: targetLeadimStatus,
            reason: lead.disqualificationReason || '',
          }).toString(),
        });
        logSync(`Updated ${lead.clientName}: status code ${updateRes.status}`);
        updatedCount++;
      } catch (err: any) {
        logSync(`Error updating ${lead.clientName}: ${err.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      totalLeadsChecked: leads.length,
      archivedLeadsSynced: updatedCount,
      message: `סונכרנו בדיעבד ${updatedCount} לידים שהיו במצב נגמר / לא רלוונטי`,
    });
  } catch (err: any) {
    logSync(`Retroactive sync error: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
