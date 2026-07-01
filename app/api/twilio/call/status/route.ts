import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const sid = searchParams.get('sid');
    if (!sid) {
      return NextResponse.json({ success: false, error: 'Missing call SID' }, { status: 400 });
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;

    if (!accountSid || !authToken) {
      return NextResponse.json({ success: false, error: 'Missing Twilio configuration' }, { status: 500 });
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    // 1. Fetch main call details
    const mainCallRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls/${sid}.json`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (!mainCallRes.ok) {
      return NextResponse.json({ success: false, error: 'Failed to fetch main call' }, { status: 404 });
    }

    const mainCall = await mainCallRes.json();
    const mainStatus = mainCall.status;

    // If main call is not yet in-progress or queued/ringing, the status is initiating
    if (mainStatus === 'queued' || mainStatus === 'ringing') {
      return NextResponse.json({ success: true, status: 'initiating', message: 'מחייג לנייד שלך...' });
    }

    if (mainStatus === 'busy') {
      return NextResponse.json({ success: true, status: 'busy', message: 'קו תפוס בנייד שלך' });
    }
    if (mainStatus === 'no-answer') {
      return NextResponse.json({ success: true, status: 'no-answer', message: 'אין מענה בנייד שלך' });
    }
    if (mainStatus === 'failed') {
      return NextResponse.json({ success: true, status: 'failed', message: 'שגיאה בחיוג לנייד שלך' });
    }
    if (mainStatus === 'canceled') {
      return NextResponse.json({ success: true, status: 'completed', message: 'שיחה בוטלה' });
    }

    // 2. If main call is in-progress, check if we have dialed the lead (child leg)
    const childCallsRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?ParentCallSid=${sid}`, {
      headers: { 'Authorization': `Basic ${auth}` }
    });

    if (childCallsRes.ok) {
      const childData = await childCallsRes.json();
      const childCall = childData.calls?.[0]; // the leg to the lead

      if (childCall) {
        const childStatus = childCall.status;
        if (childStatus === 'queued' || childStatus === 'ringing') {
          return NextResponse.json({ success: true, status: 'ringing_lead', message: 'השיחה התקבלה. כעת מחייג ללקוח...' });
        }
        if (childStatus === 'in-progress') {
          return NextResponse.json({ success: true, status: 'connected', message: 'שיחה פעילה מול הלקוח' });
        }
        if (childStatus === 'busy') {
          return NextResponse.json({ success: true, status: 'busy', message: 'הלקוח תפוס' });
        }
        if (childStatus === 'no-answer') {
          return NextResponse.json({ success: true, status: 'no-answer', message: 'הלקוח לא עונה' });
        }
        if (childStatus === 'failed') {
          return NextResponse.json({ success: true, status: 'failed', message: 'חיוג ללקוח נכשל' });
        }
        if (childStatus === 'completed') {
          return NextResponse.json({ success: true, status: 'completed', message: 'שיחה הסתיימה' });
        }
        if (childStatus === 'canceled') {
          return NextResponse.json({ success: true, status: 'completed', message: 'שיחה בוטלה' });
        }
      }
    }

    // Default if in-progress but no child leg created yet
    if (mainStatus === 'in-progress') {
      return NextResponse.json({ success: true, status: 'ringing_lead', message: 'התחברת לשיחה. מחייג ללקוח...' });
    }

    if (mainStatus === 'completed') {
      return NextResponse.json({ success: true, status: 'completed', message: 'השיחה הסתיימה' });
    }

    return NextResponse.json({ success: true, status: mainStatus, message: mainStatus });
  } catch (err: any) {
    console.error('Error fetching call status:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
