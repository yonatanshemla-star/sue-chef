import { NextResponse } from 'next/server';
import { logVoiceRequest } from '@/utils/storage';

export async function POST(req: Request) {
  try {
     const bodyText = await req.text();
     const params = new URLSearchParams(bodyText);
     const rawData: Record<string, string> = {};
     params.forEach((value, key) => { rawData[key] = value; });
     
     await logVoiceRequest(rawData);

     const from = rawData['From'] || '';
     const to = rawData['To'] || rawData['to'] || ''; 
     
     const fromStr = from.toString();
     const toStr = to.toString();

     const isFromApp = fromStr.startsWith('client:');
     const isFromSip = fromStr.startsWith('sip:');
     
     const digitsOnly = toStr.split('@')[0].replace('sip:', '').replace(/[^\d+]/g, '');
     let toValue = digitsOnly;

     if (toValue.startsWith('0') && toValue.length === 10) {
         toValue = '+972' + toValue.substring(1);
     } else if (!toValue.startsWith('+') && toValue.length >= 9 && !toValue.startsWith('972')) {
         toValue = '+972' + (toValue.startsWith('0') ? toValue.substring(1) : toValue);
     } else if (toValue.startsWith('972') && !toValue.startsWith('+')) {
         toValue = '+' + toValue;
     }

     const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));
     let callerId = process.env.TWILIO_PHONE_NUMBER || process.env.MY_PHONE_NUMBER || '';
     
     if (callerId.startsWith('0') && callerId.length === 10) {
         callerId = '+972' + callerId.substring(1);
     } else if (callerId && !callerId.startsWith('+')) {
         callerId = '+' + callerId;
     }

     let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

     if (isOutbound && toValue) {
         if (!callerId) {
             twiml += `  <Say language="he-IL">שגיאה: חסר מספר מזוהה.</Say>\n`;
         }
         twiml += `  <Dial callerId="${callerId}">\n`;
         twiml += `    <Number>${toValue}</Number>\n`;
         twiml += `  </Dial>\n`;
     } else if (!isOutbound) {
         // ADD callerId so Israeli networks don't block the forwarded call as spoofed
         twiml += `  <Dial callerId="${callerId}" timeout="20" action="/api/twilio/voicemail">\n`;
         if (process.env.MY_PHONE_NUMBER) {
            twiml += `    <Number>${process.env.MY_PHONE_NUMBER}</Number>\n`;
         }
         twiml += `  </Dial>\n`;
     } else {
         twiml += `  <Say language="he-IL">יעד לא תקין.</Say>\n`;
     }

     twiml += `</Response>`;

     return new NextResponse(twiml, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' },
     });
  } catch (err: any) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' }
      });
  }
}

export async function GET(req: Request) {
    return POST(req);
}
