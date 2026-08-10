import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';
import nodemailer from 'nodemailer';

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

    // When targeting a specific lead, always allow re-sending (ignore status)
    const leadsToSend = targetLeadId
      ? eligibleLeads.filter(l => l.id === targetLeadId)
      : eligibleLeads.filter(l => l.campaignEmailStatus === 'pending' || !l.campaignEmailStatus);

    if (leadsToSend.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'אין לידים זמינים עם מייל להמתנה בשליחה',
        processedCount: 0
      });
    }

    const lead = leadsToSend[0];
    const defaultEmailBody = `שלום, 
בעבר היית בקשר עם המשרד עו"ד HBA 
לגבי זכויותיך הרפואיות, 
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך או בטיפול במקרה
אם הנושא עדיין רלוונטי עבורך, ניתן להשיב להודעה זו ונציג מהמשרד יחזור אליך בהקדם.
תודה`;
    const emailBodyToSend = emailBodyTemplate ? emailBodyTemplate.trim() : defaultEmailBody;

    const smtpHost = process.env.SMTP_HOST;
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    if (smtpHost && smtpUser && smtpPass) {
      try {
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: { user: smtpUser, pass: smtpPass }
        });

        const htmlBody = `<div dir="rtl" style="text-align: right; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.8; color: #222;">
${emailBodyToSend.split('\n').map((line: string) => `<p style="margin: 4px 0;">${line}</p>`).join('\n')}
</div>`;

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"משרד עו״ד HBA" <${smtpUser}>`,
          to: lead.email,
          subject: emailSubject || 'פנייה ממשרד עו"ד HBA - זכויות רפואיות',
          text: emailBodyToSend,
          html: htmlBody,
        });

        console.log(`✉️ Real Email sent to ${lead.email} (${lead.clientName})`);
      } catch (mailErr: any) {
        console.error(`❌ Mail send failed for ${lead.email}:`, mailErr.message);
        lead.campaignEmailStatus = 'failed';
        await updateLead(lead);
        return NextResponse.json({ success: false, error: mailErr.message }, { status: 500 });
      }
    } else {
      console.log(`⚠️ SMTP not configured. SMTP_HOST=${smtpHost}, SMTP_USER=${smtpUser ? 'set' : 'missing'}, SMTP_PASS=${smtpPass ? 'set' : 'missing'}`);
      return NextResponse.json({ 
        success: false, 
        error: 'הגדרות SMTP חסרות בשרת. ודא ש-SMTP_HOST, SMTP_USER ו-SMTP_PASS מוגדרים.'
      }, { status: 500 });
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
