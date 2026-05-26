import { NextResponse } from 'next/server';
import { saveLead } from '@/utils/storage';
import { v4 as uuidv4 } from 'uuid';
import { sendWhatsAppWelcome } from '@/utils/whatsapp';
import fs from 'fs';

const logFile = 'webhook.log';
function logInfo(msg: string) {
  const timestamp = new Date().toISOString();
  const logLine = `[${timestamp}] [LEADIM] ${msg}`;
  console.log(logLine);
  try {
    fs.appendFileSync(logFile, `${logLine}\n`, 'utf8');
  } catch (e) {
    // Silently ignore filesystem write errors on read-only environments like Vercel
  }
}

// Field mapping keys (case-insensitive)
const nameKeys = ['lm_name', 'name', 'fullname', 'first_name', 'last_name', 'lm_fullname', 'lm_first_name', 'lm_last_name', 'שם', 'שם מלא', 'שם לקוח'];
const phoneKeys = ['lm_phone', 'phone', 'mobile', 'lm_mobile', 'lm_phone_number', 'טלפון', 'נייד', 'מספר טלפון'];
const remarksKeys = ['lm_remarks', 'remarks', 'notes', 'message', 'lm_notes', 'lm_message', 'הערות', 'הודעה', 'תוכן'];
const emailKeys = ['lm_email', 'email', 'דואל', 'אימייל', 'דואר אלקטרוני'];
const campaignKeys = [
  'lm_campaign_name', 'lm_campaign', 'campaign', 'campaign_name', 'קמפיין', 'שם קמפיין', 
  'utm_campaign', 'utm_source', 'lead_source', 'source', 'ערוץ', 'ערוץ שיווק', 
  'lm_supplier_name', 'lm_supplier', 'supplier', 'supplier_name', 'ספק', 'שם ספק',
  'channel', 'marketing_channel', 'ad_campaign', 'adset_name', 'ad_name'
];
const supplierKeys = ['lm_supplier_name', 'lm_supplier', 'supplier', 'supplier_name', 'ספק', 'שם ספק'];
const incomeKeys = ['lm_income', 'lm_salary', 'income', 'salary', 'שכר', 'משכורת', 'הכנסה', 'גובה שכר', 'כמה מרוויח', 'lm_שכר', 'lm_הכנסה'];
const taxKeys = ['lm_tax', 'tax', 'income_tax', 'monthly_tax', 'tax_payment', 'מס_הכנסה', 'מס הכנסה', 'משלם_מס', 'lm_מס_הכנסה', 'lm_מס הכנסה'];

function findValueByKeys(data: any, keys: string[]): any {
  const normalizedData: any = {};
  for (const k of Object.keys(data)) {
    normalizedData[k.toLowerCase().trim()] = data[k];
  }
  for (const key of keys) {
    const val = normalizedData[key.toLowerCase()];
    if (val !== undefined && val !== null && val !== '') {
      return val;
    }
  }
  return null;
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

    // Parse specific fields
    const clientName = findValueByKeys(data, nameKeys) || 'ליד מ-LeadIM';
    const phone = findValueByKeys(data, phoneKeys) || null;

    // Build the general notes dynamically
    const notesParts: string[] = [];
    
    const remarks = findValueByKeys(data, remarksKeys);
    if (remarks) {
      notesParts.push(remarks);
    }
    
    // Custom logic: check if salary is above 11,999 NIS
    const incomeVal = findValueByKeys(data, incomeKeys);
    if (incomeVal) {
      const parsedIncome = parseInt(incomeVal.toString().replace(/\D/g, ''), 10);
      if (!isNaN(parsedIncome) && parsedIncome > 11999) {
        notesParts.push(`הכנסה חודשית: ₪${Number(parsedIncome).toLocaleString()} (מעל 11,999 ₪)`);
      }
    }
    
    // Custom logic: check if income tax is above 1,000 NIS or "yes"
    const taxVal = findValueByKeys(data, taxKeys);
    if (taxVal) {
      const valStr = taxVal.toString().trim().toLowerCase();
      const isYes = valStr === 'כן' || valStr === 'yes' || valStr === 'true' || valStr === '1' || valStr.includes('משלם');
      const numVal = parseInt(valStr.replace(/\D/g, ''), 10);
      const isOver1000 = !isNaN(numVal) && numVal > 1000;
      
      if (isYes || isOver1000) {
        const detail = isOver1000 ? ` (סכום: ₪${Number(numVal).toLocaleString()})` : '';
        notesParts.push(`משלם מעל 1,000 ₪ מס הכנסה בחודש: כן${detail}`);
      }
    }

    // Add marketing parameters if present
    const campaign = findValueByKeys(data, campaignKeys);
    if (campaign) {
      notesParts.push(`קמפיין: ${campaign}`);
    }
    
    const supplier = findValueByKeys(data, supplierKeys);
    if (supplier) {
      notesParts.push(`ספק: ${supplier}`);
    }
    
    const email = findValueByKeys(data, emailKeys);
    if (email) {
      notesParts.push(`דוא"ל: ${email}`);
    }
    
    const debugBlock = `\n\n[דיבאג גולמי: ${JSON.stringify(data)}]`;
    const generalNotes = notesParts.join('\n') + debugBlock;

    // Create a new lead conforming to the internal Lead interface
    const newLead = {
      id: uuidv4(),
      clientName: clientName,
      phone: phone || undefined,
      source: 'LeadIM' as const,
      createdAt: new Date().toISOString(),
      lastContacted: null,
      status: 'חדש' as const,
      followUpDate: '',
      generalNotes: generalNotes,
      liveCallNotes: '',
      callCount: 0,
      urgency: 'בינונית' as const,
      campaign: campaign || undefined
    };

    // Save lead to database
    await saveLead(newLead as any);
    logInfo(`SUCCESS: Saved LeadIM lead ${newLead.id}`);

    // Send automatic WhatsApp welcome message
    if (phone && phone !== 'לא ידוע') {
      sendWhatsAppWelcome(phone, clientName).then((res) => {
        logInfo(`WhatsApp trigger response: ${JSON.stringify(res)}`);
      }).catch((err) => {
        logInfo(`Failed to trigger WhatsApp welcome: ${err.message}`);
      });
    }

    return NextResponse.json({ success: true, id: newLead.id });
  } catch (error: any) {
    logInfo(`FATAL ERROR: ${error.message}`);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({ message: 'LEAD.IM Webhook Endpoint Active' });
}

