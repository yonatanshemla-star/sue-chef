import { NextRequest, NextResponse } from 'next/server';
import { 
  getCampaignSettings, 
  saveCampaignSettings, 
  getAllUniqueCampaigns, 
  isCampaignExcluded 
} from '@/utils/storage';

export async function GET() {
  try {
    const settings = await getCampaignSettings();
    const dbCampaigns = await getAllUniqueCampaigns();

    // Map existing DB campaigns
    const campaignMap = new Map<string, number>();
    for (const c of dbCampaigns) {
      if (c.campaign) {
        campaignMap.set(c.campaign, c.count);
      }
    }

    // Include custom added campaigns even if they have 0 leads in DB yet (e.g. MUZZA)
    for (const custom of settings.customCampaigns) {
      if (!campaignMap.has(custom)) {
        campaignMap.set(custom, 0);
      }
    }

    const campaigns = Array.from(campaignMap.entries()).map(([name, count]) => ({
      name,
      count,
      isExcluded: isCampaignExcluded(name, settings.excludedCampaigns),
    }));

    return NextResponse.json({
      success: true,
      excludedCampaigns: settings.excludedCampaigns,
      customCampaigns: settings.customCampaigns,
      campaigns,
    });
  } catch (error: any) {
    console.error('Failed to get campaign settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { excludedCampaigns, customCampaigns } = body;

    const updated = await saveCampaignSettings({
      excludedCampaigns: Array.isArray(excludedCampaigns) ? excludedCampaigns : undefined,
      customCampaigns: Array.isArray(customCampaigns) ? customCampaigns : undefined,
    });

    return NextResponse.json({
      success: true,
      excludedCampaigns: updated.excludedCampaigns,
      customCampaigns: updated.customCampaigns,
    });
  } catch (error: any) {
    console.error('Failed to save campaign settings:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
