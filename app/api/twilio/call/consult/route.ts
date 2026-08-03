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
    const { action, leadPhone, lawyerPhone, roomName } = body;

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioPhone = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !twilioPhone) {
      return NextResponse.json({ success: false, error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
    const authHeader = `Basic ${auth}`;
    const targetRoom = roomName || 'consult_room';

    if (action === 'dial_gil') {
      const gilNum = lawyerPhone || process.env.LAWYER_GIL_PHONE || '0509833303';
      const e164Gil = normalizeToE164(gilNum);

      // Step 1: Find active participants in the conference room and put lead on hold
      const confsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences.json?FriendlyName=${targetRoom}&Status=in-progress`,
        { headers: { Authorization: authHeader } }
      );
      const confsData = await confsRes.json();
      const activeConf = confsData.conferences?.[0];

      if (activeConf) {
        const partsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${activeConf.sid}/Participants.json`,
          { headers: { Authorization: authHeader } }
        );
        const partsData = await partsRes.json();
        const participants = partsData.participants || [];

        // Hold all participants except agent
        for (const p of participants) {
          if (!p.label?.includes('agent') && !p.call_sid?.includes('client:')) {
            await fetch(
              `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${activeConf.sid}/Participants/${p.sid}.json`,
              {
                method: 'POST',
                headers: {
                  Authorization: authHeader,
                  'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: new URLSearchParams({ Hold: 'true' }).toString(),
              }
            ).catch(() => {});
          }
        }

        // Step 2: Dial Gil into the conference
        const params = new URLSearchParams();
        params.append('To', e164Gil);
        params.append('From', twilioPhone);
        params.append('EarlyMedia', 'true');
        params.append('Hold', 'false');
        params.append('Muted', 'false');
        params.append('Beep', 'false');

        const addGilRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${activeConf.sid}/Participants.json`,
          {
            method: 'POST',
            headers: {
              Authorization: authHeader,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
          }
        );
        const addGilData = await addGilRes.json();

        return NextResponse.json({
          success: true,
          message: 'מחייג לעו"ד גיל... הליד הועבר להמתנה',
          gilParticipantSid: addGilData.sid,
          confSid: activeConf.sid,
        });
      } else {
        return NextResponse.json({
          success: true,
          message: 'מחייג לעו"ד גיל...',
        });
      }
    }

    if (action === 'merge') {
      // Find active conference and unhold everyone
      const confsRes = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences.json?FriendlyName=${targetRoom}&Status=in-progress`,
        { headers: { Authorization: authHeader } }
      );
      const confsData = await confsRes.json();
      const activeConf = confsData.conferences?.[0];

      if (activeConf) {
        const partsRes = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${activeConf.sid}/Participants.json`,
          { headers: { Authorization: authHeader } }
        );
        const partsData = await partsRes.json();
        const participants = partsData.participants || [];

        for (const p of participants) {
          await fetch(
            `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Conferences/${activeConf.sid}/Participants/${p.sid}.json`,
            {
              method: 'POST',
              headers: {
                Authorization: authHeader,
                'Content-Type': 'application/x-www-form-urlencoded',
              },
              body: new URLSearchParams({ Hold: 'false', Muted: 'false' }).toString(),
            }
          ).catch(() => {});
        }

        return NextResponse.json({
          success: true,
          message: 'השיחות אוחדו לשיחת ועידה (3 משתתפים)',
        });
      }

      return NextResponse.json({ success: true, message: 'השיחות אוחדו' });
    }

    return NextResponse.json({ success: false, error: 'פעולה לא מוכרת' }, { status: 400 });
  } catch (err: any) {
    console.error('Consultation Route Error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
