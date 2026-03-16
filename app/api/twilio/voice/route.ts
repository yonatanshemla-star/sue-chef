import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     const formData = await req.formData();
     
      const destinationNumber = process.env.MY_PHONE_NUMBER;
      const from = formData.get('From') || '';
      const to = formData.get('To') || '';
      
      const fromStr = from.toString();
      const toStr = to.toString();

      // Outbound calls: 
      // 1. From the dashboard (client:...)
      // 2. From a SIP client (sip:...) dialing a phone number
      const isFromApp = fromStr.startsWith('client:');
      const isFromSip = fromStr.startsWith('sip:');
      
      // For SIP, it's outbound if the 'To' looks like a phone number even with a domain
      // e.g. sip:+972522818541@sip.twilio.com -> contains digits and is meant for a phone
      const toValue = toStr.split('@')[0].replace('sip:', '');
      const isOutbound = isFromApp || (isFromSip && /^\+?\d+$/.test(toValue));

      let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

      if (isOutbound && toStr) {
          // Outbound call
          const callerId = process.env.TWILIO_PHONE_NUMBER || process.env.MY_PHONE_NUMBER;
          twiml += `  <Dial callerId="${callerId}" record="record-from-answer-dual" recordingChannels="dual" trim="trim-silence">\n`;
          twiml += `    <Number>${toValue}</Number>\n`;
          twiml += `  </Dial>\n`;
      } else if (destinationNumber) {
          // Inbound call (someone calling the Twilio number)
          twiml += `  <Dial timeout="20" record="record-from-answer-dual" action="/api/twilio/voicemail">\n`;
          twiml += `    <Number>${destinationNumber}</Number>\n`;
          twiml += `    <Client>dashboard_user</Client>\n`;
          twiml += `  </Dial>\n`;
      } else {
         // Fallback directly to voicemail
         twiml += `  <Dial timeout="20" record="record-from-answer-dual" action="/api/twilio/voicemail">\n`;
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

