import { NextResponse } from 'next/server';
import { getLeads, getLawyerCampaignSettings, isCampaignExcluded, Lead } from '@/utils/storage';

export async function GET() {
  try {
    const [allLeads, campaignSettings] = await Promise.all([
      getLeads(),
      getLawyerCampaignSettings()
    ]);

    // Filter by lawyer's campaign exclusion settings
    const activeLeads = allLeads.filter(l => !isCampaignExcluded(l.campaign, campaignSettings.excludedCampaigns));

    // Map leads for Gili: if lead has red star / isStarred, strip Yonatan's past history
    const giliLeads = activeLeads.map(l => {
      const isRecurring = Boolean(l.isStarred);

      if (isRecurring) {
        // Red star lead: fresh slate for Gili, Yonatan's notes and call recordings are strictly hidden
        return {
          ...l,
          status: l.lawyerStatus || 'חדש',
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
          isStarred: false, // Don't show red star to Gili
        } as Lead;
      }

      // Standard lead
      return {
        ...l,
        status: l.lawyerStatus || l.status,
        generalNotes: l.lawyerGeneralNotes !== undefined ? l.lawyerGeneralNotes : l.generalNotes,
        liveCallNotes: l.lawyerLiveCallNotes !== undefined ? l.lawyerLiveCallNotes : l.liveCallNotes,
        followUpDate: l.lawyerFollowUpDate || l.followUpDate,
        callCount: l.lawyerCallCount !== undefined ? l.lawyerCallCount : l.callCount,
        lastContacted: l.lawyerLastContacted !== undefined ? l.lawyerLastContacted : l.lastContacted,
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
