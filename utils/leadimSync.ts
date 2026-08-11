import { getLeads, saveLead, updateLead, getDeletedLeadimIdentifiers } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

function parseLeadimDate(dateStr?: string): string {
  if (!dateStr) return new Date().toISOString();
  // Format: "DD/MM/YYYY HH:mm" e.g. "10/08/2026 09:00"
  const parts = dateStr.match(/(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})/);
  if (!parts) return new Date().toISOString();
  const [_, day, month, year, hours, minutes] = parts;
  const date = new Date(Date.UTC(+year, +month - 1, +day, +hours - 3, +minutes)); // Israel UTC+3 offset
  return date.toISOString();
}

export async function syncNewLeadsFromLeadim(): Promise<number> {
  try {
    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // 1. Login to Lead.IM
    const getRes = await fetch('https://sys.lead.im/account/login', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
    });
    const initCookie = getRes.headers.get('set-cookie');
    const html = await getRes.text();

    const viewstate = html.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    const viewstategen = html.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

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

    // 2. Fetch leads page with cleared date range filter
    const drangeParams = new URLSearchParams();
    drangeParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    drangeParams.append('__EVENTARGUMENT', '');
    drangeParams.append('__CMD', 'lm_sidebar_contSidebar_sideMenu_dv_ct_dvFilters_fs_lblCRange_crange_change_drange');
    drangeParams.append('__ARG', '');
    drangeParams.append('__VIEWSTATE', viewstate);
    drangeParams.append('__VIEWSTATEGENERATOR', viewstategen);
    drangeParams.append('lm$mpi$scms_csm_txt', 'passed');
    drangeParams.append('lm$sidebar$contSidebar$sideMenu$dv$ct$dvFilters$fs$lblCRange$crange$dvWrap$dvMenu$clndrFrom$txtDate', '01/01/2020 00:00');
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

    const leadsHtml = await drangeRes.text();

    const dbLeads = await getLeads();
    const deleted = await getDeletedLeadimIdentifiers();

    const mainCrmLeads = dbLeads.filter(l => l.source !== 'CSV Campaign' && !l.id?.startsWith('cmp_'));
    const existingLeadimIds = new Set(mainCrmLeads.map(l => l.leadimId).filter(Boolean));
    const existingPhones = new Set(mainCrmLeads.map(l => l.phone ? l.phone.replace(/\D/g, '').slice(-9) : null).filter(Boolean));

    const trRegex = /<tr[^>]*data-arg="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let newLeadsCount = 0;

    while ((trMatch = trRegex.exec(leadsHtml)) !== null) {
      const leadimId = trMatch[1];
      const rowContent = trMatch[2];
      const rowText = rowContent.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      // Skip if active lead by leadimId or tombstoned deleted lead
      if (existingLeadimIds.has(leadimId) || deleted.leadimIds.has(leadimId)) continue;

      const tds = Array.from(rowContent.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(m => m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());

      const dateStr = tds[2] || '';
      const createdAt = parseLeadimDate(dateStr);

      const campaign = tds[4] || undefined;
      const rawName = tds[6] || '';
      const clientName = (rawName && rawName !== '&nbsp;' && rawName.trim().length > 0) ? rawName.trim() : 'ליד מ-LeadIM';

      const rawPhone = tds[7] || '';
      const phoneClean = (rawPhone && rawPhone !== '&nbsp;' && rawPhone.trim().length > 0) ? rawPhone.trim() : (rowText.match(/0\d{8,9}/)?.[0] || undefined);
      const phone = phoneClean || undefined;

      const taxTdVal = tds[12] || '';
      const hasHighTax = taxTdVal.includes('כן') ||
                         taxTdVal.includes('מעל 1,000') ||
                         taxTdVal.includes('מעל 1000') ||
                         rowText.includes('משלם מעל 1,000') ||
                         rowText.includes('מעל 1000') ||
                         (rowText.includes('מס הכנסה') && (rowText.includes('כן') || rowText.includes('מעל 1,000') || rowText.includes('מעל 1000')));

      const newLead = {
        id: uuidv4(),
        clientName: clientName,
        phone: phone || undefined,
        source: 'LeadIM' as const,
        createdAt: createdAt,
        lastContacted: null,
        status: 'חדש',
        followUpDate: '',
        generalNotes: '',
        liveCallNotes: '',
        callCount: 0,
        urgency: 'בינונית' as const,
        campaign: campaign || undefined,
        leadimId: leadimId,
        isStarred: hasHighTax ? true : undefined,
      };

      await saveLead(newLead as any);
      newLeadsCount++;
    }

    return newLeadsCount;
  } catch (err: any) {
    console.error('syncNewLeadsFromLeadim error:', err.message);
    return 0;
  }
}
