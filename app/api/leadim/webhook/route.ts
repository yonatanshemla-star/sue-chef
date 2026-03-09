import { NextResponse } from 'next/server';
import { saveLead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const logFile = 'webhook.log';
function logInfo(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] [LEADIM] ${msg}\n`, 'utf8');
}

export async function POST(req: Request) {
  try {
    logInfo('Incoming LEAD.IM Webhook');
    
    // LEAD.IM usually sends data as Form Data or JSON
    let data: any;
    const contentType = req.headers.get('content-type') || '';
    
    if (contentType.includes('application/json')) {
      data = await req.json();
    } else {
      const formData = await req.formData();
      data = Object.fromEntries(formData.entries());
    }
    
    logInfo(`Received data: ${JSON.stringify(data)}`);

    // Map LEAD.IM fields to our internal Lead interface
    // Note: Field names may vary based on user's LEAD.IM configuration
    const newLead = {
      id: uuidv4(),
      clientName: data.name || data.first_name || 'ליד מ-LeadIM',
      phone: data.phone || data.mobile || null,
      age: null,
      medicalBackground: null,
      employmentStatus: null,
      incomeDetails: null,
      additionalNotes: data.remarks || data.notes || data.message || null,
      urgency: 'בינונית',
      createdAt: new Date().toISOString(),
      source: 'LeadIM' as const,
      status: 'חדש' as const,
      lastContacted: null,
      notes: ''
    };

    await saveLead(newLead as any);
    logInfo(`SUCCESS: Saved LeadIM lead ${newLead.id}`);

    return NextResponse.json({ success: true, id: newLead.id });
  } catch (error: any) {
    logInfo(`FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'LEAD.IM Webhook Endpoint Active' });
}
