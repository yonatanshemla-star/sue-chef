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
  email?: string;
  source: 'Twilio' | 'LeadIM' | 'Manual' | 'CSV Campaign';
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
  campaignTag?: string;
  campaignWhatsAppStatus?: 'pending' | 'queued' | 'sent' | 'failed';
  campaignWhatsAppQueue?: { messageTemplate: string; queuedAt: string };
  campaignEmailStatus?: 'pending' | 'sent' | 'failed' | 'no_email';
  campaignReplied?: boolean;
  campaignReplyChannel?: 'whatsapp' | 'email';
  campaignReplyText?: string;
  campaignRepliedAt?: string;
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
  await sql`
    CREATE TABLE IF NOT EXISTS system_settings (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS excluded_leadim_leads (
      leadim_id TEXT PRIMARY KEY,
      campaign TEXT,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;
}

export interface CampaignSettings {
  excludedCampaigns: string[];
  customCampaigns: string[];
}

export async function getCampaignSettings(): Promise<CampaignSettings> {
  try {
    await initDB();
    const { rows } = await sql`SELECT value FROM system_settings WHERE key = 'campaign_settings'`;
    if (rows && rows.length > 0 && rows[0].value) {
      const val = rows[0].value as any;
      return {
        excludedCampaigns: Array.isArray(val.excludedCampaigns) ? val.excludedCampaigns : [],
        customCampaigns: Array.isArray(val.customCampaigns) ? val.customCampaigns : [],
      };
    }
  } catch (e) {
    console.error('getCampaignSettings error:', e);
  }
  return { excludedCampaigns: [], customCampaigns: [] };
}

export async function saveCampaignSettings(settings: Partial<CampaignSettings>): Promise<CampaignSettings> {
  await initDB();
  const current = await getCampaignSettings();
  const updated: CampaignSettings = {
    excludedCampaigns: settings.excludedCampaigns !== undefined ? settings.excludedCampaigns : current.excludedCampaigns,
    customCampaigns: settings.customCampaigns !== undefined ? settings.customCampaigns : current.customCampaigns,
  };
  await sql`
    INSERT INTO system_settings (key, value, updated_at)
    VALUES ('campaign_settings', ${JSON.stringify(updated)}, NOW())
    ON CONFLICT (key) DO UPDATE SET value = ${JSON.stringify(updated)}, updated_at = NOW()
  `;
  return updated;
}

export function isCampaignExcluded(campaignName: string | undefined | null, excludedList: string[]): boolean {
  if (!campaignName || !excludedList || excludedList.length === 0) return false;
  const target = campaignName.trim().toLowerCase();
  if (!target) return false;
  return excludedList.some(item => {
    const ex = item.trim().toLowerCase();
    if (!ex) return false;
    return target === ex || target.includes(ex);
  });
}

export async function recordExcludedLeadimId(leadimId: string, campaign?: string): Promise<void> {
  try {
    await initDB();
    await sql`
      INSERT INTO excluded_leadim_leads (leadim_id, campaign)
      VALUES (${leadimId}, ${campaign || null})
      ON CONFLICT (leadim_id) DO NOTHING
    `;
  } catch (e) {
    console.error('recordExcludedLeadimId error:', e);
  }
}

export async function getExcludedLeadimIds(): Promise<Set<string>> {
  try {
    await initDB();
    const { rows } = await sql`SELECT leadim_id FROM excluded_leadim_leads`;
    return new Set(rows.map(r => r.leadim_id).filter(Boolean));
  } catch (e) {
    console.error('getExcludedLeadimIds error:', e);
    return new Set();
  }
}

export async function getAllUniqueCampaigns(): Promise<{ campaign: string; count: number }[]> {
  try {
    await initDB();
    const { rows } = await sql`
      SELECT data->>'campaign' as campaign, count(*) as count
      FROM leads
      WHERE data->>'campaign' IS NOT NULL AND data->>'campaign' != ''
      GROUP BY 1
      ORDER BY 2 DESC
    `;
    return rows.map(r => ({ campaign: r.campaign, count: parseInt(r.count, 10) || 0 }));
  } catch (e) {
    console.error('getAllUniqueCampaigns error:', e);
    return [];
  }
}

export async function getLeads(): Promise<Lead[]> {
  try {
    await initDB();
    const { rows: deletedRows } = await sql`SELECT leadim_id FROM deleted_leads`;
    const deletedLeadimIds = new Set(deletedRows.map(r => r.leadim_id).filter(Boolean));

    const { rows } = await sql`SELECT id, data FROM leads ORDER BY created_at DESC`;
    const activeLeads: Lead[] = [];

    for (const r of rows) {
      const l = r.data as Lead;
      const isTombstoned = l.leadimId ? deletedLeadimIds.has(l.leadimId) : false;

      if (isTombstoned) {
        // Automatically purge from PostgreSQL leads table
        await sql`DELETE FROM leads WHERE id = ${l.id}`;
      } else {
        activeLeads.push(l);
      }
    }

    return activeLeads;
  } catch (error) {
    console.error('DB getLeads error:', error);
    throw error;
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  await initDB();
  // Don't save if specific leadimId is tombstoned as deleted
  const deleted = await getDeletedLeadimIdentifiers();
  if (lead.leadimId && deleted.leadimIds.has(lead.leadimId)) {
    return;
  }

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
      if (leadimId) {
        await sql`
          INSERT INTO deleted_leads (id, leadim_id)
          VALUES (${id}, ${leadimId})
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
