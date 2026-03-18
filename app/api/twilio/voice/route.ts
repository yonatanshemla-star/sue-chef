import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     // Use text() and URLSearchParams for most reliable parsing on Vercel/Edge
     const bodyText = await req.text();
     const params = new URLSearchParams(bodyText);
     const rawData: Record<string, string> = {};
     params.forEach((value, key) => { rawData[key] = value; });
     
     console.log('Voice Webhook (Alternative) Params:', rawData);

     const from = rawData['From'] || '';
     const to = rawData['To'] || rawData['to'] || ''; 
     
     const fromStr = from.toString();
     const toStr = to.toString();

     const isFromApp = fromStr.startsWith('client:');
     const isFromSip = fromStr.startsWith('sip:');
     
     // Normalize the target number
     const digitsOnly = toStr.split('@')[0].replace('sip:', '').replace(/[^\d+]/g, '');
     let toValue = digitsOnly;

     // Israeli normalization (e.g. 0522818541 -> +972522818541)
     if (toValue.startsWith('0') && toValue.length === 10) {
         toValue = '+972' + toValue.substring(1);
     } else if (!toValue.startsWith('+') && toValue.length >= 9 && !toValue.startsWith('972')) {
         toValue = '+972' + (toValue.startsWith('0') ? toValue.substring(1) : toValue);
     } else if (toValue.startsWith('972') && !toValue.startsWith('+')) {
         toValue = '+' + toValue;
     }

     const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));
     const callerId = process.env.TWILIO_PHONE_NUMBER || process.env.MY_PHONE_NUMBER || '';

     let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

     if (isOutbound && toValue) {
         twiml += `  <Dial callerId="${callerId}">\n`;
         twiml += `    <Number>${toValue}</Number>\n`;
         twiml += `  </Dial>\n`;
     } else if (!isOutbound) {
         // Incoming call (to our Twilio number)
         twiml += `  <Dial timeout="20" action="/api/twilio/voicemail">\n`;
         twiml += `    <Client>dashboard_user</Client>\n`;
         if (process.env.MY_PHONE_NUMBER) {
            twiml += `    <Number>${process.env.MY_PHONE_NUMBER}</Number>\n`;
         }
         twiml += `  </Dial>\n`;
     } else {
         twiml += `  <Say language="he-IL">מספר היעד לא נמצא.</Say>\n`;
     }

     twiml += `</Response>`;

     return new NextResponse(twiml, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' },
     });
  } catch (err: any) {
      console.error('Voice Route Error:', err);
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
         status: 200,
         headers: { 'Content-Type': 'application/xml' }
      });
  }
}

export async function GET(req: Request) {
  return POST(req);
}
