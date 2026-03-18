import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function GET() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiSecret = process.env.TWILIO_API_SECRET;
  const twimlAppSid = process.env.TWIML_APP_SID;

  if (!accountSid || !apiKey || !apiSecret || !twimlAppSid) {
    return NextResponse.json({ error: 'Missing Twilio credentials' }, { status: 500 });
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
