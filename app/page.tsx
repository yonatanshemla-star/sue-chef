"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Star, Search, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Users } from "lucide-react";
import type { Lead } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';

// === Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number; icon?: any }> = {
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-pink-600', bg: 'bg-pink-100/80', darkBg: 'dark:bg-pink-900/60 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-500', importance: 0 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/80 dark:text-orange-200', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 3 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 5 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 6 },
  'חדש': { label: '🆕 חדש', color: 'text-indigo-700', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', importance: 7 },
  'במעקב': { label: '⭐ במעקב', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', importance: 8 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 9 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 10 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 11 },
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
  const [mounted, setMounted] = useState(false);
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
  const [globalSearch, setGlobalSearch] = useState('');
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, name: string, time: string}[]>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Scroll Lock for modal
  useEffect(() => {
    if (liveNotesLead) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [liveNotesLead]);

  // Analytics Fetching
  const fetchAnalyticsData = async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (data.success) {
        setAnalyticsData(data.data);
      }
    } catch (e) { 
      console.error("Analytics fetch fail", e); 
    } finally {
      setLoadingAnalytics(false);
    }
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
      if (data.success) setLeads(data.leads || []);
    } catch (e) { 
      console.error("Leads fetch fail", e); 
    } finally { 
      setLoadingLeads(false); 
    }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>) => {
    // Only 'נגמר' triggers the disqualification survey now. 'לא רלוונטי' stays in CRM.
    if (updates.status === 'נגמר') {
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

  const deleteLeadDirectly = async (id: string) => {
    if (!window.confirm("האם אתה בטוח שברצונך למחוק ליד זה?")) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    try {
      await fetch('/api/leads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, reason: "Direct Deletion" }) });
    } catch (e) { console.error(e); fetchLeads(); }
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
      if (callsData.success) {
        setRecentCalls(callsData.calls || []);
      }
      if (balanceData.success) setTwilioBalance(balanceData.balance);
    } catch (e) { 
        console.error("Twilio fetch fail", e); 
    } finally { 
        setLoadingCalls(false); 
    }
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

  // Global Paste Handler for OCR
  useEffect(() => {
    const handlePaste = async (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {
          const blob = items[i].getAsFile();
          if (!blob) continue;

          // Find the lead to update (the one with the latest createdAt or the first empty one)
          const targetLead = leads.find(l => !l.clientName && !l.phone) || leads[0];
          if (!targetLead) return;

          const reader = new FileReader();
          reader.onload = async (event) => {
            const base64 = event.target?.result as string;
            // Show a quick loading state if possible, but for now just fetch
            try {
              const res = await fetch('/api/vision', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ imageBase64: base64 })
              });
              const result = await res.json();
              if (result.success && result.data) {
                handleLeadUpdate(targetLead.id, { 
                  clientName: result.data.name || targetLead.clientName,
                  phone: result.data.phone || targetLead.phone 
                });
              }
            } catch (err) {
              console.error("OCR failed", err);
            }
          };
          reader.readAsDataURL(blob);
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [leads]);

  const getLeadByPhone = useCallback((phone: string) => {
    if (!phone) return null;
    const normalized = phone.slice(-9);
    return leads.find(l => l.phone?.includes(normalized));
  }, [leads]);

  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'במעקב')
    .filter(l => {
      const q = globalSearch.toLowerCase();
      if (q && !(l.clientName?.toLowerCase().includes(q) || l.phone?.includes(q))) return false;
      if (showAdvancedStageOnly) return ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה'].includes(l.status);
      return true;
    })
    .sort((a, b) => {
        if (showAdvancedStageOnly) {
            const priorityA = STATUS_CONFIG[a.status]?.importance ?? 99;
            const priorityB = STATUS_CONFIG[b.status]?.importance ?? 99;
            if (priorityA !== priorityB) return priorityA - priorityB;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [leads, globalSearch, showAdvancedStageOnly]);

  const followupLeads = useMemo(() => leads
    .filter(l => l.status === 'במעקב')
    .sort((a, b) => new Date(a.followUpDate || a.createdAt).getTime() - new Date(b.followUpDate || b.createdAt).getTime()), [leads]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === 'חתם' || l.status === 'נגמר')
    .sort((a, b) => {
        if (a.status === 'חתם' && b.status !== 'חתם') return -1;
        if (a.status !== 'חתם' && b.status === 'חתם') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [leads]);

  const cardClass = "premium-glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-indigo-500/10";

  const formatCallDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} relative`} style={{ zoom: 0.85 }}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10 opacity-100" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">
               Sue-Chef 
               <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.8</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium opacity-70">מערכת ניהול לידים מתקדמת</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרת טטוויליו</p>
                <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p>
              </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6">
                <Sun className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-all duration-700 transform ${darkMode ? 'rotate-[360deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
                <Moon className={`absolute inset-0 w-6 h-6 text-indigo-400 transition-all duration-700 transform ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-[360deg] scale-0 opacity-0'}`} />
              </div>
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-6 h-6 ${(loadingLeads || loadingCalls) ? 'animate-spin text-indigo-500' : 'text-gray-600'}`} />
            </button>
          </div>
        </div>

        {/* Notifications Bar */}
        {notifications.length > 0 && (activeTab === 'crm' || activeTab === 'followup') && (
          <div className="mb-8 p-6 bg-amber-50 dark:bg-amber-900/20 border-2 border-amber-200 dark:border-amber-800 rounded-[32px] relative shadow-inner">
            <button onClick={() => setNotifications([])} className="absolute left-6 top-6 text-amber-600 hover:rotate-90 transition-all z-10"><X size={20} /></button>
            <h3 className="text-amber-800 dark:text-amber-300 font-black flex items-center gap-3 mb-2">
               <Clock size={18} className="animate-bounce" /> הגיע הזמן לחזור ללקוחות:
            </h3>
            <div className="flex flex-wrap gap-2">
               {notifications.map(n => <span key={n.id} className="bg-white dark:bg-slate-900 px-4 py-1.5 rounded-xl border border-amber-200 text-xs font-black shadow-sm transform hover:scale-105 transition-all">{n.name} - {formatDate(n.time)}</span>)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] premium-glass">
          {(['crm', 'calls', 'archive', 'analytics', 'tree'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-8 py-3.5 rounded-2xl text-sm font-bold transition-all relative group overflow-hidden ${activeTab === tab ? 'bg-indigo-600 text-white shadow-lg scale-105' : 'text-slate-500 hover:bg-slate-100/50'}`}>
              <span className="relative z-10">{tab === 'crm' ? 'טבלת מעקב' : tab === 'calls' ? 'שיחות אחרונות' : tab === 'archive' ? 'ארכיון' : tab === 'analytics' ? 'אנליטיקה' : 'עץ החלטות'}</span>
              {activeTab === tab && <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />}
            </button>
          ))}
        </div>

        {/* Search & Actions */}
        {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
            {/* ACTION BUTTONS (Placed RIGHT in RTL flex-row) */}
            <div className="flex gap-4">
              {activeTab !== 'archive' && (
                <button onClick={addNewLead} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 relative group overflow-hidden">
                  <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" /> הוסף ליד
                  <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              )}
              {(activeTab === 'crm' || activeTab === 'followup') && (
                <>
                  <button onClick={() => setActiveTab(activeTab === 'followup' ? 'crm' : 'followup')} className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${activeTab === 'followup' ? 'bg-amber-500 text-white border-amber-600 ring-4 ring-amber-500/10' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400'}`}>
                    <Clock size={18} /> במעקב
                  </button>
                  <button onClick={() => setShowAdvancedStageOnly(!showAdvancedStageOnly)} className={`px-8 py-4 rounded-2xl font-black text-sm border flex items-center gap-2 transition-all shadow-sm ${showAdvancedStageOnly ? 'bg-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-500/10' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-400'}`}>
                    <Zap size={18} /> שלב מתקדם
                  </button>
                </>
              )}
            </div>

            <div className="relative flex-1 group">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input type="text" placeholder="חיפוש לפי שם או טלפון..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl pr-14 pl-6 py-4 outline-none font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-assistant text-slate-900 dark:text-white" />
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden min-h-[500px]">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
            <div className="overflow-x-auto">
            <table className="w-full text-right border-collapse">
              <thead className="bg-slate-50/50 dark:bg-slate-800/20 border-b dark:border-slate-800">
                <tr>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">לקוח</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">פעולות</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">סטטוס</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">תיעוד אחרון / מעקב</th>
                  <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">פתיחה</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-slate-800 opacity-100">
                {(Array.isArray(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads) ? (activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads) : []).map((lead, idx) => (
                  <tr key={lead.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-all">
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-5 text-slate-900 dark:text-white">
                        <button onClick={() => initiateCall(lead)} className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-md group border border-indigo-400/20"><Phone size={22} className="group-hover:rotate-12 transition-all" fill="currentColor" /></button>
                        <div className="flex flex-col gap-1 w-full">
                          <input type="text" placeholder="הכנס שם..." value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent border-none outline-none w-full focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors text-slate-900 dark:text-white" />
                          <input type="text" placeholder="הכנס טלפון..." value={lead.phone || ""} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="text-lg font-mono text-slate-400 tracking-tight bg-transparent border-none outline-none w-full focus:text-indigo-500 transition-all" dir="ltr" />
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-4 text-center relative">
                       <button onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)} className="p-2.5 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-xl transition-all"><MoreVertical className="w-5 text-gray-400" /></button>
                       {openMenuId === lead.id && (
                         <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-900 border dark:border-gray-800 rounded-2xl shadow-2xl z-30 overflow-hidden" dir="rtl">
                           <button onClick={() => {
                             const phone = lead.phone?.replace(/^0/, '972');
                             const firstName = lead.clientName?.split(' ')[0] || 'לקוח';
                              const msg = encodeURIComponent(`היי ${firstName}, קוראים לי יונתן אני ממשרד עורכי הדין HBA, השארת אצלנו פרטים וניסיתי לחזור אלייך. אשמח אם נוכל לדבר כשיתאפשר`);
                             window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                             setOpenMenuId(null);
                           }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 text-emerald-600 transition-colors"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                           <button onClick={() => { copyToClipboard(lead.phone || ''); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"><Copy className="w-4 h-4" /> העתק מספר</button>
                           <div className="h-px bg-gray-100 dark:bg-gray-800" />
                           <button onClick={() => { deleteLeadDirectly(lead.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 transition-colors"><Trash2 className="w-4 h-4" /> מחיקה</button>
                         </div>
                       )}
                    </td>
                    <td className="px-8 py-6">
                      <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`px-4 py-2.5 rounded-xl font-black text-[11px] border transition-all cursor-pointer ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${lead.status === 'חדש' ? 'animate-pulse ring-4 ring-indigo-500/10' : ''}`}>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col gap-2">
                        <div className="relative group/time">
                          <Clock size={12} className="absolute right-0 top-1.5 text-slate-300 group-hover/time:text-indigo-400 transition-colors" />
                          <input type="text" placeholder="קבע מועד למעקב" value={lead.followUpDate || ""} onChange={e => handleLeadUpdate(lead.id, { followUpDate: e.target.value })} className="bg-transparent border-none outline-none text-[11px] font-black text-slate-400 pr-5 w-full focus:text-slate-800 dark:focus:text-white" />
                        </div>
                        <textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-800/10 border dark:border-slate-800/10 rounded-xl p-3 text-xs font-bold resize-none h-16 focus:bg-white dark:focus:bg-slate-800 transition-all outline-none text-slate-800 dark:text-slate-100" placeholder="הערות..." />
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <button onClick={() => setLiveNotesLead(lead)} className="text-[11px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/30 px-6 py-2.5 rounded-xl hover:bg-indigo-600 hover:text-white hover:scale-105 active:scale-95 transition-all shadow-sm">תיעוד מלא</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="p-8 max-w-4xl mx-auto space-y-4 h-full min-h-[500px]">
               {loadingCalls ? (
                 <div className="flex flex-col items-center justify-center py-32 text-slate-400"><Loader2 className="animate-spin text-indigo-500 mb-4" size={48} /><p className="font-black">מעבד נתונים מטוויליו...</p></div>
               ) : Array.isArray(recentCalls) && recentCalls.length > 0 ? (
                <div className="space-y-4 opacity-100">
                  {recentCalls.map((call, idx) => {
                    const callFrom = call.from || "";
                    const callTo = call.to || "";
                    const lead = getLeadByPhone(callFrom.slice(-9)) || getLeadByPhone(callTo.slice(-9));
                    return (
                    <div key={call.sid} className="bg-white dark:bg-slate-800/30 p-6 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col md:flex-row justify-between items-center hover:scale-[1.01] transition-all group overflow-hidden">
                      <div className="flex items-center gap-5 w-full md:w-auto mb-4 md:mb-0">
                        <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500">
                          {call.direction === 'inbound' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}
                        </div>
                        <div>
                          <p className="font-black text-xl group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight text-slate-900 dark:text-white">{lead?.clientName || 'ליד לא מזוהה'}</p>
                          <p className="text-xs font-mono text-slate-400" dir="ltr">{call.direction==='inbound'?call.from:call.to}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-end text-slate-800 dark:text-slate-100">
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">משך</p>
                          <p className="font-black text-lg">{formatCallDuration(call.duration)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">עלות</p>
                          <p className="font-black text-lg text-emerald-500 leading-none">{(Math.abs(parseFloat(call.price || "0"))).toFixed(2)}$</p>
                        </div>
                        <span className="text-[10px] font-black uppercase bg-slate-50 dark:bg-slate-800 px-4 py-1.5 rounded-full text-slate-400 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950 group-hover:text-indigo-500 transition-all">{formatDate(call.startTime)}</span>
                      </div>
                    </div>
                  );})}
                </div>
               ) : (
                <div className="flex flex-col items-center justify-center py-32 text-slate-400">
                   <History size={64} className="mb-6 opacity-10" />
                   <p className="font-black text-xl tracking-tight opacity-50">אין שיחות אחרונות להצגה</p>
                   <button onClick={fetchTwilioData} className="mt-6 text-indigo-500 font-bold hover:underline">רענן נתונים כעת</button>
                </div>
               )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-10 space-y-12 min-h-[500px]">
               {loadingAnalytics ? <div className="flex flex-col items-center justify-center h-96 gap-6"><Loader2 className="animate-spin text-indigo-500" size={64} /><p className="font-black text-slate-400 text-xl animate-pulse tracking-wide">מחשב מדדים דטרמיניסטיים...</p></div> : analyticsData ? (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                     {[
                       { icon: Users, label: 'סה"כ לידים', value: analyticsData.funnel?.total || 0, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/10', border: 'border-indigo-100 dark:border-indigo-900/30' },
                       { icon: CheckCircle, label: 'חתימות', value: analyticsData.funnel?.signed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-900/30', sub: `${analyticsData.funnel?.rates?.totalToSigned || 0}% המרה` },
                       { icon: Zap, label: 'ממוצע שיחות לסגירה', value: analyticsData.effortMetrics?.avgCallsPerSigned || 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-900/30' },
                       { icon: TrendingUp, label: 'המרה מרלוונטיות', value: `${analyticsData.funnel?.rates?.relevantToSigned || 0}%`, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-900/30' }
                     ].map((kpi, idx) => (
                       <div key={idx} className={`${kpi.bg} p-10 rounded-[40px] border ${kpi.border} transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl opacity-100`}>
                          <kpi.icon className={kpi.color + " mb-6"} size={32} />
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{kpi.label}</p>
                          <p className={`text-5xl font-black ${kpi.color}`}>{kpi.value || "0"}</p>
                          {kpi.sub && <p className="text-xs font-bold text-emerald-500 mt-4 flex items-center gap-1"><ArrowUpRight size={14} /> {kpi.sub}</p>}
                       </div>
                     ))}
                   </div>

                   <div className="bg-slate-100/30 dark:bg-slate-800/20 p-12 rounded-[56px] border dark:border-slate-800 shadow-inner overflow-hidden">
                     <h4 className="text-3xl font-black mb-12 flex items-center gap-4 text-slate-900 dark:text-white">משפך המרה (Funnel) <ArrowDownRight size={24} className="text-indigo-500" /></h4>
                     <div className="space-y-12 max-w-4xl mx-auto">
                        {[
                          { label: "נוצר קשר", count: analyticsData.funnel?.contacted || 0, color: "bg-indigo-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.contacted / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", desc: "לידים שבוצעה אליהם שיחה אחת לפחות או שסטטוסם השתנה מ'חדש'." },
                          { label: "רלוונטיים", count: analyticsData.funnel?.relevant || 0, color: "bg-indigo-400", val: (analyticsData.funnel?.rates?.contactedToRelevant || "0") + "%", desc: "מתוך אלו שנוצר איתם קשר - אלו שסומנו כבעלי עילה משפטית/רפואית פוטנציאלית." },
                          { label: "חתומים", count: analyticsData.funnel?.signed || 0, color: "bg-emerald-500", val: (analyticsData.funnel?.rates?.relevantToSigned || "0") + "%", shadow: "shadow-emerald-500/30", desc: "לידים שעברו את כל השלבים וחתמו על ייצוג (ההצלחות שלנו!)." }
                        ].map((step, idx) => (
                          <div key={idx} className="relative group opacity-100">
                            <div className="flex justify-between items-center mb-3 px-4">
                               <div className="flex flex-col">
                                 <span className="text-base font-black text-slate-700 dark:text-slate-200 tracking-tight">{step.label}</span>
                                 <span className="text-xs text-slate-400 font-bold mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">{step.desc}</span>
                               </div>
                               <span className="text-lg font-black text-slate-900 dark:text-white px-4 py-1 bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border dark:border-slate-700">{step.count} ({step.val})</span>
                            </div>
                            <div className="w-full h-11 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden flex flex-row-reverse shadow-inner relative">
                               <div className={`${step.color} h-full transition-all duration-[1000ms] ease-out flex items-center justify-end px-8 text-xs font-black text-white ${step.shadow || 'shadow-lg'}`} style={{ width: step.val }}>
                                  {step.count > 0 && <span className="opacity-0 group-hover:opacity-100 transition-opacity tracking-widest uppercase text-[10px]">VERIFIED</span>}
                               </div>
                            </div>
                          </div>
                        ))}
                     </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-16 pb-12">
                      <div className="bg-white dark:bg-slate-900 p-12 rounded-[56px] border dark:border-slate-800 shadow-xl group">
                         <h4 className="text-3xl font-black mb-10 flex items-center gap-4 text-slate-900 dark:text-white">סיבות פסילה <AlertTriangle className="text-red-500" /></h4>
                         <div className="space-y-8">
                            {Array.isArray(analyticsData.disqualificationReasons) && analyticsData.disqualificationReasons.length > 0 ? analyticsData.disqualificationReasons.map((r: any, idx: number) => (
                              <div key={r.reason} className="space-y-3">
                                <div className="flex justify-between text-xs font-black uppercase text-slate-400"><span>{r.reason}</span><span>{r.count}</span></div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex flex-row-reverse">
                                  <div className="bg-gradient-to-l from-red-600 to-red-400 h-full transition-all duration-1000" style={{ width: `${(r.count / Math.max(1, analyticsData.funnel?.total || 1) * 100)}%` }} />
                                </div>
                              </div>
                            )) : <div className="flex flex-col items-center justify-center py-12 opacity-20"><HelpCircle size={48} /><p className="font-bold mt-4">אין נתונים</p></div>}
                         </div>
                      </div>
                      <div className="bg-indigo-600 rounded-[56px] p-16 text-white shadow-2xl flex flex-col justify-center relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full translate-x-32 -translate-y-32" />
                         <h4 className="text-3xl font-black mb-8 flex items-center gap-5"><Zap size={36} /> מדד המאמץ</h4>
                         <p className="text-2xl font-bold opacity-90 leading-relaxed font-assistant">
                            המערכת מנתחת את מספר השיחות הממוצע לסגירה. 
                            נדרשות <span className="text-6xl font-black text-amber-400 underline underline-offset-[16px] decoration-8 decoration-white/20 mx-2">{analyticsData.effortMetrics?.avgCallsPerSigned || "0"}</span> שיחות כדי להחתים לקוח. 
                         </p>
                      </div>
                   </div>
                 </>
               ) : <div className="flex flex-col items-center justify-center h-96 text-slate-400"><AlertTriangle size={64} className="mb-6 opacity-20" /><p className="font-black text-xl">שגיאה בטעינת האנליטיקה</p></div>}
            </div>
          )}
          
          {activeTab === 'tree' && <div className="p-8 h-full"><LegalDecisionTree /></div>}
        </div>
      </main>

      {/* Disqualification Selector Modal */}
      {pendingDisqualification && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-md p-10 rounded-[48px] shadow-2xl" dir="rtl">
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-3xl flex items-center justify-center text-red-600 mb-6 mx-auto"><AlertTriangle size={32} /></div>
            <h3 className="text-3xl font-black mb-2 text-center text-slate-900 dark:text-white">מדוע הליד נפסל?</h3>
            <p className="text-sm font-bold text-slate-400 mb-10 text-center">בחר סיבה לסיום הטיפול</p>
            <div className="grid grid-cols-1 gap-3">
               {LOST_REASONS.map((reason, idx) => (
                 <button key={reason} onClick={() => finalizeDisqualification(reason)} className="w-full text-right px-8 py-5 rounded-3xl border dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 font-black text-sm transition-all hover:border-red-500 hover:text-red-600 text-slate-700 dark:text-slate-200">{reason}</button>
               ))}
            </div>
            <button onClick={() => setPendingDisqualification(null)} className="w-full mt-8 py-4 text-xs font-black text-slate-300 hover:text-slate-500 transition-colors uppercase">ביטול</button>
          </div>
        </div>
      )}

      {/* Live Notes Modal */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-900/80 backdrop-blur-xl transition-all">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] h-[95vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border dark:border-slate-800">
            {/* Header - Compact */}
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10" dir="rtl">
              <div className="flex items-center gap-4 text-right">
                <div className="w-12 h-12 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-xl animate-pulse"><PhoneCall size={24} /></div>
                <div>
                  <h2 className="text-2xl font-black tracking-tight mb-0 text-slate-900 dark:text-white leading-none">{liveNotesLead.clientName || 'לקוח בשיחה'}</h2>
                  <p className="text-sm font-mono text-slate-400" dir="ltr">{liveNotesLead.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`px-6 py-2.5 rounded-2xl border font-black text-xs transition-all flex items-center gap-2 hover:scale-105 ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  <ClipboardList size={18} /> {showDecisionTree ? 'חזרה' : 'עץ החלטות'}
                </button>
                <button onClick={() => setLiveNotesLead(null)} className="w-10 h-10 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900 relative" dir="rtl">
               {showDecisionTree ? (
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar"><LegalDecisionTree compact={true} onComplete={handleTreeComplete} /></div>
               ) : (
                 <div className="flex-1 flex flex-row h-full">
                    {/* RIGHT SIDE: Notes Area (Expanded) */}
                    <div className="flex-[2] flex flex-col p-5 border-l dark:border-slate-800 bg-white dark:bg-slate-900 relative">
                       <div className="flex justify-between items-center mb-3">
                         <div className="flex items-center gap-3">
                            <label className="text-xs font-black uppercase text-indigo-600 flex items-center gap-2 tracking-widest px-2 group">
                               תיעוד שיחה <span className="animate-pulse">●</span>
                            </label>
                            <span className="text-[10px] font-bold text-slate-300 italic">הטקסט נשמר אוטומטית</span>
                         </div>
                         <button onClick={() => { copyToClipboard(liveNotesLead.liveCallNotes || ''); }} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 hover:text-white hover:bg-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 px-5 py-2.5 rounded-xl border border-indigo-100 dark:border-indigo-800 transition-all shadow-sm group">
                           <Copy size={12} className="group-hover:scale-110 transition-transform" /> העתק סיכום (Ctrl+C)
                         </button>
                       </div>
                       <textarea 
                         autoFocus 
                         value={liveNotesLead.liveCallNotes || ''} 
                         onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })} 
                         className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 border-2 border-slate-100 dark:border-slate-800/80 rounded-[32px] p-8 text-xl font-bold placeholder:text-slate-200 leading-relaxed font-assistant resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner custom-scrollbar text-slate-900 dark:text-white" 
                         placeholder="כתוב כאן מה הלקוח אומר..." 
                       />
                    </div>

                    {/* LEFT SIDE: Controls (Shrunken) */}
                    <div className="flex-[0.8] flex flex-col p-5 bg-slate-50/30 dark:bg-slate-950/20 overflow-y-auto custom-scrollbar gap-4">
                       <button onClick={() => setShowScriptPanel(!showScriptPanel)} className={`w-full py-3.5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-3 shadow-sm ${showScriptPanel ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-slate-800 text-slate-500 border dark:border-slate-700'}`}>
                         <FileText size={18} /> {showScriptPanel ? 'הסתר תסריט' : 'הצג תסריט'}
                       </button>

                       {showScriptPanel && (
                         <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 shadow-lg border-indigo-500/10">
                            <h4 className="text-xs font-black text-indigo-500 mb-3 flex items-center gap-2 underline decoration-indigo-500/30 underline-offset-4 pointer-events-none select-none">תסריט מקוצר</h4>
                            <div className="space-y-2 text-xs font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                                <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/10 rounded-xl border border-indigo-100 dark:border-indigo-900/30 line-clamp-2">1. הצגה: עו"ד גילי - משרד נזיקין</div>
                                <div className="p-2.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">2. פרטי אירוע: מתי ואיפה?</div>
                                <div className="p-2.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">3. רפואי: מיון, אשפוז, צילומים?</div>
                                <div className="p-2.5 bg-slate-100/50 dark:bg-slate-800/50 rounded-xl">4. ייצוג: יש עו"ד אחר בתמונה?</div>
                            </div>
                         </div>
                       )}

                       <div className="bg-white dark:bg-slate-900 p-5 rounded-3xl border dark:border-slate-800 shadow-sm flex flex-col gap-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-0"><Calendar size={14} className="text-indigo-500" /> מעקב</label>
                          <input 
                            type="text" 
                            placeholder="תאריך ושעה..." 
                            value={liveNotesLead.followUpDate || ""} 
                            onChange={e => handleLeadUpdate(liveNotesLead.id, { followUpDate: e.target.value })} 
                            className="bg-slate-50 dark:bg-slate-800 px-4 py-2.5 rounded-xl border-none outline-none font-black text-base text-slate-800 dark:text-white focus:ring-1 focus:ring-indigo-500/20" 
                          />
                       </div>

                       <div className="mt-auto opacity-20 text-[9px] items-center flex gap-2 font-black text-slate-400 uppercase tracking-tighter self-center">
                          <Zap size={10} /> Sue-Chef v5.8 Ultra
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Footer - Compact */}
            <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-between items-center px-8" dir="rtl">
               <div className="hidden sm:flex items-center gap-3 uppercase font-black text-[9px] tracking-widest text-slate-300 pointer-events-none">
                 <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                 <span>Secure Connection</span>
               </div>
               <button onClick={() => setLiveNotesLead(null)} className="px-16 py-3.5 rounded-2xl bg-indigo-600 text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 font-assistant text-xl group overflow-hidden relative shadow-indigo-500/20">
                 <span className="relative z-10 flex items-center gap-3 font-black"><Check size={24} /> סיום ועדכון</span>
                 <div className="absolute inset-0 bg-gradient-to-tr from-indigo-700 to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Styles for Shimmer and custom animations */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(99, 102, 241, 0.1);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(99, 102, 241, 0.2);
        }
      `}</style>
    </div>
  );
}
