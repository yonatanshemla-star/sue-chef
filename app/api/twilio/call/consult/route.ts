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
    const body = await req.json();
    const { action, leadPhone, lawyerPhone, activeCallSid } = body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      return NextResponse.json({ success: false, error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const authHeader = `Basic ${auth}`;

    // Get the host for generating TwiML URLs
    const host = req.headers.get('host') || '';
    const protocol = host.includes('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    if (action === 'dial_gil') {
      const gilNum = lawyerPhone || process.env.LAWYER_GIL_PHONE || '0509833303';
      const e164Gil = normalizeToE164(gilNum);
      const confName = `consult_${Date.now()}`;

      console.log(`[Consult] Starting consultation - dialing Gil at ${e164Gil}, conference: ${confName}`);

      // Step 1: Find ALL active calls to identify the current WebRTC call and lead call
      let agentCallSid = activeCallSid || '';
      let leadCallSid = '';

      const callsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=in-progress&PageSize=20`,
        { headers: { Authorization: authHeader } }
      );
      const callsData = await callsRes.json();
      const activeCalls: any[] = callsData.calls || [];

      console.log(`[Consult] Found ${activeCalls.length} active calls`);

      for (const call of activeCalls) {
        console.log(`[Consult] Call SID=${call.sid}, From=${call.from}, To=${call.to}, Direction=${call.direction}, ParentCallSid=${call.parent_call_sid || 'none'}`);
      }

      // Find WebRTC agent call (where From or To starts with client:)
      const agentCall = activeCalls.find(call => 
        call.from?.startsWith('client:') || call.to?.startsWith('client:')
      );

      if (agentCall) {
        agentCallSid = agentCall.sid;

        // If agentCall has a parent_call_sid, this is an INBOUND call (lead called browser). The parent call is the lead.
        if (agentCall.parent_call_sid) {
          leadCallSid = agentCall.parent_call_sid;
        } else {
          // If agentCall has no parent, this is an OUTBOUND call (browser called lead). The child call is the lead.
          const childCall = activeCalls.find(call => call.parent_call_sid === agentCallSid);
          if (childCall) {
            leadCallSid = childCall.sid;
          }
        }
      }

      // Fallback: If leadCallSid still not found, search for any active non-client call
      if (!leadCallSid) {
        const otherCall = activeCalls.find(call => 
          call.sid !== agentCallSid && !call.from?.startsWith('client:') && !call.to?.startsWith('client:')
        );
        if (otherCall) {
          leadCallSid = otherCall.sid;
        }
      }

      if (!agentCallSid) {
        console.log('[Consult] Could not find agent call SID');
        return NextResponse.json({ success: false, error: 'לא נמצאה שיחה פעילה מהדפדפן' });
      }

      console.log(`[Consult] Resolved Agent call SID: ${agentCallSid}, Lead call SID: ${leadCallSid}`);

      // Step 2: Redirect the lead's call FIRST so it doesn't get hung up when parent leaves <Dial>
      if (leadCallSid) {
        const leadConfTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${confName}</Conference>
  </Dial>
</Response>`;

        const updateLeadRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${leadCallSid}.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ Twiml: leadConfTwiml }).toString(),
          }
        );
        console.log(`[Consult] Redirect lead to conference first: ${updateLeadRes.status}`);
      }

      // Short delay to allow lead call to enter conference
      await new Promise(resolve => setTimeout(resolve, 400));

      // Step 3: Redirect the agent's call into the conference
      const agentConfTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true">${confName}</Conference>
  </Dial>
</Response>`;

      const updateAgentRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${agentCallSid}.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ Twiml: agentConfTwiml }).toString(),
        }
      );
      console.log(`[Consult] Redirect agent to conference: ${updateAgentRes.status}`);

      // Step 4: Wait for conference to initialize, then set lead on HOLD in the conference
      await new Promise(resolve => setTimeout(resolve, 1000));

      if (leadCallSid) {
        // Find conference SID
        const confsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences.json?FriendlyName=${encodeURIComponent(confName)}&Status=in-progress`,
          { headers: { Authorization: authHeader } }
        );
        const confsData = await confsRes.json();
        const confSid = confsData.conferences?.[0]?.sid;

        if (confSid) {
          // Put lead participant on HOLD (listens to music/silence, muted both ways)
          const holdRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confSid}/Participants/${leadCallSid}.json`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ Hold: 'true' }).toString(),
            }
          );
          console.log(`[Consult] Placed lead ${leadCallSid} on HOLD in conf ${confSid}: ${holdRes.status}`);
        }
      }

      // Step 5: Dial Gil using Twilio REST API Calls into the conference
      const gilTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${confName}</Conference>
  </Dial>
</Response>`;

      const gilCallParams = new URLSearchParams();
      gilCallParams.append('To', e164Gil);
      gilCallParams.append('From', twilioPhone);
      gilCallParams.append('Twiml', gilTwiml);

      const gilCallRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
        {
          method: 'POST',
          headers: {
            Authorization: authHeader,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: gilCallParams.toString(),
        }
      );
      const gilCallData = await gilCallRes.json();
      console.log(`[Consult] Gil call created: ${gilCallRes.status}, SID=${gilCallData.sid || 'none'}, Error=${gilCallData.message || 'none'}`);

      if (gilCallRes.status >= 400) {
        return NextResponse.json({
          success: false,
          error: gilCallData.message || 'נכשל החיוג לעו"ד גיל',
        });
      }

      return NextResponse.json({
        success: true,
        message: 'מחייג לעו"ד גיל... הליד הועבר להמתנה',
        confName,
        gilCallSid: gilCallData.sid,
        agentCallSid,
        leadCallSid,
      });
    }

    if (action === 'hangup_gil') {
      const { confName: hangupConfName, gilCallSid } = body;

      console.log(`[Consult] Hanging up Gil call: ${gilCallSid || 'none'}, conf: ${hangupConfName || 'none'}`);

      // 1. Terminate Gil's call leg if provided
      if (gilCallSid) {
        await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${gilCallSid}.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({ Status: 'completed' }).toString(),
          }
        ).catch(err => console.error('[Consult] Error ending Gil call leg:', err));
      }

      // 2. Unhold the lead in the conference
      if (hangupConfName) {
        const confsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences.json?FriendlyName=${encodeURIComponent(hangupConfName)}&Status=in-progress`,
          { headers: { Authorization: authHeader } }
        );
        const confsData = await confsRes.json();
        const activeConf = confsData.conferences?.[0];

        if (activeConf) {
          const confSid = activeConf.sid;
          const partsRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confSid}/Participants.json`,
            { headers: { Authorization: authHeader } }
          );
          const partsData = await partsRes.json();
          const participants = partsData.participants || [];

          for (const p of participants) {
            if (p.hold) {
              await fetch(
                `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confSid}/Participants/${p.call_sid}.json`,
                {
                  method: 'POST',
                  headers: {
                    Authorization: authHeader,
                    'Content-Type': 'application/x-www-form-urlencoded',
                  },
                  body: new URLSearchParams({ Hold: 'false' }).toString(),
                }
              );
              console.log(`[Consult] Unheld participant ${p.call_sid} after Gil hangup`);
            }
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'השיחה עם עו"ד גיל הופסקה. חזרת לשיחה עם הליד.',
      });
    }

    if (action === 'merge') {
      const { confName: mergeConfName } = body;

      if (!mergeConfName) {
        return NextResponse.json({ success: false, error: 'חסר שם ועידה' });
      }

      console.log(`[Consult] Merging conference: ${mergeConfName}`);

      // Find the active conference
      const confsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences.json?FriendlyName=${encodeURIComponent(mergeConfName)}&Status=in-progress`,
        { headers: { Authorization: authHeader } }
      );
      const confsData = await confsRes.json();
      const activeConf = confsData.conferences?.[0];

      if (!activeConf) {
        console.log('[Consult] No active conference found for merge');
        return NextResponse.json({ success: false, error: 'לא נמצאה ועידה פעילה' });
      }

      const confSid = activeConf.sid;

      // Get all participants in the conference
      const partsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confSid}/Participants.json`,
        { headers: { Authorization: authHeader } }
      );
      const partsData = await partsRes.json();
      const participants = partsData.participants || [];

      console.log(`[Consult] Found ${participants.length} participants in conference ${confSid}`);

      // Unhold any participant that is currently on hold (the lead)
      let unheldCount = 0;
      for (const p of participants) {
        if (p.hold) {
          const unholdRes = await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${confSid}/Participants/${p.call_sid}.json`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ Hold: 'false' }).toString(),
            }
          );
          console.log(`[Consult] Unheld participant ${p.call_sid}: ${unholdRes.status}`);
          unheldCount++;
        }
      }

      // Fallback: If no held participant was found, check active calls and add lead if missing
      if (unheldCount === 0) {
        console.log('[Consult] No held participants found, checking active calls for lead fallback...');
        const callsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=in-progress&PageSize=20`,
          { headers: { Authorization: authHeader } }
        );
        const callsData = await callsRes.json();
        const activeCalls = callsData.calls || [];

        for (const call of activeCalls) {
          if (call.parent_call_sid && !call.to?.startsWith('client:')) {
            const mergeLeadTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false">${mergeConfName}</Conference>
  </Dial>
</Response>`;

            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${call.sid}.json`,
              {
                method: 'POST',
                headers: {
                  Authorization: authHeader,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ Twiml: mergeLeadTwiml }).toString(),
              }
            ).catch(err => console.error('[Consult] Failed to merge lead:', err));
            break;
          }
        }
      }

      return NextResponse.json({
        success: true,
        message: 'השיחות אוחדו לשיחת ועידה (3 משתתפים)',
      });
    }

    return NextResponse.json({ success: false, error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (err: any) {
    console.error('Consultation Route Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
