import { NextResponse } from 'next/server';
import { getLeads, getLawyerCampaignSettings, isCampaignExcluded, Lead } from '@/utils/storage';

function parseLeadTimestamp(createdAt: string | undefined | null): number {
  if (!createdAt) return 0;
  // If DD/MM/YYYY or D/M/YYYY
  const ddmmyyyy = createdAt.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (ddmmyyyy) {
    const day = parseInt(ddmmyyyy[1], 10);
    const month = parseInt(ddmmyyyy[2], 10) - 1;
    const year = parseInt(ddmmyyyy[3], 10);
    return new Date(Date.UTC(year, month, day)).getTime();
  }
  const t = new Date(createdAt).getTime();
  return isNaN(t) ? 0 : t;
}

export async function GET() {
  try {
    const [allLeads, campaignSettings] = await Promise.all([
      getLeads(),
      getLawyerCampaignSettings()
    ]);

    // Gili starts fresh with a 100% clean-slate empty table.
    // Any historical leads before November 4, 2026 12:00 UTC are excluded,
    // so only newly arriving leads from lead.im will enter Gili's table.
    const GILI_START_TIME = new Date('2026-11-04T12:00:00.000Z').getTime();

    const activeLeads = allLeads.filter(l => {
      const leadTime = parseLeadTimestamp(l.createdAt);
      // Exclude past historical leads unless specifically assigned to lawyer
      if (leadTime < GILI_START_TIME && !l.assignedToLawyer) {
        return false;
      }
      // Filter by lawyer's campaign exclusion settings
      return !isCampaignExcluded(l.campaign, campaignSettings.excludedCampaigns);
    });

    // Map leads for Gili:
    // Strictly isolate notes - Gili NEVER sees Yonatan's internal notes or call history.
    const giliLeads = activeLeads.map(l => {
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
