import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     // The TwiML to say the fallback message. 
     // Using a <Say> block with language set to Hebrew (he-IL).
     
     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="he-IL">שלום, הגעתם למשרד. כרגע אין באפשרותנו לענות. אנא השאירו הודעה לאחר הצפצוף, ונחזור אליכם בהקדם.</Say>
  <Record action="/api/webhook" maxLength="120" playBeep="true" />
  <Say language="he-IL">תודה ולהתראות.</Say>
</Response>`;

     return new NextResponse(twiml, {
         status: 200,
         headers: {
             'Content-Type': 'text/xml',
         },
     });
  } catch (err: any) {
      console.error("Error generating voicemail TwiML:", err);
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>System error.</Say></Response>`, {
         status: 500,
         headers: { 'Content-Type': 'text/xml' }
      });
  }
}
