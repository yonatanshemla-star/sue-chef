import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
       return NextResponse.json({ success: false, error: "Missing Twilio Credentials" }, { status: 400 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // Fetch last 20 calls
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=20`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!res.ok) throw new Error('Failed to fetch recent calls');
    
    const data = await res.json();
    
    // Filter out SIP URI calls - only show real phone number calls
    const filteredCalls = data.calls
      .filter((call: any) => {
        const from = call.from || '';
        const to = call.to || '';
        return !from.startsWith('sip:') && !to.startsWith('sip:');
      })
      .map((call: any) => ({
          sid: call.sid,
          from: call.from,
          to: call.to,
          status: call.status,
          startTime: call.start_time,
          duration: call.duration,
          direction: call.direction
      }));

    return NextResponse.json({ 
      success: true, 
      calls: filteredCalls
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch calls" }, { status: 500 });
  }
}
