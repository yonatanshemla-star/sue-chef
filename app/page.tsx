"use client";
// Force Vercel Redeploy - v5.9.5-final-restored


import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Star, Search, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Users } from "lucide-react";
import type { Lead } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';

// -- Simple CountUp Component --
function SimpleCountUp({ value, suffix = '', prefix = '' }: { value: number | string, suffix?: string, prefix?: string }) {
  const [count, setCount] = useState(0);
  const target = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) : value;
  
  useEffect(() => {
    if (!target) { setCount(0); return; }
    const duration = 1500;
    const steps = 30;
    const stepTime = Math.abs(Math.floor(duration / steps));
    let curr = 0;
    const valStep = target / steps;
    
    const timer = setInterval(() => {
      curr += valStep;
      if (curr >= target) {
         setCount(target);
         clearInterval(timer);
      } else {
         setCount(curr);
      }
    }, stepTime);
    return () => clearInterval(timer);
  }, [target]);

  const displayVal = target % 1 !== 0 ? count.toFixed(1) : Math.floor(count);
  return <span>{prefix}{displayVal}{suffix}</span>;
}

// === Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number; icon?: any }> = {
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-white', bg: 'bg-pink-600', darkBg: 'dark:bg-pink-600 dark:text-white', border: 'border-pink-700', importance: 0 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'ממתין להשלמות': { label: '📋 ממתין להשלמות', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-500 dark:text-white', border: 'border-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.3)]', importance: 3 },
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/80 dark:text-orange-200', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 4 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 5 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 6 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 7 },
  'חדש': { label: '🆕 חדש', color: 'text-white', bg: 'bg-indigo-600', darkBg: 'dark:bg-indigo-600 dark:text-white', border: 'border-indigo-700 shadow-md', importance: 8 },
  'במעקב': { label: '⭐ במעקב', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', importance: 9 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 10 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 11 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-white', bg: 'bg-red-600', darkBg: 'dark:bg-red-600 dark:text-white', border: 'border-red-700 shadow-md', importance: 12 },
};

const triggerConfetti = () => {
    if (typeof window !== 'undefined' && (window as any).confetti) {
        (window as any).confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ['#4f46e5', '#fbbf24', '#10b981', '#ef4444' ] });
    }
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
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  
  // Modals
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [pendingDisqualification, setPendingDisqualification] = useState<{ id: string, action: 'delete' | 'fail', targetStatus?: string } | null>(null);
  
  // Sorting/Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, name: string, time: string}[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  // Secret Profit Tracker
  const [showSecretPanel, setShowSecretPanel] = useState(false);
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [titleClickTimer, setTitleClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);

  // Get current week key (Sunday date string)
  const getWeekKey = (offset: number = 0) => {
    const now = new Date();
    const day = now.getDay();
    const sunday = new Date(now);
    sunday.setDate(now.getDate() - day + (offset * 7));
    return sunday.toISOString().split('T')[0];
  };

  // Get total hours worked this week from localStorage
  const getWeeklyHours = (offset: number = 0): number => {
    const weekKey = getWeekKey(offset);
    const stored = localStorage.getItem(`workSessions_${weekKey}`);
    const sessions: {start: number, end: number}[] = stored ? JSON.parse(stored) : [];
    let totalMs = sessions.reduce((acc, s) => acc + (s.end - s.start), 0);
    if (offset === 0 && isWorking && workStartTime) {
      totalMs += Date.now() - workStartTime;
    }
    return totalMs / (1000 * 60 * 60); // hours
  };

  // Toggle work timer
  const toggleWorkTimer = () => {
    if (isWorking && workStartTime) {
      // Stop working - save session
      const weekKey = getWeekKey();
      const stored = localStorage.getItem(`workSessions_${weekKey}`);
      const sessions: {start: number, end: number}[] = stored ? JSON.parse(stored) : [];
      sessions.push({ start: workStartTime, end: Date.now() });
      localStorage.setItem(`workSessions_${weekKey}`, JSON.stringify(sessions));
      setWorkStartTime(null);
      setIsWorking(false);
    } else {
      // Start working
      setWorkStartTime(Date.now());
      setIsWorking(true);
    }
  };

  // Restore work timer state on mount
  useEffect(() => {
    const savedStart = localStorage.getItem('currentWorkStart');
    if (savedStart) {
      setWorkStartTime(parseInt(savedStart));
      setIsWorking(true);
    }
  }, []);

  // Persist current work start
  useEffect(() => {
    if (workStartTime) {
      localStorage.setItem('currentWorkStart', workStartTime.toString());
    } else {
      localStorage.removeItem('currentWorkStart');
    }
  }, [workStartTime]);

  // Triple-click handler
  const handleTitleClick = () => {
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);
    if (titleClickTimer) clearTimeout(titleClickTimer);
    if (newCount >= 3) {
      setShowSecretPanel(!showSecretPanel);
      setTitleClickCount(0);
      return;
    }
    const timer = setTimeout(() => setTitleClickCount(0), 600);
    setTitleClickTimer(timer);
  };

  // Fetch weekly profit data
  const fetchWeeklyProfit = async (offset: number = 0) => {
    setLoadingWeekly(true);
    try {
      const res = await fetch(`/api/weekly-profit?offset=${offset}`);
      const json = await res.json();
      if (json.success) setWeeklyData(json.data);
    } catch (e) { console.error(e); }
    setLoadingWeekly(false);
  };

  useEffect(() => {
    setMounted(true);
    // Load Confetti Library
    if (typeof window !== 'undefined' && !(window as any).confetti) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
        script.async = true;
        document.head.appendChild(script);
    }
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
    if (activeTab === 'analytics') {
      fetchAnalyticsData();
      const timer = setInterval(() => setCurrentInsightIndex(p => (p + 1) % 3), 6000);
      return () => clearInterval(timer);
    }
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
      const currentLead = leads.find(l => l.id === id);
      if (currentLead && currentLead.status !== updates.status) {
          const historyEntry = {
              type: 'status_change',
              from: currentLead.status,
              to: updates.status,
              timestamp: new Date().toISOString()
          };
          updates.history = [...(currentLead.history || []), historyEntry];
          
          if (updates.status === 'חתם') {
              triggerConfetti();
          }
      }

      const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'ממתין להשלמות'].includes(updates.status);
      if (isRelevant) updates.wasRelevant = true;
      if (updates.status === 'חתם') {
        updates.isSigned = true;
        updates.signedAt = new Date().toISOString();
      }
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

  // === Image Paste Handler ===
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>, leadId: string) => {
    e.stopPropagation();
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
                if (!text) { alert('לא זיהינו טקסט'); setProcessingImageId(null); return; }
                const phoneMatch = text.match(/0[2-9]\d[-.\s]?\d{3}[-.\s]?\d{4}|0[2-9]\d{8}/) || text.match(/\d{9,10}/);
                const phone = phoneMatch ? phoneMatch[0].replace(/[-.\s]/g, '') : '';
                let name = text;
                if (phone) name = name.replace(phoneMatch[0], '');
                name = name.replace(/[\d\n\r\t|]/g, ' ').replace(/\s+/g, ' ').trim();
                const updates: Partial<Lead> = {};
                if (name) updates.clientName = name;
                if (phone) updates.phone = phone;
                if (Object.keys(updates).length > 0) handleLeadUpdate(leadId, updates);
            } catch (err) { console.error('OCR Error:', err); }
            finally { setProcessingImageId(null); }
            break;
        }
    }
  }, [handleLeadUpdate]);

  const getLeadByPhone = useCallback((phone: string) => {
    if (!phone) return null;
    const normalized = phone.slice(-9);
    return leads.find(l => l.phone?.includes(normalized));
  }, [leads]);

  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== 'חתם' && l.status !== 'נגמר' && l.status !== 'במעקב')
    .filter(l => {
      const q = globalSearch.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = l.clientName?.toLowerCase().includes(q);
      const phoneMatch = l.phone?.includes(q);
      if (showAdvancedStageOnly) {
         const isAdvanced = ['בבדיקה עם גילי', 'גילי צריך לדבר איתו', 'מחכה לחתימה'].includes(l.status);
         if (!isAdvanced) return false;
      }
      return nameMatch || phoneMatch;
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
    .filter(l => {
      const q = globalSearch.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = l.clientName?.toLowerCase().includes(q);
      const phoneMatch = l.phone?.includes(q);
      return nameMatch || phoneMatch;
    })
    .sort((a, b) => {
        if (a.status === 'חתם' && b.status !== 'חתם') return -1;
        if (a.status !== 'חתם' && b.status === 'חתם') return 1;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }), [leads, globalSearch]);

  const cardClass = "premium-glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-indigo-500/10";
  const formatCallDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  if (!mounted) return <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-indigo-500" size={48} /></div>;

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} relative`} style={{ zoom: 0.85 }}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10 opacity-100" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 onClick={handleTitleClick} className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3 cursor-default select-none">
               Sue-Chef <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.9</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium opacity-70">מערכת ניהול לידים מתקדמת</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center"><DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" /></div>
              <div><p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">יתרת טטוויליו</p><p className="text-xl font-black text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p></div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6"><Sun className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-all duration-700 transform ${darkMode ? 'rotate-[360deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} /><Moon className={`absolute inset-0 w-6 h-6 text-indigo-400 transition-all duration-700 transform ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-[360deg] scale-0 opacity-0'}`} /></div>
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}><RefreshCw className={`w-6 h-6 ${(loadingLeads || loadingCalls) ? 'animate-spin text-indigo-500' : 'text-gray-600'}`} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] bg-indigo-600/90 dark:bg-slate-950/80 dark:border dark:border-indigo-500/20 shadow-xl shadow-indigo-500/20 relative overflow-hidden backdrop-blur-md">
          {([{id: 'crm', label: 'טבלת מעקב', accent: 'text-indigo-700'}, {id: 'calls', label: 'שיחות אחרונות', accent: 'text-amber-600'}, {id: 'archive', label: 'ארכיון', accent: 'text-rose-600'}, {id: 'analytics', label: 'אנליטיקה', accent: 'text-emerald-600'}, {id: 'tree', label: 'עץ החלטות', accent: 'text-purple-600'}] as const).map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-8 py-3.5 rounded-2xl text-sm font-bold transition-all relative group overflow-hidden z-10 ${activeTab === tab.id ? `bg-white ${tab.accent} shadow-lg scale-105` : 'text-white/70 hover:text-white hover:bg-white/10'}`}>{tab.label}</button>
          ))}
        </div>

        {/* Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden min-h-[500px]">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
            <div className="overflow-x-auto">
             <table className="w-full text-sm text-right border-collapse">
               <thead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-indigo-500/10">
                 <tr>
                   <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[300px]">פרטי ליד וחיוג</th>
                   <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[180px]">סטטוס טיפול</th>
                   <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[220px]">הערות ומעקב</th>
                   <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">מסך שיחה</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-indigo-500/5">
                 {(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads).map((lead, idx) => (
                   <tr key={lead.id} className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all">
                     <td className="px-8 py-5">
                       <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-5 p-2 transition-all">
                         <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-indigo-600/30 dark:to-indigo-950/40 dark:border dark:border-indigo-500/20 text-white rounded-[20px] shadow-lg active:scale-90 transition-all hover:scale-110"><Phone className="w-6 h-6" /></button>
                         <div className="flex flex-col flex-1 gap-1">
                           {processingImageId === lead.id ? <div className="text-indigo-600 font-black animate-pulse">סורק...</div> : <>
                             <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600" placeholder="שם..." />
                             <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono text-slate-400 bg-transparent outline-none text-sm" placeholder="05..." dir="ltr" />
                           </>}
                         </div>
                       </div>
                     </td>
                     <td className="px-6 py-5">
                       <select value={lead.status} onChange={e => handleLeadUpdate(lead.id, { status: e.target.value })} className={`text-[11px] font-black rounded-2xl px-4 py-3 outline-none border transition-all cursor-pointer w-full appearance-none shadow-sm ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}>{Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>
                     </td>
                     <td className="px-6 py-5"><textarea value={lead.generalNotes || ''} onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} className="w-full text-sm font-bold bg-white/60 dark:bg-slate-950/60 border dark:border-white/10 rounded-2xl p-4 outline-none h-20 resize-none" placeholder="הערות..." /></td>
                     <td className="px-6 py-5 text-center"><button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-800/60 px-6 py-3 rounded-2xl border border-white transition-all hover:bg-indigo-600 hover:text-white"><Maximize2 className="w-4 h-4" /> פתח תיק</button></td>
                   </tr>
                 ))}
               </tbody>
             </table>
            </div>
          )}

          {activeTab === 'calls' && (
            <div className="p-8 max-w-4xl mx-auto space-y-4">
               {loadingCalls ? <div className="py-32 text-center text-slate-400 animate-pulse font-black">מעבד נתונים מטוויליו...</div> : recentCalls.map(call => {
                 const lead = getLeadByPhone(call.from?.slice(-9)) || getLeadByPhone(call.to?.slice(-9));
                 return (
                   <div key={call.sid} className="bg-white dark:bg-slate-800/30 p-6 rounded-3xl border dark:border-slate-800 flex justify-between items-center transition-all group">
                     <div className="flex items-center gap-5">
                       <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30">{call.direction === 'inbound' ? <ArrowUpRight size={28} /> : <ArrowDownRight size={28} />}</div>
                       <div><p className="font-black text-xl text-slate-900 dark:text-white">{lead?.clientName || 'לא מזוהה'}</p><p className="text-xs font-mono text-slate-400" dir="ltr">{call.direction==='inbound'?call.from:call.to}</p></div>
                     </div>
                     <div className="flex items-center gap-8 text-right">
                       <div><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">משך</p><p className="font-black text-lg text-slate-900 dark:text-white">{formatCallDuration(call.duration)}</p></div>
                       <div><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">עלות</p><p className="font-black text-lg text-emerald-500">{(Math.abs(parseFloat(call.price || "0"))).toFixed(2)}$</p></div>
                       <span className="text-[10px] font-black uppercase text-slate-400">{formatDate(call.startTime)}</span>
                     </div>
                   </div>
                 );
               })}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="p-10 space-y-12 min-h-[500px]">
               {loadingAnalytics ? <div className="text-center py-32 text-indigo-500 font-black animate-pulse">מחשב מדדים...</div> : analyticsData && (
                 <>
                   <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                     {[{ label: 'סה"כ לידים', value: analyticsData.funnel?.total || 0, color: 'text-indigo-600', bg: 'bg-indigo-50 dark:bg-indigo-900/10' }, { label: 'חתימות', value: analyticsData.funnel?.signed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10' }, { label: 'שיחות לסגירה', value: analyticsData.insights?.avgCallsPerSigned || 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10' }, { label: 'איכות הלידים', value: analyticsData.insights?.leadQualityRatio || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10', suffix: '%' }].map((kpi, idx) => (
                       <div key={idx} className={`${kpi.bg} p-10 rounded-[40px] border border-transparent transition-all hover:-translate-y-2 hover:shadow-2xl`}>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{kpi.label}</p>
                          <p className={`text-5xl font-black ${kpi.color}`}>{kpi.value}{kpi.suffix}</p>
                       </div>
                     ))}
                   </div>
                   <div className="bg-slate-50 dark:bg-slate-900/40 p-12 rounded-[56px] border dark:border-slate-800 relative z-10">
                     <h4 className="text-3xl font-black mb-12 text-slate-900 dark:text-white">משפך המרה דינמי <TrendingUp size={24} className="inline mr-2 text-indigo-500" /></h4>
                     <div className="space-y-12 max-w-4xl mx-auto">
                        {[{ label: "נוצר קשר", count: analyticsData.funnel?.contacted || 0, color: "from-indigo-600 to-indigo-500", val: (analyticsData.funnel?.total > 1 ? (analyticsData.funnel.contacted / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%" }, { label: "רלוונטיות", count: analyticsData.funnel?.relevant || 0, color: "from-indigo-500 to-indigo-400", val: (analyticsData.funnel?.total > 1 ? (analyticsData.funnel.relevant / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%" }, { label: "חתומים", count: analyticsData.funnel?.signed || 0, color: "from-emerald-600 to-emerald-400", val: (analyticsData.funnel?.total > 1 ? (analyticsData.funnel.signed / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%" }].map((step, idx) => (
                          <div key={idx} className="relative group">
                             <div className="flex justify-between items-end mb-3 px-4"><div><span className="text-lg font-black text-slate-800 dark:text-white">{step.label}</span></div><div className="text-right"><span className="text-2xl font-black text-slate-900 dark:text-white block">{step.count}</span><span className="text-[10px] font-black text-indigo-500 uppercase">{step.val} המרה</span></div></div>
                             <div className="w-full h-14 bg-slate-200/50 dark:bg-slate-800/50 rounded-3xl overflow-hidden flex flex-row-reverse p-1"><div className={`bg-gradient-to-l ${step.color} h-full transition-all duration-[1200ms] rounded-[20px]`} style={{ width: step.val }} /></div>
                          </div>
                        ))}
                     </div>
                   </div>
                 </>
               )}
            </div>
          )}
          {activeTab === 'tree' && <div className="p-8"><LegalDecisionTree /></div>}
        </div>
      </main>

      {/* Live Notes Modal */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-[95vw] h-[95vh] rounded-[48px] shadow-2xl flex flex-col overflow-hidden border dark:border-slate-800">
            <div className="p-8 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10" dir="rtl">
              <div className="flex items-center gap-6"><div className="w-14 h-14 bg-indigo-600 rounded-[22px] flex items-center justify-center text-white shadow-xl"><PhoneCall size={28} /></div><div><h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white leading-none">{liveNotesLead.clientName || 'לקוח'}</h2><p className="text-sm font-mono text-slate-400 mt-2" dir="ltr">{liveNotesLead.phone}</p></div></div>
              <div className="flex items-center gap-4">
                <button onClick={() => setShowTimeline(!showTimeline)} className={`px-8 py-3.5 rounded-2xl border font-black text-xs transition-all flex items-center gap-3 ${showTimeline ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-100 border-slate-200'}`}><History size={20} /> {showTimeline ? 'תסריט' : 'היסטוריה'}</button>
                <button onClick={() => setLiveNotesLead(null)} className="w-12 h-12 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 transition-all"><X size={32} /></button>
              </div>
            </div>
            <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900 relative" dir="rtl">
                <div className="flex-1 flex flex-col p-8 border-l dark:border-slate-800 bg-white dark:bg-slate-900 relative">
                   <div className="flex justify-between items-center mb-4"><div className="flex items-center gap-3"><label className="text-xs font-black uppercase text-indigo-600 tracking-widest px-2">תיעוד שיחה <span className="animate-pulse">●</span></label></div><button onClick={() => copyToClipboard(liveNotesLead.liveCallNotes || '')} className="flex items-center gap-2 text-[10px] font-black text-indigo-600 bg-indigo-50 px-5 py-2.5 rounded-xl border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all"><Copy size={12} /> העתק סיכום</button></div>
                   <textarea autoFocus value={liveNotesLead.liveCallNotes || ''} onChange={e => handleLeadUpdate(liveNotesLead.id, { liveCallNotes: e.target.value })} className="flex-1 bg-slate-50/50 dark:bg-slate-800/20 border-2 border-slate-100 dark:border-slate-800/80 rounded-[32px] p-8 text-xl font-bold font-assistant resize-none outline-none focus:border-indigo-500/30 transition-all shadow-inner custom-scrollbar text-slate-900 dark:text-white" placeholder="כתוב כאן מה הלקוח אומר..." />
                </div>
                <div className="flex-[1.2] flex flex-col p-8 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto custom-scrollbar">
                   {showTimeline ? (
                     <div className="space-y-6">
                       <h4 className="text-xl font-black text-indigo-600 mb-8 border-b-2 border-indigo-500/10 pb-4 flex items-center gap-3"><History size={24} /> היסטוריית פעילות</h4>
                       {(liveNotesLead.history || [{type: 'creation', timestamp: liveNotesLead.createdAt, to: 'חדש'}]).slice().reverse().map((h, i) => (
                         <div key={i} className="relative pr-8 pb-6 border-r-2 border-slate-100 dark:border-slate-800 last:border-0" dir="rtl"><div className="absolute -right-[11px] top-0 w-5 h-5 rounded-full bg-indigo-600 border-4 border-white dark:border-slate-900 shadow-md" /><div className="text-[10px] font-bold text-slate-400 mb-1">{formatDate(h.timestamp)}</div><div className="text-sm font-black text-slate-700 dark:text-slate-200">{h.type === 'status_change' ? <p>סטטוס שונה מ- <span className="text-slate-400 font-medium">{h.from || '?' }</span> ל- <span className="text-indigo-600 font-black">{h.to}</span></p> : <p className="text-emerald-500">הליד נוצר במערכת ✨</p>}</div></div>
                       ))}
                     </div>
                   ) : (
                     <div className="space-y-8 bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800 shadow-sm">
                       <h4 className="text-xl font-black text-indigo-600 mb-6 border-b-2 border-indigo-500/10 pb-4 flex items-center gap-3"><FileText size={24} /> תסריט שיחה</h4>
                       <div className="space-y-6 text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed font-assistant">
                         <div className="bg-indigo-50/50 dark:bg-indigo-900/10 p-5 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                           <p className="mb-2 font-black text-indigo-600 dark:text-indigo-400 underline underline-offset-4">פתיח:</p>
                           אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור. יש לך כמה דקות לדבר?
                         </div>
                         <div className="p-4 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-2xl border border-emerald-100/50">
                            <p className="font-black text-emerald-600 dark:text-emerald-400">אני רק רוצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?</p>
                         </div>
                       </div>
                     </div>
                   )}
                </div>
            </div>
            <div className="p-6 border-t dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-end px-10">
               <button onClick={() => setLiveNotesLead(null)} className="px-20 py-4.5 rounded-2xl bg-indigo-600 text-white font-black shadow-xl hover:scale-105 transition-all text-xl">סיום ועדכון</button>
            </div>
          </div>
        </div>
      )}
      <style jsx global>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; } .custom-scrollbar::-webkit-scrollbar-track { background: transparent; } .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(99, 102, 241, 0.1); border-radius: 10px; }`}</style>
    </div>
  );
}
