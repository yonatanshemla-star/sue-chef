import { NextResponse } from 'next/server';
import { 
  getLeads, 
  getLawyerCampaignSettings, 
  isCampaignExcluded, 
  getCampaignAllowedCutoff, 
  parseLeadTimestamp, 
  Lead 
} from '@/utils/storage';
import { syncNewLeadsFromLeadim } from '@/utils/leadimSync';

export async function GET() {
  try {
    // Non-blocking auto-sync of newest leads directly from Lead.IM
    await syncNewLeadsFromLeadim().catch(err => console.error('LeadIM auto-sync error in lawyer route:', err));

    const [allLeads, campaignSettings] = await Promise.all([
      getLeads(),
      getLawyerCampaignSettings()
    ]);

    // Gili starts fresh with a 100% clean-slate empty table.
    // Any historical leads before November 4, 2026 12:00 UTC are excluded,
    // so only newly arriving leads from lead.im will enter Gili's table.
    const GILI_START_TIME = new Date('2026-11-04T12:00:00.000Z').getTime();

    const activeLeads = allLeads.filter(l => {
      if (l.deletedByLawyer) {
        return false;
      }
      // If created by lawyer, ALWAYS show to lawyer
      if (l.createdRole === 'lawyer' || l.id?.startsWith('manual_') || l.lawyerOnly) {
        return true;
      }

      // If marked adminOnly or created by admin, NEVER show to lawyer
      if (l.adminOnly || l.createdRole === 'admin' || (l.source === 'Manual' && !l.assignedToLawyer)) {
        return false;
      }

      const leadTime = parseLeadTimestamp(l.createdAt);
      // Exclude past historical leads unless specifically assigned to lawyer
      if (leadTime < GILI_START_TIME && !l.assignedToLawyer) {
        return false;
      }
      // Filter by lawyer's campaign exclusion settings
      if (isCampaignExcluded(l.campaign, campaignSettings.excludedCampaigns)) {
        return false;
      }
      // If campaign was unblocked, exclude leads created before unblock
      const cutoffTime = getCampaignAllowedCutoff(l.campaign, campaignSettings.campaignAllowedFrom);
      if (cutoffTime !== null && !l.assignedToLawyer) {
        if (leadTime < cutoffTime) {
          return false;
        }
      }
      return true;
    });

    // Map leads for Gili:
    // Strictly isolate notes - Gili NEVER sees Yonatan's internal notes or call history.
    const giliLeads = activeLeads.map(l => {
      return {
        ...l,
        status: l.lawyerStatus || l.status || 'חדש',
        generalNotes: l.lawyerGeneralNotes || '',
        liveCallNotes: l.lawyerLiveCallNotes || '',
        followUpDate: l.lawyerFollowUpDate || '',
        callCount: l.lawyerCallCount || 0,
        lastContacted: l.lawyerLastContacted || null,
        disqualificationReason: l.lawyerDisqualificationReason || '',
        recordingUrl: undefined,
        transcription: undefined,
        fullTranscription: undefined,
        aiSummary: undefined,
        sentiment: undefined,
        isStarred: false,
      } as Lead;
    });

    return NextResponse.json({
      success: true,
      leads: giliLeads,
      excludedCampaigns: campaignSettings.excludedCampaigns,
      customCampaigns: campaignSettings.customCampaigns,
    });
  } catch (error: any) {
    console.error('Lawyer leads fetch error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
