import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

async function updateTwimlAppVoiceUrl(accountSid: string, authToken: string, twimlAppSid: string, voiceUrl: string) {
  try {
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const params = new URLSearchParams();
    params.append('VoiceUrl', voiceUrl);
    params.append('VoiceMethod', 'POST');

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Applications/${twimlAppSid}.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });
  } catch (err) {
    console.error('Failed to update TwiML App VoiceUrl:', err);
  }
}

export async function GET(req: NextRequest) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const twimlAppSid = process.env.TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return NextResponse.json({ error: 'Missing Twilio credentials' }, { status: 500 });
  }

  // Automatically sync TwiML App VoiceUrl to match current request domain
  const host = req.headers.get('host');
  if (host && authToken) {
    const protocol = req.headers.get('x-forwarded-proto') || (host.includes('localhost') ? 'http' : 'https');
    const baseUrl = `${protocol}://${host}`;
    const voiceUrl = `${baseUrl}/api/twilio/voice/outbound`;
    
    updateTwimlAppVoiceUrl(accountSid, authToken, twimlAppSid, voiceUrl).catch(() => {});
  }

  // Dependency-free JWT generation for Twilio
  const header = {
    typ: 'JWT',
    alg: 'HS256',
    cty: 'twilio-fpa;v=1',
  };

  const now = Math.floor(Date.now() / 1000);
  const payload = {
    jti: `${apiKey}-${now}`,
    iss: apiKey,
    sub: accountSid,
    exp: now + 3600,
    nbf: now,
    grants: {
      identity: 'dashboard_user',
      voice: {
        outgoing: {
          application_sid: twimlAppSid,
        },
        incoming: {
          allow: true,
        },
      },
    },
  };

  const base64UrlEncode = (obj: object) => {
    return Buffer.from(JSON.stringify(obj))
      .toString('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
  };

  const encodedHeader = base64UrlEncode(header);
  const encodedPayload = base64UrlEncode(payload);

  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const token = `${encodedHeader}.${encodedPayload}.${signature}`;
 
  return NextResponse.json({ token, twimlAppSid });
}
