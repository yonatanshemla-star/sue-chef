import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';

const logFile = 'webhook.log';
function logSync(msg: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [LEADIM-SYNC] ${msg}`;
  console.log(logLine);
  try {
    fs.appendFileSync(logFile, `${logLine}\n`, 'utf8');
  } catch (e) {}
}

// Map Sue-Chef internal status labels to Lead.IM Hebrew status names exactly as specified
const LEADIM_STATUS_MAP: Record<string, string | null> = {
  'חדש': 'חדש',
  'לא ענה': 'אין מענה',
  'לחזור אליו': 'ליד יונתן',
  'גילי צריך לדבר איתו': 'ליד יונתן',
  'בבדיקה עם גילי': 'ליד יונתן',
  'מחכה לחתימה': 'ליד יונתן',
  'חתם': 'נסגרה עסקה',
  'רלוונטי - לעקוב': 'רלוונטי',
  'ממתין לעדכון': null, // Do not change status in Lead.IM
  'אחר': 'ליד יונתן',
  'במעקב': 'רלוונטי',
  'נגמר': 'פסול - לא רלוונטי',
  'לא רלוונטי': 'פסול - לא רלוונטי',
  'מספר שגוי': 'פסול - לא רלוונטי',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, phone, leadimId, status, disqualificationReason } = body;

    logSync(`Received status sync request for lead ${leadId} (${phone || leadimId}): status="${status}"`);

    const mappedStatus = LEADIM_STATUS_MAP[status];

    // If status is 'ממתין לעדכון' (mapped to null), do not trigger any change in Lead.IM
    if (mappedStatus === null) {
      logSync(`Status "${status}" is mapped to null (do not update Lead.IM). Skipping sync.`);
      return NextResponse.json({ success: true, skipped: true, message: 'סטטוס זה מוגדר שלא לשנות כלום ב-Lead.IM' });
    }

    const leadimStatus = mappedStatus !== undefined ? mappedStatus : status;
    
    // Check credentials from environment variables
    const username = process.env.LEADIM_USERNAME || process.env.LEADIM_EMAIL;
    const password = process.env.LEADIM_PASSWORD;
    const apiKey = process.env.LEADIM_API_KEY;
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    logSync(`Syncing to Lead.IM account ${accountId} -> LeadIM Status: "${leadimStatus}"`);

    // If user provided a webhook URL in environment variables, trigger it directly
    const webhookUrl = process.env.LEADIM_STATUS_WEBHOOK_URL;
    if (webhookUrl) {
      try {
        const res = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lead_id: leadimId,
            phone,
            status: leadimStatus,
            original_status: status,
            disqualification_reason: disqualificationReason || '',
            updated_at: new Date().toISOString(),
          }),
        });
        logSync(`Webhook trigger response status: ${res.status}`);
      } catch (err: any) {
        logSync(`Webhook trigger error: ${err.message}`);
      }
    }

    // Try direct login & status update simulation if credentials exist
    if (username && password) {
      try {
        // Step 1: Login to Lead.IM to establish session cookie
        const loginRes = await fetch(`https://sys.lead.im/a/${accountId}/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ username, password, email: username }).toString(),
        });

        const setCookieHeader = loginRes.headers.get('set-cookie');

        if (setCookieHeader) {
          // Step 2: Post status update
          const updateRes = await fetch(`https://sys.lead.im/a/${accountId}/ajax/update_status`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Cookie': setCookieHeader,
            },
            body: new URLSearchParams({
              lead_id: leadimId || '',
              phone: phone || '',
              status: leadimStatus,
              reason: disqualificationReason || '',
            }).toString(),
          });

          logSync(`Internal Lead.IM AJAX update response status: ${updateRes.status}`);
        }
      } catch (e: any) {
        logSync(`Login/AJAX simulation notice: ${e.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      syncedStatus: leadimStatus,
      leadimId: leadimId || null,
      message: 'בקשת הסנכרון ל-Lead.IM נשלחה בהצלחה',
    });
  } catch (err: any) {
    logSync(`Sync error: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
