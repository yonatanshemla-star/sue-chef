import { NextResponse } from 'next/server';
import { getLeads, updateLead, Lead } from '@/utils/storage';

type LeadimAction =
  | { type: 'delete'; reason: string }
  | { type: 'update'; targetStatus: string; allowedExisting?: string[] }
  | { type: 'ignore' };

const FOLLOW_UP_GROUP = [
  'לחזור אליו',
  'גילי צריך לדבר איתו',
  'בבדיקה עם גילי',
  'מחכה לחתימה',
  'אחר',
];

function extractSelectedStatus(rowHtml: string, fallbackText?: string): { statusId: string; statusText: string } {
  const optionRegex = /<option\b([^>]*)>([\s\S]*?)<\/option>/gi;
  let match: RegExpExecArray | null;
  while ((match = optionRegex.exec(rowHtml)) !== null) {
    const attrs = match[1];
    if (/\bselected\b/i.test(attrs)) {
      const valueMatch = attrs.match(/\bvalue=["']([^"']*)["']/i);
      const statusId = valueMatch ? valueMatch[1].trim() : '';
      const statusText = match[2].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
      return { statusId, statusText };
    }
  }
  return { statusId: '', statusText: (fallbackText || '').trim() };
}

function classifyLeadimStatus(statusId: string, statusText: string): LeadimAction {
  const text = statusText.trim();

  // Auto-disqualify and delete: חתם, לא רלוונטי (או פסול/נגמר), במעקב
  if (statusId === '223856' || text.includes('חתם')) {
    return { type: 'delete', reason: text || 'חתם' };
  }
  if (
    statusId === '223857' ||
    text.includes('לא רלוונטי') ||
    text.includes('פסול') ||
    text.includes('נגמר') ||
    text.includes('בוטל')
  ) {
    return { type: 'delete', reason: text || 'לא רלוונטי' };
  }
  if (statusId === '245310' || text.includes('מעקב')) {
    return { type: 'delete', reason: text || 'במעקב' };
  }

  // Sync non-deleted statuses
  if (statusId === '223854' || text.includes('לא ענה')) {
    return { type: 'update', targetStatus: 'לא ענה' };
  }
  if (statusId === '335898' || text.includes('עו"ד') || text.includes('עורך דין') || text.includes('לחזור')) {
    return {
      type: 'update',
      targetStatus: 'לחזור אליו',
      allowedExisting: FOLLOW_UP_GROUP,
    };
  }
  if (statusId === '1' || text === 'חדש') {
    return { type: 'ignore' };
  }

  return { type: 'ignore' };
}

async function loginToLeadim(username: string, password: string): Promise<string> {
  const getRes = await fetch('https://sys.lead.im/account/login', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
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
  return [initCookie, authCookie]
    .filter(Boolean)
    .map((c) => c!.split(';')[0])
    .join('; ');
}

export async function POST() {
  try {
    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    const allCookies = await loginToLeadim(username, password);

    // 1. Load initial leads page to get ViewState
    const leadsPageRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      headers: {
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    let currentHtml = await leadsPageRes.text();
    let currentVs = currentHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    let currentVsg = currentHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // 2. Open date range to all leads
    const drangeParams = new URLSearchParams();
    drangeParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    drangeParams.append('__EVENTARGUMENT', '');
    drangeParams.append('__CMD', 'lm_sidebar_contSidebar_sideMenu_dv_ct_dvFilters_fs_lblCRange_crange_change_drange');
    drangeParams.append('__ARG', 'allleads');
    drangeParams.append('__VIEWSTATE', currentVs);
    drangeParams.append('__VIEWSTATEGENERATOR', currentVsg);
    drangeParams.append('lm$mpi$scms_csm_txt', 'passed');

    const drangeRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: drangeParams.toString(),
    });

    currentHtml = await drangeRes.text();
    currentVs = currentHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || currentVs;
    currentVsg = currentHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || currentVsg;

    // 3. Set page size to 100 (scans the latest 100 leads)
    const ippParams = new URLSearchParams();
    ippParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    ippParams.append('__EVENTARGUMENT', '');
    ippParams.append('__CMD', 'lm_toolbar_contToolbar_pgrPager_cmd');
    ippParams.append('__ARG', 'ipp100');
    ippParams.append('__VIEWSTATE', currentVs);
    ippParams.append('__VIEWSTATEGENERATOR', currentVsg);
    ippParams.append('lm$mpi$scms_csm_txt', 'passed');

    const ippRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: ippParams.toString(),
    });

    const pageHtml = await ippRes.text();

    // Load DB leads currently visible in Admin CRM and index by leadimId and normalized 9-digit phone
    const dbLeads = await getLeads();
    const mainCrmLeads = dbLeads.filter(
      (l) =>
        l.source !== 'CSV Campaign' &&
        !l.id?.startsWith('cmp_') &&
        !l.id?.startsWith('manual_') &&
        l.createdRole !== 'lawyer' &&
        !l.lawyerOnly
    );

    const byLeadimId = new Map<string, Lead>();
    const byPhone = new Map<string, Lead>();
    for (const lead of mainCrmLeads) {
      if (lead.leadimId) {
        byLeadimId.set(lead.leadimId, lead);
      }
      if (lead.phone) {
        const norm = lead.phone.replace(/\D/g, '').slice(-9);
        if (norm.length >= 7 && !byPhone.has(norm)) {
          byPhone.set(norm, lead);
        }
      }
    }

    const trRegex = /<tr[^>]*data-arg="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch: RegExpExecArray | null;

    let scannedCount = 0;
    let deletedCount = 0;
    let updatedCount = 0;
    let unchangedCount = 0;
    const deletedNames: string[] = [];
    const updatedNames: string[] = [];

    while ((trMatch = trRegex.exec(pageHtml)) !== null) {
      scannedCount++;
      const leadimId = trMatch[1];
      const rowHtml = trMatch[2];

      const tds = Array.from(rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map((m) =>
        m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      );
      const rowText = rowHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

      const rawPhone = tds[7] || '';
      const phoneClean =
        rawPhone && rawPhone !== '&nbsp;' ? rawPhone.trim() : rowText.match(/0\d{8,9}/)?.[0] || '';
      const normPhone = phoneClean.replace(/\D/g, '').slice(-9);

      const dbLead = byLeadimId.get(leadimId) || (normPhone.length >= 7 ? byPhone.get(normPhone) : undefined);
      if (!dbLead) continue;

      const { statusId, statusText } = extractSelectedStatus(rowHtml, tds[3]);
      const action = classifyLeadimStatus(statusId, statusText);

      if (action.type === 'delete') {
        // Hide from Admin CRM only (lawyerOnly: true) so Gili's lawyer dashboard is untouched
        await updateLead({
          ...dbLead,
          leadimId: dbLead.leadimId || leadimId,
          lawyerOnly: true,
        });
        deletedCount++;
        deletedNames.push(`${dbLead.clientName} (${action.reason})`);
        byLeadimId.delete(leadimId);
        if (normPhone) byPhone.delete(normPhone);
      } else if (action.type === 'update') {
        const alreadyInGroup =
          dbLead.status === action.targetStatus ||
          (action.allowedExisting ? action.allowedExisting.includes(dbLead.status) : false);

        if (alreadyInGroup) {
          unchangedCount++;
          continue;
        }

        await updateLead({
          ...dbLead,
          leadimId: dbLead.leadimId || leadimId,
          status: action.targetStatus,
        });
        updatedCount++;
        updatedNames.push(`${dbLead.clientName} (${dbLead.status} -> ${action.targetStatus})`);
      } else {
        unchangedCount++;
      }
    }

    return NextResponse.json({
      success: true,
      scannedCount,
      deletedCount,
      updatedCount,
      unchangedCount,
      deletedNames,
      updatedNames,
    });
  } catch (error: any) {
    console.error('pull-statuses error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'שגיאה בסנכרון סטטוסים מ-Lead.IM' },
      { status: 500 }
    );
  }
}
