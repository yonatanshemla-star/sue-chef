"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Download, Mail, ExternalLink, Clipboard, AlertCircle } from "lucide-react";
import type { Lead } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';
import { legalQuestions } from '@/utils/legalQuestions';
import { evaluateResults } from '@/utils/legalLogic';

// === Status Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number }> = {
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-pink-600', bg: 'bg-pink-100/80', darkBg: 'dark:bg-pink-900/60 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-500', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 3 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 5 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 3 },
  'חדש': { label: '🆕 חדש', color: 'text-indigo-700', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', importance: 0 },
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/80 dark:text-orange-200', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 1 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 0 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 5 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 3 },
};

// Statuses that should NOT appear in the manual dropdown
const AUTO_ONLY_STATUSES = new Set(['ממתין לעדכון']);

function getStatusStyle(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['אחר'];
}

// === Phone number normalization for matching ===
function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Handle SIP URIs by taking the user part (before @)
  const cleanPhone = phone.startsWith('sip:') ? phone.split('@')[0].replace('sip:', '') : phone;
  const digits = cleanPhone.replace(/[^\d]/g, '');
  // Israeli numbers are usually 10 digits (05...) or 12 digits (9725...)
  // We'll take the last 9 digits to match regardless of prefix (0 or 972)
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return digits;
}

function findLeadNameByPhone(phone: string, leads: Lead[]): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 9) return null;
  for (const lead of leads) {
    if (lead.phone) {
      const leadNorm = normalizePhone(lead.phone);
      if (leadNorm === normalized) return lead.clientName;
    }
  }
  return null;
}

// === Call Script ===
const CALL_SCRIPT = `פתיחה
"אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור. יש לך כמה דקות לדבר?"

בירור כוונה
"אני רק רוצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?"

שאלות סינון
1. מה שמך המלא ומה הגיל שלך?

2. יש לך כרגע הכנסות?
אם כן – מאיפה הן מגיעות (קצבה, עבודה, פנסיה וכו') ומה הסכום בערך?

3. תוכל לפרט קצת על המצב הרפואי שלך?
ממה אתה סובל כיום, מה יש באבחנות, ומה הכי משפיע על התפקוד היומיומי?
(אם מספר כמה בעיות → תגיד: "אוקיי, חשוב לי להבין כל דבר בנפרד כדי להעביר לעו"ד בצורה מדויקת").

4. יש לך כרגע קצבאות כלשהן? אם כן – מאיפה?
אם זו קצבה מביטוח לאומי – אתה יודע מה דרגת הנכות שקיבלת?

5. האם יש קושי בפעולות יומיומיות (לבוש, רחצה, תפקוד בסיסי)?
תשאל רק אם אתה שומע תיאור שמעיד על מצב תפקודי קשה.

6. האם יש לך ביטוח סיעודי בקופת חולים?

7. משלם מס הכנסה? אם כן, כמה?`;

export default function Home() {
  // === State ===
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  const [lawyerPhoneCopied, setLawyerPhoneCopied] = useState(false);
  
  // Live notes modal
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(true);
  
  // WebPhone state
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneTarget, setPhoneTarget] = useState({ name: '', phone: '' });
  
  // Decision Tree state in modal
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  
  const [sortBy, setSortBy] = useState<'date' | 'importance'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterImportance, setFilterImportance] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [expandedCallSid, setExpandedCallSid] = useState<string | null>(null);
  const [transcribingSids, setTranscribingSids] = useState<Set<string>>(new Set());
  
  // Agent Assist State
  const [assistCards, setAssistCards] = useState<{emoji: string, text: string}[]>([]);
  const [isAssistLoading, setIsAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const assistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leadsRef = useRef<Lead[]>(leads);
  const lastFetchedNotesRef = useRef<string>('');

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // === Data Fetching ===
  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) setLeads(data.leads);
    } catch (e) { console.error("Failed to fetch leads", e); }
    finally { setLoadingLeads(false); }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>) => {
    // If status is being updated, check if it's one of the "relevant" ones
    if (updates.status) {
      const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם'].includes(updates.status);
      if (isRelevant) {
        updates.wasRelevant = true;
      }
    }

    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    try {
      await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    } catch (error) { console.error('Failed to update lead:', error); fetchLeads(); }
  };

  const initiateCall = async (lead: any) => {
    if (!lead.phone) return;
    // 1. Update status to "ממתין לעדכון" ONLY if current status is "חדש"
    if (lead.status === 'חדש') {
      handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
    }
    
    // 2. Open the "Live Notes" modal for documentation
    setLiveNotesLead(lead);

    // 3. Bridge Call via Twilio
    try {
      console.log(`Initiating bridge call to: ${lead.phone}`);
      const res = await fetch('/api/twilio/call/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: lead.phone })
      });
      const data = await res.json();
      if (!data.success) {
        alert("שגיאה בהוצאת השיחה: " + (data.error || "לא ידוע"));
      }
    } catch (err) {
      console.error("Initiate Call Error:", err);
      alert("נכשל להתחבר לשרת טוויליו.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`למחוק את הליד "${name || 'ללא שם'}"?`)) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    const deletedCount = parseInt(localStorage.getItem('analytics_deleted_leads') || '0');
    localStorage.setItem('analytics_deleted_leads', (deletedCount + 1).toString());
    try { await fetch('/api/leads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch(e) { console.error(e); fetchLeads(); }
  };

  const addNewLead = async () => {
    const newLead: Lead = {
      id: crypto.randomUUID(), clientName: "", source: "Manual", createdAt: new Date().toISOString(),
      lastContacted: null, status: "חדש", followUpDate: "", generalNotes: "", liveCallNotes: "", urgency: "בינונית"
    };
    setLeads(prev => [newLead, ...prev]);
    try { await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLead) }); } catch(e) { console.error(e); }
  };

  const fetchTwilioData = async () => {
    setLoadingCalls(true);
    try {
      const balRes = await fetch("/api/twilio/balance"); const balData = await balRes.json();
      if (balData.success) setTwilioBalance(balData.balance);
      const callsRes = await fetch("/api/twilio/calls");
      if (callsRes.ok) {
        const data = await callsRes.json();
        setRecentCalls(data.calls || []);
      }
    } catch (e) { console.error("Failed to fetch Twilio data", e); }
    finally { setLoadingCalls(false); }
  };

  const handleCallEnd = useCallback(async (phone: string) => {
    console.log("Call ended for phone:", phone);
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    
    // Use leadsRef.current to avoid stale closures and unnecessary re-creations
    const lead = leadsRef.current.find(l => {
      if (!l.phone) return false;
      const leadNorm = normalizePhone(l.phone);
      return leadNorm === normalized;
    });

    if (lead && lead.status === 'חדש') {
      console.log("Found new lead, updating status to awaiting update:", lead.clientName);
      handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
    } else {
      console.log("Lead not new or not found, skipping status update.");
    }
  }, [handleLeadUpdate]); // leads is no longer a dependency

  const fetchAgentAssist = async (notes: string) => {
    if (!notes || notes.trim().length < 5) return;
    setIsAssistLoading(true);
    setAssistError(null);
    try {
      const res = await fetch('/api/gemini/agent-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (data.success) {
        setAssistCards(data.alerts);
      } else {
        setAssistError(data.error || "שגיאה ב-AI");
      }
    } catch (err) {
      console.error("Agent Assist Fetch Error:", err);
      setAssistError("נכשל בחיבור לשרת");
    } finally {
      setIsAssistLoading(false);
    }
  };

  const debouncedAgentAssist = useCallback((notes: string) => {
    if (assistTimeoutRef.current) clearTimeout(assistTimeoutRef.current);
    
    // Only fetch if notes have changed significantly (more than 15 chars)
    // and if the length is at least 5
    const diff = Math.abs(notes.length - lastFetchedNotesRef.current.length);
    if (diff < 15 && notes.length > 5) return;

    assistTimeoutRef.current = setTimeout(() => {
      fetchAgentAssist(notes);
      lastFetchedNotesRef.current = notes;
    }, 3000); // 3 seconds debounce for free tier
  }, []);

  const handleTranscribe = async (callSid: string, recordingUrl: string, phone: string) => {
    if (transcribingSids.has(callSid)) return;
    
    // Find the lead for this phone
    const normalized = normalizePhone(phone);
    const lead = leads.find(l => l.phone && normalizePhone(l.phone) === normalized);
    
    if (!lead) {
      alert("לא נמצא ליד מתאים למספר הטלפון הזה. יש לוודא שהליד קיים בטבלה.");
      return;
    }

    setTranscribingSids(prev => new Set(prev).add(callSid));
    try {
      const res = await fetch('/api/twilio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadId: lead.id,
          recordingUrl,
          callSid
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh leads to get the new transcription
        await fetchLeads();
      } else {
        alert("שגיאה בתמלול: " + (data.error || "שגיאה לא ידועה"));
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("כשל בחיבור לשרת התמלול");
    } finally {
      setTranscribingSids(prev => {
        const next = new Set(prev);
        next.delete(callSid);
        return next;
      });
    }
  };

  useEffect(() => { 
    fetchTwilioData(); 
    fetchLeads(); 
    const i1 = setInterval(fetchTwilioData, 60000); 
    const i2 = setInterval(fetchLeads, 30000); 
    return () => { clearInterval(i1); clearInterval(i2); }; 
  }, []);

  // One-time migration for historical relevance on mount/data load
  useEffect(() => {
    if (leads.length > 0) {
      const needsMigration = leads.filter(l => 
        !l.wasRelevant && ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם'].includes(l.status)
      );
      if (needsMigration.length > 0) {
        console.log(`Migrating ${needsMigration.length} leads for relevance history...`);
        needsMigration.forEach(l => handleLeadUpdate(l.id, { wasRelevant: true }));
      }
    }
  }, [leads.length]); // Only run when leads are first loaded or count changes

  const handleTreeComplete = (answers: any) => {
    if (!liveNotesLead) return;
    
    const summaryParts = [];
    if (answers.name) summaryParts.push(`שם: ${answers.name}`);
    if (answers.age) summaryParts.push(`גיל: ${answers.age}`);
    if (answers.income) summaryParts.push(`הכנסה: ${answers.income}`);
    if (answers.medicalCondition) {
      const conditionLabel = legalQuestions.find(q => q.id === 'medicalCondition')?.options?.find(o => o.value === answers.medicalCondition)?.label || answers.medicalCondition;
      summaryParts.push(`מצב רפואי: ${conditionLabel}`);
    }
    if (answers.taxPaid) summaryParts.push(`מס ששולם: ${answers.taxPaid}`);
    
    const treeSummary = `\nסיכום עץ החלטות:\n${summaryParts.join('\n')}\n`;
    const newNotes = (liveNotesLead.liveCallNotes || '') + treeSummary;
    
    handleLeadUpdate(liveNotesLead.id, { liveCallNotes: newNotes });
    setShowDecisionTree(false);
  };

  // === Dark Mode & Body Scroll Lock ===
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (liveNotesLead) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [liveNotesLead]);

  // === Image Paste Handler ===
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>, leadId: string) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        e.preventDefault();
        const blob = items[i].getAsFile();
        if (!blob) continue;
        setProcessingImageId(leadId);
        try {
          const Tesseract = (window as any).Tesseract || await new Promise<any>((resolve, reject) => {
            if ((window as any).Tesseract) { resolve((window as any).Tesseract); return; }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.onload = () => resolve((window as any).Tesseract);
            script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
            document.head.appendChild(script);
          });
          const result = await Tesseract.recognize(blob, 'heb+eng');
          const text = result.data.text.trim();
          if (!text) {
            alert('לא זיהינו טקסט בתמונה. נסה תמונה ברורה יותר.');
            setProcessingImageId(null);
            return;
          }
          const phoneMatch = text.match(/0[2-9]\d[-.\s]?\d{3}[-.\s]?\d{4}|0[2-9]\d{8}/) || text.match(/\d{9,10}/);
          const phone = phoneMatch ? phoneMatch[0].replace(/[-.\s]/g, '') : '';
          let name = text;
          if (phone) name = name.replace(phoneMatch![0], '');
          name = name.replace(/[\d\n\r\t|]/g, ' ').replace(/\s+/g, ' ').trim();
          const updates: Partial<Lead> = {};
          if (name) updates.clientName = name;
          if (phone) updates.phone = phone;
          if (Object.keys(updates).length > 0) handleLeadUpdate(leadId, updates);
          else alert('לא הצלחנו לחלץ שם או טלפון מהתמונה.');
        } catch (err) {
          console.error('OCR Error:', err);
          alert('שגיאה בניתוח התמונה');
        } finally {
          setProcessingImageId(null);
        }
        break;
      }
    }
  }, []);

  // === Sorting & Filtering ===
  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר')
    .filter(l => {
      if (!globalSearch) return true;
      const q = globalSearch.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)) || (l.generalNotes && l.generalNotes.toLowerCase().includes(q));
    })
    .filter(l => filterImportance === null || getStatusStyle(l.status).importance === filterImportance)
    .sort((a, b) => {
      if (sortBy === 'importance') {
        const impA = getStatusStyle(a.status).importance;
        const impB = getStatusStyle(b.status).importance;
        if (impA !== impB) return impA - impB;
      }
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, filterImportance, sortOrder, globalSearch, sortBy]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === 'חתם' || l.status === 'לא רלוונטי' || l.status === 'נגמר')
    .filter(l => {
      const search = globalSearch || archiveSearch;
      if (!search) return true;
      const q = search.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)) || (l.generalNotes && l.generalNotes.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (a.status === 'חתם' && b.status !== 'חתם') return -1;
      if (b.status === 'חתם' && a.status !== 'חתם') return 1;
      const dateA = new Date(a.signedAt || a.createdAt).getTime();
      const dateB = new Date(b.signedAt || b.createdAt).getTime();
      return dateB - dateA;
    }), [leads, archiveSearch]);
  
  const stats = useMemo(() => {
    const total = leads.length;
    const signed = leads.filter(l => l.status === 'חתם').length;
    const disqualified = leads.filter(l => l.status === 'לא רלוונטי').length;
    const noAnswer = leads.filter(l => l.status === 'לא ענה').length;
    const newLeads = leads.filter(l => l.status === 'חדש').length;
    
    // Total screened (not new)
    const screened = total - newLeads;
    
    // Leads that were deemed relevant after screening
    const actuallyRelevant = leads.filter(l => 
      l.wasRelevant === true ||
      l.status === 'גילי צריך לדבר איתו' || 
      l.status === 'מחכה לחתימה' || 
      l.status === 'חתם'
    ).length;

    // Leads that were relevant but ended without a deal
    const lostRelevant = leads.filter(l => l.status === 'נגמר').length;
    
    const successRate = actuallyRelevant > 0 ? ((signed / actuallyRelevant) * 100).toFixed(1) : "0";
    const disqualificationRate = screened > 0 ? ((disqualified / screened) * 100).toFixed(1) : "0";
    
    // Average cost per call
    const callsWithPrice = recentCalls.filter(c => c.price && parseFloat(c.price) !== 0);
    const totalCost = callsWithPrice.reduce((sum, c) => sum + Math.abs(parseFloat(c.price)), 0);
    const avgCost = callsWithPrice.length > 0 ? (totalCost / callsWithPrice.length).toFixed(3) : "0.00";

    const byStatus = leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { 
      total, signed, actuallyRelevant, lostRelevant, disqualified, noAnswer, newLeads, screened,
      successRate, disqualificationRate, byStatus, avgCost 
    };
  }, [leads, recentCalls]);

  // === Helpers ===
  const formatDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
  const formatDate = (d: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

  const cardClass = "premium-glass rounded-3xl";
  const cardClassSoft = "bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl";

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100' : 'text-slate-900'} bg-mesh relative overflow-hidden selection:bg-indigo-500/20`}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">Sue-Chef <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest">v3.7</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} לידים פעילים בטיפול שוטף</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText('+972509833303');
                setLawyerPhoneCopied(true);
                setTimeout(() => setLawyerPhoneCopied(false), 2000);
              }}
              className={`flex items-center gap-3 px-5 py-3.5 transition-all duration-300 active:scale-95 ${cardClass} ${lawyerPhoneCopied ? 'ring-2 ring-emerald-400 dark:ring-emerald-500' : 'hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors duration-300 ${lawyerPhoneCopied ? 'bg-emerald-100 dark:bg-emerald-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
                {lawyerPhoneCopied ? <Check className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /> : <UserPlus className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />}
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">הוסף עו״ד לשיחה</p>
                <p className={`text-sm font-black leading-none transition-colors ${lawyerPhoneCopied ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} dir="ltr">{lawyerPhoneCopied ? '✓ הועתק!' : '+972-50-983-3303'}</p>
              </div>
            </button>
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרת חשבון</p>
                <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p>
              </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 transition-all active:scale-95 hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6">
                <Sun className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-transform duration-500 ${darkMode ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
                <Moon className={`absolute inset-0 w-6 h-6 text-indigo-400 transition-transform duration-500 ${darkMode ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
              </div>
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-6 h-6 transition-transform ${(loadingCalls||loadingLeads) ? 'animate-spin text-indigo-500' : 'text-gray-600 dark:text-gray-300 group-hover:rotate-180 duration-500 group-hover:text-indigo-500'}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] premium-glass relative overflow-hidden group">
          <button onClick={() => setActiveTab('crm')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'crm' ? 'bg-indigo-600 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <TableProperties className="w-4.5 h-4.5" /> טבלת מעקב
          </button>
          <button onClick={() => setActiveTab('calls')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'calls' ? 'bg-blue-600 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <PhoneCall className="w-4.5 h-4.5" /> שיחות אחרונות
          </button>
          <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'archive' ? 'bg-amber-600 text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <CheckCircle className="w-4.5 h-4.5" /> ארכיון
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-[0_8px_20px_-4px_rgba(147,51,234,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <BarChart className="w-4.5 h-4.5" /> אנליטיקה
          </button>
          <button onClick={() => setActiveTab('tree')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'tree' ? 'bg-emerald-600 text-white shadow-[0_8px_20px_-4px_rgba(5,150,105,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <ClipboardList className="w-4.5 h-4.5" /> עץ החלטות
          </button>
        </div>

        {/* CRM Content */}
        {activeTab === 'crm' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <button onClick={addNewLead} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[24px] text-sm font-black shadow-xl shadow-indigo-500/20 active:scale-95 transition-all animate-in slide-in-from-right-4 duration-500">
                <Plus className="w-5 h-5" /> הוסף ליד חדש
              </button>

              <div className="flex flex-wrap items-center gap-4 flex-1 justify-end animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-3 px-6 py-3.5 premium-glass rounded-[24px] w-full max-w-md group focus-within:premium-glass-active transition-all duration-500">
                  <RefreshCw className={`w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors ${loadingLeads ? 'animate-spin' : ''}`} />
                  <input type="text" placeholder="חיפוש מהיר בכל הלידים..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="bg-transparent outline-none text-sm w-full font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
                
                <div className="flex flex-wrap items-center gap-2 p-1.5 premium-glass rounded-[20px] shadow-sm">
                  <button onClick={() => setSortBy(s => s === 'date' ? 'importance' : 'date')} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${sortBy === 'importance' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-white/5 active:scale-95'}`}>
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'importance' ? 'text-white' : 'text-indigo-500'}`} /> {sortBy === 'importance' ? 'לפי חשיבות' : 'סדר כרונולוגי'}
                  </button>
                  <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 active:scale-95 border border-white/20 dark:border-white/5 mx-1">
                    {sortOrder === 'desc' ? 'הכי חדשים' : 'הכי ישנים'}
                  </button>
                  <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                  <div className="relative group">
                    <select value={filterImportance ?? ''} onChange={e => setFilterImportance(e.target.value === '' ? null : Number(e.target.value))} className="px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider outline-none cursor-pointer bg-transparent appearance-none text-slate-700 dark:text-slate-200 pr-10">
                      <option value="">🎯 כל הלידים</option>
                      <option value="1">🔴 חשיבות עליונה</option>
                      <option value="2">🟠 בינונית-גבוהה</option>
                      <option value="0">🆕 לידים חדשים</option>
                    </select>
                    <Maximize2 className="absolute left-4 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none rotate-90" />
                  </div>
                </div>
              </div>
            </div>

            {crmLeads.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-bold">אין לידים פעילים</div>
            ) : (
              <div className="premium-glass rounded-[32px] overflow-hidden shadow-2xl border-white/50">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-indigo-500/10">
                      <tr>
                        <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[300px]">פרטי ליד וחיוג</th>
                        <th className="px-2 py-6 font-bold w-12 text-center"></th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[180px]">סטטוס טיפול</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[220px]">הערות ומעקב</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">מסך שיחה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/5">
                      {crmLeads.map((lead, idx) => (
                        <tr 
                          key={lead.id} 
                          className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                          style={{ animationDelay: `${idx * 50}ms`, transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                        >
                          <td className="px-8 py-5">
                            <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-5 p-2 rounded-2xl transition-all duration-300 group-hover:translate-x-1">
                              <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[20px] shadow-lg shadow-indigo-500/20 active:scale-90 transition-all hover:scale-110"><Phone className="w-6 h-6" /></button>
                              <div className="flex flex-col flex-1 gap-1">
                                <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors" placeholder="שם הלקוח..." />
                                <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-medium text-slate-400 bg-transparent outline-none text-sm group-focus-within:text-slate-500" placeholder="05..." dir="ltr" />
                              </div>
                            </div>
                          </td>
                          <td className="px-2 py-4 text-center relative">
                             <div className="relative">
                                <button onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"><MoreVertical className="w-5 h-5 text-gray-400" /></button>
                                {openMenuId === lead.id && (
                                  <>
                                    <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-2xl z-30 overflow-hidden animate-in fade-in zoom-in-95 duration-200" dir="rtl">
                                      <button onClick={() => {
                                        const phone = normalizePhone(lead.phone || '').replace(/^0/, '972');
                                        const firstName = lead.clientName ? lead.clientName.split(' ')[0] : 'לקוח';
                                        const msg = encodeURIComponent(`היי ${firstName}, קוראים לי יונתן אני ממשרד עו"ד HBA. השארת אצלנו פרטים בנוגע לזכויות רפואיות וניסיתי לחזור אלייך, אשמח אם נוכל לשוחח כשיהיה זמן`);
                                        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                                      <button onClick={() => {
                                        copyToClipboard(lead.phone || '');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /> העתק מספר</button>
                                      <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                      <button onClick={() => {
                                        deleteLead(lead.id, lead.clientName);
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 className="w-4 h-4" /> מחק ליד</button>
                                    </div>
                                  </>
                                )}
                             </div>
                          </td>
                          <td className="px-6 py-5">
                            <div className="relative group/select">
                              <select 
                                value={lead.status} 
                                onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} 
                                className={`text-[11px] font-black rounded-2xl px-4 py-3 outline-none border transition-all cursor-pointer w-full appearance-none shadow-sm ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border} group-hover/select:shadow-indigo-500/10`}
                              >
                                {Object.entries(STATUS_CONFIG).filter(([k]) => k === lead.status || !AUTO_ONLY_STATUSES.has(k)).map(([k,v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDown size={14} /></div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <textarea 
                              value={lead.generalNotes || ''} 
                              onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                              className="w-full text-sm font-bold bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none h-20 resize-none focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                              placeholder="הערות למעקב..." 
                            />
                          </td>
                          <td className="px-6 py-5 text-center">
                             <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-800/60 px-6 py-3 rounded-2xl border border-white dark:border-white/10 transition-all hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 shadow-sm active:scale-95"><Maximize2 className="w-4 h-4" /> פתח תיק</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <div className={`p-6 ${cardClass}`}>
            
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3"><History className="w-6 h-6 text-indigo-500" /> שיחות אחרונות</h3>
            <div className="flex flex-col gap-3 max-w-3xl mx-auto">
              {recentCalls.map(call => {
                const callPhone = call.direction === 'inbound' ? call.from : call.to;
                const matchedName = findLeadNameByPhone(callPhone || '', leads);
                return (
                  <div key={call.sid} className={`p-5 rounded-3xl flex flex-col gap-4 border transition-all duration-300 hover:shadow-lg ${cardClassSoft}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-lg text-indigo-600 dark:text-indigo-400">{matchedName || 'ליד לא מזוהה'}</p>
                          {leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">תומלל 🤖</span>
                          )}
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-400" dir="ltr">{callPhone}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{formatDate(call.startTime)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[9px] opacity-30 font-mono mt-1 text-right truncate max-w-[80px]" dir="ltr">
                    {call.sid}
                  </div>

                        <div className="flex flex-col gap-2">
                          {call.recordingUrl && (
                            <div className="flex flex-col gap-2">
                              <audio 
                                controls 
                                className="h-8 w-48 opacity-80 hover:opacity-100 transition-opacity"
                                src={call.recordingUrl}
                              >
                                דפדפן זה לא תומך בנגן אודיו.
                              </audio>
                              <button 
                                onClick={() => handleTranscribe(call.sid, call.recordingUrl, callPhone)}
                                disabled={transcribingSids.has(call.sid)}
                                className={`flex items-center justify-center gap-2 px-4 py-1.5 rounded-xl text-[9px] font-black transition-all active:scale-95 ${transcribingSids.has(call.sid) ? 'bg-gray-100 text-gray-400' : 'text-indigo-600 hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-900/20 underline decoration-indigo-500/30'}`}
                              >
                                {transcribingSids.has(call.sid) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
                                {transcribingSids.has(call.sid) ? 'מתמלל...' : 
                                 leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary ? 'עדכן תמלול' : 'נסה תמלול (AI)'}
                              </button>
                            </div>
                          )}
                        </div>
                        <span className="text-xs font-mono font-black bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-white/50 dark:border-white/5">{formatDuration(call.duration)}</span>
                        {call.price && (
                          <span className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-xl border border-amber-200/50 mr-2" dir="ltr">
                            {Math.abs(parseFloat(call.price)).toFixed(3)}$
                          </span>
                        )}
                        <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl border uppercase tracking-wider ${call.status === 'completed' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-red-200 text-red-600 bg-red-50'}`}>{call.direction === 'inbound' ? 'נכנסת' : 'יוצאת'}</span>
                      </div>
                    </div>
                    
                    {/* Transcription Preview */}
                    {leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary && (
                      <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-indigo-500/5 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">סיכום AI</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-80">{leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary}</p>
                        <button 
                          onClick={() => setLiveNotesLead(leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || '')) || null)}
                          className="mt-3 text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          קרא תמלול מלא ופרטים מרכזיים <ArrowUpDown className="w-3 h-3 rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* 1. Funnel Overview */}
            <div className={`mb-12 p-10 ${cardClass} border border-white/20 shadow-2xl overflow-hidden relative`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="w-full md:w-1/2">
                  <h3 className="text-3xl font-black tracking-tight mb-2">משפך המרות עמוק</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-10 italic">ניתוח ביצועים מבוסס על "לידים רלוונטיים" בלבד</p>
                  
                  <div className="flex flex-col gap-6">
                    {[
                      { label: 'כל הלידים', count: stats.total, color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: <UserPlus className="w-4 h-4" /> },
                      { label: 'נסרקו (Screened)', count: stats.screened, color: 'bg-indigo-300 dark:bg-indigo-700', text: 'text-indigo-700 dark:text-indigo-300', icon: <PhoneCall className="w-4 h-4" /> },
                      { label: 'רלוונטיים באמת', count: stats.actuallyRelevant, color: 'bg-blue-400 dark:bg-blue-600', text: 'text-blue-800 dark:text-blue-200', icon: <CheckCircle className="w-4 h-4" /> },
                      { label: 'חתימות (הצלחה)', count: stats.signed, color: 'bg-emerald-500', text: 'text-emerald-900 dark:text-emerald-100', icon: <DollarSign className="w-4 h-4" /> }
                    ].map((step, idx) => {
                      const perc = stats.total > 0 ? (step.count / stats.total * 100) : 0;
                      return (
                        <div key={idx} className="group flex items-center gap-6">
                          <div className="w-48 text-left">
                            <p className={`text-sm font-black uppercase tracking-widest ${step.text}`}>{step.label}</p>
                            <p className="text-2xl font-black tracking-tighter">{step.count}</p>
                          </div>
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-full ${step.color} shadow-lg`}
                              style={{ width: `${perc}%`, transitionDelay: `${idx * 150}ms` }}
                            />
                          </div>
                          <div className="w-16 text-right font-black opacity-30 text-xs">{perc.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full md:w-1/3 flex flex-col gap-6">
                   <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">אחוז הצלחה מהרלוונטיים</p>
                      <h4 className="text-6xl font-black tracking-tighter mb-4">{stats.successRate}<span className="text-2xl opacity-50">%</span></h4>
                      <p className="text-xs font-bold leading-relaxed opacity-80">זהו האחוז האמיתי שמייצג את היכולת של המשרד להחתים לקוחות שעברו סינון.</p>
                   </div>
                   
                   <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-indigo-500/10 shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">אחוז פסילה ראשוני</p>
                      <h4 className="text-4xl font-black tracking-tighter mb-2">{stats.disqualificationRate}<span className="text-xl opacity-30">%</span></h4>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed">אחוז הלידים (לאחר שיחה ראשונה) שנמצאו כלא רלוונטיים מיד.</p>
                   </div>
                </div>
              </div>
            </div>

            {/* 2. Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Lost & Status Breakdown */}
              <div className={`p-8 ${cardClass}`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-3"><PhoneOff className="w-5 h-5 text-red-500" /> לידים שאבדו</h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                      <div>
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">נסגרו כ-"נגמר"</p>
                        <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats.lostRelevant}</p>
                      </div>
                      <X className="w-8 h-8 text-red-200 dark:text-red-800" />
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">לא ענו (נטלו)</p>
                        <p className="text-2xl font-black">{stats.noAnswer}</p>
                      </div>
                      <Phone className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                   </div>
                </div>
              </div>

              {/* Status Efficiency */}
              <div className={`p-8 ${cardClass} md:col-span-2`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-3"><BarChart className="w-5 h-5 text-indigo-500" /> התפלגות מלאה (כולל ארכיון)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {Object.entries(STATUS_CONFIG).map(([k,v]) => {
                     const count = stats.byStatus[k] || 0;
                     if (count === 0) return null;
                     return (
                       <div key={k} className={`p-5 rounded-3xl border ${v.bg} ${v.border} group transition-all hover:scale-105 duration-300`}>
                          <p className={`text-[10px] font-black uppercase mb-1 opacity-60 ${v.color}`}>{v.label.substring(v.label.indexOf(' ') + 1)}</p>
                          <p className={`text-2xl font-black ${v.color}`}>{count}</p>
                       </div>
                     );
                   })}
                </div>
              </div>
            </div>

            {/* 3. Financial Info */}
            <div className={`mt-8 p-10 ${cardClass} flex flex-col md:flex-row items-center justify-between gap-8 group`}>
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                    <DollarSign className="w-8 h-8 text-amber-600 dark:text-amber-400 shadow-glow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">עלות תקשורת ממוצעת לליד</h4>
                    <p className="text-4xl font-black text-amber-600 dark:text-amber-400" dir="ltr">{stats.avgCost}$</p>
                  </div>
               </div>
               <div className="text-left md:text-right max-w-sm">
                  <p className="text-xs font-bold text-slate-500 leading-relaxed italic">הנתון מחושב לפי עלות שיחות טוויליו בזמן אמת. לידים שנסגרים בחתימה מחזירים את ההשקעה תוך פחות מ-24 שעות.</p>
               </div>
            </div>
          </div>
        )}

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex items-center gap-3 px-4 py-3 w-full md:w-96 ${cardClass}`}>
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="חיפוש בארכיון..." 
                  value={archiveSearch} 
                  onChange={(e) => setArchiveSearch(e.target.value)} 
                  className="bg-transparent outline-none text-sm w-full font-bold" 
                />
              </div>
              <p className="text-sm font-bold text-gray-500">{archiveLeads.length} לידים מאורכבים</p>
            </div>
            
            <div className={`overflow-hidden rounded-3xl ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50/50 dark:bg-[#151822]/80 border-b border-gray-100 dark:border-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 font-bold min-w-[250px]">שם וטלפון</th>
                      <th className="px-4 py-4 font-bold min-w-[170px]">סטטוס סופי</th>
                      <th className="px-4 py-4 font-bold min-w-[200px]">הערות</th>
                      <th className="px-4 py-4 font-bold text-center">תאריך סגירה</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                    {archiveLeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold">אין לידים בארכיון</td>
                      </tr>
                    ) : (
                      archiveLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-lg">{lead.clientName || 'ללא שם'}</span>
                              <span className="font-mono font-bold text-gray-500" dir="ltr">{lead.phone}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs font-black rounded-xl px-3 py-2 border ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}>
                              {getStatusStyle(lead.status).label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold opacity-70 line-clamp-2">{lead.generalNotes || lead.liveCallNotes || 'אין הערות'}</p>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-400">
                            {lead.signedAt ? formatDate(lead.signedAt) : lead.lastContacted ? formatDate(lead.lastContacted) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Decision Tree Tab */}
        {activeTab === 'tree' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <LegalDecisionTree />
          </div>
        )}

        {/* =================== LIVE NOTES MODAL =================== */}
        {liveNotesLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setLiveNotesLead(null)} />
            <div className={`relative w-full max-w-[1280px] h-[90vh] flex flex-col rounded-[40px] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden premium-glass`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-8 border-b border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl z-10 transition-colors duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-float"><PhoneCall className="w-8 h-8 text-white" /></div>
                  <div>
                    <h3 className="font-black text-3xl tracking-tight text-glow">שיחה עם {liveNotesLead.clientName || 'לקוח'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-sm font-black text-indigo-500/80 uppercase tracking-widest" dir="ltr">{liveNotesLead.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border font-black text-xs transition-all duration-300 shadow-sm active:scale-95 ${showDecisionTree ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' : 'bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10'}`}><ClipboardList className="w-4 h-4" /> {showDecisionTree ? 'חזרה לשיחה' : 'עץ החלטות'}</button>
                  <button onClick={() => setShowScript(!showScript)} className="flex items-center gap-3 px-6 py-3.5 rounded-2xl border font-black text-xs transition-all duration-300 shadow-sm active:scale-95 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10"><FileText className="w-4 h-4" /> {showScript ? 'הסתר תסריט' : 'הצג תסריט'}</button>
                  <button onClick={() => setLiveNotesLead(null)} className="p-3.5 rounded-2xl border bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10 text-slate-400 hover:text-red-500 hover:rotate-90 transition-all duration-300"><X className="w-6 h-6" /></button>
                </div>
              </div>

                {/* Modal Body: 3-Panel Layout */}
                <div className="flex-1 flex overflow-hidden min-h-0 bg-white/10 dark:bg-black/10">
                  {showDecisionTree ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20 backdrop-blur-md">
                      <LegalDecisionTree compact={true} onComplete={handleTreeComplete} />
                    </div>
                  ) : (
                    <>
                      {/* 1. Agent Assist (Right Panel) */}
                      <div className="w-96 border-l border-slate-200 dark:border-white/5 p-8 flex flex-col gap-6 overflow-y-auto bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl custom-scrollbar animate-in slide-in-from-right-8 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <RefreshCw className={`w-5 h-5 ${isAssistLoading ? 'animate-spin' : ''} text-indigo-500`} /> המלצות AI בזמן אמת
                          </h4>
                          <button
                            onClick={() => fetchAgentAssist(liveNotesLead.liveCallNotes || '')}
                            disabled={isAssistLoading}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            title="רענן המלצות באופן ידני"
                          >
                            <RefreshCw size={14} className={isAssistLoading ? 'animate-spin' : ''} />
                          </button>
                        </div>
                        {assistError && (
                          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 dark:text-amber-400 text-xs font-bold text-center">
                             ⚠️ {assistError}
                          </div>
                        )}

                        {assistCards.length === 0 && !isAssistLoading && !assistError && (
                          <div className="text-center py-20 opacity-30"><HelpCircle size={40} className="mx-auto mb-2 text-slate-400" /><p className="text-xs font-black uppercase tracking-tighter">הקלד הערות לקבלת סיוע</p></div>
                        )}
                        {assistCards.map((card, idx) => (
                          <div key={idx} className={`p-6 rounded-3xl border animate-in slide-in-from-right-4 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${card.emoji === '🔴' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-[0_8px_32px_-4px_rgba(239,68,68,0.15)]' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 shadow-[0_8px_32px_-4px_rgba(245,158,11,0.15)]'}`}>
                            <p className="text-base font-bold leading-snug">{card.emoji} {card.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* 2. Main Notes Area (Center) */}
                      <div className="flex-1 p-12 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar relative animate-in fade-in duration-1000">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                          <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">תיעוד שיחה בשידור חי - {liveNotesLead.clientName}</h4>
                        </div>
                        <textarea
                          autoFocus
                          value={liveNotesLead.liveCallNotes || ''}
                          onChange={e => {
                            const v = e.target.value;
                            handleLeadUpdate(liveNotesLead.id, { liveCallNotes: v });
                            debouncedAgentAssist(v);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (assistTimeoutRef.current) clearTimeout(assistTimeoutRef.current);
                              fetchAgentAssist(liveNotesLead.liveCallNotes || '');
                            }
                          }}
                          placeholder="כתוב כאן נקודות מרכזיות מהשיחה..."
                          className="w-full flex-1 text-lg leading-loose bg-transparent outline-none resize-none font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-200 dark:placeholder:text-slate-800 selection:bg-indigo-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* 3. Script / Help (Left Panel - Collapsible) */}
                  <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] border-r border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar ${showScript ? 'w-[480px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                    {showScript && (
                      <div className="p-12 animate-in fade-in slide-in-from-left-8 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3"><FileText size={18} className="text-indigo-500" /> תסריט שיחה מנצח</h4>
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-lg leading-loose whitespace-pre-wrap font-bold text-slate-700 dark:text-slate-300 opacity-90">{CALL_SCRIPT}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl flex justify-between items-center z-10 transition-colors duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">תיעוד השיחה נשמר אוטומטית ברקע</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    copyToClipboard(liveNotesLead.liveCallNotes || '');
                    alert('התיעוד הועתק ללוח!');
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"><Copy size={18} /> העתק תיעוד</button>
                  <button onClick={() => setLiveNotesLead(null)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white px-10 py-3.5 rounded-2xl text-sm font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2"><Check size={20} /> סיום שימוש</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* WebPhone component removed to restore MicroSIP / External App usage as requested */}
    </div>
  );
}
