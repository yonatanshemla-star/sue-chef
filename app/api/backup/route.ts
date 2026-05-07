import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';

export async function GET() {
  try {
    const leads = await getLeads();
    
    const backup = {
      version: '1.0',
      exportedAt: new Date().toISOString(),
      system: 'Sue-Chef CRM',
      totalLeads: leads.length,
      leads
    };

    const json = JSON.stringify(backup, null, 2);
    
    return new NextResponse(json, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="suechef-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Backup export error:', error);
    return NextResponse.json({ error: 'Failed to export backup' }, { status: 500 });
  }
}
