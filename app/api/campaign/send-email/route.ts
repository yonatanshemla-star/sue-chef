import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { emailSubject, emailBodyTemplate, targetLeadId } = await req.json();

    const leads = await getLeads();

    // Active main CRM phones & emails
    const mainActivePhones = new Set<string>();
    const mainActiveEmails = new Set<string>();

    leads.forEach(l => {
      const isCampaign = l.id?.startsWith('cmp_') || l.source === 'CSV Campaign' || l.campaignTag === 'קמפיין פולואפ 2026';
      const isArchived = l.status === 'ארכיון';
      if (!isCampaign && !isArchived) {
        if (l.email && l.email.includes('@')) mainActiveEmails.add(l.email.trim().toLowerCase());
        if (l.phone) {
          const digits = l.phone.replace(/\D/g, '');
          if (digits.length >= 9) mainActivePhones.add(digits.slice(-9));
        }
      }
    });

    const campaignLeads = leads.filter(l => {
      const isCampaign = l.campaignTag === 'קמפיין פולואפ 2026' || l.source === 'CSV Campaign';
      if (!isCampaign) return false;

      // Allow test lead
      if (l.id === 'cmp_test_yonatan_shemla') return true;

      // Exclude if in active main table
      if (l.email && mainActiveEmails.has(l.email.trim().toLowerCase())) return false;
      if (l.phone) {
        const digits = l.phone.replace(/\D/g, '');
        if (digits.length >= 9 && mainActivePhones.has(digits.slice(-9))) return false;
      }
      return true;
    });

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

    // Trim env vars to remove any trailing whitespace from Vercel env injection
    const smtpUser = (process.env.SMTP_USER || '').trim();
    const smtpPass = (process.env.SMTP_PASS || '').trim();

    if (smtpUser && smtpPass) {
      try {
        // Use service: 'gmail' instead of host/port - works reliably on Vercel serverless
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: smtpUser, pass: smtpPass }
        });

        const htmlBody = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head><meta charset="utf-8"></head>
<body style="direction: rtl; text-align: right; font-family: Arial, sans-serif; font-size: 15px; line-height: 1.8; color: #222;">
${emailBodyToSend.split('\n').map((line: string) => `<p style="margin: 4px 0; direction: rtl; text-align: right;">${line}</p>`).join('\n')}
</body>
</html>`;

        await transporter.sendMail({
          from: `"משרד עו״ד HBA" <${smtpUser}>`,
          to: lead.email,
          subject: emailSubject || 'פנייה ממשרד עו"ד HBA - זכויות רפואיות',
          text: emailBodyToSend,
          html: htmlBody,
        });

        console.log(`✉️ Real Email sent to ${lead.email} (${lead.clientName})`);
      } catch (mailErr: any) {
        console.error(`❌ Mail send failed for ${lead.email}:`, mailErr.message);
        const errMsg = mailErr.message || '';
        const isQuota = /quota|limit|exceeded|550|454|rate/i.test(errMsg);

        if (isQuota) {
          // Keep as pending so it can be resumed next day
          lead.campaignEmailStatus = 'pending';
          await updateLead(lead);
          return NextResponse.json({ 
            success: false, 
            isQuotaExceeded: true, 
            error: 'מכסת השליחה היומית של Gmail מוצתה להיום (Quota Exceeded)' 
          }, { status: 429 });
        }

        lead.campaignEmailStatus = 'failed';
        await updateLead(lead);
        return NextResponse.json({ success: false, error: mailErr.message }, { status: 500 });
      }
    } else {
      console.log(`⚠️ SMTP not configured. SMTP_USER=${smtpUser ? 'set' : 'missing'}, SMTP_PASS=${smtpPass ? 'set' : 'missing'}`);
      return NextResponse.json({ 
        success: false, 
        error: 'הגדרות SMTP חסרות בשרת. ודא ש-SMTP_USER ו-SMTP_PASS מוגדרים.'
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
