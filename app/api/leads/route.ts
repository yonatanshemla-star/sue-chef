import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';
import { syncNewLeadsFromLeadim } from '@/utils/leadimSync';

export async function GET() {
  try {
    // Auto-sync any newly arrived leads directly from Lead.IM
    await syncNewLeadsFromLeadim().catch(err => console.error('LeadIM auto-sync error:', err));

    const leads = await getLeads();
    
    // Filter out campaign leads so main CRM table remains separate
    const mainCrmLeads = leads.filter(
      l => !l.id?.startsWith('cmp_') && l.source !== 'CSV Campaign' && l.campaignTag !== 'קמפיין פולואפ 2026'
    );

    // Sort leads by newest first
    const sortedLeads = mainCrmLeads.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ success: true, leads: sortedLeads });
  } catch (error: any) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
