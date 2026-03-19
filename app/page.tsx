"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Star, Search, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Users } from "lucide-react";
import type { Lead } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';
import { legalQuestions } from '@/utils/legalQuestions';
import { evaluateResults } from '@/utils/legalLogic';

// === Configuration ===
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

const LOST_REASONS = ["אין מענה חוזר", "אין עילה רפואית", "מתחרים/לקח עו\"ד אחר", "לא מעוניין", "טעות במספר", "אחר"];

function getStatusStyle(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['אחר'];
}

function formatDate(d: string | null) {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree' | 'followup'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Modals
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [pendingDisqualification, setPendingDisqualification] = useState<{ id: string, action: 'delete' | 'fail', targetStatus?: string } | null>(null);
  
  // Sorting/Search
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, name: string, time: string}[]>([]);

  // Analytics Fetching
  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.success) setAnalyticsData(data.data);
    } catch (e) { console.error("Analytics fetch fail", e); }
    setLoadingAnalytics(false);
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalyticsData();
  }, [activeTab]);

  // Notifications
  useEffect(() => {
    const checkNotifications = () => {
      const now = new Date();
      const news = leads.filter(l => {
        if (!l.followUpDate || typeof l.followUpDate !== 'string' || l.followUpDate.trim() === '') return false;
        const timestamp = Date.parse(l.followUpDate);
        if (isNaN(timestamp)) return false;
        return new Date(timestamp) <= now;
      }).map(l => ({ id: l.id, name: l.clientName, time: l.followUpDate }));
      setNotifications(news);
    };
    const interval = setInterval(checkNotifications, 30000);
    return () => clearInterval(interval);
  }, [leads]);
  
  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) setLeads(data.leads);
    } catch (e) { console.error(e); } finally { setLoadingLeads(false); }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>) => {
    // If moving to 'failed' status, show reason prompt instead of immediate update
    if (updates.status === 'לא רלוונטי' || updates.status === 'נגמר') {
        setPendingDisqualification({ id, action: 'fail', targetStatus: updates.status });
        return;
    }

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

  const finalizeDisqualification = async (reason: string) => {
    if (!pendingDisqualification) return;
    const { id, action, targetStatus } = pendingDisqualification;
    
    if (action === 'delete') {
      setLeads(prev => prev.filter(l => l.id !== id));
      try {
        await fetch('/api/leads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reason }) });
      } catch (e) { console.error(e); fetchLeads(); }
    } else {
        const updates: Partial<Lead> = { status: targetStatus, disqualificationReason: reason };
        setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
        try {
          await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
        } catch (e) { console.error(e); fetchLeads(); }
    }
    setPendingDisqualification(null);
    if (activeTab === 'analytics') fetchAnalyticsData();
  };

  const initiateCall = async (lead: Lead) => {
    if (!lead.phone) return;
    const newCount = (lead.callCount || 0) + 1;
    handleLeadUpdate(lead.id, { callCount: newCount });
    if (lead.status === 'חדש') handleLeadUpdate(lead.id, { status: 'ממתין לעדכון' });
    try {
      fetch('/api/twilio/call/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: lead.phone }) });
      setLiveNotesLead(lead);
    } catch (err) { console.error(err); }
  };

  const addNewLead = async () => {
    const newLead: Lead = {
      id: crypto.randomUUID(), clientName: "", source: "Manual", createdAt: new Date().toISOString(),
      lastContacted: null, status: "חדש", followUpDate: "", generalNotes: "", liveCallNotes: "", urgency: "בינונית", callCount: 0
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
    const summaryParts = [`עץ החלטות במועד: ${new Intl.DateTimeFormat('he-IL', { dateStyle: 'short', timeStyle: 'short' }).format(new Date())}`];
    if (answers.name) summaryParts.push(`- שם: ${answers.name}`);
    if (answers.age) summaryParts.push(`- גיל: ${answers.age}`);
    if (answers.income) summaryParts.push(`- הכנסה: ${answers.income}`);
    if (answers.medicalCondition) summaryParts.push(`- מצב רפואי: ${answers.medicalCondition}`);
    const treeSummary = `\n${summaryParts.join('\n')}\n`;
    handleLeadUpdate(liveNotesLead.id, { liveCallNotes: (liveNotesLead.liveCallNotes || '') + treeSummary });
    setShowDecisionTree(false);
  };

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'לא רלוונטי' && l.status !== 'במעקב')
    .filter(l => {
      const q = globalSearch.toLowerCase();
      return !q || (l.clientName?.toLowerCase().includes(q)) || (l.phone?.includes(q));
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [leads, globalSearch, sortOrder]);

  const followupLeads = useMemo(() => leads
    .filter(l => l.status === 'במעקב')
    .sort((a, b) => new Date(a.followUpDate || a.createdAt).getTime() - new Date(b.followUpDate || b.createdAt).getTime()), [leads]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === 'חתם' || l.status === 'לא רלוונטי' || l.status === 'נגמר')
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [leads]);

  const overallStats = useMemo(() => {
    const total = leads.length;
    const signed = leads.filter(l => l.status === 'חתם').length;
    return { total, signed };
  }, [leads]);

  const cardClass = "premium-glass rounded-3xl";

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} relative overflow-hidden`}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10 animate-in fade-in duration-700" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
               Sue-Chef 
               <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.7</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} לידים פעילים בטיפול</p>
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
              {darkMode ? <Moon className="w-6 h-6 text-indigo-400" /> : <Sun className="w-6 h-6 text-yellow-500" />}
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-6 h-6 ${(loadingLeads) ? 'animate-spin text-indigo-500' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Notifications Bar */}
        {notifications.length > 0 && (
          <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-[32px] animate-in slide-in-from-top-4 duration-500 relative group">
            <button onClick={() => setNotifications([])} className="absolute left-6 top-6 text-amber-600 hover:rotate-90 transition-all"><X size={20} /></button>
            <h3 className="text-amber-800 dark:text-amber-300 font-black flex items-center gap-3 mb-2">
               <Clock size={18} className="animate-bounce" /> הגיע הזמן לחזור ללקוחות:
            </h3>
            <div className="flex flex-wrap gap-2">
               {notifications.map(n => <span key={n.id} className="bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border border-amber-200 text-xs font-black shadow-sm">{n.name} - {formatDate(n.time)}</span>)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] premium-glass">
          {(['crm', 'calls', 'archive', 'analytics', 'tree'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 rounded-2xl text-sm font-bold transition-all ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100/50'}`}>
              {tab === 'crm' ? 'טבלת מעקב' : tab === 'calls' ? 'שיחות' : tab === 'archive' ? 'ארכיון' : tab === 'analytics' ? 'אנליטיקה' : 'עץ החלטות'}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            <div className="relative flex-1">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
              <input type="text" placeholder="חיפוש לפי שם או טלפון..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl pr-14 pl-6 py-4 outline-none font-bold" />
            </div>
            <button onClick={addNewLead} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center gap-2">
              <Plus size={20} /> הוסף ליד
            </button>
          </div>
        )}

        {/* Main Table Content */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
            <table className="w-full text-right">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">לקוח</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">פעולות</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">סטטוס</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">תיעוד אחרון / מעקב</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">פתיחה</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800">
                {(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads).map(lead => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all group">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5">
                        <button onClick={() => initiateCall(lead)} className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md"><Phone size={22} fill="currentColor" /></button>
                        <div>
                          <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent border-none outline-none w-full" />
                          <p className="text-lg font-mono text-slate-400" dir="ltr">{lead.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center relative">
                       <button onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)} className="p-2.5 hover:bg-gray-100 rounded-xl transition-all"><MoreVertical className="w-5 text-gray-400" /></button>
                       {openMenuId === lead.id && (
                         <div className="absolute right-0 mt-2 w-48 bg-white border rounded-2xl shadow-2xl z-30 overflow-hidden">
                           <button onClick={() => setPendingDisqualification({ id: lead.id, action: 'delete' })} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 text-red-600"><Trash2 className="w-4 h-4" /> מחיקה לצמיתות</button>
                         </div>
                       )}
                    </td>
                    <td className="px-8 py-6">
                      <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`px-4 py-2.5 rounded-xl font-black text-[11px] border ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color}`}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="relative">
                          <Clock size={12} className="absolute right-0 top-1.5 text-slate-300" />
                          <input type="text" placeholder="קבע מועד למעקב" value={lead.followUpDate || ""} onChange={e => handleLeadUpdate(lead.id, { followUpDate: e.target.value })} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-400 pr-5 w-full" />
                        </div>
                        <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} className="w-full bg-slate-50 border-none rounded-xl p-3 text-xs font-bold resize-none h-16" placeholder="הערות..." />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button onClick={() => setLiveNotesLead(lead)} className="text-[11px] font-black text-indigo-600 bg-indigo-50 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white transition-all">תיעוד מלא</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {activeTab === 'analytics' && (
            <div className="p-10 space-y-12">
               {loadingAnalytics ? (
                 <div className="flex flex-col items-center justify-center h-64 gap-4">
                    <Loader2 className="animate-spin text-indigo-500" size={48} />
                    <p className="font-black text-slate-400">מחשב נתונים דטרמיניסטים מהשרת...</p>
                 </div>
               ) : (
                 <>
                   {/* KPI Section */}
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                     <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[32px] border border-indigo-100 dark:border-indigo-900/30">
                        <Users className="text-indigo-600 mb-4" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">סה"כ לידים</p>
                        <p className="text-4xl font-black text-indigo-600">{analyticsData?.funnel.total || "0"}</p>
                     </div>
                     <div className="bg-emerald-50 dark:bg-emerald-900/10 p-8 rounded-[32px] border border-emerald-100 dark:border-emerald-900/30">
                        <CheckCircle className="text-emerald-600 mb-4" />
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">חתימות</p>
                        <p className="text-4xl font-black text-emerald-600">{analyticsData?.funnel.signed || "0"}</p>
                        <p className="text-xs font-bold text-emerald-500 mt-2">{analyticsData?.funnel.rates.totalToSigned}% מכלל הלידים</p>
                     </div>
                     <div className={`p-8 rounded-[32px] border flex flex-col justify-between ${cardClass}`}>
                        <Zap className="text-amber-500 mb-4" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">שיחות ממוצעות לסגירה</p>
                          <p className="text-4xl font-black text-slate-800 dark:text-white">{analyticsData?.effortMetrics.avgCallsPerSigned || "0"}</p>
                        </div>
                     </div>
                     <div className={`p-8 rounded-[32px] border flex flex-col justify-between ${cardClass}`}>
                        <TrendingUp className="text-purple-500 mb-4" />
                        <div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1">יחס המרה מרלוונטיות</p>
                          <p className="text-4xl font-black text-purple-600">{analyticsData?.funnel.rates.relevantToSigned || "0"}%</p>
                        </div>
                     </div>
                   </div>

                   {/* Vertical Funnel - 4 Steps */}
                   <div className="bg-slate-50 dark:bg-slate-800/10 p-10 rounded-[48px] border dark:border-slate-800 relative">
                     <h4 className="text-2xl font-black mb-10 flex items-center gap-3">משפך המרה (Funnel) <ArrowDownRight size={20} className="text-indigo-500" /></h4>
                     <div className="space-y-4 max-w-2xl mx-auto">
                        {[
                          { label: "סה\"כ לידים במערכת", count: analyticsData?.funnel.total, color: "bg-indigo-600", val: "100%" },
                          { label: "לידים שנוצר איתם קשר", count: analyticsData?.funnel.contacted, color: "bg-indigo-500", val: `${analyticsData?.funnel.contacted > 0 ? (analyticsData?.funnel.contacted / analyticsData?.funnel.total * 100).toFixed(0) : 0}%` },
                          { label: "לידים שנמצאו רלוונטיים", count: analyticsData?.funnel.relevant, color: "bg-indigo-400", val: analyticsData?.funnel.rates.contactedToRelevant + "%" },
                          { label: "לידים חתומים (הצלחה)", count: analyticsData?.funnel.signed, color: "bg-emerald-500", val: analyticsData?.funnel.rates.relevantToSigned + "%" }
                        ].map((step, idx) => (
                          <div key={idx} className="relative group">
                            <div className="flex justify-between items-center mb-2 px-2">
                               <span className="text-sm font-black text-slate-500">{step.label}</span>
                               <span className="text-sm font-black text-slate-900 dark:text-white">{step.count} ({step.val})</span>
                            </div>
                            <div className="w-full h-8 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner font-mono text-[10px] flex items-center pr-4">
                               <div className={`${step.color} h-full transition-all duration-1000 ease-out flex items-center justify-end px-4 text-white shadow-lg`} style={{ width: step.val }}>
                                  {step.count > 0 && <span className="opacity-0 group-hover:opacity-100 transition-opacity">DATA VALIDATED</span>}
                               </div>
                            </div>
                            {idx < 3 && <div className="h-4 flex justify-center"><div className="w-px h-full bg-slate-200" /></div>}
                          </div>
                        ))}
                     </div>
                   </div>

                   {/* Lost Reasons Chart */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
                      <div className="bg-white dark:bg-slate-900 p-10 rounded-[48px] border dark:border-slate-800">
                         <h4 className="text-2xl font-black mb-8 flex items-center gap-3">סיבות פסילה <AlertTriangle className="text-red-500" /></h4>
                         <div className="space-y-6">
                            {analyticsData?.disqualificationReasons.length > 0 ? analyticsData.disqualificationReasons.map((r: any) => (
                              <div key={r.reason} className="space-y-2">
                                <div className="flex justify-between text-xs font-black uppercase text-slate-400">
                                   <span>{r.reason}</span>
                                   <span>{r.count}</span>
                                </div>
                                <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                   <div className="bg-red-400 h-full rounded-full" style={{ width: `${(r.count / (analyticsData.funnel.total - analyticsData.funnel.signed) * 100)}%` }} />
                                </div>
                              </div>
                            )) : <p className="text-slate-400 font-bold text-center py-10">אין נתוני פסילה כרגע</p>}
                         </div>
                      </div>
                      <div className="bg-indigo-600 rounded-[48px] p-10 text-white shadow-2xl flex flex-col justify-center">
                         <h4 className="text-2xl font-black mb-4 flex items-center gap-3"><Zap /> מדד המאמץ</h4>
                         <p className="text-lg font-bold opacity-90 leading-relaxed">
                            המערכת מנתחת את מספר השיחות הממוצע שנדרש כדי להגיע לחתימה. 
                            נכון לעכשיו, נדרשות בממוצע <span className="text-3xl font-black underline decoration-amber-400 underline-offset-8">{analyticsData?.effortMetrics.avgCallsPerSigned}</span> שיחות כדי לסגור לקוח. ייעול התהליך ב-10% יכול לחסוך לך שעות של עבודה בשבוע.
                         </p>
                      </div>
                   </div>
                 </>
               )}
            </div>
          )}
          
          {activeTab === 'tree' && <div className="p-8 h-full"><LegalDecisionTree /></div>}
        </div>
      </main>

      {/* Disqualification Selector Modal */}
      {pendingDisqualification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[40px] shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-2xl font-black mb-2 flex items-center gap-3">מדוע הליד נפסל? <AlertTriangle className="text-red-500" /></h3>
            <p className="text-sm font-bold text-slate-400 mb-8">בחר סיבה כדי לשמור על סטטיסטיקה מדויקת</p>
            <div className="space-y-3">
               {LOST_REASONS.map(reason => (
                 <button key={reason} onClick={() => finalizeDisqualification(reason)} className="w-full text-right px-6 py-4 rounded-2xl border hover:bg-slate-50 dark:hover:bg-slate-800 font-black text-sm transition-all hover:border-red-500 hover:text-red-600">
                   {reason}
                 </button>
               ))}
            </div>
            <button onClick={() => setPendingDisqualification(null)} className="w-full mt-6 py-4 text-xs font-black text-slate-300 hover:text-slate-500">ביטול והשארת הליד</button>
          </div>
        </div>
      )}

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
                <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`px-8 py-3.5 rounded-2xl border font-black text-sm transition-all flex items-center gap-3 ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-white dark:bg-slate-800 hover:bg-slate-100'}`}>
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
                    <div className="flex-1 p-10 flex flex-col min-h-0 bg-white dark:bg-slate-900 transition-all duration-500 overflow-y-auto pr-8 custom-scrollbar">
                       <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
                         <div className="flex-1 min-w-[300px] flex items-center gap-6">
                            <button onClick={() => setShowScriptPanel(!showScriptPanel)} className={`px-8 py-3 rounded-2xl font-black text-xs transition-all flex items-center gap-2 whitespace-nowrap ${showScriptPanel ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200'}`}>
                              <FileText size={16} /> {showScriptPanel ? 'סגור תסריט' : 'פתח תסריט שיחה'}
                            </button>
                            <div className="flex-1 flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-6 py-3 rounded-2xl border dark:border-slate-800">
                               <Calendar size={16} className="text-indigo-500" />
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest pl-2">מועד למעקב:</span>
                               <input type="text" placeholder="הזן תאריך ושעה..." value={liveNotesLead.followUpDate || ""} onChange={e => handleLeadUpdate(liveNotesLead.id, { followUpDate: e.target.value })} className="bg-transparent border-none outline-none font-bold text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-0" />
                            </div>
                         </div>
                       </div>
                       <div className="mb-4">
                          <label className="text-[10px] font-black uppercase text-indigo-600 mb-2 block tracking-widest">תיעוד שיחה בזמן אמת</label>
                          <textarea autoFocus value={liveNotesLead.liveCallNotes || ''} onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })} className="w-full h-[350px] md:h-[450px] bg-slate-50 dark:bg-slate-800/20 border-2 border-slate-100 dark:border-slate-800/50 rounded-[40px] p-10 text-xl font-bold placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-relaxed font-assistant resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner custom-scrollbar" placeholder="התחל להקליד את פרטי השיחה כאן..." />
                       </div>
                    </div>
                    {showScriptPanel && (
                      <div className="w-full md:w-[450px] bg-slate-50 dark:bg-slate-800/10 flex flex-col p-10 animate-in slide-in-from-left-4 duration-500 h-full border-r dark:border-slate-800">
                        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar">
                           <h4 className="text-[10px] font-black uppercase text-slate-400 mb-6 tracking-widest flex items-center gap-2"><Maximize2 size={16} /> תסריט שיחה מומלץ</h4>
                           <p className="text-sm leading-relaxed whitespace-pre-wrap font-bold text-slate-600 dark:text-slate-400 italic bg-white dark:bg-slate-900/30 p-10 rounded-[40px] border border-dashed border-slate-200 dark:border-slate-800 shadow-sm">
                             {`פתיחה:\n"אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור."\n\nבירור כוונה:\n"אני רק רצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?"\n\nסגירה:\n"אוקיי, רשמתי הכל. אני מעביר את הפרטים לבדיקת היתכנות אצל גילי, המומחה שלנו. נחזור אליך בהקדם."`}
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
                 <button onClick={() => setLiveNotesLead(null)} className="px-14 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-2"><Check size={20} /> סיום ועדכון מערכת</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
