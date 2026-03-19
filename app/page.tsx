"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Star, Search, Calendar, ArrowUpRight, ArrowDownRight } from "lucide-react";
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
  'במעקב': { label: '⭐ במעקב', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', importance: 1 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 5 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 3 },
};

const AUTO_ONLY_STATUSES = new Set(['ממתין לעדכון']);

function getStatusStyle(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['אחר'];
}

function formatDate(d: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d; // Return as text if not a valid date
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

const CALL_SCRIPT = `פתיחה:
"אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור. יש לך כמה דקות לדבר?"

בירור כוונה:
"אני רק רוצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?"

שאלות סינון עומק:
1. מה שמך המלא ומה הגיל שלך? (חובה לדיוק מול ביטוח לאומי).
2. יש לך כרגע הכנסות? מעבודה? מקצבה? (נכות/זקנה/אבטלה).
   - אם כן, מאיפה הן מגיעות ומה הסכום בערך?
3. תוכל לפרט קצת על המצב הרפואי שלך? 
   - ממה אתה סובל ביומיום? 
   - יש אבחנות ספציפיות מרופא?
   - איך זה משפיע על היכולת שלך לעבוד או לתפקד בבית?
4. יש לך כרגע קצבאות כלשהן? (נכות כללית, ניידות, שירותים מיוחדים).
   - אם כן, אתה יודע מה אחוז הנכות שקיבלת?
5. האם יש קושי בפעולות יומיומיות בסיסיות (לבוש, רחצה, אכילה)?
6. האם יש לך ביטוח סיעודי פרטי או דרך קופת החולים?
7. האם אתה משלם מס הכנסה? (חשוב להחזרי מס רפואיים).

סגירה:
"אוקיי, רשמתי הכל. אני מעביר את הפרטים לבדיקת היתכנות אצל גילי, המומחה שלנו. נחזור אליך בהקדם עם תשובה לגבי סיכויי התביעה."`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree' | 'followup'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  
  // Live notes modal
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(true);
  
  // Decision Tree state in modal
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  
  // Advanced Stage Filter (Local to Table tab)
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, name: string, time: string}[]>([]);

  // Notification interval check
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const news = leads.filter(l => {
        if (!l.followUpDate || typeof l.followUpDate !== 'string' || l.followUpDate.trim() === '') return false;
        const timestamp = Date.parse(l.followUpDate);
        if (isNaN(timestamp)) return false;
        return new Date(timestamp) <= now;
      }).map(l => ({
        id: l.id, name: l.clientName, time: l.followUpDate
      }));
      setNotifications(news);
    };
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [leads]);
  
  const leadsRef = useRef<Lead[]>(leads);
  useEffect(() => { leadsRef.current = leads; }, [leads]);

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) setLeads(data.leads);
    } catch (e) { console.error(e); } finally { setLoadingLeads(false); }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>) => {
    if (updates.status) {
      const isRelevant = ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם'].includes(updates.status);
      if (isRelevant) updates.wasRelevant = true;
    }
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    try {
      await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    } catch (e) { console.error(e); fetchLeads(); }
  };

  const initiateCall = async (lead: Lead) => {
    if (!lead.phone) return;
    if (lead.status === 'חדש') handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
    try {
      fetch('/api/twilio/call/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: lead.phone }) });
      setLiveNotesLead(lead);
    } catch (err) { console.error(err); }
  };

  const copyToClipboard = (text: string) => navigator.clipboard.writeText(text);

  const addNewLead = async () => {
    const newLead: Lead = {
      id: crypto.randomUUID(), clientName: "", source: "Manual", createdAt: new Date().toISOString(),
      lastContacted: null, status: "חדש", followUpDate: "", generalNotes: "", liveCallNotes: "", urgency: "בינונית"
    };
    setLeads(prev => [newLead, ...prev]);
    try { await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLead) }); } catch(e) { console.error(e); }
  };

  const deleteLeadItem = async (id: string) => {
    if (!confirm('האם אתה בטוח שברצונך למחוק ליד זה לצמיתות? הפעולה לא ניתנת לביטול.')) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    try {
      await fetch('/api/leads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) });
    } catch (e) { console.error(e); fetchLeads(); }
  };

  const fetchTwilioData = async () => {
    setLoadingCalls(true);
    try {
      const [callsRes, balanceRes] = await Promise.all([ fetch('/api/twilio/calls'), fetch('/api/twilio/balance') ]);
      const callsData = await callsRes.json();
      const balanceData = await balanceRes.json();
      if (callsData.success) setRecentCalls(callsData.calls);
      if (balanceData.success) setTwilioBalance(balanceData.balance);
    } catch (e) { console.error(e); } finally { setLoadingCalls(false); }
  };

  useEffect(() => { 
    fetchTwilioData(); fetchLeads(); 
    const i1 = setInterval(fetchTwilioData, 60000); 
    const i2 = setInterval(fetchLeads, 30000); 
    return () => { clearInterval(i1); clearInterval(i2); }; 
  }, []);

  const handleTreeComplete = (answers: any) => {
    if (!liveNotesLead) return;
    const summaryParts = [];
    if (answers.name) summaryParts.push(`שם: ${answers.name}`);
    if (answers.age) summaryParts.push(`גיל: ${answers.age}`);
    if (answers.income) summaryParts.push(`הכנסה: ${answers.income}`);
    if (answers.medicalCondition) summaryParts.push(`מצב רפואי: ${answers.medicalCondition}`);
    const treeSummary = `\nסיכום עץ החלטות:\n${summaryParts.join('\n')}\n`;
    handleLeadUpdate(liveNotesLead.id, { liveCallNotes: (liveNotesLead.liveCallNotes || '') + treeSummary });
    setShowDecisionTree(false);
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (liveNotesLead) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [liveNotesLead]);

  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'לא רלוונטי' && l.status !== 'במעקב')
    .filter(l => {
      const q = globalSearch.toLowerCase();
      const matchSearch = !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
      if (!matchSearch) return false;
      if (showAdvancedStageOnly) return ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה'].includes(l.status);
      return true;
    })
    .sort((a, b) => {
      if (showAdvancedStageOnly) {
         // Priority: מחכה לחתימה (1), גילי צריך לדבר איתו (2), בבדיקה אצל גילי (3)
         const order: Record<string, number> = { 'מחכה לחתימה': 1, 'גילי צריך לדבר איתו': 2, 'בבדיקה אצל גילי': 3 };
         const orderA = order[a.status] || 99;
         const orderB = order[b.status] || 99;
         if (orderA !== orderB) return orderA - orderB;
      }
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, globalSearch, sortOrder, showAdvancedStageOnly]);

  const followupLeads = useMemo(() => leads
    .filter(l => l.status === 'במעקב')
    .filter(l => {
        const q = globalSearch.toLowerCase();
        return !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
    })
    .sort((a, b) => new Date(a.followUpDate || a.createdAt).getTime() - new Date(b.followUpDate || b.createdAt).getTime()), [leads, globalSearch]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === 'חתם' || l.status === 'לא רלוונטי' || l.status === 'נגמר')
    .filter(l => {
      const q = (globalSearch || archiveSearch).toLowerCase();
      return !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
    })
    .sort((a, b) => {
        if (a.status === 'חתם' && b.status !== 'חתם') return -1;
        if (a.status !== 'חתם' && b.status === 'חתם') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [leads, globalSearch, archiveSearch]);

  const stats = useMemo(() => {
    const total = leads.length;
    const signed = leads.filter(l => l.status === 'חתם').length;
    const irrelevant = leads.filter(l => l.status === 'לא רלוונטי').length;
    const screened = total - leads.filter(l => l.status === 'חדש').length;
    
    // Relevant leads that signed (Screened and were 'relevant' statuses or 'חתם')
    const actuallyRelevant = leads.filter(l => l.wasRelevant).length;
    
    // Relevant leads that didn't sign (were relevant but ended as 'נגמר')
    const relevantLost = leads.filter(l => l.wasRelevant && l.status === 'נגמר').length;
    
    // Immediate Irrelevant (New -> Irrelevant)
    const immediateIrrelevant = leads.filter(l => l.status === 'לא רלוונטי' && !l.wasRelevant).length;

    const successRate = actuallyRelevant > 0 ? ((signed / actuallyRelevant) * 100).toFixed(1) : "0";
    
    const callsWithPrice = recentCalls.filter(c => c.price && parseFloat(c.price) !== 0);
    const totalCost = callsWithPrice.reduce((sum, c) => sum + Math.abs(parseFloat(c.price)), 0);
    const avgCost = callsWithPrice.length > 0 ? (totalCost / callsWithPrice.length).toFixed(3) : "0.00";
    
    return { total, signed, irrelevant, actuallyRelevant, relevantLost, immediateIrrelevant, successRate, avgCost };
  }, [leads, recentCalls]);

  const formatCallDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };

  const getLeadByPhone = useCallback((phone: string) => {
    const normalized = phone.slice(-9);
    return leads.find(l => l.phone?.includes(normalized));
  }, [leads]);

  const cardClass = "premium-glass rounded-3xl";

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} relative overflow-hidden`}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10 animate-in fade-in duration-700" dir="rtl">
        {/* Header - Classical Restored v5.1 Style */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
               Sue-Chef 
               <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.1</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} לידים פעילים בטיפול שוטף</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרת טוויליו</p>
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
              <RefreshCw className={`w-6 h-6 transition-transform ${(loadingLeads) ? 'animate-spin text-indigo-500' : 'text-gray-600 dark:text-gray-300 group-hover:rotate-180 duration-500 group-hover:text-indigo-500'}`} />
            </button>
          </div>
        </div>

        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-[32px] animate-in slide-in-from-top-4 duration-500 relative group/alert">
            <button 
              onClick={() => setNotifications([])} 
              className="absolute left-6 top-6 w-8 h-8 rounded-full bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center transition-all opacity-0 group-hover/alert:opacity-100"
            >
              <X size={16} />
            </button>
            <h3 className="text-amber-800 dark:text-amber-300 font-black flex items-center gap-3 mb-4">
               <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center animate-bounce"><Clock size={16} /></div>
               הגיע הזמן לחזור ללקוחות הבאים:
            </h3>
            <div className="flex flex-wrap gap-3">
               {notifications.map(n => (
                 <div key={n.id} className="bg-white dark:bg-slate-900 px-5 py-2.5 rounded-2xl border border-amber-100 dark:border-amber-800 shadow-sm flex items-center gap-3">
                   <span className="font-black text-slate-700 dark:text-slate-200">{n.name}</span>
                   <span className="text-xs text-amber-500 font-bold">{formatDate(n.time)}</span>
                 </div>
               ))}
            </div>
          </div>
        )}

        {/* Tabs - Classic Restored Layout */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] premium-glass relative overflow-hidden group">
          {(['crm', 'calls', 'archive', 'analytics', 'tree'] as const).map(tab => (
            <button 
              key={tab} 
              onClick={() => setActiveTab(tab)} 
              className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === tab ? 'bg-indigo-600 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}
            >
              {tab === 'crm' ? 'טבלת מעקב' : tab === 'calls' ? 'שיחות אחרונות' : tab === 'archive' ? 'ארכיון' : tab === 'analytics' ? 'אנליטיקה' : 'עץ החלטות'}
            </button>
          ))}
        </div>

        {/* Search & Actions Bar - Merged Feel */}
        {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input 
                type="text" 
                placeholder="חיפוש מהיר של לקוח או טלפון..." 
                value={activeTab === 'archive' ? archiveSearch : globalSearch} 
                onChange={e => activeTab === 'archive' ? setArchiveSearch(e.target.value) : setGlobalSearch(e.target.value)} 
                className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl pr-14 pl-6 py-4 outline-none font-bold shadow-sm focus:ring-4 ring-indigo-500/5 transition-all" 
              />
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setActiveTab('followup')}
                className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${activeTab === 'followup' ? 'bg-amber-500 text-white border-amber-600' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                <Clock size={18} /> מעקב
                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === 'followup' ? 'bg-white text-amber-500' : 'bg-amber-500 text-white'}`}>{leads.filter(l => l.status === 'במעקב').length}</span>
              </button>
              
              <button 
                onClick={() => setShowAdvancedStageOnly(!showAdvancedStageOnly)}
                className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${showAdvancedStageOnly ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                <Zap size={18} /> שלב מתקדם
              </button>
              
              <button onClick={addNewLead} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
                <Plus size={20} /> הוסף ליד
              </button>
            </div>
          </div>
        )}

        {/* Content Area - Classic Rows and Gradients */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden min-h-[500px] animate-in slide-in-from-bottom-4 duration-500">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">לקוח</th>
                  <th className="px-2 py-6 font-bold w-12 text-center"></th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">סטטוס</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">תיעוד אחרון / מעקב</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">פעולות</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <button onClick={() => initiateCall(lead)} className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all">
                          <Phone size={22} fill="currentColor" />
                        </button>
                        <div>
                          <input 
                            type="text" 
                            value={lead.clientName} 
                            onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} 
                            className="font-black text-xl font-assistant bg-transparent border-none outline-none focus:text-indigo-600 transition-colors w-full"
                          />
                          <p className="text-lg font-mono text-slate-400" dir="ltr">{lead.phone}</p>
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
                                  const phone = lead.phone?.replace(/^0/, '972');
                                  const msg = encodeURIComponent(`שלום ${lead.clientName?.split(' ')[0] || 'לקוח'}, רציתי לחזור אליך בנוגע לפנייתך`);
                                  window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                  setOpenMenuId(null);
                                }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                                <button onClick={() => { copyToClipboard(lead.phone || ''); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /> העתק מספר</button>
                                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                <button onClick={() => { deleteLeadItem(lead.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 className="w-4 h-4" /> מחיקה לצמיתות</button>
                              </div>
                            </>
                          )}
                       </div>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={lead.status} 
                        onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} 
                        className={`px-4 py-2.5 rounded-xl font-black text-[11px] border focus:ring-2 ring-indigo-500/20 transition-all ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}
                      >
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2 max-w-sm">
                        {lead.followUpDate ? (
                          <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-lg w-fit border border-amber-200 dark:border-amber-800/50">
                            <Clock size={14} className="animate-pulse" />
                            <span className="text-xs font-black">{formatDate(lead.followUpDate)}</span>
                            <button onClick={() => handleLeadUpdate(lead.id, { followUpDate: "" })} className="hover:text-red-500"><X size={12} /></button>
                          </div>
                        ) : (
                          <div className="relative group/callback">
                            <Calendar size={12} className="absolute right-0 top-1.5 text-slate-300" />
                            <input 
                              type="text" 
                              placeholder="קבע מועד חזרה"
                              value={lead.followUpDate || ""}
                              className="bg-transparent border-none outline-none text-[11px] font-black text-slate-400 focus:text-indigo-600 pr-5 w-full placeholder:text-slate-200"
                              onChange={e => handleLeadUpdate(lead.id, { followUpDate: e.target.value })}
                            />
                          </div>
                        )}
                        <textarea 
                          value={lead.generalNotes || ''} 
                          onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 text-sm font-bold placeholder:text-slate-200 dark:placeholder:text-slate-700 resize-none min-h-[80px]" 
                          placeholder="הערה תמציתית..." 
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => setLiveNotesLead(lead)}
                        className="text-[11px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all active:scale-95"
                      >
                        תיעוד מלא
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'calls' && (
            <div className="p-8 max-w-4xl mx-auto space-y-4 animate-in fade-in duration-500">
               {recentCalls.map(call => {
                const lead = getLeadByPhone(call.from.slice(-10)) || getLeadByPhone(call.to.slice(-10));
                return (
                <div key={call.sid} className="bg-white dark:bg-slate-800/30 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex justify-between items-center hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">
                      {call.direction === 'inbound' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                    </div>
                    <div>
                      <p className="font-black text-xl">{lead?.clientName || 'ליד לא מזוהה'}</p>
                      <p className="text-xs font-mono text-slate-400" dir="ltr">{call.direction==='inbound'?call.from:call.to}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-300 uppercase tracking-widest">משך שיחה</p>
                       <p className="font-black text-lg">{formatCallDuration(call.duration)}</p>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800" />
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-300 uppercase tracking-widest">עלות</p>
                       <p className="font-black text-lg text-emerald-500">{call.price ? `${Math.abs(parseFloat(call.price)).toFixed(2)}$` : '0.00$'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full text-slate-400">{formatDate(call.startTime)}</span>
                  </div>
                </div>
              );})}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-10 space-y-10 animate-in zoom-in-95 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'סה"כ לידים', val: stats.total, color: 'text-indigo-600', icon: <Phone size={24} /> },
                  { label: 'חתימות (הצלחה)', val: stats.signed, color: 'text-emerald-500', detail: `${stats.successRate}% הצלחה`, icon: <CheckCircle size={24} /> },
                  { label: 'עלות שיחה', val: stats.avgCost + '$', color: 'text-amber-500', detail: 'ממוצע לשיחה', icon: <DollarSign size={24} /> },
                  { label: 'לא רלוונטיים', val: stats.irrelevant, color: 'text-red-400', detail: `${stats.immediateIrrelevant} סוננו מיד`, icon: <X size={24} /> }
                ].map(s => (
                  <div key={s.label} className="bg-white dark:bg-slate-800/50 p-10 rounded-[48px] border-2 border-slate-50 dark:border-slate-800 shadow-xl shadow-slate-200/20 dark:shadow-none hover:scale-105 transition-all">
                    <div className={`w-14 h-14 rounded-3xl ${s.color.replace('text', 'bg').replace('600', '100').replace('500', '100').replace('400', '100')} flex items-center justify-center mb-6 opacity-80`}>
                       <span className={s.color}>{s.icon}</span>
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">{s.label}</p>
                    <p className={`text-6xl font-black ${s.color} mb-2 tracking-tighter`}>{s.val}</p>
                    {s.detail && <p className="text-xs font-bold text-slate-400">{s.detail}</p>}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                 <div className="bg-indigo-600 rounded-[48px] p-10 text-white shadow-2xl shadow-indigo-500/40">
                    <h4 className="text-2xl font-black mb-6 flex items-center gap-3"><Zap /> תובנה חכמה</h4>
                    <p className="text-lg font-bold opacity-90 leading-relaxed">
                       {stats.signed > 0 
                         ? `מתוך ${stats.actuallyRelevant} לידים שנמצאו רלוונטיים, ${stats.signed} כבר חתמו. זה אומר שיחס ההמרה שלך עומד על ${stats.successRate}%.`
                         : `יש לנו כרגע ${stats.total} לידים במערכת. ככל שנתקדם בשיחות ונסמן 'רלוונטיות', נוכל לראות כאן את סיכויי הסגירה המדויקים.`
                       }
                    </p>
                 </div>
                 <div className="bg-slate-900 rounded-[48px] p-10 text-white border border-slate-800">
                    <h4 className="text-2xl font-black mb-6 flex items-center gap-3"><Brain /> ניתוח רלוונטיות</h4>
                    <div className="space-y-4 text-slate-400 font-bold">
                       <div className="flex justify-between items-center">
                          <span>לידים שנסגרו ללא חתימה (נגמר)</span>
                          <span className="text-red-400">{stats.relevantLost}</span>
                       </div>
                       <div className="flex justify-between items-center">
                          <span>לידים רלוונטיים בתהליך</span>
                          <span className="text-indigo-400">{stats.actuallyRelevant - stats.signed - stats.relevantLost}</span>
                       </div>
                       <div className="w-full bg-slate-800 h-2 rounded-full mt-4 overflow-hidden">
                          <div className="bg-indigo-500 h-full" style={{ width: `${(stats.signed / stats.actuallyRelevant * 100) || 0}%` }} />
                       </div>
                    </div>
                 </div>
              </div>
            </div>
          )}
          
          {activeTab === 'tree' && (
            <div className="p-8 h-full animate-in fade-in duration-500">
              <LegalDecisionTree />
            </div>
          )}
        </div>
      </main>

      {/* Live Notes Modal - Classic v5.1 Restoration */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20"><PhoneCall size={32} /></div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight font-assistant">{liveNotesLead.clientName || 'לקוח'}</h2>
                  <p className="text-sm font-mono text-slate-400" dir="ltr">{liveNotesLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowDecisionTree(!showDecisionTree)} 
                  className={`px-8 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-3 ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'}`}
                >
                  <ClipboardList size={20} /> {showDecisionTree ? 'חזרה לתיעוד' : 'עץ החלטות'}
                </button>
                <button onClick={() => setLiveNotesLead(null)} className="w-12 h-12 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 transition-all"><X size={28} /></button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               {showDecisionTree ? (
                 <div className="flex-1 overflow-y-auto p-10 bg-slate-50 dark:bg-slate-950">
                    <LegalDecisionTree compact={true} onComplete={handleTreeComplete} />
                 </div>
               ) : (
                 <div className="flex-1 flex flex-col md:flex-row min-h-0 divide-x divide-x-reverse dark:divide-slate-800">
                    {/* Documentation Area */}
                    <div className="flex-1 p-10 flex flex-col min-h-0 bg-white dark:bg-slate-900 transition-all duration-500 overflow-y-auto pr-8 custom-scrollbar">
                       <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                         <div className="flex-1 min-w-[300px] flex items-center gap-6">
                            <button 
                              onClick={() => setShowScriptPanel(!showScriptPanel)} 
                              className={`px-8 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${showScriptPanel ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}
                            >
                              <FileText size={16} /> {showScriptPanel ? 'סגור תסריט' : 'פתח תסריט שיחה'}
                            </button>
                            
                            <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-2xl border dark:border-slate-800">
                               <Calendar size={16} className="text-indigo-500" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">מועד למעקב:</span>
                               <input 
                                 type="text" 
                                 placeholder="הזן תאריך ושעה..."
                                 value={liveNotesLead.followUpDate || ""}
                                 onChange={e => handleLeadUpdate(liveNotesLead.id, { followUpDate: e.target.value })}
                                 className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-0"
                               />
                            </div>
                         </div>
                       </div>
                       
                       <div className="mb-4">
                          <label className="text-[10px] font-black uppercase text-indigo-600 mb-2 block tracking-widest">תיעוד שיחה בזמן אמת</label>
                          <textarea 
                            autoFocus 
                            value={liveNotesLead.liveCallNotes || ''} 
                            onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })}
                            className="w-full h-[350px] md:h-[450px] bg-slate-50 dark:bg-slate-800/20 border-2 border-slate-100 dark:border-slate-800/50 rounded-[40px] p-10 text-xl font-bold placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-relaxed font-assistant resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner custom-scrollbar"
                            placeholder="התחל להקליד את פרטי השיחה כאן..."
                          />
                       </div>
                    </div>
                    
                    {showScriptPanel && (
                      <div className="w-full md:w-[450px] bg-slate-50 dark:bg-slate-800/10 flex flex-col p-10 animate-in slide-in-from-left-4 duration-500 h-full border-r dark:border-slate-800">
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Maximize2 size={16} /> תסריט שיחה מומלץ</h4>
                           <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/30 p-10 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                             {CALL_SCRIPT}
                           </p>
                        </div>
                      </div>
                    )}
                 </div>
               )}
            </div>
            
            <div className="p-10 border-t dark:border-slate-800 bg-white dark:bg-slate-900/50 flex justify-between items-center">
               <p className="text-xs font-black text-slate-300 tracking-widest">מערכת Sue-Chef | אבטחת מידע ברמה גבוהה</p>
               <div className="flex gap-4">
                 <button onClick={() => copyToClipboard(liveNotesLead.liveCallNotes || '')} className="px-10 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-sm hover:bg-slate-200 transition-all flex items-center gap-2"><Copy size={18} /> העתק תיעוד</button>
                 <button onClick={() => setLiveNotesLead(null)} className="px-14 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><Check size={20} /> סיום ועדכון מערכת</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
