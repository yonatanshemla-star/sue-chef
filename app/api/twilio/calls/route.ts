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
    
    // 1. Fetch last 100 calls
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=100`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!res.ok) throw new Error('Failed to fetch recent calls');
    const data = await res.json();
    const rawCalls = data.calls || [];

    // 2. Group legs by root transaction
    const callGroups = new Map<string, any[]>();
    rawCalls.forEach((call: any) => {
      const rootSid = call.parent_call_sid || call.sid;
      if (!callGroups.has(rootSid)) callGroups.set(rootSid, []);
      callGroups.get(rootSid)!.push(call);
    });

    // 3. Consolidate groups
    const consolidated = Array.from(callGroups.entries()).map(([rootSid, legs]) => {
      const leadLeg = legs.find(l => l.to !== myNumber && l.direction !== 'inbound') || legs[0];
      
      let totalCost = 0;
      let maxDuration = 0;
      let finalStatus = leadLeg.status;

      for (const leg of legs) {
        totalCost += Math.abs(parseFloat(leg.price || "0"));
        maxDuration = Math.max(maxDuration, parseInt(leg.duration || "0"));
        if (leg.status === 'completed') finalStatus = 'completed';
      }

      return {
        sid: rootSid,
        from: leadLeg.from,
        to: leadLeg.to,
        status: finalStatus,
        startTime: leadLeg.start_time,
        duration: maxDuration.toString(),
        direction: leadLeg.direction,
        price: totalCost > 0 ? `-${totalCost.toFixed(3)}` : "0.000",
        isBridge: legs.length > 1
      };
    });

    // 4. Final Sort and Slice
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
