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

// Exact Lead.IM internal status numeric IDs mapped from Sue-Chef statuses
const LEADIM_NUMERIC_STATUS_MAP: Record<string, string | null> = {
  'חדש': '1',                  // חדש
  'לא ענה': '223854',           // אין מענה
  'לחזור אליו': '335898',        // ליד יונתן
  'גילי צריך לדבר איתו': '335898', // ליד יונתן
  'בבדיקה עם גילי': '335898',    // ליד יונתן
  'מחכה לחתימה': '335898',       // ליד יונתן
  'חתם': '223856',               // נסגרה עיסקה
  'רלוונטי - לעקוב': '245310',   // רלוונטי
  'ממתין לעדכון': null,           // אל תשנה כלום
  'אחר': '335898',               // ליד יונתן
  'במעקב': '245310',             // רלוונטי
  'נגמר': '223857',              // נפסל - לא רלוונטי
  'לא רלוונטי': '223857',        // נפסל - לא רלוונטי
  'מספר שגוי': '223857',         // נפסל - לא רלוונטי
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leadId, phone, leadimId, status } = body;

    logSync(`Received status sync request for lead ${leadId} (leadimId=${leadimId}, phone=${phone}): status="${status}"`);

    const numericStatusId = LEADIM_NUMERIC_STATUS_MAP[status];

    if (numericStatusId === null) {
      logSync(`Status "${status}" mapped to null (do not change Lead.IM). Skipping.`);
      return NextResponse.json({ success: true, skipped: true, message: 'סטטוס זה מוגדר שלא לשנות כלום ב-Lead.IM' });
    }

    if (!numericStatusId) {
      logSync(`Status "${status}" has no numeric Lead.IM mapping. Skipping.`);
      return NextResponse.json({ success: false, error: 'אין מיפוי סטטוס מתאים ל-Lead.IM' });
    }

    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // Step 1: GET login page & extract initial cookies & ViewState
    const getRes = await fetch('https://sys.lead.im/account/login', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const initCookie = getRes.headers.get('set-cookie');
    const html = await getRes.text();

    const viewstate = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const viewstategen = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // Step 2: Login via ASP.NET WebForms scms command
    const loginParams = new URLSearchParams();
    loginParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    loginParams.append('__EVENTARGUMENT', '');
    loginParams.append('__CMD', 'login');
    loginParams.append('__ARG', '');
    loginParams.append('__VIEWSTATE', viewstate);
    loginParams.append('__VIEWSTATEGENERATOR', viewstategen);
    loginParams.append('lm$mpi$scms_csm_txt', 'passed');
    loginParams.append('lm$contMain$txtUser', username);
    loginParams.append('lm$contMain$txtPass', password);

    const loginRes = await fetch('https://sys.lead.im/account/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': initCookie || '',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: loginParams.toString(),
      redirect: 'manual',
    });

    const authCookie = loginRes.headers.get('set-cookie');
    const allCookies = [initCookie, authCookie].filter(Boolean).map(c => c!.split(';')[0]).join('; ');

    // Step 3: GET leads page to get active ViewState
    const leadsPageRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      headers: {
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const leadsHtml = await leadsPageRes.text();
    const leadsViewstate = leadsHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const leadsViewstategen = leadsHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // Step 4: Resolve target leadimId if not provided (by searching by phone)
    let targetLeadimId = leadimId;
    if (!targetLeadimId && phone) {
      const cleanPhone = phone.replace(/\D/g, '').slice(-9);
      const match = leadsHtml.match(new RegExp(`1#${accountId}#(\\d+)#[^"']*${cleanPhone.slice(-7)}`, 'i')) ||
                    leadsHtml.match(new RegExp(`1#${accountId}#(\\d+)#`, 'i'));
      if (match) {
        targetLeadimId = match[1];
      }
    }

    if (!targetLeadimId) {
      logSync(`Could not resolve Lead.IM lead ID for phone ${phone}`);
      return NextResponse.json({ success: false, error: 'לא נמצא מזהה ליד ב-Lead.IM' });
    }

    // Step 5: Execute leads_chngstt command
    logSync(`Updating Lead.IM lead ${targetLeadimId} to numeric status ID ${numericStatusId}...`);

    const updateParams = new URLSearchParams();
    updateParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    updateParams.append('__EVENTARGUMENT', '');
    updateParams.append('__CMD', 'leads_chngstt');
    updateParams.append('__ARG', `1#${accountId}#${targetLeadimId}#${numericStatusId}`);
    updateParams.append('__VIEWSTATE', leadsViewstate);
    updateParams.append('__VIEWSTATEGENERATOR', leadsViewstategen);
    updateParams.append('lm$mpi$scms_csm_txt', 'passed');

    const updateRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: updateParams.toString(),
    });

    logSync(`Lead.IM update status response: ${updateRes.status}`);

    return NextResponse.json({
      success: true,
      numericStatusId,
      leadimId: targetLeadimId,
      message: 'הסטטוס ב-Lead.IM עודכן בהצלחה',
    });
  } catch (err: any) {
    logSync(`Sync error: ${err.message}`);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
