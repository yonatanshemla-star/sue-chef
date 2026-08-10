import { NextResponse } from 'next/server';
import { getLeads, saveLead, deleteLead, Lead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const { leadId } = await req.json();
    if (!leadId) {
      return NextResponse.json({ success: false, error: 'Missing leadId' }, { status: 400 });
    }

    const allLeads = await getLeads();
    const targetLead = allLeads.find(l => l.id === leadId);

    if (!targetLead) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    // Prepare new lead for main CRM table
    const newMainId = `lead_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
    const originalNotesText = targetLead.generalNotes || targetLead.liveCallNotes || '';
    const formattedSummaryNotes = originalNotesText.trim() 
      ? `📝 --- הערות מקוריות מ-LEADIM ---\n${originalNotesText.trim()}`
      : 'ליד הועבר מקמפיין פולואפ 2026';

    const movedLead: Lead = {
      ...targetLead,
      id: newMainId,
      source: 'Manual',
      campaignTag: undefined, // Clear campaign tag so it shows in main CRM table
      createdAt: new Date().toISOString(), // Brand new creation timestamp!
      status: 'רלוונטי - לעקוב', // Exactly as requested
      followUpDate: new Date().toISOString().split('T')[0],
      generalNotes: 'הועבר מקמפיין פולואפ 2026',
      liveCallNotes: formattedSummaryNotes, // Put LeadIM notes inside the big summary box!
      lastContacted: new Date().toISOString(),
      statusHistory: [
        ...(targetLead.statusHistory || []),
        {
          from: targetLead.status || 'קמפיין',
          to: 'רלוונטי - לעקוב',
          timestamp: new Date().toISOString()
        }
      ]
    };

    // Save moved lead into DB as active main lead
    await saveLead(movedLead);

    // Delete or mark original cmp_ lead as transferred
    if (leadId.startsWith('cmp_')) {
      await deleteLead(leadId);
    } else {
      targetLead.campaignTag = undefined;
      targetLead.status = 'רלוונטי - לעקוב';
      targetLead.createdAt = new Date().toISOString();
      await saveLead(targetLead);
    }

    return NextResponse.json({
      success: true,
      message: `הליד ${movedLead.clientName} הועבר בהצלחה לטבלה הראשית כליד חדש בסטטוס 'רלוונטי - לעקוב'`,
      movedLead
    });
  } catch (error: any) {
    console.error('Failed to move lead to main table:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
