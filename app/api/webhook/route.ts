import { NextResponse } from 'next/server';
import { getLeads, saveLead, updateLead, Lead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { sendWhatsAppWelcome } from '@/utils/whatsapp';

function matchLeadByPhone(rawPhone: string | undefined | null, leadsList: Lead[]): Lead | undefined {
  if (!rawPhone || !leadsList || leadsList.length === 0) return undefined;

  const cleanDigits = (p: string) => p.replace(/\D/g, '');
  const targetDigits = cleanDigits(rawPhone);
  if (targetDigits.length < 7) return undefined;

  for (const len of [9, 8, 7]) {
    if (targetDigits.length >= len) {
      const suffix = targetDigits.slice(-len);
      const found = leadsList.find(l => {
        if (!l.phone) return false;
        const lDigits = cleanDigits(l.phone);
        return lDigits.length >= len && (lDigits.endsWith(suffix) || suffix.endsWith(lDigits.slice(-7)));
      });
      if (found) return found;
    }
  }

  return undefined;
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const phone = formData.get('From') as string || 'לא ידוע';
    const recordingUrl = formData.get('RecordingUrl') as string;

    const allLeads = await getLeads();
    const existingLead = matchLeadByPhone(phone, allLeads);

    if (existingLead) {
      console.log(`Incoming call webhook for existing lead ${existingLead.clientName} (${phone}) - updating existing lead without duplication.`);
      const timeStr = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });
      const newNote = `[${timeStr}] התקבלה שיחה נכנסת מ-Twilio.`;
      const updatedNotes = existingLead.generalNotes 
        ? `${existingLead.generalNotes}\n${newNote}` 
        : newNote;

      const updated = {
        ...existingLead,
        generalNotes: updatedNotes,
        lastContacted: new Date().toISOString(),
        callCount: (existingLead.callCount || 0) + 1,
        recordingUrl: recordingUrl || existingLead.recordingUrl,
      };

      await updateLead(updated);

      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
      });
    }
    
    const newLead = {
      id: uuidv4(),
      clientName: 'ליד חדש (שיחה קולית)',
      phone: phone,
      source: 'Twilio' as const,
      createdAt: new Date().toISOString(),
      lastContacted: null,
      status: 'חדש' as const,
      followUpDate: null,
      generalNotes: 'התקבלה שיחה חדשה מ-Twilio. יש ליצור קשר בהקדם.',
      liveCallNotes: '',
      recordingUrl: recordingUrl,
      transcription: 'התמלול בוטל',
      urgency: 'בינונית',
    };

    await saveLead(newLead as any);

    // Send automatic WhatsApp welcome message
    if (phone && phone !== 'לא ידוע') {
        sendWhatsAppWelcome(phone, newLead.clientName).catch(err => {
            console.error('Failed to trigger WhatsApp welcome:', err);
        });
    }
    
    // Twilio MUST receive TwiML XML when the Action URL runs
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Hangup/></Response>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
    });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say language="he-IL">שגיאה במערכת להשארת הודעות.</Say></Response>`, {
        status: 200,
        headers: { 'Content-Type': 'application/xml' }
    });
  }
}
