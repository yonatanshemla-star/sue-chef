import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { to, agentPhone } = await req.json();
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const myPhone = agentPhone || process.env.MY_PHONE_NUMBER;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !myPhone || !twilioPhone) {
      return NextResponse.json({ success: false, error: 'Missing Twilio configuration' }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // Get the base URL for the bridge callback
    const host = req.headers.get('host');
    const protocol = host?.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;
    const bridgeUrl = `${baseUrl}/api/twilio/call/bridge?to=${encodeURIComponent(to)}`;

    console.log(`Initiating bridge call. Calling ${myPhone}, then bridging to ${to}`);
    console.log(`Bridge URL: ${bridgeUrl}`);

    const params = new URLSearchParams();
    params.append('To', myPhone);
    params.append('From', twilioPhone);
    params.append('Url', bridgeUrl);

    const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data = await twilioRes.json();

    if (twilioRes.ok) {
      return NextResponse.json({ success: true, sid: data.sid });
    } else {
      console.error('Twilio Error:', data);
      return NextResponse.json({ success: false, error: data.message || 'Twilio Error' }, { status: 400 });
    }
  } catch (err: any) {
    console.error('Initiate Call Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
