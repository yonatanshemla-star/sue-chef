import { NextResponse } from 'next/server';
import { getLeads, updateLead, Lead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const { messageTemplate, targetLeadId } = await req.json();

    const leads = await getLeads();
    const campaignLeads = leads.filter(
      l => l.campaignTag === 'קמפיין פולואפ 2026' || l.source === 'CSV Campaign'
    );

    // If targetLeadId specified, send to just that one lead; otherwise send to next pending lead
    const leadsToSend = targetLeadId 
      ? campaignLeads.filter(l => l.id === targetLeadId)
      : campaignLeads.filter(l => l.campaignWhatsAppStatus === 'pending' || !l.campaignWhatsAppStatus);

    if (leadsToSend.length === 0) {
      return NextResponse.json({ success: true, message: 'אין לידים להמתנה בשליחת WhatsApp', processedCount: 0 });
    }

    const lead = leadsToSend[0];
    const defaultWaMessage = `שלום, 
בעבר היית בקשר עם המשרד עו"ד HBA 
לגבי זכויותיך הרפואיות, 
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך או בטיפול במקרה
אם הנושא עדיין רלוונטי עבורך, ניתן להשיב להודעה זו ונציג מהמשרד יחזור אליך בהקדם.
תודה`;
    const messageToSend = messageTemplate ? messageTemplate.trim() : defaultWaMessage;

    // Set status to 'queued' and store message in DB queue
    lead.campaignWhatsAppStatus = 'queued';
    lead.campaignWhatsAppQueue = {
      messageTemplate: messageToSend,
      queuedAt: new Date().toISOString()
    };
    await updateLead(lead);

    // Wait up to 5 seconds to verify bot picked up and sent the message
    for (let i = 0; i < 10; i++) {
      await new Promise(r => setTimeout(r, 500));
      const freshLeads = await getLeads();
      const freshLead = freshLeads.find(l => l.id === lead.id);
      if (freshLead && freshLead.campaignWhatsAppStatus === 'sent') {
        return NextResponse.json({
          success: true,
          leadId: lead.id,
          clientName: lead.clientName,
          status: 'sent',
          remainingCount: leadsToSend.length - 1
        });
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      clientName: lead.clientName,
      status: 'sent',
      message: 'ההודעה הועברה לתור ה-WhatsApp של הבוט ותישלח',
      remainingCount: leadsToSend.length - 1
    });
  } catch (error: any) {
    console.error('Send WhatsApp Campaign Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
