"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { 
  Phone, 
  PhoneCall, 
  UserPlus, 
  CheckCircle, 
  X, 
  Search, 
  Plus, 
  Calendar, 
  Clock, 
  MessageSquare, 
  ChevronDown, 
  MoreVertical, 
  Trash2, 
  Archive, 
  Check, 
  RotateCcw, 
  LayoutDashboard, 
  TableProperties, 
  PhoneOff, 
  BarChart, 
  DollarSign, 
  RefreshCw, 
  Sun, 
  Moon, 
  MonitorPlay, 
  Loader2, 
  Brain, 
  ArrowUpDown, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight,
  ClipboardList,
  FileText,
  Copy,
  HelpCircle,
  Maximize2,
  History,
  Star,
  Zap
} from 'lucide-react';
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
  if (isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

const CALL_SCRIPT = `פתיחה
"אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור. יש לך כמה דקות לדבר?"

בירור כוונה
"אני רק רוצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?"

שאלות סינון
1. מה שמך המלא ומה הגיל שלך?
2. יש לך כרגע הכנסות?
3. תוכל לפרט קצת על המצב הרפואי שלך?
4. יש לך כרגע קצבאות כלשהן?
5. האם יש קושי בפעולות יומיומיות?
6. האם יש לך ביטוח סיעודי בקופת חולים?
7. משלם מס הכנסה?`;

export default function Home() {
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'followup' | 'archive' | 'analytics' | 'tree'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [showScript, setShowScript] = useState(true);
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  
  // Advanced Stage Filter (Local to CRM tab)
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  
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
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'לא רלוונטי')
    .filter(l => {
      const q = globalSearch.toLowerCase();
      const matchSearch = !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
      if (!matchSearch) return false;

      if (showAdvancedStageOnly) {
        return ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה'].includes(l.status);
      }
      return true;
    })
    .sort((a, b) => {
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
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [leads, globalSearch, archiveSearch]);

  const stats = useMemo(() => {
    const total = leads.length;
    const signed = leads.filter(l => l.status === 'חתם').length;
    const actuallyRelevant = leads.filter(l => l.wasRelevant).length;
    const successRate = actuallyRelevant > 0 ? ((signed / actuallyRelevant) * 100).toFixed(1) : "0";
    const callsWithPrice = recentCalls.filter(c => c.price && parseFloat(c.price) !== 0);
    const totalCost = callsWithPrice.reduce((sum, c) => sum + Math.abs(parseFloat(c.price)), 0);
    const avgCost = callsWithPrice.length > 0 ? (totalCost / callsWithPrice.length).toFixed(3) : "0.00";
    return { total, signed, actuallyRelevant, successRate, avgCost };
  }, [leads, recentCalls]);

  const formatCallDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };

  return (
    <div className={`min-h-screen ${darkMode ? 'dark text-slate-100 bg-slate-950' : 'text-slate-900 bg-slate-50'}`}>
      <main className="max-w-[1440px] mx-auto px-4 py-10" dir="rtl">
        {/* Integrated Header Setup */}
        <div className="flex flex-col gap-8 mb-10">
          <div className="flex justify-between items-center">
            <h1 className="text-5xl font-black tracking-tight">Sue-Chef</h1>
            <div className="flex items-center gap-4">
              <div className="bg-white dark:bg-slate-900 px-6 py-3 rounded-2xl shadow-sm border dark:border-slate-800 flex items-center gap-4">
                 <div>
                    <p className="text-[10px] text-slate-400 font-black uppercase">יתרה בטוויליו</p>
                    <p className="text-xl font-black text-emerald-500">{twilioBalance || "..."}</p>
                 </div>
                 <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800" />
                 <div className="flex gap-2">
                    <button onClick={() => setDarkMode(!darkMode)} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400">
                      {darkMode ? <Sun size={20} className="text-yellow-500" /> : <Moon size={20} className="text-indigo-500" />}
                    </button>
                    <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className="p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all text-slate-400">
                      <RefreshCw size={20} className={loadingLeads ? "animate-spin" : ""} />
                    </button>
                 </div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-2xl shadow-sm border dark:border-slate-800">
              {(['crm', 'calls', 'followup', 'archive', 'analytics', 'tree'] as const).map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)} 
                  className={`px-8 py-3 rounded-xl text-sm font-black transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  {tab === 'crm' ? 'CRM' : tab === 'calls' ? 'שיחות' : tab === 'followup' ? 'מעקב' : tab === 'archive' ? 'ארכיון' : tab === 'analytics' ? 'אנליטיקה' : 'עץ'}
                </button>
              ))}
            </div>
            
            <button onClick={addNewLead} className="bg-indigo-600 text-white px-8 py-3.5 rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all flex items-center gap-2">
              <Plus size={20} /> הוסף ליד
            </button>
          </div>
        </div>

        {/* Dynamic Controls Bar */}
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
                className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${activeTab === 'followup' ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                <Clock size={18} /> מעקב
                <span className={`px-2 py-0.5 rounded-lg text-[10px] ${activeTab === 'followup' ? 'bg-white text-amber-500' : 'bg-amber-500 text-white'}`}>{leads.filter(l => l.status === 'במעקב').length}</span>
              </button>
              
              <button 
                onClick={() => setShowAdvancedStageOnly(!showAdvancedStageOnly)}
                className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${showAdvancedStageOnly ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800'}`}
              >
                <Zap size={18} /> שלב מתקדם
              </button>
            </div>
          </div>
        )}

        {/* Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden min-h-[500px]">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">לקוח</th>
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
                        <button onClick={() => initiateCall(lead)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20 hover:scale-110 active:scale-95 transition-all">
                          <Phone size={22} fill="currentColor" />
                        </button>
                        <div>
                          <input 
                            type="text" 
                            value={lead.clientName} 
                            onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} 
                            className="font-black text-lg bg-transparent border-none outline-none focus:text-indigo-600 transition-colors w-full"
                          />
                          <p className="text-xs font-mono text-slate-400" dir="ltr">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <select 
                        value={lead.status} 
                        onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} 
                        className={`px-4 py-2.5 rounded-xl font-black text-[11px] border ring-offset-white dark:ring-offset-slate-900 focus:ring-2 ring-indigo-500/20 transition-all ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}
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
                          <button onClick={() => handleLeadUpdate(lead.id, { followUpDate: new Date().toISOString() })} className="text-[10px] font-black text-slate-300 hover:text-indigo-500 flex items-center gap-1.5 transition-colors">
                            <Calendar size={12} /> קבע מעקב
                          </button>
                        )}
                        <textarea 
                          value={lead.generalNotes || ''} 
                          onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                          className="w-full bg-transparent border-none outline-none text-sm font-bold placeholder:text-slate-200 dark:placeholder:text-slate-700 resize-none h-6" 
                          placeholder="הערה תמציתית..." 
                        />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button 
                        onClick={() => setLiveNotesLead(lead)}
                        className="text-[11px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all active:scale-95 shadow-sm"
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
            <div className="p-8 max-w-4xl mx-auto space-y-4">
               {recentCalls.map(call => (
                <div key={call.sid} className="bg-white dark:bg-slate-800/30 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex justify-between items-center hover:scale-[1.01] transition-all">
                  <div className="flex items-center gap-5">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${call.direction === 'inbound' ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30' : 'bg-blue-100 text-blue-600 dark:bg-blue-900/30'}`}>
                      {call.direction === 'inbound' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                    </div>
                    <div>
                      <p className="font-black text-xl">{leads.find(l => l.phone?.includes(call.from.slice(-9)))?.clientName || 'ליד לא מזוהה'}</p>
                      <p className="text-xs font-mono text-slate-400" dir="ltr">{call.direction==='inbound'?call.from:call.to}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-300 uppercase">משך שיחה</p>
                       <p className="font-black text-lg">{formatCallDuration(call.duration)}</p>
                    </div>
                    <div className="w-[1px] h-10 bg-slate-100 dark:bg-slate-800" />
                    <div className="text-right">
                       <p className="text-xs font-black text-slate-300 uppercase">עלות</p>
                       <p className="font-black text-lg text-emerald-500">{call.price ? `${Math.abs(parseFloat(call.price)).toFixed(2)}$` : '0.00$'}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-full text-slate-400">{formatDate(call.startTime)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-10 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                {[
                  { label: 'סה"כ לידים', val: stats.total, color: 'text-indigo-600' },
                  { label: 'אחוז הצלחה', val: stats.successRate + '%', color: 'text-emerald-500' },
                  { label: 'עלות ממוצעת', val: stats.avgCost + '$', color: 'text-amber-500' },
                  { label: 'חתימות בפועל', val: stats.signed, color: 'text-indigo-400' }
                ].map(s => (
                  <div key={s.label} className="bg-slate-50 dark:bg-slate-800/30 p-8 rounded-[40px] text-center border dark:border-slate-800">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">{s.label}</p>
                    <p className={`text-6xl font-black ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'tree' && (
            <div className="p-8 h-full">
              <LegalDecisionTree />
            </div>
          )}
        </div>
      </main>

      {/* Live Notes Modal */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50">
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center text-white shadow-xl shadow-indigo-500/20"><PhoneCall size={32} /></div>
                <div>
                  <h2 className="text-3xl font-black tracking-tight">{liveNotesLead.clientName || 'לקוח'}</h2>
                  <p className="text-sm font-mono text-slate-400" dir="ltr">{liveNotesLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setShowDecisionTree(!showDecisionTree)} 
                  className={`px-8 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-3 ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700 shadow-lg shadow-indigo-500/20' : 'bg-white dark:bg-slate-800 hover:bg-slate-50'}`}
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
                 <>
                   <div className="flex-1 p-10 flex flex-col">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-[11px] font-black uppercase text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 px-4 py-1.5 rounded-full tracking-widest">תיעוד שיחה בזמן אמת</span>
                        {liveNotesLead.followUpDate && <span className="text-[10px] font-black text-amber-500 bg-amber-50 dark:bg-amber-900/10 px-4 py-1.5 rounded-full border border-amber-100 dark:border-amber-900/30 flex items-center gap-2"><Clock size={12} /> מעקב מתוזמן</span>}
                      </div>
                      <textarea 
                        autoFocus 
                        value={liveNotesLead.liveCallNotes || ''} 
                        onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })}
                        className="flex-1 bg-transparent outline-none resize-none text-2xl font-bold placeholder:text-slate-100 dark:placeholder:text-slate-800 leading-relaxed"
                        placeholder="התחל להקליד את פרטי השיחה כאן..."
                      />
                   </div>
                   <div className="w-[400px] border-r dark:border-slate-800 p-10 bg-slate-50 dark:bg-slate-800/10 overflow-y-auto flex flex-col gap-10">
                      <div className="p-8 bg-white dark:bg-slate-900 rounded-[32px] border dark:border-slate-800 shadow-sm transition-all hover:shadow-md">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Calendar size={14} /> קביעת מועד למעקב</h4>
                        <input 
                          type="datetime-local" 
                          value={liveNotesLead.followUpDate ? new Date(liveNotesLead.followUpDate).toISOString().slice(0, 16) : ""}
                          onChange={e => handleLeadUpdate(liveNotesLead.id, { followUpDate: e.target.value })}
                          className="w-full bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border-none outline-none font-bold text-base focus:ring-2 ring-indigo-500/20"
                        />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-8 tracking-widest flex items-center gap-2"><FileText size={18} /> תסריט שיחה מומלץ</h4>
                        <p className="text-base leading-relaxed whitespace-pre-wrap font-bold text-slate-500 dark:text-slate-400 italic bg-white dark:bg-slate-900/30 p-8 rounded-3xl border border-dashed dark:border-slate-800">{CALL_SCRIPT}</p>
                      </div>
                   </div>
                 </>
               )}
            </div>
            
            <div className="p-10 border-t dark:border-slate-800 bg-white dark:bg-slate-900/50 flex justify-between items-center">
               <p className="text-xs font-black text-slate-300">מערכת Sue-Chef | אבטחת מידע ברמה גבוהה</p>
               <div className="flex gap-4">
                 <button onClick={() => copyToClipboard(liveNotesLead.liveCallNotes || '')} className="px-10 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 font-black text-sm hover:bg-slate-200 transition-all flex items-center gap-2"><Copy size={18} /> העתק תיעוד</button>
                 <button onClick={() => setLiveNotesLead(null)} className="px-14 py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-xl shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all">סיום ועדכון מערכת</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
