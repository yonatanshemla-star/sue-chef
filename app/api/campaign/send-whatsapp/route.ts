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
    const clientName = lead.clientName || 'לקוח';
    
    // Personalize message if template contains {name} or [שם]
    const personalizedMessage = (messageTemplate || `שלום ${clientName}, משרד עו"ד HBA פונה אליך לבדוק האם חל שינוי במצבך. ניתן להשיב להודעה זו.`)
      .replace(/\{name\}|\[שם\]|\[שם הלקוח\]/g, clientName);

    const botUrl = process.env.WHATSAPP_BOT_URL || 'http://localhost:3001';
    const apiKey = process.env.WHATSAPP_API_KEY || 'sue-chef-secret-whatsapp-key-123';

    try {
      const response = await fetch(`${botUrl}/api/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          phone: lead.phone,
          message: personalizedMessage
        })
      });

      const resData = await response.json();

      if (response.ok && resData.success) {
        lead.campaignWhatsAppStatus = 'sent';
        lead.whatsappSentAt = new Date().toISOString();
        lead.lastContacted = new Date().toISOString();
        await updateLead(lead);

        return NextResponse.json({
          success: true,
          leadId: lead.id,
          clientName: lead.clientName,
          status: 'sent',
          remainingCount: leadsToSend.length - 1
        });
      } else {
        lead.campaignWhatsAppStatus = 'failed';
        await updateLead(lead);
        return NextResponse.json({
          success: false,
          leadId: lead.id,
          error: resData.error || 'WhatsApp bot error'
        }, { status: 500 });
      }
    } catch (botErr: any) {
      console.error('WhatsApp Bot connection failed:', botErr);
      lead.campaignWhatsAppStatus = 'failed';
      await updateLead(lead);
      return NextResponse.json({
        success: false,
        leadId: lead.id,
        error: 'בוט ה-WhatsApp אינו זמין (ודא שבוט whatsapp-bot פועל בפורט 3001)'
      }, { status: 503 });
    }
  } catch (error: any) {
    console.error('Send WhatsApp Campaign Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
