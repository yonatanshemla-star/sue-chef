import fs from 'fs/promises';
import path from 'path';

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
  urgency: 'נמוכה' | 'בינונית' | 'גבוהה';
  isSigned?: boolean; // explicit flag
  signedAt?: string;  // date when signed
}

const dbPath = path.join(process.cwd(), 'leads.json');

export async function getLeads(): Promise<Lead[]> {
  try {
    const data = await fs.readFile(dbPath, 'utf8');
    return JSON.parse(data);
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      // Return empty array if file doesn't exist yet
      return [];
    }
    throw error;
  }
}

export async function saveLead(lead: Lead): Promise<void> {
  const currentLeads = await getLeads();
  currentLeads.push(lead);
  await fs.writeFile(dbPath, JSON.stringify(currentLeads, null, 2), 'utf8');
}

export async function updateLead(updatedLead: Lead): Promise<void> {
  const leads = await getLeads();
  const index = leads.findIndex(l => l.id === updatedLead.id);
  if (index !== -1) {
    leads[index] = updatedLead;
    await fs.writeFile(dbPath, JSON.stringify(leads, null, 2), 'utf8');
  }
}
