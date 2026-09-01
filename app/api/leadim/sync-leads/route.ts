import { NextResponse } from 'next/server';
import { getLeads, saveLead, Lead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

function parseHebrewDate(dateStr: string) {
  if (!dateStr) return new Date().toISOString();
  const parts = dateStr.trim().split(' ');
  if (parts.length < 2) return new Date().toISOString();

  const [d, m, y] = parts[0].split('/');
  const [hh, mm] = parts[1].split(':');

  const dateObj = new Date(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}T${hh.padStart(2, '0')}:${mm.padStart(2, '0')}:00+03:00`);
  return isNaN(dateObj.getTime()) ? new Date().toISOString() : dateObj.toISOString();
}

function normalizeStatus(leadimStatus: string) {
  // Always import new incoming leads as 'חדש'
  return 'חדש';
}

function buildNotes(item: any) {
  const notes: string[] = [];
  if (item.subCampaign && item.subCampaign !== item.campaign) {
    notes.push(`ערוץ: ${item.subCampaign}`);
  }
  if (item.remarks) {
    notes.push(`מחלה/מצב רפואי: ${item.remarks}`);
  }
  if (item.diseaseTime && item.diseaseTime !== 'בחירה') {
    notes.push(`מתי סבלתם מהמחלה: ${item.diseaseTime}`);
  }
  if (item.stoppedWorking && item.stoppedWorking !== 'בחירה' && item.stoppedWorking !== 'לא') {
    notes.push(`הפסקתי לעבוד עקב הבעיות: ${item.stoppedWorking}`);
  }
  if (item.receivesAllowance && item.receivesAllowance !== 'בחירה' && item.receivesAllowance !== 'לא') {
    notes.push(`מקבל קצבה מביטוח לאומי: ${item.receivesAllowance}`);
  }
  if (item.paysHighTax && item.paysHighTax !== 'בחירה' && item.paysHighTax !== 'לא') {
    notes.push(`משלם מעל 1,000 ₪ מס הכנסה בחודש: ${item.paysHighTax}`);
  }
  if (item.insuranceDisability && item.insuranceDisability !== 'בחירה' && item.insuranceDisability !== 'לא') {
    notes.push(`פנסיית נכות/אובדן כושר מחברת ביטוח: ${item.insuranceDisability}`);
  }
  if (item.age) {
    notes.push(`גיל: ${item.age}`);
  }
  if (item.monthlyIncome) {
    notes.push(`הכנסה חודשית: ${item.monthlyIncome}`);
  }
  if (item.howToHelp) {
    notes.push(`איך נוכל לעזור: ${item.howToHelp}`);
  }
  if (item.lastNote) {
    notes.push(`הערה: ${item.lastNote}`);
  }
  return notes.join('\n');
}

export async function POST() {
  try {
    const username = process.env.LEADIM_USERNAME || 'gili.harutz@gmail.com';
    const password = process.env.LEADIM_PASSWORD || 'Gili0394!!';
    const accountId = process.env.LEADIM_ACCOUNT_ID || '6553';

    // 1. Login
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

    // 2. GET leads page
    const initialLeadsRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      headers: {
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
    });

    const initialLeadsHtml = await initialLeadsRes.text();
    let leadsVs = initialLeadsHtml.match(/id="__VIEWSTATE"\s+value="([^"]+)"/)?.[1] || '';
    let leadsVsg = initialLeadsHtml.match(/id="__VIEWSTATEGENERATOR"\s+value="([^"]+)"/)?.[1] || '';

    // 3. Set page size to 100
    const ippParams = new URLSearchParams();
    ippParams.append('__EVENTTARGET', 'lm$mpi$scms_csm');
    ippParams.append('__EVENTARGUMENT', '');
    ippParams.append('__CMD', 'lm_toolbar_contToolbar_pgrPager_cmd');
    ippParams.append('__ARG', 'ipp100');
    ippParams.append('__VIEWSTATE', leadsVs);
    ippParams.append('__VIEWSTATEGENERATOR', leadsVsg);
    ippParams.append('lm$mpi$scms_csm_txt', 'passed');

    const currentRes = await fetch(`https://sys.lead.im/a/${accountId}/leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Cookie': allCookies,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      },
      body: ippParams.toString(),
    });

    const currentHtml = await currentRes.text();

    const dbLeads = await getLeads();
    const existingLeadimIds = new Set(dbLeads.map(l => l.leadimId).filter(Boolean));
    const existingPhones = new Set(
      dbLeads.map(l => l.phone ? l.phone.replace(/\D/g, '').slice(-9) : '').filter(p => p && p.length >= 7)
    );

    const trRegex = /<tr[^>]*data-arg="(\d+)"[^>]*>([\s\S]*?)<\/tr>/gi;
    let trMatch;
    let addedCount = 0;

    while ((trMatch = trRegex.exec(currentHtml)) !== null) {
      const leadimId = trMatch[1];
      const rowHtml = trMatch[2];
      
      const tds: string[] = [];
      const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
      let tdMatch;
      while ((tdMatch = tdRegex.exec(rowHtml)) !== null) {
        tds.push(tdMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
      }
      
      const statusMatch = rowHtml.match(/<option[^>]*selected[^>]*>([\s\S]*?)<\/option>/i);
      const selectedStatus = statusMatch ? statusMatch[1].trim() : tds[3];

      const phone = tds[7] || '';
      const cleanPhone = phone.replace(/\D/g, '').slice(-9);

      if (!existingLeadimIds.has(leadimId)) {
        const id = uuidv4();
        const createdAt = parseHebrewDate(tds[2]);
        const status = normalizeStatus(selectedStatus);
        const generalNotes = buildNotes({
          subCampaign: tds[5],
          campaign: tds[4],
          remarks: tds[8],
          stoppedWorking: tds[9],
          receivesAllowance: tds[10],
          reachedRetirement: tds[11],
          paysHighTax: tds[12],
          diseaseTime: tds[13],
          insuranceDisability: tds[14],
          age: tds[15],
          monthlyIncome: tds[16],
          howToHelp: tds[17],
          lastNote: tds[23]
        });

        const newLead: Lead = {
          id,
          clientName: tds[6] || 'ליד מ-LeadIM',
          phone,
          source: 'LeadIM',
          createdAt,
          lastContacted: null,
          status,
          followUpDate: '',
          generalNotes,
          liveCallNotes: '',
          callCount: 0,
          urgency: 'בינונית',
          campaign: tds[4] || '',
          leadimId
        };

        await saveLead(newLead);
        existingLeadimIds.add(leadimId);
        if (cleanPhone) existingPhones.add(cleanPhone);
        addedCount++;
      }
    }

    return NextResponse.json({ success: true, addedCount });
  } catch (error: any) {
    console.error('Lead.im Sync API Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
