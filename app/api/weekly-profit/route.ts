import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

function getWeekBounds() {
  const now = new Date();
  const day = now.getDay(); // 0=Sunday
  // Start of week = last Sunday (or today if Sunday)
  const sundayOffset = day; // days since Sunday
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - sundayOffset);
  weekStart.setHours(0, 0, 0, 0);
  
  // End of week = Thursday 23:59:59
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 4); // Thursday
  weekEnd.setHours(23, 59, 59, 999);
  
  return { weekStart, weekEnd };
}

export async function GET() {
  try {
    const { weekStart, weekEnd } = getWeekBounds();
    const weekStartISO = weekStart.toISOString();
    const weekEndISO = weekEnd.toISOString();

    // 1. Count leads signed this week
    const signedRes = await sql`
      SELECT count(*) as count
      FROM leads 
      WHERE (data->>'status') = 'חתם'
        AND (data->>'signedAt') IS NOT NULL
        AND (data->>'signedAt') >= ${weekStartISO}
        AND (data->>'signedAt') <= ${weekEndISO}
    `;
    const signedThisWeek = parseInt(signedRes.rows[0]?.count) || 0;

    // 2. Get Twilio costs this week from calls API
    let twilioCostThisWeek = 0;
    try {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      if (accountSid && authToken) {
        const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
        const startDate = weekStart.toISOString().split('T')[0];
        const endDate = weekEnd.toISOString().split('T')[0];
        const res = await fetch(
          `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json?StartTime>=${startDate}&StartTime<=${endDate}&PageSize=200`,
          { headers: { 'Authorization': `Basic ${auth}` } }
        );
        if (res.ok) {
          const data = await res.json();
          for (const call of (data.calls || [])) {
            twilioCostThisWeek += Math.abs(parseFloat(call.price || "0"));
          }
        }
      }
    } catch (e) {
      console.error("Error fetching Twilio costs:", e);
    }

    const revenuePerClient = 1000; // NIS
    const grossRevenue = signedThisWeek * revenuePerClient;
    const twilioCostNIS = twilioCostThisWeek * 3.6; // USD to NIS approximate
    const netProfit = grossRevenue - twilioCostNIS;

    return NextResponse.json({
      success: true,
      data: {
        weekStart: weekStartISO,
        weekEnd: weekEndISO,
        signedThisWeek,
        grossRevenue,
        twilioCostUSD: parseFloat(twilioCostThisWeek.toFixed(2)),
        twilioCostNIS: parseFloat(twilioCostNIS.toFixed(2)),
        netProfit: parseFloat(netProfit.toFixed(2))
      }
    });

  } catch (error) {
    console.error("Error in weekly-profit API:", error);
    return NextResponse.json({ success: false, error: "Failed" }, { status: 500 });
  }
}
