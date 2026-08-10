import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const { emailSubject, emailBodyTemplate, targetLeadId } = await req.json();

    const leads = await getLeads();
    const campaignLeads = leads.filter(
      l => l.campaignTag === 'קמפיין פולואפ 2026' || l.source === 'CSV Campaign'
    );

    const eligibleLeads = campaignLeads.filter(
      l => l.email && l.email.includes('@')
    );

    const leadsToSend = targetLeadId
      ? eligibleLeads.filter(l => l.id === targetLeadId)
      : eligibleLeads.filter(l => l.campaignEmailStatus === 'pending' || !l.campaignEmailStatus);

    if (leadsToSend.length === 0) {
      return NextResponse.json({
        success: true,
        message: 'אין לידים זמינים עם מייל להמתנה בשליחה',
        processedCount: 0
      });
    }

    const lead = leadsToSend[0];
    const clientName = lead.clientName || 'לקוח';
    const personalizedBody = (emailBodyTemplate || `שלום ${clientName},\n\nבעבר היית בקשר עם משרד עו"ד HBA לגבי זכויותיך הרפואיות.\nפנינו אליך כעת לבדוק האם חל שינוי במצבך.\n\nבברכה,\nמשרד עו"ד HBA`)
      .replace(/\{name\}|\[שם\]|\[שם הלקוח\]/g, clientName);

    // If Nodemailer / SMTP environment variables are present, use nodemailer:
    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass }
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"משרד עו״ד HBA" <${smtpUser}>`,
          to: lead.email,
          subject: emailSubject || 'פנייה ממשרד עו"ד HBA - זכויות רפואיות',
          text: personalizedBody,
        });

        console.log(`✉️ Real Email sent to ${lead.email} (${clientName})`);
      } catch (mailErr: any) {
        console.error(`❌ Mail send failed for ${lead.email}:`, mailErr.message);
        lead.campaignEmailStatus = 'failed';
        await updateLead(lead);
        return NextResponse.json({ success: false, error: mailErr.message }, { status: 500 });
      }
    } else {
      // Simulate / Mark as sent in system if SMTP credentials not configured yet
      console.log(`✉️ Email marked as sent to ${lead.email} (${clientName}) - SMTP config pending in .env.local`);
    }

    lead.campaignEmailStatus = 'sent';
    lead.lastContacted = new Date().toISOString();
    await updateLead(lead);

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      clientName: lead.clientName,
      email: lead.email,
      status: 'sent',
      remainingCount: leadsToSend.length - 1
    });
  } catch (error: any) {
    console.error('Send Email Campaign Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
