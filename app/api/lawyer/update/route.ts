import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      id,
      status,
      generalNotes,
      liveCallNotes,
      followUpDate,
      callCount,
      lastContacted,
      disqualificationReason,
      lawyerNotes,
      caseStatus,
      profit
    } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    const leads = await getLeads();
    const lead = leads.find(l => l.id === id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Update Gili / lawyer-specific fields
    if (status !== undefined) lead.lawyerStatus = status;
    if (generalNotes !== undefined) lead.lawyerGeneralNotes = generalNotes;
    if (liveCallNotes !== undefined) lead.lawyerLiveCallNotes = liveCallNotes;
    if (followUpDate !== undefined) lead.lawyerFollowUpDate = followUpDate;
    if (callCount !== undefined) lead.lawyerCallCount = callCount;
    if (lastContacted !== undefined) lead.lawyerLastContacted = lastContacted;
    if (disqualificationReason !== undefined) lead.lawyerDisqualificationReason = disqualificationReason;
    if (lawyerNotes !== undefined) lead.lawyerNotes = lawyerNotes;
    if (caseStatus !== undefined) lead.caseStatus = caseStatus;
    if (profit !== undefined) lead.profit = typeof profit === 'number' ? profit : parseFloat(profit) || 0;

    await updateLead(lead);
    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Lawyer lead update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
