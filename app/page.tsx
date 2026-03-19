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
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree'>('crm');
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
  
  // New Quick Filters
  const [showFollowUpOnly, setShowFollowUpOnly] = useState(false);
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
      // 1. Global Search
      const q = globalSearch.toLowerCase();
      const matchSearch = !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
      if (!matchSearch) return false;

      // 2. Follow-up Filter
      if (showFollowUpOnly && !l.followUpDate) return false;

      // 3. Advanced Stage Filter
      if (showAdvancedStageOnly) {
        return ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה'].includes(l.status);
      }

      return true;
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, globalSearch, sortOrder, showFollowUpOnly, showAdvancedStageOnly]);

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
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-black">Sue-Chef <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full">v5.3</span></h1>
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border dark:border-slate-700">
               <p className="text-[10px] text-gray-400 font-bold uppercase">יתרה</p>
               <p className="text-xl font-black text-emerald-600">{twilioBalance || "..."}</p>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
              {darkMode ? <Sun className="text-yellow-500" /> : <Moon className="text-indigo-500" />}
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-700">
              <RefreshCw className={loadingLeads ? "animate-spin" : ""} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-8 bg-white dark:bg-slate-900 p-2 rounded-3xl shadow-sm w-fit border dark:border-slate-800">
          {(['crm', 'calls', 'archive', 'analytics', 'tree'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-6 py-3 rounded-2xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
              {tab === 'crm' ? 'CRM' : tab === 'calls' ? 'שיחות' : tab === 'archive' ? 'ארכיון' : tab === 'analytics' ? 'אנליטיקה' : 'עץ'}
            </button>
          ))}
        </div>

        {/* CRM */}
        {activeTab === 'crm' && (
          <div>
            <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
              <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={addNewLead} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"><Plus size={20} /> הוסף ליד</button>
              </div>
              
              <div className="flex items-center gap-3 w-full md:w-auto">
                {/* Search Bar */}
                <div className="relative flex-1 md:w-80">
                  <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="חיפוש לפי שם או טלפון..." 
                    value={globalSearch} 
                    onChange={e => setGlobalSearch(e.target.value)} 
                    className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-2xl pr-12 pl-6 py-4 outline-none font-bold shadow-sm focus:ring-2 ring-indigo-500/20 transition-all" 
                  />
                </div>

                {/* Quick Action: Follow-up */}
                <button 
                  onClick={() => setShowFollowUpOnly(!showFollowUpOnly)}
                  className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-black text-sm border transition-all shadow-sm ${showFollowUpOnly ? 'bg-amber-500 text-white border-amber-600 shadow-amber-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                  <Calendar size={18} />
                  <span>מעקב</span>
                  {leads.filter(l => l.followUpDate).length > 0 && <span className={`text-[10px] px-1.5 rounded-full ${showFollowUpOnly ? 'bg-white text-amber-600' : 'bg-amber-500 text-white'}`}>{leads.filter(l => l.followUpDate).length}</span>}
                </button>

                {/* Quick Action: Advanced Stage */}
                <button 
                  onClick={() => setShowAdvancedStageOnly(!showAdvancedStageOnly)}
                  className={`flex items-center gap-2 px-5 py-4 rounded-2xl font-black text-sm border transition-all shadow-sm ${showAdvancedStageOnly ? 'bg-emerald-600 text-white border-emerald-700 shadow-emerald-500/20' : 'bg-white dark:bg-slate-800 text-slate-500 border-slate-200 dark:border-slate-700'}`}
                >
                  <Zap size={18} />
                  <span>שלב מתקדם</span>
                </button>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">לקוח</th>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">סטטוס</th>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">מעקב / הערה תמציתית</th>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400 text-center">פעולות</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {crmLeads.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-20 text-center text-slate-400 font-bold">לא נמצאו לידים התואמים את הסינון</td>
                    </tr>
                  ) : (
                    crmLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-8 py-5">
                        <div className="flex items-center gap-4">
                          <button onClick={() => initiateCall(lead)} className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-110 transition-all"><Phone size={20} /></button>
                          <div>
                            <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-lg bg-transparent outline-none block" />
                            <span className="text-xs font-mono text-slate-400" dir="ltr">{lead.phone}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-5">
                        <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`px-4 py-2 rounded-xl font-bold text-xs border ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color}`}>
                          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-5">
                        <div className="flex flex-col gap-1">
                          {lead.followUpDate ? (
                            <div className="flex items-center gap-2 text-amber-600 font-black text-xs mb-1">
                              <Calendar size={14} />
                              <span>מעקב: {formatDate(lead.followUpDate)}</span>
                              <button onClick={() => handleLeadUpdate(lead.id, { followUpDate: "" })} className="hover:text-red-500"><X size={12} /></button>
                            </div>
                          ) : (
                            <button onClick={() => handleLeadUpdate(lead.id, { followUpDate: new Date().toISOString() })} className="text-[10px] text-slate-300 hover:text-indigo-500 flex items-center gap-1 w-fit mb-1"><Calendar size={10} /> קבע מעקב</button>
                          )}
                          <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} className="w-full bg-transparent border-none outline-none text-sm h-8 resize-none font-medium" placeholder="הוסף הערה..." />
                        </div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <button onClick={() => setLiveNotesLead(lead)} className="text-xs font-black text-indigo-600 border border-indigo-200 px-4 py-2 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">תיעוד מלא</button>
                      </td>
                    </tr>
                   ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Calls */}
        {activeTab === 'calls' && (
          <div className="max-w-3xl mx-auto space-y-4">
            {recentCalls.map(call => (
              <div key={call.sid} className="bg-white dark:bg-slate-900 p-6 rounded-[32px] border dark:border-slate-800 shadow-sm flex justify-between items-center transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${call.direction === 'inbound' ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-100 text-blue-600'}`}>
                    {call.direction === 'inbound' ? <ArrowUpRight /> : <ArrowDownRight />}
                  </div>
                  <div>
                    <p className="font-black text-lg">{leads.find(l => l.phone?.includes(call.from.slice(-9)))?.clientName || 'ליד לא מזוהה'}</p>
                    <p className="text-xs font-mono text-slate-400" dir="ltr">{call.direction==='inbound'?call.from:call.to}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs font-mono font-bold">{formatCallDuration(call.duration)}</span>
                  <span className="text-[10px] font-black uppercase bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{formatDate(call.startTime)}</span>
                  {call.price && <span className="text-xs font-black text-emerald-600">{Math.abs(parseFloat(call.price)).toFixed(2)}$</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Analytics */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm grid grid-cols-1 md:grid-cols-4 gap-8">
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">סה"כ לידים</p>
                <p className="text-5xl font-black text-indigo-600">{stats.total}</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">אחוז הצלחה</p>
                <p className="text-5xl font-black text-emerald-600">{stats.successRate}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">עלות ממוצעת</p>
                <p className="text-5xl font-black text-amber-600">{stats.avgCost}$</p>
              </div>
              <div className="text-center">
                <p className="text-xs font-black text-slate-400 uppercase mb-2">חתימות</p>
                <p className="text-5xl font-black text-emerald-500">{stats.signed}</p>
              </div>
            </div>
          </div>
        )}

        {/* Archive */}
        {activeTab === 'archive' && (
           <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
              <table className="w-full text-right">
                <thead className="bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-700">
                  <tr>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">לקוח</th>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">סטטוס סופי</th>
                    <th className="px-8 py-6 font-black text-xs uppercase text-slate-400">הערות</th>
                  </tr>
                </thead>
                <tbody className="divide-y dark:divide-slate-800">
                  {archiveLeads.map(lead => (
                    <tr key={lead.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                      <td className="px-8 py-5">
                         <p className="font-black text-lg">{lead.clientName || 'ללא שם'}</p>
                         <p className="text-xs font-mono text-slate-400" dir="ltr">{lead.phone}</p>
                      </td>
                      <td className="px-8 py-5">
                        <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`px-4 py-2 rounded-xl font-bold text-xs border ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color}`}>
                          {Object.entries(STATUS_CONFIG).map(([k,v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </td>
                      <td className="px-8 py-5 text-slate-500 text-sm">{lead.generalNotes || lead.liveCallNotes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        )}

        {/* Tree View Placeholder */}
        {activeTab === 'tree' && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[40px] border dark:border-slate-800 shadow-sm min-h-[400px]">
            <LegalDecisionTree />
          </div>
        )}
      </main>

      {/* Live Notes Modal */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/80 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-5xl h-[90vh] rounded-[40px] shadow-2xl flex flex-col overflow-hidden relative">
            <div className="p-6 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900/50">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white"><PhoneCall /></div>
                <div>
                   <h2 className="text-2xl font-black">שיחה עם {liveNotesLead.clientName || 'לקוח'}</h2>
                   <p className="text-sm font-mono text-slate-400" dir="ltr">{liveNotesLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`p-3 rounded-xl border flex items-center gap-2 font-bold text-xs transition-all ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800'}`}>
                  <ClipboardList size={18} /> {showDecisionTree ? 'חזרה להערות' : 'עץ החלטות'}
                </button>
                <button onClick={() => setLiveNotesLead(null)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-all"><X /></button>
              </div>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
               {showDecisionTree ? (
                 <div className="flex-1 overflow-y-auto p-8 bg-slate-50 dark:bg-slate-950">
                    <LegalDecisionTree compact={true} onComplete={handleTreeComplete} />
                 </div>
               ) : (
                 <>
                   <div className="flex-1 p-8 flex flex-col">
                      <div className="flex items-center justify-between mb-4">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">תיעוד שיחה חופשי</h4>
                        {liveNotesLead.followUpDate && <span className="text-[10px] font-black text-amber-500 bg-amber-50 px-2 py-1 rounded-md">מעקב פעיל</span>}
                      </div>
                      <textarea 
                        autoFocus 
                        value={liveNotesLead.liveCallNotes || ''} 
                        onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })}
                        className="flex-1 bg-transparent outline-none resize-none text-lg font-bold placeholder:text-slate-200 dark:placeholder:text-slate-700 leading-relaxed"
                        placeholder="הקלד הערות מהשיחה כאן..."
                      />
                   </div>
                   <div className="w-96 border-r dark:border-slate-800 p-8 bg-slate-50 dark:bg-slate-800/20 overflow-y-auto flex flex-col gap-6">
                      <div className="p-6 bg-white dark:bg-slate-800 rounded-3xl border dark:border-slate-700 shadow-sm">
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-4 tracking-widest">קביעת מעקב</h4>
                        <input 
                          type="datetime-local" 
                          value={liveNotesLead.followUpDate ? new Date(liveNotesLead.followUpDate).toISOString().slice(0, 16) : ""}
                          onChange={e => handleLeadUpdate(liveNotesLead.id, { followUpDate: e.target.value })}
                          className="w-full bg-slate-100 dark:bg-slate-900 p-3 rounded-xl border-none outline-none font-bold text-sm"
                        />
                      </div>
                      <div>
                        <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><FileText size={14} /> תסריט שיחה</h4>
                        <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-slate-600 dark:text-slate-400 opacity-80">{CALL_SCRIPT}</p>
                      </div>
                   </div>
                 </>
               )}
            </div>
            
            <div className="p-8 border-t dark:border-slate-800 bg-white dark:bg-slate-900/50 flex justify-between items-center">
               <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-4 py-2 rounded-full">השיחה מתועדת בגרסה v5.3</span>
               <div className="flex gap-4">
                 <button onClick={() => copyToClipboard(liveNotesLead.liveCallNotes || '')} className="px-6 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 font-bold text-sm hover:scale-105 transition-all">העתק תיעוד</button>
                 <button onClick={() => setLiveNotesLead(null)} className="px-10 py-3 rounded-2xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-500/20 hover:scale-105 transition-all outline-none">סיום שיחה ועדכון</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
