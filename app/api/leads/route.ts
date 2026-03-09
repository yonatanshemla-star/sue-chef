import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

export async function GET() {
  try {
    const leads = await getLeads();
    
    // Sort leads by newest first
    const sortedLeads = leads.sort((a, b) => {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return NextResponse.json({ success: true, leads: sortedLeads });
  } catch (error: any) {
    console.error('Failed to fetch leads:', error);
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 });
  }
}
