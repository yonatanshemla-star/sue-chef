import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
     // The TwiML to say the fallback message. 
     // Using a <Say> block with language set to Hebrew (he-IL).
     
     const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say language="he-IL" voice="Google.he-IL-Standard-A">שלום, כרגע אין באפשרותנו לענות. אנא השאירו הודעה ונחזור אליכם בהקדם.</Say>
  <Say language="he-IL" voice="Google.he-IL-Standard-A">לא התקבלה הודעה, להתראות.</Say>
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
