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
      // The WebRTC client call is the parent, and it created a child call to the lead
      let agentCallSid = activeCallSid || '';
      let leadCallSid = '';

      // Find active calls
      const callsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=in-progress&PageSize=20`,
        { headers: { Authorization: authHeader } }
      );
      const callsData = await callsRes.json();
      const activeCalls = callsData.calls || [];

      console.log(`[Consult] Found ${activeCalls.length} active calls`);

      for (const call of activeCalls) {
        console.log(`[Consult] Call SID=${call.sid}, From=${call.from}, To=${call.to}, Direction=${call.direction}, ParentCallSid=${call.parent_call_sid || 'none'}`);
        
        // The agent's WebRTC call originates from client:dashboard_user
        if (call.from === 'client:dashboard_user' || call.from?.startsWith('client:')) {
          agentCallSid = call.sid;
        }
        // The lead call is the child call to an external number
        if (call.parent_call_sid && !call.to?.startsWith('client:')) {
          leadCallSid = call.sid;
        }
      }

      if (!agentCallSid) {
        console.log('[Consult] Could not find agent call SID');
        return NextResponse.json({ success: false, error: 'לא נמצאה שיחה פעילה מהדפדפן' });
      }

      console.log(`[Consult] Agent call: ${agentCallSid}, Lead call: ${leadCallSid}`);

      // Step 2: Redirect the agent's call into a conference
      const agentConfTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="true" waitUrl="">${confName}</Conference>
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

      // Step 3: Redirect the lead's call into the same conference, but on HOLD
      if (leadCallSid) {
        const leadConfTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="false" endConferenceOnExit="false" waitUrl="http://twimlets.com/holdmusic?Bucket=com.twilio.music.soft-rock">${confName}</Conference>
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
        console.log(`[Consult] Redirect lead to conference (hold): ${updateLeadRes.status}`);
      }

      // Step 4: Wait a moment for the conference to be created, then dial Gil
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Dial Gil using Twilio REST API Calls (creates a new outbound call to Gil)
      const gilTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false" waitUrl="">${confName}</Conference>
  </Dial>
</Response>`;

      const gilTwimlUrl = `${baseUrl}/api/twilio/call/consult-twiml?conf=${encodeURIComponent(confName)}&role=gil`;

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

    if (action === 'merge') {
      const { confName: mergeConfName } = body;

      if (!mergeConfName) {
        return NextResponse.json({ success: false, error: 'חסר שם ועידה' });
      }

      console.log(`[Consult] Merging conference: ${mergeConfName}`);

      // Find the conference
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

      // Find ALL calls in the system to locate the lead call that is on hold music
      const callsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?Status=in-progress&PageSize=20`,
        { headers: { Authorization: authHeader } }
      );
      const callsData = await callsRes.json();
      const activeCalls = callsData.calls || [];

      // Find the lead call (the one with a parent_call_sid or the one connected to an external number that's not Gil)
      for (const call of activeCalls) {
        // Look for calls that are in-progress but NOT in the conference (lead on hold music)
        if (call.parent_call_sid && !call.to?.startsWith('client:')) {
          // This is likely the lead - redirect them into the conference with startConferenceOnEnter=true
          const mergeLeadTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Dial>
    <Conference beep="false" startConferenceOnEnter="true" endConferenceOnExit="false" waitUrl="">${mergeConfName}</Conference>
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

          console.log(`[Consult] Merged lead call ${call.sid} into conference`);
          break;
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
