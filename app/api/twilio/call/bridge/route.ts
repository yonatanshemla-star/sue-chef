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
    const confId = searchParams.get('confId');
    
    const userMobile = process.env.MY_PHONE_NUMBER;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!to || !userMobile || !confId || !accountSid || !authToken) {
      console.error('Bridge Error: Missing parameters', { to, userMobile, confId });
      return new NextResponse(`<?xml version="1.0" encoding="UTF-8"?><Response><Say>Error</Say></Response>`, {
        headers: { 'Content-Type': 'text/xml' }
      });
    }

    const e164To = normalizeToE164(to);
    console.log(`Bridging call to lead: ${e164To} using callerId: ${userMobile} via Conference: ${confId}`);

    // Trigger REST API call to dial the lead into the conference
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    const params = new URLSearchParams();
    params.append('To', e164To);
    params.append('From', twilioPhone as string);
    params.append('EarlyMedia', 'true');
    params.append('EndConferenceOnExit', 'false');

    // We don't await this so we can immediately return the TwiML for the agent
    fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confId}/Participants.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    }).catch(err => console.error("Failed to add lead to conference:", err));

    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const waitUrl = `${baseUrl}/ringback.mp3`;

    // For the agent, we return a Conference TwiML pointing to our hosted ringback tone waitUrl.
    // We set endConferenceOnExit="true" so that when the agent hangs up, the whole conference ends.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Dial>
        <Conference waitUrl="${waitUrl}" beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">${confId}</Conference>
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
