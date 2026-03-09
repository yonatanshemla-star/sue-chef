import { NextResponse } from 'next/server';
import { getLeads, updateLead, saveLead } from '@/utils/storage';

export async function POST(req: Request) {
  try {
    const data = await req.json();
    const leads = await getLeads();
    
    // Check if lead exists
    const existingIndex = leads.findIndex(l => l.id === data.id);
    
    if (existingIndex === -1) {
       // If it doesn't exist (like from "Add Manual Lead"), save it as new
       await saveLead(data);
       return NextResponse.json({ success: true, lead: data });
    }

    // Merge existing lead with new data
    const updatedLead = {
      ...leads[existingIndex],
      ...data,
      lastContacted: new Date().toISOString()
    };

    await updateLead(updatedLead);
    return NextResponse.json({ success: true, lead: updatedLead });
  } catch (error: any) {
    console.error("Error updating lead:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
