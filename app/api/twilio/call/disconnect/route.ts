import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ success: false, error: 'Missing Twilio configuration' }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // 1. Fetch all calls with status 'in-progress'
    const inProgressUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=in-progress`;
    const inProgressRes = await fetch(inProgressUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!inProgressRes.ok) {
      const errText = await inProgressRes.text();
      throw new Error(`Twilio API error fetching in-progress calls: ${errText}`);
    }

    const inProgressData = await inProgressRes.json();
    const callsToTerminate = inProgressData.calls || [];

    // 2. Fetch all calls with status 'ringing' or 'queued' to ensure we catch initiating calls
    const ringingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=ringing`;
    const ringingRes = await fetch(ringingUrl, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    if (ringingRes.ok) {
      const ringingData = await ringingRes.json();
      if (ringingData.calls) {
        callsToTerminate.push(...ringingData.calls);
      }
    }

    const queuedUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=queued`;
    const queuedRes = await fetch(queuedUrl, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    if (queuedRes.ok) {
      const queuedData = await queuedRes.json();
      if (queuedData.calls) {
        callsToTerminate.push(...queuedData.calls);
      }
    }

    if (callsToTerminate.length === 0) {
      return NextResponse.json({ success: true, terminatedCount: 0, message: 'No active calls found' });
    }

    const terminatedSids: string[] = [];

    // 3. Terminate each call by updating its status to 'completed'
    for (const call of callsToTerminate) {
      const sid = call.sid;
      console.log(`Terminating active Twilio call SID: ${sid}`);
      
      const updateParams = new URLSearchParams();
      updateParams.append('Status', 'completed');

      const termRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${sid}.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: updateParams.toString()
      });

      if (termRes.ok) {
        terminatedSids.push(sid);
      } else {
        const errText = await termRes.text();
        console.error(`Failed to terminate call leg ${sid}: ${errText}`);
      }
    }

    return NextResponse.json({
      success: true,
      terminatedCount: terminatedSids.length,
      terminatedSids
    });

  } catch (err: any) {
    console.error('Twilio Disconnect Call Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
