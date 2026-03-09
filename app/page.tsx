"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical } from "lucide-react";
import type { Lead } from "@/utils/storage";

// === Status Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number }> = {
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-pink-700', bg: 'bg-pink-100', darkBg: 'dark:bg-pink-950 dark:text-pink-300', border: 'border-pink-300 dark:border-pink-700', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 3 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 5 },
  'לא רוצה': { label: '❌ לא רוצה', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 3 },
  'חדש': { label: '🆕 חדש', color: 'text-indigo-700', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', importance: 0 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 0 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 3 },
};

function getStatusStyle(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['אחר'];
}

// === Phone number normalization for matching ===
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/[^\d]/g, '');
  // Convert +972XXXXXXXXX to 0XXXXXXXXX
  if (digits.startsWith('972') && digits.length >= 12) {
    return '0' + digits.substring(3);
  }
  // Already local format
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
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  
  // Live notes modal
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(true);
  
  // Filtering & Sorting
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterImportance, setFilterImportance] = useState<number | null>(null);
  const [archiveSearch, setArchiveSearch] = useState('');

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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Temporary feedback could be added here
  };

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`למחוק את הליד "${name || 'ללא שם'}"?`)) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    // Tracking deletions for analytics
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
      const callsRes = await fetch("/api/twilio/calls"); const callsData = await callsRes.json();
      if (callsData.success) setRecentCalls(callsData.calls);
    } catch (e) { console.error("Failed to fetch Twilio data", e); }
    finally { setLoadingCalls(false); }
  };

  useEffect(() => { fetchTwilioData(); fetchLeads(); const i1 = setInterval(fetchTwilioData, 60000); const i2 = setInterval(fetchLeads, 30000); return () => { clearInterval(i1); clearInterval(i2); }; }, []);

  // === Dark Mode ===
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // === Image Paste Handler (Tesseract.js client-side OCR) ===
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
          // Dynamically load Tesseract.js from CDN
          const Tesseract = (window as any).Tesseract || await new Promise<any>((resolve, reject) => {
            if ((window as any).Tesseract) { resolve((window as any).Tesseract); return; }
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
            script.onload = () => resolve((window as any).Tesseract);
            script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
            document.head.appendChild(script);
          });

          // Run OCR with Hebrew + English
          const result = await Tesseract.recognize(blob, 'heb+eng', {
            logger: (m: any) => console.log('OCR:', m.status, Math.round((m.progress || 0) * 100) + '%')
          });

          const text = result.data.text.trim();
          console.log('OCR Full Text:', text);

          if (!text) {
            alert('לא זיהינו טקסט בתמונה. נסה תמונה ברורה יותר.');
            setProcessingImageId(null);
            return;
          }

          // Extract phone number (Israeli format)
          const phoneMatch = text.match(/0[2-9]\d[-.\s]?\d{3}[-.\s]?\d{4}|0[2-9]\d{8}/)
                          || text.match(/\d{9,10}/);
          const phone = phoneMatch ? phoneMatch[0].replace(/[-.\s]/g, '') : '';
          
          // Extract name: everything that's NOT the phone number, clean up
          let name = text;
          if (phone) name = name.replace(phoneMatch![0], '');
          name = name.replace(/[\d\n\r\t|]/g, ' ').replace(/\s+/g, ' ').trim();

          const updates: Partial<Lead> = {};
          if (name) updates.clientName = name;
          if (phone) updates.phone = phone;

          if (Object.keys(updates).length > 0) {
            handleLeadUpdate(leadId, updates);
          } else {
            alert('לא הצלחנו לחלץ שם או טלפון מהתמונה.');
          }
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
    .filter(l => l.status !== 'חתם' && l.status !== 'לא רלוונטי' && l.status !== 'לא רוצה')
    .filter(l => filterImportance === null || getStatusStyle(l.status).importance === filterImportance)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, filterImportance, sortOrder]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === 'חתם' || l.status === 'לא רלוונטי' || l.status === 'לא רוצה')
    .filter(l => {
      if (!archiveSearch) return true;
      const q = archiveSearch.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q));
    })
    .sort((a, b) => {
      if (a.status === 'חתם' && b.status !== 'חתם') return -1;
      if (b.status === 'חתם' && a.status !== 'חתם') return 1;
      const dateA = new Date(a.signedAt || a.createdAt).getTime();
      const dateB = new Date(b.signedAt || b.createdAt).getTime();
      return dateB - dateA;
    }), [leads, archiveSearch]);

  // === Helpers ===
  const formatDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
  const formatDate = (d: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

  // Card/Panel base classes for dark mode
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
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
              Sue-Chef
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} לידים פעילים בטיפול שוטף</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Balance */}
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרת חשבון</p>
                <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p>
              </div>
            </div>
            {/* Theme Toggle */}
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 transition-all active:scale-95 hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6">
                <Sun className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-transform duration-500 ${darkMode ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
                <Moon className={`absolute inset-0 w-6 h-6 text-indigo-400 transition-transform duration-500 ${darkMode ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
              </div>
            </button>
            {/* Refresh */}
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-6 h-6 transition-transform ${(loadingCalls||loadingLeads) ? 'animate-spin text-indigo-500' : 'text-gray-600 dark:text-gray-300 group-hover:rotate-180 duration-500 group-hover:text-indigo-500'}`} />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
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
        </div>

        {/* =================== CRM TAB =================== */}
        {activeTab === 'crm' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {/* Toolbar */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <button onClick={addNewLead} className="group relative flex items-center gap-2.5 bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-6 py-3.5 rounded-2xl text-sm font-bold shadow-xl shadow-gray-900/10 dark:shadow-white/10 transition-all hover:scale-105 active:scale-95 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <Plus className="w-4 h-4 relative z-10" /> 
                  <span className="relative z-10">ליד חדש</span>
                </button>
              </div>
              <div className={`flex items-center gap-2 p-1.5 ${cardClass}`}>
                <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-colors bg-white/50 dark:bg-gray-800/50 hover:bg-white dark:hover:bg-gray-700`}>
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-500" />
                  {sortOrder === 'desc' ? 'הכי חדשים קודם' : 'הכי ישנים קודם'}
                </button>
                <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
                <select value={filterImportance ?? ''} onChange={e => setFilterImportance(e.target.value === '' ? null : Number(e.target.value))} className={`px-4 py-2.5 rounded-xl text-xs font-bold outline-none cursor-pointer bg-transparent appearance-none text-gray-700 dark:text-gray-200`}>
                  <option value="">🎯 הצג את כל הלידים</option>
                  <option value="1">🔴 חשיבות עליונה</option>
                  <option value="2">🟠 חשיבות בינונית-גבוהה</option>
                  <option value="3">🟡 חשיבות בינונית</option>
                  <option value="4">🔵 עדיפות נמוכה</option>
                  <option value="5">⚫ ארכיון / לא רלוונטי</option>
                  <option value="0">🆕 לידים שטרם טופלו</option>
                </select>
              </div>
            </div>

            {/* CRM Table */}
            {loadingLeads ? (
              <div className={`rounded-3xl shadow-xl shadow-indigo-500/5 p-16 flex flex-col items-center justify-center gap-4 ${cardClassSoft}`}>
                <RefreshCw className="w-10 h-10 text-indigo-500 animate-spin" />
                <p className="text-gray-500 dark:text-gray-400 font-medium animate-pulse">טוען לידים...</p>
              </div>
            ) : crmLeads.length === 0 ? (
              <div className={`rounded-3xl shadow-xl shadow-indigo-500/5 p-16 text-center ${cardClassSoft}`}>
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Phone className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{leads.length > 0 ? 'אין תוצאות חיפוש' : 'אין לידים במערכת'}</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto">{leads.length > 0 ? 'נסה לשנות את פילטר החשיבות כדי לראות תוצאות אחרות.' : 'לחץ על הכפתור "ליד חדש" למעלה כדי להתחיל להזין נתונים.'}</p>
              </div>
            ) : (
              <div className={`w-full overflow-hidden rounded-3xl shadow-2xl shadow-indigo-500/5 ${cardClass}`}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50/50 dark:bg-[#151822]/80 border-b border-gray-100 dark:border-gray-800/50 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4 font-bold min-w-[280px]">שם וטלפון לחיוג</th>
                        <th className="px-4 py-4 font-bold min-w-[120px]">תאריך יצירה</th>
                        <th className="px-4 py-4 font-bold min-w-[170px]">סטטוס טיפול</th>
                        <th className="px-4 py-4 font-bold min-w-[140px]">מתי לחזור</th>
                        <th className="px-4 py-4 font-bold min-w-[200px]">הערות אישיות</th>
                        <th className="px-4 py-4 font-bold min-w-[140px] text-center">מסך שיחה</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                      {crmLeads.map((lead) => {
                        const statusStyle = getStatusStyle(lead.status);
                        const isCustomStatus = !STATUS_CONFIG[lead.status] && lead.status !== 'חדש';
                        return (
                          <tr key={lead.id} className="hover:bg-indigo-50/40 dark:hover:bg-indigo-500/5 transition-all duration-300 group">
                            {/* Name & Phone - pasteable */}
                            <td className="px-6 py-4">
                              <div onPaste={(e) => handlePaste(e, lead.id)} className={`relative p-3 rounded-2xl transition-all duration-300 ${processingImageId === lead.id ? 'bg-indigo-50 dark:bg-indigo-900/40 ring-2 ring-indigo-400' : 'hover:bg-white/50 dark:hover:bg-gray-800/30'}`}>
                                {processingImageId === lead.id ? (
                                  <div className="flex items-center gap-3 text-indigo-600 dark:text-indigo-400 font-bold text-sm"><Loader2 className="w-5 h-5 animate-spin" /> מנתח תמונה...</div>
                                ) : (
                                  <div className="flex items-center gap-5 relative group/call-container">
                                    <div className="flex flex-col gap-2 relative group/call-actions">
                                      <button 
                                        onClick={() => {
                                          window.location.href = `tel:${lead.phone || ''}`;
                                          setTimeout(() => { window.location.href = `callto:${lead.phone || ''}`; }, 500);
                                        }}
                                        className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-blue-600 hover:from-indigo-400 hover:to-blue-500 text-white rounded-[20px] shadow-lg shadow-indigo-500/25 transition-all duration-300 hover:scale-[1.05] active:scale-95 shrink-0 hover:rotate-3" 
                                        title="חיוג מיידי (MicroSIP)"
                                      >
                                        <Phone className="w-6 h-6 fill-current" />
                                      </button>
                                    </div>
  
                                    <div className="flex flex-col flex-1 min-w-0 justify-center">
                                      {/* Name */}
                                      <div className="flex items-center justify-between group/name mb-1">
                                        {(() => {
                                          const nameStyle = lead.clientName.match(/^[a-zA-Z\s]+$/) ? "tracking-widest" : "tracking-wide";
                                          return (
                                            <input 
                                              type="text" 
                                              value={lead.clientName} 
                                              onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} 
                                              className={`font-sans text-xl font-black bg-transparent outline-none flex-1 text-gray-900 dark:text-white placeholder:text-gray-300 dark:placeholder:text-gray-700 truncate ${nameStyle}`}
                                              placeholder="הדבק תמונה / שם ליד" 
                                            />
                                          );
                                        })()}
                                        <div className="relative">
                                          <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === lead.id ? null : lead.id); }} className="list-none p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-all cursor-pointer">
                                            <MoreVertical className="w-5 h-5" />
                                          </button>
                                          {openMenuId === lead.id && (
                                            <>
                                              <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)}></div>
                                              <div className="absolute bottom-full left-0 mb-2 w-40 bg-white dark:bg-gray-800 rounded-xl shadow-xl shadow-black/10 border border-gray-100 dark:border-gray-700 overflow-hidden z-50 flex flex-col">
                                                {lead.phone && lead.phone.length >= 9 && (
                                                  <button 
                                                    onClick={() => {
                                                      const message = encodeURIComponent(`היי ${lead.clientName || ''}, קוראים לי יונתן אני ממשרד עו"ד HBA. השארת אצלנו פרטים בנוגע לזכויות רפואיות וניסיתי לחזור אלייך, אשמח אם נוכל לשוחח כשיהיה זמן`);
                                                      const waPhone = normalizePhone(lead.phone!).replace(/^0/, '972');
                                                      window.open(`https://wa.me/${waPhone}?text=${message}`, '_blank');
                                                      setOpenMenuId(null);
                                                    }}
                                                    className="flex justify-between items-center w-full px-4 py-3 text-sm font-bold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-right transition-colors"
                                                  >
                                                    <MessageSquare className="w-4 h-4 ml-2" /> הודעה
                                                  </button>
                                                )}
                                                <button 
                                                  onClick={() => { deleteLead(lead.id, lead.clientName); setOpenMenuId(null); }} 
                                                  className="flex justify-between items-center w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-gray-50 dark:border-gray-700/50 text-right"
                                                >
                                                  <Trash2 className="w-4 h-4 ml-2" /> מחק
                                                </button>
                                              </div>
                                            </>
                                          )}
                                        </div>
                                      </div>

                                      {/* Phone - stacked below */}
                                      <div className="flex flex-col">
                                        <div className="flex items-center gap-2">
                                          <input 
                                            type="text" 
                                            value={lead.phone || ''} 
                                            onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} 
                                            className="font-sans text-xl font-black tracking-widest bg-transparent outline-none text-gray-500 dark:text-gray-400 placeholder:text-gray-300 dark:placeholder:text-gray-700 w-[180px]" 
                                            placeholder="05..."
                                            dir="ltr" 
                                          />
                                          <button 
                                            onClick={() => copyToClipboard(lead.phone || '')}
                                            className="p-1.5 text-gray-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-all"
                                            title="העתק מספר"
                                          >
                                            <Copy className="w-4 h-4" />
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </td>
                            {/* Date */}
                            <td className="px-4 py-4 text-sm font-bold text-gray-800 dark:text-gray-200 whitespace-nowrap">{formatDate(lead.lastContacted || lead.createdAt)}</td>
                            {/* Status */}
                              <td className="px-4 py-4">
                                {isCustomStatus ? (
                                  <input type="text" value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`text-xs font-black tracking-wide rounded-xl px-3 py-2 w-full outline-none border focus:ring-2 focus:ring-indigo-500/50 transition-all ${statusStyle.bg} ${statusStyle.darkBg} ${statusStyle.color} ${statusStyle.border}`} />
                                ) : (
                                  <select value={lead.status} onChange={e => { 
                                      const newStatus = e.target.value === 'אחר' ? '' : e.target.value;
                                      const updates: Partial<Lead> = { status: newStatus };
                                      if (newStatus === 'חתם' && !lead.signedAt) updates.signedAt = new Date().toISOString();
                                      handleLeadUpdate(lead.id, updates); 
                                    }} 
                                    className={`text-xs font-black tracking-wide rounded-xl px-3 py-2 outline-none border cursor-pointer w-full focus:ring-2 focus:ring-indigo-500/50 transition-all appearance-none ${statusStyle.bg} ${statusStyle.darkBg} ${statusStyle.color} ${statusStyle.border}`}
                                  >
                                    {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                      <option key={key} value={key}>{cfg.label}</option>
                                    ))}
                                  </select>
                                )}
                              </td>
                            {/* Follow-up (free text) */}
                            <td className="px-4 py-4">
                              <input type="text" value={lead.followUpDate || ''} onChange={e => handleLeadUpdate(lead.id, { followUpDate: e.target.value })} placeholder="למשל: יום ראשון" className="text-xs font-medium w-full bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 rounded-xl px-3 py-2 outline-none placeholder:text-gray-400 dark:placeholder:text-gray-600 transition-all" />
                            </td>
                            {/* General Notes */}
                            <td className="px-4 py-4">
                              <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} placeholder="הערות..." className="w-full min-h-[60px] text-sm font-semibold text-gray-800 dark:text-gray-200 resize-none bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-800 rounded-xl p-3 outline-none placeholder:text-gray-500 transition-all leading-relaxed" />
                            </td>
                            {/* Live Call Notes - opens modal */}
                            <td className="px-4 py-4 text-center">
                              <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 px-4 py-2.5 rounded-xl transition-all border border-amber-200/50 dark:border-amber-700/50 group/notes shadow-sm">
                                <Maximize2 className="w-4 h-4 group-hover/notes:scale-110 transition-transform" /> פתח
                              </button>
                              {lead.liveCallNotes && <p className="text-[10px] text-gray-500 mt-2 truncate max-w-[120px] mx-auto opacity-70 group-hover:opacity-100 transition-opacity">{lead.liveCallNotes.substring(0, 30)}...</p>}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* =================== ARCHIVE & SIGNED LEADS TAB =================== */}
        {activeTab === 'archive' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            {loadingLeads ? (
              <div className={`rounded-3xl p-16 flex flex-col items-center justify-center gap-4 ${cardClassSoft}`}>
                <RefreshCw className="w-10 h-10 text-amber-500 animate-spin" />
              </div>
            ) : archiveLeads.length === 0 && !archiveSearch ? (
              <div className={`rounded-3xl p-16 text-center ${cardClassSoft}`}>
                <div className="w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-amber-500" />
                </div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">אין כרגע לידים בארכיון</h3>
                <p className="text-gray-500 dark:text-gray-400">לידים שהועברו לסטטוס "חתם" או "לא רלוונטי" יופיעו כאן ההיסטורית.</p>
              </div>
            ) : (
              <div className={`w-full overflow-hidden rounded-3xl shadow-2xl shadow-amber-500/5 ${cardClass}`}>
                <div className="p-6 border-b border-gray-100/50 dark:border-gray-800/50 flex flex-col md:flex-row items-start md:items-center justify-between bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm gap-4">
                  <h3 className="font-bold text-lg flex items-center gap-3"><CheckCircle className="w-6 h-6 text-amber-500" /> ארכיון</h3>
                  
                  <div className="flex items-center gap-3 w-full md:w-auto">
                    <input 
                      type="text" 
                      placeholder="חפש ליד לפי שם או טלפון..." 
                      value={archiveSearch}
                      onChange={(e) => setArchiveSearch(e.target.value)}
                      className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none text-sm w-full md:w-64 focus:border-amber-500 transition-colors"
                    />
                    <span className="text-sm font-bold bg-amber-100 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400 px-3 py-2 rounded-xl border border-amber-200 dark:border-amber-500/20 whitespace-nowrap">{archiveLeads.length} רשומות</span>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-right">
                    <thead className="text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest bg-gray-50/50 dark:bg-[#151822]/80 border-b border-gray-100 dark:border-gray-800/50 backdrop-blur-md">
                      <tr>
                        <th className="px-6 py-4 font-bold min-w-[200px]">שם וטלפון</th>
                        <th className="px-4 py-4 font-bold min-w-[120px]">תאריך החתימה</th>
                        <th className="px-4 py-4 font-bold min-w-[160px]">סטטוס טיפול</th>
                        <th className="px-4 py-4 font-bold min-w-[200px]">הערות אישיות (סיכום)</th>
                        <th className="px-4 py-4 font-bold min-w-[100px] text-center">פעולות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                      {archiveLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-amber-50/40 dark:hover:bg-amber-500/5 transition-all duration-300">
                           <td className="px-6 py-4">
                             <p className="text-lg font-black text-gray-900 dark:text-white tracking-wide">{lead.clientName || 'לקוח ללא שם'}</p>
                             <p className="text-gray-500 dark:text-gray-400 tracking-widest font-mono font-medium mt-1" dir="ltr">{lead.phone || 'ללא מספר'}</p>
                           </td>
                           <td className="px-4 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">
                             {lead.signedAt ? formatDate(lead.signedAt) : formatDate(lead.createdAt)}
                           </td>
                           <td className="px-4 py-4">
                             <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`text-xs font-black tracking-wide rounded-xl px-3 py-2 outline-none border cursor-pointer w-full focus:ring-2 focus:ring-amber-500/50 transition-all appearance-none ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).darkBg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}>
                               {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                 <option key={key} value={key}>{cfg.label}</option>
                               ))}
                             </select>
                           </td>
                           <td className="px-4 py-4">
                             <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} placeholder="הערות אישיות..." className="w-full min-h-[60px] text-sm font-semibold text-gray-800 dark:text-gray-200 resize-none bg-white/50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 focus:border-amber-500 focus:bg-white dark:focus:bg-gray-800 rounded-xl p-3 outline-none placeholder:text-gray-500 transition-all leading-relaxed" />
                           </td>
                           <td className="px-4 py-4 text-center">
                              <button onClick={() => deleteLead(lead.id, lead.clientName)} className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all focus:opacity-100" title="מחק ליד לצמיתות">
                                <Trash2 className="w-5 h-5 mx-auto" />
                              </button>
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

        {/* =================== CALLS TAB =================== */}
        {activeTab === 'calls' && (
          <div className={`animate-in fade-in slide-in-from-bottom-4 duration-500 rounded-3xl shadow-2xl shadow-indigo-500/5 overflow-hidden ${cardClass}`}>
            <div className="p-6 border-b border-gray-100/50 dark:border-gray-800/50 flex items-center justify-between bg-white/30 dark:bg-gray-900/30 backdrop-blur-sm">
              <h3 className="font-bold text-lg flex items-center gap-3"><History className="w-6 h-6 text-indigo-500" /> יומן שיחות אחרונות</h3>
              <span className="text-xs font-bold font-mono tracking-widest bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 px-3 py-1.5 rounded-lg border border-indigo-200 dark:border-indigo-500/20">TWILIO LINE</span>
            </div>
            <div className="p-6 flex flex-col gap-3 max-w-3xl mx-auto">
              {loadingCalls ? [1,2,3,4,5].map(i => (
                <div key={i} className={`animate-pulse p-5 rounded-2xl ${cardClassSoft}`}><div className="h-4 bg-gray-200 dark:bg-gray-700/50 rounded-md w-1/2 mb-3" /><div className="h-3 bg-gray-200 dark:bg-gray-700/50 rounded-md w-1/3" /></div>
              )) : recentCalls.length === 0 ? (
                <div className="text-center py-16">
                  <PhoneOff className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">לא נמצאו שיחות ברשומות של Twilio לאחרונה</p>
                </div>
              ) : recentCalls.map(call => {
                const callPhone = call.direction === 'inbound' ? call.from : call.to;
                const matchedName = findLeadNameByPhone(callPhone || '', leads);
                return (
                  <div key={call.sid} className={`flex flex-col p-5 rounded-2xl transition-all duration-300 hover:border-indigo-300 flex-1 hover:shadow-lg dark:hover:border-indigo-500/30 ${cardClassSoft}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex flex-col gap-1">
                        {matchedName && <span className="font-bold text-base text-indigo-600 dark:text-indigo-400">{matchedName}</span>}
                        <span className={`${matchedName ? 'text-xs font-medium text-gray-500 dark:text-gray-400' : 'font-bold text-base text-gray-900 dark:text-white'}`} dir="ltr">{callPhone}</span>
                      </div>
                      <span className={`text-[10px] font-black tracking-wider px-2.5 py-1 rounded-md shrink-0 border ${call.status === 'completed' ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' : call.status === 'no-answer' || call.status === 'failed' || call.status === 'busy' ? 'bg-red-50 text-red-700 border-red-200 dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20' : 'bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'}`}>
                        {call.direction === 'inbound' ? '📥 נכנסת' : '📤 יוצאת'}
                      </span>
                    </div>
                    <div className="flex justify-between items-end mt-auto pt-3 border-t border-gray-100 dark:border-gray-700/50">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-500">{call.startTime ? formatDate(call.startTime) : '-'}</span>
                      <span className={`text-xs font-mono font-bold px-2 py-1 rounded-md border border-gray-100 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50`}>{formatDuration(call.duration)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =================== ANALYTICS TAB =================== */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <h2 className="text-2xl font-black mb-6 flex items-center gap-3"><BarChart className="text-purple-500" /> סקירת ביצועים אישית</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              {/* Stat Card 1: Twilio Spend */}
              <div className={`p-6 flex flex-col gap-2 relative overflow-hidden ${cardClass}`}>
                <div className="absolute top-0 left-0 w-2 h-full bg-emerald-500"></div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mb-2 shadow-inner">
                  <DollarSign className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">הוצאות Twilio נוכחיות</p>
                <div className="flex items-end gap-2">
                  <h3 className="text-4xl font-black text-gray-900 dark:text-white" dir="ltr">{twilioBalance || "0.00$"}</h3>
                </div>
                <p className="text-xs text-gray-400 font-medium">יתרה שנותרה בחשבון</p>
              </div>

              {/* Stat Card 2: Total Calls */}
              <div className={`p-6 flex flex-col gap-2 relative overflow-hidden ${cardClass}`}>
                <div className="absolute top-0 left-0 w-2 h-full bg-blue-500"></div>
                <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center mb-2 shadow-inner">
                  <PhoneCall className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">יומן שיחות (אחרונות)</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white">{recentCalls.length}</h3>
                <p className="text-xs text-gray-400 font-medium">שיחות שנרשמו לאחרונה</p>
              </div>

              {/* Stat Card 3: Signed Deals */}
              <div className={`p-6 flex flex-col gap-2 relative overflow-hidden ${cardClass}`}>
                <div className="absolute top-0 left-0 w-2 h-full bg-amber-500"></div>
                <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mb-2 shadow-inner">
                  <CheckCircle className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">לקוחות שחתמו</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white">{leads.filter(l => l.status === 'חתם').length}</h3>
                <p className="text-xs text-gray-400 font-medium">מתוך {leads.length} לידים כוללים ({leads.length > 0 ? (leads.filter(l => l.status === 'חתם').length / leads.length * 100).toFixed(1) : '0'}%)</p>
              </div>

              {/* Stat Card 4: Deleted Leads */}
              <div className={`p-6 flex flex-col gap-2 relative overflow-hidden ${cardClass}`}>
                <div className="absolute top-0 left-0 w-2 h-full bg-gray-500/50"></div>
                <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center mb-2 shadow-inner">
                  <Trash2 className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">לידים שנמחקו</p>
                <h3 className="text-4xl font-black text-gray-900 dark:text-white">{typeof window !== 'undefined' ? localStorage.getItem('analytics_deleted_leads') || '0' : '0'}</h3>
                <p className="text-xs text-gray-400 font-medium">מאז תחילת תיעוד מחיקות</p>
              </div>
            </div>

            <div className={`p-8 ${cardClass}`}>
              <h3 className="text-lg font-bold mb-6 border-b border-gray-100 dark:border-gray-800 pb-4">התפלגות סטטוסים</h3>
              <div className="flex flex-col gap-4">
                {Object.entries(STATUS_CONFIG).map(([statusKey, config]) => {
                  const count = leads.filter(l => l.status === statusKey).length;
                  if (count === 0 && statusKey !== 'חתם') return null; // hide empty except signed
                  const percentage = leads.length > 0 ? (count / leads.length) * 100 : 0;
                  return (
                    <div key={statusKey} className="flex items-center gap-4">
                      <div className="w-48 text-sm font-bold text-gray-600 dark:text-gray-300">{config.label}</div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-4 rounded-full overflow-hidden">
                        <div className={`h-full ${config.bg} ${config.color} border-r-2 ${config.border} opacity-80`} style={{ width: `${Math.max(percentage, 1)}%` }}></div>
                      </div>
                      <div className="w-16 text-left text-sm font-bold text-gray-800 dark:text-gray-100">{count}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =================== LIVE NOTES MODAL =================== */}
        {liveNotesLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-300" style={{ overscrollBehavior: 'contain' }}>
            {/* Backdrop */}
            <div className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-md transition-opacity" onClick={() => setLiveNotesLead(null)}></div>
            
            {/* Modal Content */}
            <div className={`relative w-full max-w-5xl h-[85vh] flex flex-col rounded-[2.5rem] shadow-2xl border border-white/20 dark:border-white/10 ${darkMode ? 'bg-[#0f111a]' : 'bg-[#f8fafc]'}`} style={{ overflow: 'hidden' }}>
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-gray-200/50 dark:border-gray-800 shadow-sm bg-white/50 dark:bg-black/20 backdrop-blur-xl z-10">
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                    <PhoneCall className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-black text-2xl text-gray-900 dark:text-white leading-none">שיחה עם {liveNotesLead.clientName || 'לקוח ללא שם'}</h3>
                    {liveNotesLead.phone && <p className="text-sm font-medium text-indigo-600 dark:text-indigo-400 mt-1.5 opacity-90 tracking-widest" dir="ltr">{liveNotesLead.phone}</p>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <button onClick={() => setShowScript(s => !s)} className={`flex items-center gap-2 text-xs font-bold px-4 py-2.5 rounded-xl border transition-all duration-300 ${showScript ? 'bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-500/30 shadow-inner' : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:shadow-md'}`}>
                    <FileText className="w-4 h-4" /> {showScript ? 'הסתר תסריט' : 'הצג תסריט'}
                  </button>
                  <div className="w-px h-8 bg-gray-200 dark:bg-gray-700 mx-2"></div>
                  <button onClick={() => setLiveNotesLead(null)} className="p-2.5 bg-white dark:bg-gray-800 hover:bg-red-50 dark:hover:bg-red-900/30 hover:text-red-600 border border-gray-200 dark:border-gray-700 rounded-xl transition-all duration-300 group shadow-sm"><X className="w-5 h-5 text-gray-400 group-hover:text-red-500" /></button>
                </div>
              </div>
              
              {/* Body */}
              <div className="flex-1 flex overflow-hidden min-h-0 relative">
                {/* Left / Notes Panel */}
                <div className="flex-1 p-8 pb-28 flex flex-col min-w-0 bg-white/40 dark:bg-black/10 overflow-y-auto custom-scrollbar">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <h4 className="text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">סיכום שיחה</h4>
                  </div>
                  <textarea
                    autoFocus
                    value={liveNotesLead.liveCallNotes || ''}
                    onChange={e => { handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value }); setLiveNotesLead(prev => prev ? { ...prev, liveCallNotes: e.target.value } : null); }}
                    placeholder="הקלד כאן את תקציר השיחה באופן חופשי..."
                    className="w-full flex-1 text-lg leading-relaxed resize-none bg-transparent outline-none placeholder:text-gray-300 dark:placeholder:text-gray-700 font-medium text-gray-800 dark:text-gray-100 custom-scrollbar"
                  />
                </div>
                
                {/* Right / Script Panel (collapsible) */}
                <div className={`transition-all duration-500 ease-in-out border-r border-gray-200/50 dark:border-gray-800 bg-indigo-50/40 dark:bg-[#12141f] shrink-0 overflow-y-auto custom-scrollbar relative ${showScript ? 'w-[450px] opacity-100 flex flex-col' : 'w-0 opacity-0 overflow-hidden'}`}>
                   {showScript && (
                    <div className="p-8 pb-32">
                      <h4 className="text-xs font-black text-indigo-500 dark:text-indigo-400 uppercase tracking-widest mb-6 flex items-center gap-2 sticky top-0 bg-indigo-50/40 dark:bg-[#12141f] py-2 z-10 backdrop-blur-md">
                        <FileText className="w-4 h-4" /> תסריט שיחה מומלץ
                      </h4>
                      <div className="text-sm leading-relaxed whitespace-pre-wrap text-gray-700 dark:text-gray-300 font-medium">
                        {CALL_SCRIPT}
                      </div>
                    </div>
                   )}
                </div>
              </div>
              
              {/* Footer */}
              <div className="p-5 border-t border-gray-200/50 dark:border-gray-800 bg-white/80 dark:bg-black/40 backdrop-blur-xl flex justify-between items-center absolute bottom-0 left-0 right-0 z-20">
                <span className="text-xs font-medium text-gray-400 dark:text-gray-500 px-4">ההערות נשמרות אוטומטית בענן</span>
                <div className="flex items-center gap-3">
                  <button onClick={() => {
                    const message = encodeURIComponent(`*סיכום שיחה עם ${liveNotesLead.clientName || 'לקוח'}*\nטלפון: ${liveNotesLead.phone || '-'}\nסטטוס: ${liveNotesLead.status}\n\n*הערות סיכום:*\n${liveNotesLead.liveCallNotes || 'אין הערות בתיעוד...'}`);
                    window.open(`https://wa.me/?text=${message}`, '_blank');
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-2">
                    <MessageSquare className="w-4 h-4" /> שלח לעורך דין (WhatsApp)
                  </button>
                  <button onClick={() => setLiveNotesLead(null)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white px-8 py-3.5 rounded-xl text-sm font-bold shadow-xl shadow-indigo-500/20 transition-all active:scale-95 flex items-center gap-2 hover:shadow-indigo-500/40">
                    <Check className="w-5 h-5" /> סיום שיחה וחזרה ללוח
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
