import { NextResponse } from 'next/server';
import { 
  getLeads, 
  getCampaignSettings, 
  isCampaignExcluded,
  getCampaignAllowedCutoff,
  parseLeadTimestamp
} from '@/utils/storage';
import { syncNewLeadsFromLeadim } from '@/utils/leadimSync';

export async function GET() {
  try {
    // Auto-sync any newly arrived leads directly from Lead.IM
    await syncNewLeadsFromLeadim().catch(err => console.error('LeadIM auto-sync error:', err));

    const [leads, campaignSettings] = await Promise.all([
      getLeads(),
      getCampaignSettings()
    ]);
    
    // Filter out campaign leads, excluded campaigns, and leads created by lawyer
    const mainCrmLeads = leads.filter(l => {
      if (l.deletedByAdmin) {
        return false;
      }
      if (l.id?.startsWith('cmp_') || l.source === 'CSV Campaign' || l.campaignTag === 'קמפיין פולואפ 2026') {
        return false;
      }
      // Strictly exclude lawyer's manual leads and lawyer-assigned manual leads from admin CRM
      if (l.id?.startsWith('manual_') || l.createdRole === 'lawyer' || l.lawyerOnly || (l.assignedToLawyer && l.source === 'Manual')) {
        return false;
      }
      // If explicitly marked adminOnly, always show (e.g. intentionally imported leads)
      if (l.adminOnly) {
        return true;
      }
      // Exclude campaigns excluded by admin settings (e.g. MUZZA)
      if (isCampaignExcluded(l.campaign, campaignSettings.excludedCampaigns)) {
        return false;
      }
      // If campaign was unblocked, exclude historical leads from before the unblock timestamp
      const cutoffTime = getCampaignAllowedCutoff(l.campaign, campaignSettings.campaignAllowedFrom);
      if (cutoffTime !== null) {
        const leadTime = parseLeadTimestamp(l.createdAt);
        if (leadTime < cutoffTime) {
          return false;
        }
      }
      return true;
    });

    // Sort leads by newest first
    const sortedLeads = mainCrmLeads.sort((a, b) => {
      return parseLeadTimestamp(b.createdAt) - parseLeadTimestamp(a.createdAt);
    });

    return NextResponse.json({ success: true, leads: sortedLeads });
  } catch (error: any) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
