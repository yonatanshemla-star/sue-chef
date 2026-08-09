import { sql } from '@vercel/postgres';

export interface AITask {
  id: string;
  text: string;
  dueDate: string | null;
  type: 'call' | 'document' | 'followup' | 'general';
  completed: boolean;
  createdAt: string;
}

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
  statusHistory?: { from: string; to: string; timestamp: string }[];
  lawyerNotes?: string;
  caseStatus?: string;
  profit?: number;
  isPaid?: boolean;
  paidAt?: string;
  whatsappSentAt?: string;
  salary?: string;
  employmentStatus?: string;
  medicalStatus?: string;
  isStarred?: boolean;
  whatsappReplyAnalyzed?: boolean;
  campaign?: string;
  leadimId?: string;
  aiTasks?: AITask[];
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
  await sql`
    CREATE TABLE IF NOT EXISTS deleted_leads (
      id TEXT PRIMARY KEY,
      leadim_id TEXT,
      phone TEXT,
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
    throw error;
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
  try {
    const { rows } = await sql`SELECT data FROM leads WHERE id = ${id}`;
    if (rows && rows.length > 0) {
      const lead = rows[0].data as Lead;
      const leadimId = lead.leadimId || null;
      const phone = lead.phone ? lead.phone.replace(/\D/g, '').slice(-9) : null;
      if (leadimId || phone) {
        await sql`
          INSERT INTO deleted_leads (id, leadim_id, phone)
          VALUES (${id}, ${leadimId}, ${phone})
          ON CONFLICT (id) DO NOTHING
        `;
      }
    }
  } catch (e) {
    console.error('Error recording deleted_leads tombstone:', e);
  }
  const result = await sql`DELETE FROM leads WHERE id = ${id}`;
  return (result.rowCount ?? 0) > 0;
}

export async function getDeletedLeadimIdentifiers(): Promise<{ leadimIds: Set<string>; phones: Set<string> }> {
  try {
    await initDB();
    const { rows } = await sql`SELECT leadim_id, phone FROM deleted_leads`;
    const leadimIds = new Set<string>();
    const phones = new Set<string>();
    for (const r of rows) {
      if (r.leadim_id) leadimIds.add(r.leadim_id);
      if (r.phone) phones.add(r.phone);
    }
    return { leadimIds, phones };
  } catch (e) {
    console.error('getDeletedLeadimIdentifiers error:', e);
    return { leadimIds: new Set(), phones: new Set() };
  }
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
    const { rows } = await sql`SELECT * FROM debug_voice_logs ORDER BY created_at DESC LIMIT 100`;
    return rows;
  } catch (e) {
    console.error('Get voice logs error:', e);
    return [];
  }
}
