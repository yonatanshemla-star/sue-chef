import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET() {
  try {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
       return NextResponse.json({ success: false, error: "Missing Twilio Credentials" }, { status: 400 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    
    // SCAN ALL RECENT RECORDINGS IN THE ACCOUNT AS A FALLBACK
    const recsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings.json?PageSize=50`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });
    const recsData = recsRes.ok ? await recsRes.json() : { recordings: [] };
    const accountRecsMap = new Map();
    (recsData.recordings || []).forEach((r: any) => {
      if (r.call_sid) accountRecsMap.set(r.call_sid, r.sid);
    });

    // Fetch last 20 calls
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?PageSize=20`, {
      headers: {
        'Authorization': `Basic ${auth}`
      }
    });

    if (!res.ok) throw new Error('Failed to fetch recent calls');
    
    const data = await res.json();
    
    // SAVE RAW DATA FOR DEBUGGING
    try {
      fs.writeFileSync(path.join(process.cwd(), 'raw_calls_debug.json'), JSON.stringify(data, null, 2));
    } catch (e) {}

    const filteredCalls = await Promise.all(data.calls.map(async (call: any) => {
          let recordingUrl = null;
          const from = call.from || '';
          const to = call.to || '';
          const isSip = from.startsWith('sip:') || to.startsWith('sip:');

          if (call.status === 'completed' || call.status === 'in-progress' || call.recording_sid) {
              try {
                  // Try this SID, parent SID, and check for child legs recordings
                  const sidsToTry = [call.sid];
                  if (call.parent_call_sid) sidsToTry.push(call.parent_call_sid);
                  
                  // Check current leg and potential parent for direct recordings
                  for (const sid of sidsToTry) {
                    const recRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${sid}/Recordings.json`, {
                        headers: { 'Authorization': `Basic ${auth}` }
                    });
                    if (recRes.ok) {
                        const recData = await recRes.json();
                        if (recData.recordings && recData.recordings.length > 0) {
                            const recSid = recData.recordings[0].sid;
                            recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recSid}.mp3`;
                            break;
                        }
                    }
                  }
                  
                  // LAST RESORT FALLBACK: Check our accountRecsMap (pre-fetched top 50 recs)
                  if (!recordingUrl) {
                     for (const sid of sidsToTry) {
                        const recSid = accountRecsMap.get(sid);
                        if (recSid) {
                           recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recSid}.mp3`;
                           break;
                        }
                     }
                  }

                  // If still no recording, check child legs (common for <Dial> recordings)
                  if (!recordingUrl) {
                    const childRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?ParentCallSid=${call.sid}`, {
                        headers: { 'Authorization': `Basic ${auth}` }
                    });
                    if (childRes.ok) {
                        const childData = await childRes.json();
                        for (const childCall of (childData.calls || [])) {
                          const childRecRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${childCall.sid}/Recordings.json`, {
                              headers: { 'Authorization': `Basic ${auth}` }
                          });
                          if (childRecRes.ok) {
                              const childRecData = await childRecRes.json();
                              if (childRecData.recordings && childRecData.recordings.length > 0) {
                                  const recSid = childRecData.recordings[0].sid;
                                  recordingUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Recordings/${recSid}.mp3`;
                                  break;
                              }
                          }
                        }
                    }
                  }
              } catch (e: any) { 
                console.error("Error fetching recording for", call.sid, e); 
              }
          }

          return {
              sid: call.sid,
              from: from,
              to: to,
              isSip: isSip,
              status: call.status,
              startTime: call.start_time,
              duration: call.duration,
              direction: call.direction,
              recordingUrl: recordingUrl,
              price: call.price,
              debug_found: !!recordingUrl
          };
    }));

    // NO FILTERING FOR DEBUG - RESTORED BUT KEPT RAW DATA LOGIC
    // Filter out internal SIP legs if they don't have recordings and aren't primary
    const finalCalls = filteredCalls.filter(c => {
      if (c.isSip && !c.recordingUrl) return false;
      return true;
    });

    return NextResponse.json({ 
      success: true, 
      calls: finalCalls,
      debug: {
        raw_count: data.calls.length,
        filtered_count: finalCalls.length
      }
    });
  } catch (error) {
    console.error("Error fetching calls:", error);
    return NextResponse.json({ success: false, error: "Failed to fetch calls" }, { status: 500 });
  }
}
