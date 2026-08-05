import { NextRequest, NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

export async function GET(req: NextRequest) {
  try {
    const leads = await getLeads();

    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // 1. GET login page
    const getRes = await fetch('https://sys.lead.im/account/login', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const initCookie = getRes.headers.get('set-cookie');
    const html = await getRes.text();

    const viewstate = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const viewstategen = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // 2. Login
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

    // Filter untouched leads (0 calls, no status history)
    const untouchedLeads = leads.filter(l => {
      const hasCalls = Boolean(l.callCount && l.callCount > 0);
      const hasHistory = l.statusHistory && l.statusHistory.length > 0;
      return !hasCalls && !hasHistory;
    });

    console.log(`[RESTORE] Found ${untouchedLeads.length} untouched leads out of ${leads.length} total leads.`);

    let restoredCount = 0;
    const restoredNames: string[] = [];

    for (const lead of untouchedLeads) {
      let targetLeadimId = lead.leadimId;
      let searchQuery = '';
      if (!targetLeadimId) {
        if (lead.phone) searchQuery = lead.phone.replace(/\D/g, '').slice(-9);
        else if (lead.clientName) searchQuery = lead.clientName;
      }

      const searchUrl = searchQuery 
        ? `https://sys.lead.im/a/${accountId}/leads?s=${encodeURIComponent(searchQuery)}`
        : `https://sys.lead.im/a/${accountId}/leads`;

      const searchPageRes = await fetch(searchUrl, {
        headers: {
          'Cookie': allCookies,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        },
      });

      const searchHtml = await searchPageRes.text();
      const searchViewstate = searchHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
      const searchViewstategen = searchHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

      if (!targetLeadimId) {
        const trRegex = /<tr[^>]*data-arg="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
        let trMatch;
        while ((trMatch = trRegex.exec(searchHtml)) !== null) {
          const rowLeadId = trMatch[1];
          const rowContent = trMatch[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

          let isMatch = false;
          if (lead.phone) {
            const cleanPhone = lead.phone.replace(/\D/g, '').slice(-7);
            if (cleanPhone.length >= 7 && rowContent.includes(cleanPhone)) {
              isMatch = true;
            }
          }

          if (isMatch) {
            targetLeadimId = rowLeadId;
            break;
          }
        }
      }

      if (!targetLeadimId) continue;

      console.log(`[RESTORE] Restoring lead in Lead.IM: "${lead.clientName}" (${targetLeadimId}) -> ID 1 ("חדש")...`);

      const updateParams = new URLSearchParams();
      updateParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
      updateParams.append('__EVENTARGUMENT', '');
      updateParams.append('__CMD', 'leads_chngstt');
      updateParams.append('__ARG', `1#${accountId}#${targetLeadimId}#1`); // 1 = חדש
      updateParams.append('__VIEWSTATE', searchViewstate);
      updateParams.append('__VIEWSTATEGENERATOR', searchViewstategen);
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

      if (updateRes.status === 200) {
        restoredCount++;
        restoredNames.push(lead.clientName || lead.phone || 'ללא שם');
      }
    }

    return NextResponse.json({
      success: true,
      totalUntouchedLeads: untouchedLeads.length,
      restoredCount,
      restoredNames,
      message: `שוחזרו בהצלחה ${restoredCount} לידים שלא חויגו/טופלו חזרה לסטטוס "חדש" ב-Lead.IM`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
