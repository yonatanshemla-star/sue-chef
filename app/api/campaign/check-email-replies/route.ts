import { NextResponse } from 'next/server';
import { getLeads, updateLead } from '@/utils/storage';
import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

export async function GET() {
  return handleCheckEmailReplies();
}

export async function POST() {
  return handleCheckEmailReplies();
}

async function handleCheckEmailReplies() {
  const smtpUser = (process.env.SMTP_USER || 'gilh.lawoffice@gmail.com').trim();
  const smtpPass = (process.env.SMTP_PASS || 'vohcfbheluiaavtj').trim();

  if (!smtpUser || !smtpPass) {
    return NextResponse.json({
      success: false,
      error: 'פרטי חשבון Gmail (SMTP_USER / SMTP_PASS) חסרים'
    }, { status: 500 });
  }

  const client = new ImapFlow({
    host: 'imap.gmail.com',
    port: 993,
    secure: true,
    auth: {
      user: smtpUser,
      pass: smtpPass
    },
    logger: false
  });

  try {
    await client.connect();

    const lock = await client.getMailboxLock('INBOX');
    const matchedReplies: any[] = [];

    try {
      const mailbox = client.mailbox;
      const totalMessages = (mailbox && typeof mailbox === 'object' && 'exists' in mailbox) ? (mailbox.exists as number) : 0;
      
      if (totalMessages === 0) {
        return NextResponse.json({
          success: true,
          message: 'תיבת הדואר ריקה',
          repliesFound: 0,
          updatedLeads: []
        });
      }

      // Load all leads from DB
      const leads = await getLeads();
      const campaignLeads = leads.filter(
        l => l.campaignTag === 'קמפיין פולואפ 2026' || l.source === 'CSV Campaign' || l.email
      );

      // Map email addresses (lowercase) to leads
      const leadsByEmail = new Map();
      campaignLeads.forEach(l => {
        if (l.email && l.email.includes('@')) {
          leadsByEmail.set(l.email.trim().toLowerCase(), l);
        }
      });

      // Fetch the last 30 messages in the INBOX
      const fromSeq = Math.max(1, totalMessages - 29);
      for await (const message of client.fetch(`${fromSeq}:*`, { envelope: true, source: true })) {
        try {
          if (!message.source) continue;
          const parsed: any = await simpleParser(message.source);
          let fromAddress = '';
          if (parsed.from && parsed.from.value && parsed.from.value.length > 0) {
            fromAddress = (parsed.from.value[0].address || '').trim().toLowerCase();
          }
          
          if (!fromAddress) continue;

          // Don't match our own outgoing emails
          if (fromAddress === smtpUser.toLowerCase()) continue;

          // Find lead matching this email address
          const matchedLead = leadsByEmail.get(fromAddress);
          if (matchedLead) {
            let fullText = (parsed.text || '').trim();
            // Clean quoted thread history
            const cleanReply = fullText
              .split(/\n\s*בתאריך|\n\s*On .*wrote:|\n\s*>|\n\s*---/)[0]
              .trim() || fullText;

            const envelopeDate = message.envelope ? message.envelope.date : null;
            const replyDate = (parsed.date || envelopeDate || new Date()).toISOString();

            // Update lead record
            matchedLead.campaignReplied = true;
            matchedLead.campaignReplyChannel = 'email';
            matchedLead.campaignReplyText = cleanReply;
            matchedLead.campaignRepliedAt = replyDate;

            const replyNote = `✉️ תשובת אימייל (${new Date(replyDate).toLocaleDateString('he-IL')}): ${cleanReply}`;
            if (!matchedLead.liveCallNotes || !matchedLead.liveCallNotes.includes(cleanReply)) {
              matchedLead.liveCallNotes = matchedLead.liveCallNotes 
                ? `${replyNote}\n\n${matchedLead.liveCallNotes}` 
                : replyNote;
            }

            await updateLead(matchedLead);

            matchedReplies.push({
              leadId: matchedLead.id,
              clientName: matchedLead.clientName,
              email: fromAddress,
              replyText: cleanReply,
              date: replyDate
            });
          }
        } catch (parseErr: any) {
          console.error('Failed to parse email message:', parseErr.message);
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();

    return NextResponse.json({
      success: true,
      message: `סריקת מיילים הושלמה. נמצאו ${matchedReplies.length} תשובות מלידים!`,
      repliesFound: matchedReplies.length,
      updatedLeads: matchedReplies
    });
  } catch (err: any) {
    console.error('❌ IMAP Check Error:', err);
    return NextResponse.json({
      success: false,
      error: `שגיאה בבדיקת תיבת המייל: ${err.message}`
    }, { status: 500 });
  }
}
