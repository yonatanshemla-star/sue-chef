import { NextResponse } from 'next/server';
import { saveLead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const phone = formData.get('From') as string || 'לא ידוע';
    const recordingUrl = formData.get('RecordingUrl') as string;
    
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
      recordingUrl: recordingUrl, // Keep the URL just in case, but no AI processing
      transcription: 'התמלול בוטל',
      urgency: 'בינונית',
    };

    await saveLead(newLead as any);
    
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
