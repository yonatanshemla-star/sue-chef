import { NextResponse } from 'next/server';
import { saveLead, Lead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientName, phone, generalNotes, status, campaign } = body;

    if (!clientName || !clientName.trim()) {
      return NextResponse.json({ success: false, error: 'יש להזין שם לקוח' }, { status: 400 });
    }

    const newLead: Lead = {
      id: `manual_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      clientName: clientName.trim(),
      phone: phone?.trim() || undefined,
      campaign: campaign?.trim() || 'הזנה ידנית',
      source: 'Manual' as any,
      status: status || 'חדש',
      lawyerStatus: status || 'חדש',
      assignedToLawyer: true,
      createdRole: 'lawyer',
      lawyerOnly: true,
      createdAt: new Date().toISOString(),
      lastContacted: null,
      followUpDate: '',
      generalNotes: '',
      liveCallNotes: '',
      lawyerGeneralNotes: generalNotes?.trim() || '',
      lawyerLiveCallNotes: '',
      callCount: 0,
      urgency: 'בינונית',
      isStarred: false,
    };

    await saveLead(newLead);
    return NextResponse.json({ success: true, lead: newLead });
  } catch (error: any) {
    console.error('Lawyer manual lead creation error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
