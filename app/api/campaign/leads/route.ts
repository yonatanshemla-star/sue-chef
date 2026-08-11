import { NextResponse } from 'next/server';
import { getLeads, saveLead, Lead } from '@/utils/storage';
import { sql } from '@vercel/postgres';

export async function GET() {
  try {
    const allLeads = await getLeads();

    // Collect active main CRM phones and emails
    const mainActivePhones = new Set<string>();
    const mainActiveEmails = new Set<string>();

    allLeads.forEach(l => {
      const isCampaign = l.id?.startsWith('cmp_') || l.source === 'CSV Campaign' || l.campaignTag === 'קמפיין פולואפ 2026';
      const isArchived = l.status === 'ארכיון';
      if (!isCampaign && !isArchived) {
        if (l.email && l.email.includes('@')) {
          mainActiveEmails.add(l.email.trim().toLowerCase());
        }
        if (l.phone) {
          const digits = l.phone.replace(/\D/g, '');
          if (digits.length >= 9) mainActivePhones.add(digits.slice(-9));
        }
      }
    });

    const campaignLeads = allLeads.filter(l => {
      const isCampaign = l.id?.startsWith('cmp_') || l.campaignTag === 'קמפיין פולואפ 2026' || l.source === 'CSV Campaign';
      if (!isCampaign) return false;

      // Never exclude our test lead
      if (l.id === 'cmp_test_yonatan_shemla') return true;

      // Exclude if exists in active main CRM table
      if (l.email && mainActiveEmails.has(l.email.trim().toLowerCase())) return false;
      if (l.phone) {
        const digits = l.phone.replace(/\D/g, '');
        if (digits.length >= 9 && mainActivePhones.has(digits.slice(-9))) return false;
      }

      return true;
    });

    return NextResponse.json({ success: true, leads: campaignLeads });
  } catch (error: any) {
    console.error('Failed to fetch campaign leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { leads: incomingLeads } = body;

    if (!Array.isArray(incomingLeads)) {
      return NextResponse.json({ success: false, error: 'Invalid leads array' }, { status: 400 });
    }

    let added = 0;
    for (const item of incomingLeads) {
      const id = item.id || `cmp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      const hasEmail = Boolean(item.email && item.email.includes('@'));
      
      const lead: Lead = {
        id,
        clientName: item.clientName || 'ליד קמפיין',
        phone: item.phone || '',
        email: item.email || '',
        source: 'CSV Campaign',
        campaignTag: 'קמפיין פולואפ 2026',
        createdAt: item.createdAt || new Date().toISOString(),
        lastContacted: null,
        status: item.status || 'במעקב',
        followUpDate: new Date().toISOString().split('T')[0],
        generalNotes: item.generalNotes || '',
        liveCallNotes: item.liveCallNotes || '',
        urgency: 'בינונית',
        campaignWhatsAppStatus: item.campaignWhatsAppStatus || 'pending',
        campaignEmailStatus: item.campaignEmailStatus || (hasEmail ? 'pending' : 'no_email'),
        campaignReplied: false,
      };

      await saveLead(lead);
      added++;
    }

    return NextResponse.json({ success: true, added });
  } catch (error: any) {
    console.error('Failed to save campaign leads:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
