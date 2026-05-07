import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDB } from '@/utils/storage';
import type { Lead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    
    // Support both formats: { leads: [...] } or direct array
    const leads: Lead[] = Array.isArray(data) ? data : data.leads;
    
    if (!leads || !Array.isArray(leads)) {
      return NextResponse.json({ success: false, error: 'קובץ לא תקין — חסר מערך לידים' }, { status: 400 });
    }

    // Validate each lead has required fields
    for (let i = 0; i < leads.length; i++) {
      const lead = leads[i];
      if (!lead.id) {
        return NextResponse.json({ 
          success: false, 
          error: `ליד מספר ${i + 1} חסר שדה id` 
        }, { status: 400 });
      }
    }

    await initDB();

    // Clear existing data and insert backup data
    await sql`DELETE FROM leads`;
    
    for (const lead of leads) {
      await sql`
        INSERT INTO leads (id, data, created_at) 
        VALUES (${lead.id}, ${JSON.stringify(lead)}, ${lead.createdAt || new Date().toISOString()})
        ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(lead)}
      `;
    }

    return NextResponse.json({ 
      success: true, 
      count: leads.length,
      message: `שוחזרו ${leads.length} לידים בהצלחה`
    });
  } catch (error: any) {
    console.error('Backup restore error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message || 'שגיאה בשחזור הגיבוי' 
    }, { status: 500 });
  }
}
