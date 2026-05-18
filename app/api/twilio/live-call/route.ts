import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { getLeads } from '@/utils/storage';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
  try {
    // 1. Query for any incoming call arriving in the last 30 seconds
    const { rows } = await sql`
      SELECT data, created_at 
      FROM debug_voice_logs 
      WHERE created_at >= NOW() - INTERVAL '30 seconds'
      ORDER BY created_at DESC 
      LIMIT 5
    `;

    if (!rows || rows.length === 0) {
      return NextResponse.json({ success: true, activeCall: null });
    }

    // Find the first external incoming call
    let activeCallData: any = null;
    for (const row of rows) {
      const data = row.data || {};
      const from = data['From'] || '';
      const fromStr = from.toString();
      // Skip if it's an internal WebRTC client or SIP connection dialing out
      if (fromStr.startsWith('client:') || fromStr.startsWith('sip:')) {
        continue;
      }
      activeCallData = { data, createdAt: row.created_at };
      break;
    }

    if (!activeCallData) {
      return NextResponse.json({ success: true, activeCall: null });
    }

    const { data } = activeCallData;
    const fromPhone = data['From'] || '';
    
    // Normalize phone number to match against leads
    const normalizedPhone = fromPhone.replace(/\D/g, '').slice(-9);
    
    // Format phone nicely for display if no name found
    let displayPhone = fromPhone;
    if (displayPhone.startsWith('+972')) displayPhone = '0' + displayPhone.slice(4);
    else if (displayPhone.startsWith('972')) displayPhone = '0' + displayPhone.slice(3);

    return NextResponse.json({
      success: true,
      activeCall: {
        from: displayPhone,
        timestamp: activeCallData.createdAt
      }
    });

  } catch (error) {
    console.error('Error fetching live call:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch live call status' }, { status: 500 });
  }
}
