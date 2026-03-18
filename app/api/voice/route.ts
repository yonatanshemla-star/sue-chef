import { NextResponse } from 'next/server';
import fs from 'fs';

const logFile = 'webhook.log';
function logInfo(msg: string) {
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `[${timestamp}] ${msg}\n`, 'utf8');
}

export async function POST(req: Request) {
  try {
     const formData = await req.formData();
     const rawData: Record<string, string> = {};
     formData.forEach((value, key) => { rawData[key] = value.toString(); });
     logInfo(`Voice Request: ${JSON.stringify(rawData)}`);

     const from = rawData['From'] || '';
     const to = rawData['To'] || '';
     
     const fromStr = from.toString();
     const toStr = to.toString();

     const isFromApp = fromStr.startsWith('client:');
     const isFromSip = fromStr.startsWith('sip:');
     
     const toValue = toStr.split('@')[0].replace('sip:', '');
     const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));

     let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

     if (isOutbound && toStr) {
         twiml += `  <Dial>\n`;
         twiml += `    <Number>${toValue}</Number>\n`;
         twiml += `  </Dial>\n`;
     } else {
         twiml += `  <Dial timeout="20" action="/api/twilio/voicemail">\n`;
         twiml += `    <Client>dashboard_user</Client>\n`;
         if (process.env.MY_PHONE_NUMBER) {
            twiml += `    <Number>${process.env.MY_PHONE_NUMBER}</Number>\n`;
         }
         twiml += `  </Dial>\n`;
     }

     twiml += `</Response>`;

     return new NextResponse(twiml, {
         status: 200,
         headers: { 'Content-Type': 'text/xml' },
     });
  } catch (err: any) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
         status: 500,
         headers: { 'Content-Type': 'text/xml' }
      });
  }
}
