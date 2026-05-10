import { NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';

// Initialize daily notes table
async function initNotesTable() {
  await sql`
    CREATE TABLE IF NOT EXISTS daily_notes (
      id SERIAL PRIMARY KEY,
      date TEXT UNIQUE NOT NULL,
      items JSONB NOT NULL DEFAULT '[]',
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

// GET: fetch note for a specific date (or today)
export async function GET(req: Request) {
  try {
    await initNotesTable();
    const url = new URL(req.url);
    const date = url.searchParams.get('date') || new Date().toISOString().split('T')[0];
    
    const result = await sql`SELECT * FROM daily_notes WHERE date = ${date}`;
    
    if (result.rows.length === 0) {
      return NextResponse.json({ success: true, date, items: [] });
    }
    
    return NextResponse.json({ 
      success: true, 
      date, 
      items: result.rows[0].items 
    });
  } catch (error: any) {
    console.error('Notes GET error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST: save note items for a specific date
export async function POST(req: Request) {
  try {
    await initNotesTable();
    const { date, items } = await req.json();
    const noteDate = date || new Date().toISOString().split('T')[0];
    
    await sql`
      INSERT INTO daily_notes (date, items, updated_at) 
      VALUES (${noteDate}, ${JSON.stringify(items)}, NOW())
      ON CONFLICT (date) DO UPDATE SET items = ${JSON.stringify(items)}, updated_at = NOW()
    `;

    // Cleanup: delete notes older than 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoff = sevenDaysAgo.toISOString().split('T')[0];
    await sql`DELETE FROM daily_notes WHERE date < ${cutoff}`;
    
    return NextResponse.json({ success: true, date: noteDate, items });
  } catch (error: any) {
    console.error('Notes POST error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
