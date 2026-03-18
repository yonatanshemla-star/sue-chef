import { NextResponse } from 'next/server';
import { getVoiceLogs } from '@/utils/storage';

export async function GET() {
  try {
    const logs = await getVoiceLogs();
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
