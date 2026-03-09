import { NextResponse } from 'next/server';
import { getLeads } from '@/utils/storage';
import fs from 'fs/promises';
import path from 'path';

const dbPath = path.join(process.cwd(), 'leads.json');

export async function POST(req: Request) {
  try {
    const { id } = await req.json();
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Missing lead ID' }, { status: 400 });
    }

    const leads = await getLeads();
    const filtered = leads.filter(l => l.id !== id);
    
    if (filtered.length === leads.length) {
      return NextResponse.json({ success: false, error: 'Lead not found' }, { status: 404 });
    }

    await fs.writeFile(dbPath, JSON.stringify(filtered, null, 2), 'utf8');
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting lead:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
