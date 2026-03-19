import { sql } from '@vercel/postgres';

export interface Lead {
  id: string;
  clientName: string;
  phone?: string;
  source: 'Twilio' | 'LeadIM' | 'Manual';
  createdAt: string;
  lastContacted: string | null;
  status: string;
  followUpDate: string;
  generalNotes: string;
  liveCallNotes: string;
  recordingUrl?: string;
  transcription?: string;
  aiSummary?: string;
  sentiment?: 'חיובי' | 'ניטרלי' | 'שלילי';
  fullTranscription?: string;
  urgency: 'נמוכה' | 'בינונית' | 'גבוהה';
  isSigned?: boolean;
  signedAt?: string;
  wasRelevant?: boolean;
  disqualificationReason?: string;
  callCount?: number;
}

export async function initDB() {
  await sql`
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS debug_voice_logs (
      id SERIAL PRIMARY KEY,
      data JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export async function getLeads(): Promise<Lead[]> {
  try {
    await initDB();
    const { rows } = await sql`SELECT data FROM leads ORDER BY created_at DESC`;
    return rows.map((r: any) => r.data as Lead);
  } catch (error) {
    console.error('DB getLeads error:', error);
    return [];
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  await initDB();
  await sql`
    INSERT INTO leads (id, data, created_at) 
    VALUES (${lead.id}, ${JSON.stringify(lead)}, ${lead.createdAt})
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(lead)}
  `;
}

export async function updateLead(updatedLead: Lead): Promise<void> {
  await initDB();
  await sql`
    UPDATE leads SET data = ${JSON.stringify(updatedLead)} WHERE id = ${updatedLead.id}
  `;
}

export async function deleteLead(id: string): Promise<boolean> {
  await initDB();
  const result = await sql`DELETE FROM leads WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

export async function logVoiceRequest(data: any): Promise<void> {
  try {
    await initDB();
    await sql`INSERT INTO debug_voice_logs (data) VALUES (${JSON.stringify(data)})`;
  } catch (e) {
    console.error('Log voice error:', e);
  }
}

export async function getVoiceLogs(): Promise<any[]> {
  try {
    await initDB();
    const { rows } = await sql`SELECT * FROM debug_voice_logs ORDER BY created_at DESC LIMIT 20`;
    return rows;
  } catch (e) {
    return [];
  }
}
