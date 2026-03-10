import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     const formData = await req.formData();
     const caller = formData.get('From') || 'Unknown';
     
     // 1. We want to ring the user's actual phone or SIP client
     //    Since we don't have the explicit destination number hardcoded, 
     //    we will demonstrate ringing a predefined Client name, or a destination passed in ENV.
     //    If no destination is set, it goes straight to voicemail.
     
     const to = formData.get('To');
     const isOutbound = to && to !== process.env.TWILIO_PHONE_NUMBER;

     let twiml = `<?xml version="1.0" encoding="UTF-8"?>\n<Response>\n`;

     if (isOutbound) {
         // Outbound call from dashboard
         twiml += `  <Dial record="record-from-answer-dual">\n`;
         twiml += `    <Number>${to}</Number>\n`;
         twiml += `  </Dial>\n`;
     } else if (destinationNumber) {
         // Inbound call
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
