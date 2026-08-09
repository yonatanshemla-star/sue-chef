import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';
import fs from 'fs';

const logFile = 'webhook.log';
function logSync(msg: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [SYNC_STATUS] ${msg}`;
  console.log(logLine);
  try {
    fs.appendFileSync(logFile, `${logLine}\n`, 'utf8');
  } catch (e) {
    // Silently ignore filesystem write errors on read-only environments like Vercel
  }
}

// Map internal dashboard status strings to Lead.IM numeric status IDs
const STATUS_MAP: Record<string, string | null> = {
  'חדש': '1',
  'לא ענה': '223854',
  'לחזור אליו': '335898', // Assigned to lawyer
  'גילי צריך לדבר איתו': '335898',
  'בבדיקה עם גילי': '335898',
  'מחכה לחתימה': '335898',
  'אחר': '335898',
  'חתם': '223856',
  'רלוונטי - לעקוב': '245310',
  'במעקב': '245310',
  'ממתין לעדכון': null, // Do not change Lead.IM status when waiting for update
};

const DEFAULT_DISQUALIFIED_STATUS = '223857';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leadId, phone, clientName, leadimId, status, disqualificationReason } = body;

    logSync(`Received sync-status request: leadId=${leadId}, phone=${phone}, name=${clientName}, leadimId=${leadimId}, status=${status}, reason=${disqualificationReason}`);

    // If status is 'ממתין לעדכון', skip sync
    if (status === 'ממתין לעדכון') {
      logSync(`Skipping Lead.IM status update for status '${status}'`);
      return NextResponse.json({ success: true, skipped: true, reason: 'Status is ממתין לעדכון' });
    }

    // Determine target Lead.IM numeric status ID
    let targetStatusId: string | null = null;
    if (status === 'נגמר' || status === 'לא רלוונטי' || status === 'מספר שגוי') {
      targetStatusId = DEFAULT_DISQUALIFIED_STATUS;
    } else {
      targetStatusId = STATUS_MAP[status] !== undefined ? STATUS_MAP[status] : null;
    }

    if (!targetStatusId) {
      logSync(`No matching Lead.IM status ID for status '${status}'. Skipping.`);
      return NextResponse.json({ success: true, skipped: true, reason: `No mapping for status: ${status}` });
    }

    // Lookup lead in PostgreSQL DB if leadId provided
    let targetDbLead: any = null;
    if (leadId) {
      const allLeads = await getLeads();
      targetDbLead = allLeads.find(l => l.id === leadId);
    }

    const effectiveLeadimId = leadimId || (targetDbLead ? targetDbLead.leadimId : undefined);
    const effectivePhone = phone || (targetDbLead ? targetDbLead.phone : undefined);
    const effectiveName = clientName || (targetDbLead ? targetDbLead.clientName : undefined);

    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // Step 1: GET login page to obtain ViewState tokens
    const getRes = await fetch('https://sys.lead.im/account/login', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const initCookie = getRes.headers.get('set-cookie');
    const html = await getRes.text();

    const viewstate = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const viewstategen = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // Step 2: Login POST
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

    // Step 3: GET initial leads page to extract leads page ViewState
    const initialLeadsRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      headers: {
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const initialLeadsHtml = await initialLeadsRes.text();
    const leadsVs = initialLeadsHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const leadsVsg = initialLeadsHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    let targetLeadimId = effectiveLeadimId;

    // Step 4: If leadimId is missing, perform 2-step search (clear date filter, then search by phone)
    if (!targetLeadimId) {
      logSync(`leadimId missing, executing 2-step search for phone="${effectivePhone}", name="${effectiveName}"`);

      // 4a. Clear date range filter to 01/01/2015 00:00
      const drangeParams = new URLSearchParams();
      drangeParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
      drangeParams.append('__EVENTARGUMENT', '');
      drangeParams.append('__CMD', 'lm_sidebar_contSidebar_sideMenu_dv_ct_dvFilters_fs_lblCRange_crange_change_drange');
      drangeParams.append('__ARG', '');
      drangeParams.append('__VIEWSTATE', leadsVs);
      drangeParams.append('__VIEWSTATEGENERATOR', leadsVsg);
      drangeParams.append('lm$mpi$scms_csm_txt', 'passed');
      drangeParams.append('lm$sidebar$contSidebar$sideMenu$dv$ct$dvFilters$fs$lblCRange$crange$dvWrap$dvMenu$clndrFrom$txtDate', '01/01/2015 00:00');
      drangeParams.append('lm$sidebar$contSidebar$sideMenu$dv$ct$dvFilters$fs$ddlFilterStatuses', '');

      const drangeRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': allCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: drangeParams.toString(),
      });

      const drangeHtml = await drangeRes.text();
      const drangeVs = drangeHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
      const drangeVsg = drangeHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

      // 4b. Perform phone search using drangeVs
      const searchParams = new URLSearchParams();
      searchParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
      searchParams.append('__EVENTARGUMENT', '');
      searchParams.append('__CMD', 'lm_sidebar_contSidebar_sideMenu_dv_ct_dvFilters_fs_sbox_lm_srch');
      searchParams.append('__ARG', 'vgsrch');
      searchParams.append('__VIEWSTATE', drangeVs);
      searchParams.append('__VIEWSTATEGENERATOR', drangeVsg);
      searchParams.append('lm$mpi$scms_csm_txt', 'passed');
      if (effectivePhone) {
        searchParams.append('lm$sidebar$contSidebar$sideMenu$dv$ct$dvFilters$fs$sbox$dvBox$txtSearchFor', effectivePhone.replace(/\D/g, '').slice(-9));
        searchParams.append('lm$sidebar$contSidebar$sideMenu$dv$ct$dvFilters$fs$sbox$dvBox$dvMenu$ddlSearchIn', '223860');
      }

      const searchRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Cookie': allCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
        body: searchParams.toString(),
      });

      const searchHtml = await searchRes.text();
      const trRegex = /<tr[^>]*data-arg="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
      let trMatch;
      while ((trMatch = trRegex.exec(searchHtml)) !== null) {
        const rowLeadId = trMatch[1];
        const rowContent = trMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

        let isMatch = false;
        if (effectivePhone) {
          const cleanPhone = effectivePhone.replace(/\D/g, '').slice(-7);
          if (cleanPhone.length >= 7 && rowContent.includes(cleanPhone)) {
            isMatch = true;
          }
        }

        if (!isMatch && effectiveName && effectiveName.trim().length >= 2) {
          const nameParts = effectiveName.trim().split(/\s+/).filter((p: string) => p.length >= 2);
          if (rowContent.includes(effectiveName.trim()) || (nameParts.length > 0 && nameParts.every((p: string) => rowContent.includes(p)))) {
            isMatch = true;
          }
        }

        if (isMatch) {
          targetLeadimId = rowLeadId;
          logSync(`Successfully resolved targetLeadimId ${targetLeadimId} via 2-step search for phone="${effectivePhone}"`);
          break;
        }
      }
    }

    if (!targetLeadimId) {
      logSync(`STRICT SAFETY CHECK: Could not match exact lead in Lead.IM for phone="${effectivePhone}", clientName="${effectiveName}". Aborting sync.`);
      return NextResponse.json({ success: false, error: 'לא נמצאה התאמה מדויקת לליד ב-Lead.IM' }, { status: 404 });
    }

    // Auto-save resolved leadimId to PostgreSQL if missing
    if (leadId && targetDbLead && (!targetDbLead.leadimId || targetDbLead.leadimId !== targetLeadimId)) {
      const updatedLead = { ...targetDbLead, leadimId: targetLeadimId };
      await updateLead(updatedLead);
      logSync(`Auto-saved resolved leadimId ${targetLeadimId} to PostgreSQL for leadId ${leadId}`);
    }

    // Step 5: Post status change command to Lead.IM
    logSync(`Executing Lead.IM status change for leadimId ${targetLeadimId} to statusId ${targetStatusId}`);
    const changeStatusParams = new URLSearchParams();
    changeStatusParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    changeStatusParams.append('__EVENTARGUMENT', '');
    changeStatusParams.append('__CMD', 'leads_chngstt');
    changeStatusParams.append('__ARG', `1#${accountId}#${targetLeadimId}#${targetStatusId}`);

    const changeRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: changeStatusParams.toString(),
    });

    logSync(`Status change HTTP result: ${changeRes.status}`);
    return NextResponse.json({ success: true, leadimId: targetLeadimId, statusId: targetStatusId });
  } catch (error: any) {
    logSync(`Sync status error: ${error.message}`);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
