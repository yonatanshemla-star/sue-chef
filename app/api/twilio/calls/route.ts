import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const myNumber = process.env.MY_PHONE_NUMBER;

    if (!accountSid || !authToken) {
       return NextResponse.json({ success: false, error: "Missing Twilio Credentials" }, { status: 400 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // 1. Prefetch top recordings for the account to speed up lookup
    const recsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings.json?PageSize=100`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const recsData = recsRes.ok ? await recsRes.json() : { recordings: [] };
    const accountRecsMap = new Map();
    (recsData.recordings || []).forEach((r: any) => {
      if (r.call_sid) accountRecsMap.set(r.call_sid, r.sid);
    });

    // 2. Fetch last 100 calls to have enough context for grouping bridge legs
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=100`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!res.ok) throw new Error('Failed to fetch recent calls');
    const data = await res.json();
    const rawCalls = data.calls || [];

    // 3. Group legs by root transaction (ParentCallSid or call SID itself)
    const callGroups = new Map<string, any[]>();
    rawCalls.forEach((call: any) => {
      const rootSid = call.parent_call_sid || call.sid;
      if (!callGroups.has(rootSid)) callGroups.set(rootSid, []);
      callGroups.get(rootSid)!.push(call);
    });

    // 4. Consolidate groups into single "transactions"
    const consolidated = await Promise.all(Array.from(callGroups.entries()).map(async ([rootSid, legs]) => {
      // The representative leg is the one NOT going to our own mobile number (if a bridge)
      // or simply the primary leg if it's a direct call.
      const leadLeg = legs.find(l => l.to !== myNumber && l.direction !== 'inbound') || legs[0];
      
      let totalCost = 0;
      let maxDuration = 0;
      let finalStatus = leadLeg.status;
      let recordingUrl = null;

      // Combine metadata from all legs
      for (const leg of legs) {
        totalCost += Math.abs(parseFloat(leg.price || "0"));
        maxDuration = Math.max(maxDuration, parseInt(leg.duration || "0"));
        if (leg.status === 'completed') finalStatus = 'completed';
        
        // Search for recording on ANY leg (bridge recordings can be on parent or child)
        if (!recordingUrl) {
          const sidRec = accountRecsMap.get(leg.sid);
          if (sidRec) {
            recordingUrl = `/api/twilio/recordings/${sidRec}`;
          } else {
            // Check Twilio API directly for this leg if not in map
            try {
              const recRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${leg.sid}/Recordings.json`, {
                headers: { 'Authorization': `Basic ${auth}` }
              });
              if (recRes.ok) {
                const recData = await recRes.json();
                if (recData.recordings?.length > 0) {
                  recordingUrl = `/api/twilio/recordings/${recData.recordings[0].sid}`;
                }
              }
            } catch (e) {}
          }
        }
      }

      return {
        sid: rootSid,
        from: leadLeg.from,
        to: leadLeg.to,
        status: finalStatus,
        startTime: leadLeg.start_time,
        duration: maxDuration.toString(),
        direction: leadLeg.direction,
        recordingUrl: recordingUrl,
        price: totalCost > 0 ? `-${totalCost.toFixed(3)}` : "0.000",
        isBridge: legs.length > 1,
        debug_found: !!recordingUrl
      };
    }));

    // 5. Final Sort and Slice (Return unique transactions, newest first)
    const finalCalls = consolidated
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())
      .slice(0, 50);

    return NextResponse.json({ 
      success: true, 
      calls: finalCalls
    });

  } catch (error) {
    console.error("Error in calls API:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch calls" }, { status: 500 });
  }
}
