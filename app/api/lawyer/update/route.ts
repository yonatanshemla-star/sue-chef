import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const { id, lawyerNotes, caseStatus, profit } = await req.json();
    
    if (!id) {
      return NextResponse.json({ error: 'Missing lead id' }, { status: 400 });
    }

    const leads = await getLeads();
    const lead = leads.find(l => l.id === id);

    if (!lead) {
      return NextResponse.json({ error: 'Lead not found' }, { status: 404 });
    }

    // Update only lawyer-specific fields
    if (lawyerNotes !== undefined) lead.lawyerNotes = lawyerNotes;
    if (caseStatus !== undefined) lead.caseStatus = caseStatus;
    if (profit !== undefined) lead.profit = typeof profit === 'number' ? profit : parseFloat(profit) || 0;

    await updateLead(lead);
    return NextResponse.json({ success: true, lead });
  } catch (error: any) {
    console.error('Lawyer update error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
