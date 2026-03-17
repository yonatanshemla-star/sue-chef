import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     const formData = await req.formData();
     
      const destinationNumber = process.env.MY_PHONE_NUMBER;
      const from = formData.get('From') || '';
      const to = formData.get('To') || '';
      
      const fromStr = from.toString();
      const toStr = to.toString();

      const isFromApp = fromStr.startsWith('client:');
      const isFromSip = fromStr.startsWith('sip:');
      
      const toValue = toStr.split('@')[0].replace('sip:', '');
      const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));

      let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

      if (isOutbound && toStr) {
          const callerId = process.env.TWILIO_PHONE_NUMBER || process.env.MY_PHONE_NUMBER;
          twiml += `  <Dial callerId="${callerId}">\n`;
          twiml += `    <Number>${toValue}</Number>\n`;
          twiml += `  </Dial>\n`;
      } else if (destinationNumber) {
          twiml += `  <Dial timeout="20" action="/api/twilio/voicemail">\n`;
          twiml += `    <Number>${destinationNumber}</Number>\n`;
          twiml += `    <Client>dashboard_user</Client>\n`;
          twiml += `  </Dial>\n`;
      } else {
          twiml += `  <Dial timeout="20" action="/api/twilio/voicemail">\n`;
          twiml += `    <Client>dashboard_user</Client>\n`;
          twiml += `  </Dial>\n`;
      }

      twiml += `</Response>`;

      return new NextResponse(twiml, {
          status: 200,
          headers: {
              'Content-Type': 'text/xml',
          },
      });
  } catch (err: any) {
      console.error("Error generating voice TwiML:", err);
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error.</Say></Response>`, {
         status: 500,
         headers: { 'Content-Type': 'text/xml' }
      });
  }
}

export async function GET(req: Request) {
  return POST(req);
}

