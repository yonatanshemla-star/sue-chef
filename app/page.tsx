"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList } from "lucide-react";
import type { Lead } from "@/utils/storage";
import WebPhone from '@/components/WebPhone';
import LegalDecisionTree from '@/components/LegalDecisionTree';
import { legalQuestions } from '@/utils/legalQuestions';
import { evaluateResults } from '@/utils/legalLogic';

// === Status Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number }> = {
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-pink-700', bg: 'bg-pink-100', darkBg: 'dark:bg-pink-950 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 3 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 5 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 3 },
  'חדש': { label: '🆕 חדש', color: 'text-indigo-700', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', importance: 0 },
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-800', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/60 dark:text-orange-300', border: 'border-orange-400 dark:border-orange-600', importance: 1 },
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
  const digits = phone.replace(/[^\d]/g, '');
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
  
  // Filtering & Sorting
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterImportance, setFilterImportance] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [expandedCallSid, setExpandedCallSid] = useState<string | null>(null);
  
  // Agent Assist State
  const [assistCards, setAssistCards] = useState<{emoji: string, text: string}[]>([]);
  const [isAssistLoading, setIsAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const assistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leadsRef = useRef<Lead[]>(leads);

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
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    try {
      await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    } catch (error) { console.error('Failed to update lead:', error); fetchLeads(); }
  };

  const initiateCall = (lead: Lead) => {
    if (!lead.phone) return;
    setPhoneTarget({ name: lead.clientName || 'ללא שם', phone: lead.phone });
    setIsPhoneOpen(true);
    // Automatically update status to "ממתין לעדכון" on call start
    handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
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

    if (lead) {
      console.log("Found lead, updating status:", lead.clientName);
      handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
    } else {
      console.log("No matching lead found for:", normalized);
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
    assistTimeoutRef.current = setTimeout(() => {
      fetchAgentAssist(notes);
    }, 1000);
  }, []);

  useEffect(() => { fetchTwilioData(); fetchLeads(); const i1 = setInterval(fetchTwilioData, 60000); const i2 = setInterval(fetchLeads, 30000); return () => { clearInterval(i1); clearInterval(i2); }; }, []);

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
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, filterImportance, sortOrder, globalSearch]);

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
    const active = leads.filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'לא רלוונטי').length;
    const successRate = total > 0 ? (signed / total * 100).toFixed(1) : "0";
    
    // Average cost per call
    const callsWithPrice = recentCalls.filter(c => c.price && parseFloat(c.price) !== 0);
    const totalCost = callsWithPrice.reduce((sum, c) => sum + Math.abs(parseFloat(c.price)), 0);
    const avgCost = callsWithPrice.length > 0 ? (totalCost / callsWithPrice.length).toFixed(3) : "0.00";

    const byStatus = leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { total, signed, active, successRate, byStatus, avgCost };
  }, [leads, recentCalls]);

  // === Helpers ===
  const formatDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
  const formatDate = (d: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

  const cardClass = "bg-white/80 dark:bg-[#0f111a]/80 backdrop-blur-xl border border-white/40 dark:border-white/5 shadow-2xl shadow-indigo-500/5 dark:text-gray-100 rounded-3xl";
  const cardClassSoft = "bg-white/50 dark:bg-gray-800/50 backdrop-blur-md border border-white/20 dark:border-gray-700/50 rounded-2xl";

  return (
    <div className={`min-h-screen transition-all duration-500 ${darkMode ? 'dark bg-[#0a0a0f] text-gray-100' : 'bg-[#f4f7fa] text-gray-900'} relative overflow-hidden`}>
      {/* Background Orbs */}
      <div className={`absolute top-[-10%] sm:right-[-5%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-40 pointer-events-none transition-all duration-1000 ${darkMode ? 'bg-indigo-900' : 'bg-blue-300'}`} />
      <div className={`absolute bottom-[-10%] sm:left-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-30 pointer-events-none transition-all duration-1000 ${darkMode ? 'bg-fuchsia-900/50' : 'bg-indigo-300'}`} />

      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans relative z-10" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">Sue-Chef</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} לידים פעילים בטיפול שוטף</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                navigator.clipboard.writeText('+9725983303');
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
                <p className={`text-sm font-black leading-none transition-colors ${lawyerPhoneCopied ? 'text-emerald-600 dark:text-emerald-400' : 'text-indigo-600 dark:text-indigo-400'}`} dir="ltr">{lawyerPhoneCopied ? '✓ הועתק!' : '+972-598-3303'}</p>
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
        <div className={`flex flex-wrap gap-2 mb-8 p-1.5 w-fit rounded-[20px] ${cardClass}`}>
          <button onClick={() => setActiveTab('crm')} className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === 'crm' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <TableProperties className="w-4 h-4" /> טבלת מעקב
          </button>
          <button onClick={() => setActiveTab('calls')} className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === 'calls' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <PhoneCall className="w-4 h-4" /> שיחות אחרונות
          </button>
          <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === 'archive' ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <CheckCircle className="w-4 h-4" /> ארכיון
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/25 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <BarChart className="w-4 h-4" /> אנליטיקה
          </button>
          <button onClick={() => setActiveTab('tree')} className={`flex items-center gap-2.5 px-6 py-3 rounded-2xl text-sm font-bold transition-all duration-300 ${activeTab === 'tree' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25 scale-105' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100/50 dark:hover:bg-gray-800/50 hover:text-gray-900 dark:hover:text-white'}`}>
            <ClipboardList className="w-4 h-4" /> עץ החלטות
          </button>
        </div>

        {/* CRM Content */}
        {activeTab === 'crm' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <button onClick={addNewLead} className="group relative flex items-center gap-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl overflow-hidden hover:scale-105 active:scale-95 transition-all">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <Plus className="w-4 h-4 relative z-10" /> <span className="relative z-10">ליד חדש</span>
              </button>
              <div className={`flex items-center gap-2 p-1.5 ${cardClass}`}>
                <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" /> {sortOrder === 'desc' ? 'הכי חדשים קודם' : 'הכי ישנים קודם'}
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                <select value={filterImportance ?? ''} onChange={e => setFilterImportance(e.target.value === '' ? null : Number(e.target.value))} className="px-4 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer bg-transparent appearance-none text-gray-700 dark:text-gray-200">
                  <option value="">🎯 הצג את כל הלידים</option>
                  <option value="1">🔴 חשיבות עליונה</option>
                  <option value="2">🟠 חשיבות בינונית-גבוהה</option>
                  <option value="0">🆕 לידים שטרם טופלו</option>
                </select>
              </div>
              <div className={`flex items-center gap-3 px-4 py-2 w-full md:w-80 ${cardClass}`}>
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <input type="text" placeholder="חיפוש גלובלי..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="bg-transparent outline-none text-sm w-full font-bold" />
              </div>
            </div>
            {loadingLeads ? (
               <div className="p-16 flex flex-col items-center justify-center gap-4"><Loader2 className="w-10 h-10 text-indigo-500 animate-spin" /></div>
            ) : (
              <div className={`overflow-hidden rounded-3xl ${cardClass}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-gray-50/50 dark:bg-[#151822]/80 border-b border-gray-100 dark:border-gray-800/50">
                      <tr>
                        <th className="px-6 py-4 font-bold min-w-[280px]">שם וטלפון לחיוג</th>
                        <th className="px-2 py-4 font-bold w-10"></th>
                        <th className="px-4 py-4 font-bold min-w-[170px]">סטטוס</th>
                        <th className="px-4 py-4 font-bold min-w-[200px]">הערות</th>
                        <th className="px-4 py-4 font-bold text-center">מסך שיחה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                      {crmLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all">
                          <td className="px-6 py-4">
                            <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-4 p-2 rounded-xl hover:bg-white/50 dark:hover:bg-gray-800/30 transition-all">
                              <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-12 h-12 bg-gradient-to-br from-indigo-500 to-blue-600 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><Phone className="w-5 h-5" /></button>
                              <div className="flex flex-col flex-1">
                                <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-lg bg-transparent outline-none" placeholder="שם הליד..." />
                                <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-bold text-gray-500 bg-transparent outline-none" placeholder="05..." dir="ltr" />
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
                          <td className="px-4 py-4">
                            <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`text-xs font-black rounded-xl px-3 py-2 outline-none border cursor-pointer w-full ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}>
                              {Object.entries(STATUS_CONFIG).filter(([k]) => !AUTO_ONLY_STATUSES.has(k)).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                            </select>
                          </td>
                          <td className="px-4 py-4">
                            <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} className="w-full text-sm font-semibold bg-white/50 dark:bg-gray-800/50 border rounded-xl p-2 outline-none h-16 resize-none" placeholder="הערות..." />
                          </td>
                          <td className="px-4 py-4 text-center">
                             <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 bg-amber-50 px-4 py-2.5 rounded-xl border border-amber-200 transition-all hover:bg-amber-100 shadow-sm"><Maximize2 className="w-4 h-4" /> פתח</button>
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
                  <div key={call.sid} className={`p-5 rounded-2xl flex justify-between items-center ${cardClassSoft}`}>
                    <div>
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">{matchedName || 'לא מזוהה'}</p>
                      <p className="text-sm font-mono" dir="ltr">{callPhone}</p>
                      <p className="text-[10px] text-gray-400 mt-1">{formatDate(call.startTime)}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs font-mono font-bold bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-lg">{formatDuration(call.duration)}</span>
                      <span className={`text-[10px] font-black px-2 py-1 rounded-md border ${call.status === 'completed' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-red-200 text-red-600 bg-red-50'}`}>{call.direction === 'inbound' ? 'נכנסת' : 'יוצאת'}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className={`p-6 ${cardClassSoft}`}>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">סה"כ לידים במערכת</p>
                <p className="text-3xl font-black">{stats.total}</p>
                <div className="flex items-center gap-1 mt-2 text-indigo-500">
                  <Plus className="w-3 h-3" /> <span className="text-[10px] font-bold">צמיחה מתמדת</span>
                </div>
              </div>
              <div className={`p-6 ${cardClassSoft}`}>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">לידים חתומים (הצלחה)</p>
                <p className="text-3xl font-black text-emerald-600 dark:text-emerald-400">{stats.signed}</p>
                <div className="flex items-center gap-1 mt-2 text-emerald-500">
                  <CheckCircle className="w-3 h-3" /> <span className="text-[10px] font-bold">חוזים חתומים</span>
                </div>
              </div>
              <div className={`p-6 ${cardClassSoft}`}>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">לידים בטיפול שוטף</p>
                <p className="text-3xl font-black text-indigo-600 dark:text-indigo-400">{stats.active}</p>
                <div className="flex items-center gap-1 mt-2 text-indigo-500">
                  <Loader2 className="w-3 h-3 animate-spin" /> <span className="text-[10px] font-bold">בעבודה</span>
                </div>
              </div>
              <div className={`p-6 ${cardClassSoft}`}>
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">עלות ממוצעת לשיחה</p>
                <p className="text-3xl font-black text-amber-600 dark:text-amber-400" dir="ltr">{stats.avgCost}$</p>
                <div className="flex items-center gap-1 mt-2 text-amber-500">
                  <DollarSign className="w-3 h-3" /> <span className="text-[10px] font-bold">מערכת טוויליו</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className={`p-8 ${cardClass}`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-2"><TableProperties className="w-5 h-5 text-indigo-500" /> התפלגות סטטוסים</h3>
                <div className="space-y-4">
                  {['חתם', 'לא ענה', 'מחכה לחתימה', 'לא רלוונטי', 'נגמר'].map((status) => {
                    const config = STATUS_CONFIG[status];
                    const count = stats.byStatus[status] || 0;
                    const percent = stats.total > 0 ? (count / stats.total * 100) : 0;
                    return (
                      <div key={status} className="group">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-sm font-bold flex items-center gap-2">{config.label} <span className="text-xs text-gray-400">({count})</span></span>
                          <span className="text-xs font-black opacity-60">{percent.toFixed(0)}%</span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-1000 ease-out rounded-full ${config.bg.replace('bg-', 'bg-').split(' ')[0]}`}
                            style={{ width: `${percent}%`, backgroundColor: 'currentColor' }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={() => setLiveNotesLead(null)} />
            <div className={`relative w-full max-w-[1280px] h-[90vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-white/20 overflow-hidden ${darkMode ? 'bg-[#0f111a]' : 'bg-[#f8fafc]'}`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b bg-white dark:bg-black/20 backdrop-blur-xl z-10">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center"><PhoneCall className="w-6 h-6 text-white" /></div>
                  <div>
                    <h3 className="font-black text-2xl">שיחה עם {liveNotesLead.clientName || 'לקוח'}</h3>
                    <p className="text-sm font-medium text-indigo-500" dir="ltr">{liveNotesLead.phone}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs transition-all ${showDecisionTree ? 'bg-emerald-600 text-white border-emerald-500 shadow-lg' : 'bg-white dark:bg-gray-800'}`}><ClipboardList className="w-4 h-4" /> {showDecisionTree ? 'חזרה לשיחה' : 'עץ החלטות'}</button>
                  <button onClick={() => setShowScript(!showScript)} className="flex items-center gap-2 px-4 py-2 rounded-xl border font-bold text-xs bg-white dark:bg-gray-800"><FileText className="w-4 h-4" /> {showScript ? 'הסתר תסריט' : 'הצג תסריט'}</button>
                  <button onClick={() => setLiveNotesLead(null)} className="p-2.5 rounded-xl border bg-white dark:bg-gray-800 text-gray-400 hover:text-red-500"><X className="w-5 h-5" /></button>
                </div>
              </div>

               {/* Modal Body: 3-Panel Layout */}
               <div className="flex-1 flex overflow-hidden min-h-0">
                 {showDecisionTree ? (
                   <div className="flex-1 overflow-y-auto custom-scrollbar bg-gray-50/50 dark:bg-black/40">
                     <LegalDecisionTree compact={true} onComplete={handleTreeComplete} />
                   </div>
                 ) : (
                   <>
                     {/* 1. Agent Assist (Right Panel) */}
                     <div className="w-80 border-l p-6 flex flex-col gap-4 overflow-y-auto bg-white/50 dark:bg-black/20 custom-scrollbar">
                       <div className="flex items-center justify-between mb-2">
                         <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-2">
                           <RefreshCw className={isAssistLoading ? 'animate-spin' : ''} size={14} /> המלצות AI בזמן אמת
                         </h4>
                         <button 
                           onClick={() => fetchAgentAssist(liveNotesLead.liveCallNotes || '')}
                           disabled={isAssistLoading}
                           className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                           title="רענן המלצות באופן ידני"
                         >
                           <RefreshCw size={12} className={isAssistLoading ? 'animate-spin' : ''} />
                         </button>
                       </div>
                       {assistError && (
                         <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 dark:text-amber-400 text-xs font-bold text-center">
                            ⚠️ {assistError}
                         </div>
                       )}

                       {assistCards.length === 0 && !isAssistLoading && !assistError && (
                         <div className="text-center py-20 opacity-30"><HelpCircle size={40} className="mx-auto mb-2" /><p className="text-xs font-bold">הקלד הערות לקבלת סיוע</p></div>
                       )}
                       {assistCards.map((card, idx) => (
                         <div key={idx} className={`p-4 rounded-2xl border animate-in slide-in-from-right-4 duration-500 ${card.emoji === '🔴' ? 'bg-red-50 dark:bg-red-900/20 border-red-200' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200'}`}>
                           <p className="text-sm font-bold leading-snug">{card.emoji} {card.text}</p>
                         </div>
                       ))}
                     </div>

                     {/* 2. Main Notes Area (Center) */}
                     <div className="flex-1 p-8 flex flex-col bg-white/30 overflow-y-auto custom-scrollbar">
                       <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" /><h4 className="text-xs font-black text-gray-500 uppercase tracking-widest">תיעוד שיחה לייב</h4></div>
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
                         placeholder="הקלד כאן בנקודות את עיקרי השיחה..."
                         className="w-full flex-1 text-xl leading-relaxed bg-transparent outline-none resize-none font-medium text-gray-800 dark:text-white"
                       />
                     </div>
                   </>
                 )}

                 {/* 3. Script / Help (Left Panel - Collapsible) */}
                 <div className={`transition-all duration-500 border-r bg-indigo-50/30 dark:bg-[#12141f] overflow-y-auto custom-scrollbar ${showScript ? 'w-[450px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                   {showScript && (
                     <div className="p-8">
                       <h4 className="text-xs font-black text-indigo-500 uppercase tracking-widest mb-6 flex items-center gap-2"><FileText size={16} /> תסריט שיחה מנצח</h4>
                       <p className="text-sm leading-relaxed whitespace-pre-wrap font-medium opacity-80">{CALL_SCRIPT}</p>
                     </div>
                   )}
                 </div>
               </div>

              {/* Modal Footer */}
              <div className="p-6 border-t bg-white/80 dark:bg-black/60 backdrop-blur-xl flex justify-between items-center z-10">
                <span className="text-xs font-bold text-gray-400">נשמר אוטומטית עכשיו</span>
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    const msg = encodeURIComponent(`*סיכום שיחה עם ${liveNotesLead.clientName}*\n\n${liveNotesLead.liveCallNotes}`);
                    window.open(`https://web.whatsapp.com/send?text=${msg}`, '_blank');
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"><MessageSquare size={18} /> שלח סיכום (WhatsApp)</button>
                  <button onClick={() => setLiveNotesLead(null)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white px-10 py-3.5 rounded-2xl text-sm font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2"><Check size={20} /> סיום שימוש</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <WebPhone 
        isOpen={isPhoneOpen} 
        onClose={() => setIsPhoneOpen(false)} 
        onCallEnd={handleCallEnd}
        targetName={phoneTarget.name}
        targetPhone={phoneTarget.phone}
        leads={leads}
      />
    </div>
  );
}
