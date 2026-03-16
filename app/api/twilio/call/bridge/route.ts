import { NextRequest, NextResponse } from 'next/server';

function normalizeToE164(phone: string): string {
  // Remove all non-digit characters
  let digits = phone.replace(/\D/g, '');
  
  // If it starts with 0, replace with +972
  if (digits.startsWith('0')) {
    return '+972' + digits.substring(1);
  }
  
  // If it starts with 972 and not +, add +
  if (digits.startsWith('972') && digits.length > 10) {
    return '+' + digits;
  }
  
  // If already starts with +, return as is (but cleaned)
  if (phone.startsWith('+')) {
    return '+' + digits;
  }
  
  return digits;
}

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const to = searchParams.get('to');
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!to || !twilioPhone) {
      console.error('Bridge Error: Missing parameters', { to, twilioPhone });
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const e164To = normalizeToE164(to);
    console.log(`Bridging call to lead: ${e164To} (original: ${to})`);

    // No <Say> tag as requested by user.
    // Just <Dial> directly to connect.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial callerId="${twilioPhone}" record="record-from-answer-dual" recordingChannels="dual" trim="trim-silence">
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

