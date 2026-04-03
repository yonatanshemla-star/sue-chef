import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

export async function GET() {
  try {
    const leads = await getLeads();
    const signedLeads = leads.filter(l => l.status === 'חתם' || l.isSigned);
    return NextResponse.json({ success: true, leads: signedLeads });
  } catch (error: any) {
    console.error('Lawyer leads error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
