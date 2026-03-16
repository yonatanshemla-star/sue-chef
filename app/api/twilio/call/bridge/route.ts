import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!to || !twilioPhone) {
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error: Missing destination number.</Say></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    console.log(`Bridging call to lead: ${to}`);

    // Clean the phone number for the lead
    const cleanTo = to.replace(/[^\d+]/g, '');

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say language="he-IL" voice="Google.he-IL-Standard-A">ממחבר אותך כעת לליד. השיחה מוקלטת.</Say>
    <Dial callerId="${twilioPhone}" record="record-from-answer-dual" recordingChannels="dual" trim="trim-silence">
        <Number>${cleanTo}</Number>
    </Dial>
</Response>`;

    return new NextResponse(twiml, {
      headers: { 'Content-Type': 'text/xml' }
    });
  } catch (err: any) {
    console.error('Bridge TwiML Error:', err);
    return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
      headers: { 'Content-Type': 'text/xml' }
    });
  }
}

// Twilio can also use GET
export async function GET(req: NextRequest) {
  return POST(req);
}
