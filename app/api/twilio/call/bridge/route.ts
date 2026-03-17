import { NextRequest, NextResponse } from 'next/server';

function normalizeToE164(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) {
    return '+972' + digits.substring(1);
  }
  if (digits.startsWith('972') && digits.length > 10) {
    return '+' + digits;
  }
  if (phone.startsWith('+')) {
    return '+' + digits;
  }
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');
    
    // Use the Twilio business number as callerId so the lead sees the business number.
    const userMobile = process.env.MY_PHONE_NUMBER;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!to || !userMobile) {
      console.error('Bridge Error: Missing parameters', { to, userMobile });
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const e164To = normalizeToE164(to);
    console.log(`Bridging call to lead: ${e164To} using callerId: ${userMobile}`);

    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${twilioPhone}" record="do-not-record" recordingChannels="dual" trim="trim-silence">
        <Number>${e164To}</Number>
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

export async function GET(req: NextRequest) {
  return POST(req);
}
