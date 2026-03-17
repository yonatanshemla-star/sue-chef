import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { sid: string } }
) {
  try {
    const { sid } = params;
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return new NextResponse("Missing Twilio credentials", { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${sid}.mp3`;

    const response = await fetch(twilioUrl, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!response.ok) {
      return new NextResponse("Failed to fetch recording from Twilio", { status: response.status });
    }

    // Stream the response back to the client
    const audioData = await response.arrayBuffer();
    
    return new NextResponse(audioData, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=3600'
      }
    });

  } catch (error) {
    console.error("Recording proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
