"use client";
// Force Vercel Redeploy - v5.9.5-final-restored


import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Star, Search, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Users, Briefcase, Lock } from "lucide-react";
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
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/80 dark:text-orange-200', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 3 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 5 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 6 },
  'חדש': { label: '🆕 חדש', color: 'text-white', bg: 'bg-indigo-600', darkBg: 'dark:bg-indigo-600 dark:text-white', border: 'border-indigo-700 shadow-md', importance: 7 },
  'במעקב': { label: '⭐ במעקב', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', importance: 8 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 9 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 10 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-white', bg: 'bg-red-600', darkBg: 'dark:bg-red-600 dark:text-white', border: 'border-red-700 shadow-md', importance: 11 },
};

const LOST_REASONS = ["אין מענה חוזר", "אין עילה רפואית", "מתחרים/לקח עו\"ד אחר", "לא מעוניין", "בגלל מחיר", "טעות במספר", "אחר"];

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
  const [pendingDisqualification, setPendingDisqualification] = useState<{ id: string, action: 'delete' | 'fail', targetStatus?: string } | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  
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
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");

  const handleSwitchRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSwitchError("");
    setSwitchLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: switchPassword }) });
      const data = await res.json();
      if (data.success) {
        window.location.href = data.role === 'lawyer' ? "/lawyer" : "/";
      } else {
        setSwitchError("סיסמה שגויה");
      }
    } catch (err) { setSwitchError("שגיאת תקשורת"); }
    finally { setSwitchLoading(false); }
  };

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
      const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם'].includes(updates.status);
      if (isRelevant) updates.wasRelevant = true;
      if (updates.status === 'חתם') {
        updates.isSigned = true;
        updates.signedAt = new Date().toISOString();
      }
      // Track status history
      const currentLead = leads.find(l => l.id === id);
      if (currentLead && currentLead.status !== updates.status) {
        const history = currentLead.statusHistory || [];
        updates.statusHistory = [...history, { from: currentLead.status, to: updates.status, timestamp: new Date().toISOString() }];
      }
    }
    
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    if (historyLead?.id === id) setHistoryLead(prev => prev ? { ...prev, ...updates } : null);
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

  // === Image Paste Handler (Restored Tesseract.js approach) ===
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>, leadId: string) => {
    e.stopPropagation(); // Prevent duplicate events bubbling up
    const items = e.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf("image") !== -1) {

            e.preventDefault(); // Stop native pasting of an image file object
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
                if (phone) name = name.replace(phoneMatch[0], '');
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

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} flex flex-row-reverse`} style={{ zoom: 0.85 }}>
      {/* Sidebar Navigation */}
      <aside className="w-72 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-l dark:border-slate-800 sticky top-0 h-screen z-50 flex flex-col p-6 shadow-2xl transition-all duration-500 overflow-hidden" dir="rtl">
        <div className="mb-12 flex flex-col items-center">
          <h1 onClick={handleTitleClick} className="text-3xl font-black tracking-tight text-indigo-600 dark:text-indigo-400 cursor-default select-none transition-all hover:scale-105 active:scale-95">
             Sue-Chef
          </h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 tracking-[0.2em] uppercase mt-2">Leads Terminal</p>
        </div>

        <nav className="flex-1 space-y-3">
          {[
            { id: 'crm', label: 'ניהול לידים (CRM)', icon: TableProperties, color: 'text-indigo-500', bg: 'bg-indigo-50/50 dark:bg-indigo-900/10' },
            { id: 'lawyer', label: 'דשבורד עו"ד', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50/50 dark:bg-emerald-900/10', action: () => setShowSwitchModal(true) },
            { id: 'analytics', label: 'אנליטיקה', icon: BarChart, color: 'text-amber-500', bg: 'bg-amber-50/50 dark:bg-amber-900/10' },
            { id: 'tree', label: 'עץ החלטות', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50/50 dark:bg-purple-900/10' },
            { id: 'calls', label: 'שיחות אחרונות', icon: PhoneCall, color: 'text-blue-500', bg: 'bg-blue-50/50 dark:bg-blue-900/10' },
            { id: 'archive', label: 'ארכיון', icon: History, color: 'text-rose-500', bg: 'bg-rose-50/50 dark:bg-rose-900/10' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => {
                if (item.action) item.action();
                else setActiveTab(item.id as any);
              }}
              className={`w-full flex items-center gap-4 px-5 py-4 rounded-3xl font-black text-sm transition-all duration-300 group ${
                activeTab === item.id 
                  ? `${item.bg} ${item.color} shadow-sm translate-x-1` 
                  : 'text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-600 dark:hover:text-slate-300'
              }`}
            >
              <item.icon className={`${activeTab === item.id ? item.color : 'text-slate-300 dark:text-slate-700'} group-hover:scale-110 transition-transform duration-300`} size={22} />
              <span className="flex-1 text-right">{item.label}</span>
              {activeTab === item.id && <div className={`w-1.5 h-6 rounded-full ${item.color.replace('text-', 'bg-')}`} />}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t dark:border-slate-800 space-y-4">
          <div className={`p-5 rounded-3xl ${cardClass} flex flex-col gap-3 group`}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרה</p>
            </div>
            <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform origin-right" dir="ltr">{twilioBalance || "..."}</p>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setDarkMode(!darkMode)} className={`flex-1 p-4 flex items-center justify-center transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              {darkMode ? <Sun className="w-5 h-5 text-yellow-500" /> : <Moon className="w-5 h-5 text-indigo-400" />}
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`flex-1 p-4 flex items-center justify-center transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-5 h-5 ${(loadingLeads || loadingCalls) ? 'animate-spin text-indigo-500' : 'text-gray-400'}`} />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex-1 max-h-screen overflow-y-auto custom-scrollbar">
        <main className="max-w-[1280px] mx-auto px-6 lg:px-12 py-10 font-sans relative z-10 opacity-100" dir="rtl">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 onClick={handleTitleClick} className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3 cursor-default select-none">
               Sue-Chef 
               <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.9</span>
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium opacity-70">מערכת ניהול לידים מתקדמת</p>
          </div>

          {/* Secret Profit Tracker Panel (Counter + Profit Only) */}
          {showSecretPanel && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-2 rounded-3xl border dark:border-white/5">
              <div className="px-4 py-2 flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">מונה שעות עבודה</p>
                <p className="text-sm font-black text-indigo-500" dir="ltr">
                  {isWorking && workStartTime ? (
                    new Date(Date.now() - workStartTime).toISOString().substr(11, 8)
                  ) : (
                    '00:00:00'
                  )}
                </p>
              </div>
              <button onClick={toggleWorkTimer} className={`h-12 px-6 rounded-2xl font-black text-sm flex items-center gap-2 transition-all shadow-lg ${isWorking ? 'bg-red-500 text-white shadow-red-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                {isWorking ? 'עצור עבודה' : 'התחל עבודה'}
              </button>
              <button onClick={() => { setWeekOffset(0); fetchWeeklyProfit(0); setShowWeeklyReport(true); }} className="h-12 px-6 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:scale-105 transition-all">
                <TrendingUp size={16} /> רווח שבועי
              </button>
              <button onClick={() => setShowSecretPanel(false)} className="w-12 h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
          )}
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

        {/* Main Sections are now in Sidebar. Tabs removed from here. */}

        {/* Search & Actions */}
        {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive') && (
          <div className="flex flex-col md:flex-row gap-4 mb-8 items-center">
            {/* ACTION BUTTONS (Placed RIGHT in RTL flex-row) */}
            <div className="flex gap-4">
              {activeTab !== 'archive' && (
                <button onClick={addNewLead} className="bg-indigo-600 dark:bg-slate-900/40 dark:border dark:border-indigo-500/30 text-white px-8 py-4 rounded-2xl font-black shadow-lg shadow-indigo-500/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center gap-2 relative group overflow-hidden backdrop-blur-sm">
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
              <tbody className="divide-y divide-indigo-500/5 opacity-100">
                {(Array.isArray(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads) ? (activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : archiveLeads) : []).map((lead, idx) => (
                  <tr 
                    key={lead.id} 
                    className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                    style={{ animationDelay: `${idx * 50}ms`, transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                  >
                    <td className="px-8 py-5">
                      <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-5 p-2 rounded-2xl transition-all duration-300 group-hover:translate-x-1">
                        <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 dark:from-slate-800 dark:to-indigo-950 dark:border dark:border-indigo-500/30 text-white rounded-[20px] shadow-lg shadow-indigo-500/20 dark:shadow-none active:scale-90 transition-all hover:scale-110 backdrop-blur-sm"><Phone className="w-6 h-6" /></button>
                        <div className="flex flex-col flex-1 gap-1">
                          {processingImageId === lead.id ? (
                            <div className="flex items-center gap-3 py-2 text-indigo-600 font-black animate-pulse">
                              <Loader2 className="animate-spin w-5 h-5" />
                              סורק תמונה מקומית...
                            </div>
                          ) : (
                            <>
                              <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors" placeholder="שם הלקוח..." />
                              <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-medium text-slate-400 bg-transparent outline-none text-sm group-focus-within:text-slate-500" placeholder="05..." dir="ltr" />
                            </>
                          )}
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
                                  const firstName = lead.clientName?.split(' ')[0] || 'לקוח';
                                  const msg = encodeURIComponent(`היי ${firstName}, קוראים לי יונתן אני ממשרד עורכי הדין HBA, השארת אצלנו פרטים וניסיתי לחזור אלייך. אשמח אם נוכל לדבר כשיתאפשר`);
                                  window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                  setOpenMenuId(null);
                                }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-colors"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                                <button onClick={() => { copyToClipboard(lead.phone || ''); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"><Copy className="w-4 h-4" /> העתק מספר</button>
                                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                <button onClick={() => { deleteLeadDirectly(lead.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 transition-colors"><Trash2 className="w-4 h-4" /> מחק ליד</button>
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
                          {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
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
                       <div className="flex items-center justify-center gap-2">
                         <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-800/60 px-6 py-3 rounded-2xl border border-white dark:border-white/10 transition-all hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 shadow-sm active:scale-95"><Maximize2 className="w-4 h-4" /> פתח תיק</button>
                         <button onClick={() => setHistoryLead(lead)} className="inline-flex items-center gap-2 text-xs font-black text-amber-600 dark:text-amber-400 bg-amber-50/60 dark:bg-amber-900/20 px-4 py-3 rounded-2xl border border-amber-200/60 dark:border-amber-700/30 transition-all hover:bg-amber-500 hover:text-white dark:hover:bg-amber-600 shadow-sm active:scale-95" title="היסטוריית ליד"><History className="w-4 h-4" /></button>
                       </div>
                       {activeTab === 'archive' && lead.status === 'נגמר' && lead.disqualificationReason && (
                         <div className="mt-2 text-[10px] font-bold text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/10 px-3 py-1 rounded-full border border-red-100 dark:border-red-900/30 inline-block">
                           ❌ {lead.disqualificationReason}
                         </div>
                       )}
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
                       { icon: CheckCircle, label: 'חתימות', value: analyticsData.funnel?.signed || 0, color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-900/10', border: 'border-emerald-100 dark:border-emerald-900/30', sub: `${analyticsData.funnel?.total > 0 ? ((analyticsData.funnel.signed / analyticsData.funnel.total)*100).toFixed(1) : 0}% המרה כוללת` },
                       { icon: Zap, label: 'ממוצע שיחות לסגירה', value: analyticsData.insights?.avgCallsPerSigned || 0, color: 'text-amber-600', bg: 'bg-amber-50 dark:bg-amber-900/10', border: 'border-amber-100 dark:border-amber-900/30' },
                       { icon: TrendingUp, label: 'איכות הלידים (רלוונטיות)', value: analyticsData.insights?.leadQualityRatio || 0, color: 'text-purple-600', bg: 'bg-purple-50 dark:bg-purple-900/10', border: 'border-purple-100 dark:border-purple-900/30', isPercent: true }
                     ].map((kpi, idx) => (
                       <div key={idx} className={`${kpi.bg} p-10 rounded-[40px] border ${kpi.border} transition-all duration-500 transform hover:-translate-y-2 hover:shadow-2xl opacity-100`}>
                          <kpi.icon className={kpi.color + " mb-6"} size={32} />
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">{kpi.label}</p>
                          <p className={`text-5xl font-black ${kpi.color}`}><SimpleCountUp value={kpi.value || 0} suffix={kpi.isPercent ? "%" : ""} /></p>
                          {kpi.sub && <p className="text-xs font-bold text-emerald-500 mt-4 flex items-center gap-1"><ArrowUpRight size={14} /> {kpi.sub}</p>}
                       </div>
                     ))}
                   </div>

                   <div className="bg-slate-100/30 dark:bg-slate-800/20 p-12 rounded-[56px] border dark:border-slate-800 shadow-inner overflow-hidden">
                     <h4 className="text-3xl font-black mb-12 flex items-center gap-4 text-slate-900 dark:text-white">משפך המרה <ArrowDownRight size={24} className="text-indigo-500" /></h4>
                     <div className="space-y-12 max-w-4xl mx-auto">
                        {[
                          { label: "נוצר קשר (ענו)", count: analyticsData.funnel?.contacted || 0, drop: analyticsData.funnel?.total > 0 ? (100 - (analyticsData.funnel.contacted / analyticsData.funnel.total * 100)) : 0, dropVal: analyticsData.funnel?.total - analyticsData.funnel?.contacted, color: "bg-indigo-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.contacted / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", desc: "לידים שענו לטלפון או שסטטוסם התקדם מעבר ל'חדש'." },
                          { label: "רלוונטיות (בבדיקה/המשך טיפול)", count: analyticsData.funnel?.relevant || 0, drop: analyticsData.funnel?.contacted > 0 ? (100 - (analyticsData.funnel.relevant / analyticsData.funnel.contacted * 100)) : 0, dropVal: analyticsData.funnel?.contacted - analyticsData.funnel?.relevant, color: "bg-indigo-400", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.relevant / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", desc: "לידים שסומנו כבעלי עילה והועברו הלאה במערכת." },
                          { label: "חתומים", count: analyticsData.funnel?.signed || 0, drop: analyticsData.funnel?.relevant > 0 ? (100 - (analyticsData.funnel.signed / analyticsData.funnel.relevant * 100)) : 0, dropVal: analyticsData.funnel?.relevant - analyticsData.funnel?.signed, color: "bg-emerald-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.signed / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", shadow: "shadow-emerald-500/30", desc: "מטופלים שהמרו והפכו לייצוג רשמי." }
                        ].map((step, idx) => (
                          <div key={idx} className="relative group opacity-100 mt-8">
                             {idx > 0 && <div className="absolute -top-10 right-4 text-[10px] font-black bg-red-50 dark:bg-red-900/10 text-red-500 px-3 py-1 rounded-full z-10 shadow-sm border border-red-100 dark:border-red-900/30 flex items-center gap-1"><ArrowDownRight size={12}/> נשרו {step.drop.toFixed(1)}% ({step.dropVal} אבדו בשלב הקודם)</div>}
                             <div className="flex justify-between items-center mb-3 px-4 relative z-20">
                               <div className="flex flex-col">
                                 <span className="text-base font-black text-slate-700 dark:text-slate-200 tracking-tight">{step.label}</span>
                                 <span className="text-xs text-slate-400 font-bold mt-1 line-clamp-1 group-hover:line-clamp-none transition-all">{step.desc}</span>
                               </div>
                               <span className="text-lg font-black text-slate-900 dark:text-white px-4 py-1 bg-white dark:bg-slate-800/80 rounded-xl shadow-sm border dark:border-slate-700">{step.count} ({step.val})</span>
                             </div>
                             <div className="w-full h-11 bg-slate-200/50 dark:bg-slate-800 rounded-full overflow-hidden flex flex-row-reverse shadow-inner relative z-20">
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
                      <div className="bg-indigo-600 rounded-[56px] p-12 text-white shadow-2xl flex flex-col justify-center relative overflow-hidden group">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full translate-x-32 -translate-y-32 transition-transform duration-1000 group-hover:scale-110" />
                         
                         <div className="flex justify-between items-center mb-8 relative z-10">
                            <h4 className="text-xl font-black flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full uppercase tracking-widest text-[11px]"><Brain size={16} /> תובנות חכמות מבוססות נתונים</h4>
                            <div className="flex gap-2">
                               <button onClick={() => setCurrentInsightIndex(p => (p + 1) % 3)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><ArrowUpRight size={14} className="rotate-45" /></button>
                               {[0, 1, 2].map(i => <button key={i} onClick={() => setCurrentInsightIndex(i)} className={`h-2 rounded-full transition-all duration-500 cursor-pointer hover:bg-white/60 ${currentInsightIndex === i ? 'bg-white w-6' : 'bg-white/30 w-2'}`} />)}
                               <button onClick={() => setCurrentInsightIndex(p => (p + 2) % 3)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><ArrowUpRight size={14} className="rotate-[225deg]" /></button>
                            </div>
                         </div>

                         <div className="relative h-48 z-10 w-full">
                            {currentInsightIndex === 0 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <Zap size={48} className="text-amber-400 mb-6 opacity-80" />
                                   <p className="text-3xl font-black opacity-90 leading-tight font-assistant">
                                      {analyticsData.insights?.quickSignedRate || 0}% מהחוזים נחתמים ב-<span className="text-amber-400">3 השיחות הראשונות</span>. נדרשות בממוצע {analyticsData.insights?.avgCallsPerSigned || 0} שיחות לסגירה.
                                   </p>
                                   <p className="mt-4 text-indigo-200 font-bold text-sm">מסקנה: השקעת מאמץ מעבר ל-4 צלצולים מפחיתה דרסטית את סיכויי ההמרה.</p>
                               </div>
                            )}
                            {currentInsightIndex === 1 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <Star size={48} className="text-emerald-400 mb-6 opacity-80" />
                                   <p className="text-3xl font-black opacity-90 leading-tight font-assistant">
                                      מדד איכות הלידים שלך: <span className="text-emerald-400">{analyticsData.insights?.leadQualityRatio || 0}%</span> מאלו שענו באמת עברו את הסינון שלך והוגדרו כרלוונטיים.
                                   </p>
                                   <p className="mt-4 text-indigo-200 font-bold text-sm">מסקנה: זהו אחוז הלידים הבשלים שהתקדמו לבדיקה מתוך הסך הכל הכללי עמו הושג קשר.</p>
                               </div>
                            )}
                            {currentInsightIndex === 2 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <PhoneOff size={48} className="text-red-400 mb-6 opacity-80" />
                                   <p className="text-3xl font-black opacity-90 leading-tight font-assistant">
                                      לידים שנפסלו על 'אין מענה' קיבלו בממוצע רק <span className="text-red-400">{analyticsData.insights?.avgCallsNoAnswer || 0}</span> צלצולים בלבד.
                                   </p>
                                   <p className="mt-4 text-indigo-200 font-bold text-sm">מסקנה: ייתכן ואנחנו ממהרים מדי לפסול. מומלץ להגדיל מספר ניסיונות לפני פסילה סופית.</p>
                               </div>
                            )}
                         </div>
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
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl" dir="rtl">
            <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mb-4 mx-auto"><AlertTriangle size={24} /></div>
            <h3 className="text-xl font-black mb-1 text-center text-slate-900 dark:text-white">מדוע הליד נפסל?</h3>
            <p className="text-xs font-bold text-slate-400 mb-5 text-center">בחר סיבה לסיום הטיפול</p>
            <div className="grid grid-cols-1 gap-2">
               {LOST_REASONS.map((reason, idx) => (
                 <button key={reason} onClick={() => finalizeDisqualification(reason)} className="w-full text-right px-5 py-3 rounded-2xl border dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-900/10 font-black text-sm transition-all hover:border-red-500 hover:text-red-600 text-slate-700 dark:text-slate-200">{reason}</button>
               ))}
            </div>
            <button onClick={() => setPendingDisqualification(null)} className="w-full mt-5 py-3 text-xs font-black text-slate-300 hover:text-slate-500 transition-colors uppercase">ביטול</button>
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

                    {/* LEFT SIDE: New Permanent Script (Expanded) */}
                    <div className="flex-[1.2] flex flex-col p-6 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto custom-scrollbar border-r dark:border-slate-800">
                       <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800 shadow-sm border-indigo-500/10">
                          <h4 className="text-xl font-black text-indigo-600 mb-6 flex items-center gap-3 underline decoration-indigo-500/30 underline-offset-8">
                            <FileText size={24} /> תסריט שיחה מלא
                          </h4>
                          
                          <div className="space-y-8 text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed font-assistant" dir="rtl">
                            <section>
                              <h5 className="text-indigo-500 font-black text-lg mb-2">פתיחה</h5>
                              <p className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                                אהלן, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות, ורציתי לשוחח איתך כדי להבין איך נוכל לעזור. יש לך כמה דקות לדבר?
                              </p>
                            </section>

                            <section>
                              <h5 className="text-indigo-500 font-black text-lg mb-2">בירור כוונה</h5>
                              <p>אני רק רוצה לוודא – אתה עדיין מעוניין שנבדוק עבורך האם נוכל לסייע?</p>
                            </section>

                            <section className="space-y-4">
                              <h5 className="text-indigo-500 font-black text-lg mb-2">שאלות סינון</h5>
                              <div className="space-y-4">
                                <div className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                                  <p>מה שמך המלא ומה הגיל שלך?</p>
                                </div>
                                <div className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                                  <p>יש לך כרגע הכנסות? אם כן – מאיפה הן מגיעות (קצבה, עבודה, פנסיה וכו') ומה הסכום בערך?</p>
                                </div>
                                <div className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                                  <div>
                                    <p>תוכל לפרט קצת על המצב הרפואי שלך? ממה אתה סובל כיום, מה יש באבחנות, ומה הכי משפיע על התפקוד היומיומי?</p>
                                    <p className="text-[10px] text-slate-400 mt-2 italic">(אם מספר כמה בעיות – תגיד: "אוקיי, חשוב לי להבין כל דבר בנפרד כדי להעביר לעו"ד בצורה מדויקת).</p>
                                  </div>
                                </div>
                                <div className="flex gap-3">
                                  <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">4</span>
                                  <p>יש לך כרגע קצבאות כלשהן? אם כן – מאיפה? אם זו קצבה מביטוח לאומי – אתה יודע מה דרגת הנכות שקיבלת?</p>
                                </div>
                                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center text-xs font-black">5</span>
                                    <p>האם יש קושי בפעולות יומיומיות (לבוש, רחצה, תפקוד בסיסי)? תשאלו רק אם אתה שומע תיאור שמעיד על מצב תפקודי קשה.</p>
                                  </div>
                                </div>
                                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center text-xs font-black">6</span>
                                    <p>האם יש לך ביטוח סיעודי בקופת חולים?</p>
                                  </div>
                                </div>
                                <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center text-xs font-black">7</span>
                                    <p>משלם מס הכנסה? אם כן, כמה?</p>
                                  </div>
                                </div>
                              </div>
                            </section>
                          </div>
                       </div>

                       <div className="mt-8 opacity-20 text-[9px] items-center flex gap-2 font-black text-slate-400 uppercase tracking-tighter self-center">
                          <Zap size={10} /> Sue-Chef v5.9 Master
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

      {/* Lead History Modal */}
      {historyLead && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md" onClick={() => setHistoryLead(null)}>
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg max-h-[80vh] rounded-[48px] shadow-2xl overflow-hidden border dark:border-slate-800" dir="rtl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-8 pb-4 border-b dark:border-slate-800 bg-gradient-to-l from-amber-50 to-white dark:from-amber-950/20 dark:to-slate-900">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-3xl flex items-center justify-center text-amber-600">
                    <History size={28} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-900 dark:text-white">{historyLead.clientName || 'ליד'}</h3>
                    <p className="text-sm font-mono text-slate-400" dir="ltr">{historyLead.phone || '---'}</p>
                  </div>
                </div>
                <button onClick={() => setHistoryLead(null)} className="w-10 h-10 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center justify-center text-slate-400 hover:text-red-500 transition-all"><X size={20} /></button>
              </div>
            </div>

            {/* Timeline */}
            <div className="p-8 overflow-y-auto max-h-[55vh] custom-scrollbar">
              <div className="relative pr-6 border-r-2 border-indigo-100 dark:border-indigo-900/30 space-y-6">
                {/* Created */}
                <div className="relative">
                  <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900 shadow-md" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">נוצר</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDate(historyLead.createdAt)}</p>
                  <p className="text-xs text-slate-400">מקור: {historyLead.source}</p>
                </div>

                {/* Status changes */}
                {(historyLead.statusHistory || []).map((entry, idx) => (
                  <div key={idx} className="relative animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 80}ms` }}>
                    <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-amber-400 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{formatDate(entry.timestamp)}</p>
                    <div className="flex items-center gap-2 text-sm font-bold">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${getStatusStyle(entry.from).bg} ${getStatusStyle(entry.from).color}`}>{STATUS_CONFIG[entry.from]?.label || entry.from}</span>
                      <ArrowRight size={14} className="text-slate-300 flex-shrink-0" />
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black ${getStatusStyle(entry.to).bg} ${getStatusStyle(entry.to).color}`}>{STATUS_CONFIG[entry.to]?.label || entry.to}</span>
                    </div>
                    {entry.to === 'נגמר' && historyLead.disqualificationReason && idx === (historyLead.statusHistory || []).length - 1 && (
                      <p className="text-xs text-red-500 font-bold mt-1">סיבה: {historyLead.disqualificationReason}</p>
                    )}
                  </div>
                ))}

                {/* Calls */}
                {(historyLead.callCount || 0) > 0 && (
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">שיחות</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">בוצעו {historyLead.callCount} שיחות</p>
                    {historyLead.lastContacted && <p className="text-xs text-slate-400">שיחה אחרונה: {formatDate(historyLead.lastContacted)}</p>}
                  </div>
                )}

                {/* Twilio calls for this lead */}
                {recentCalls.filter(c => {
                  if (!historyLead.phone) return false;
                  const norm = historyLead.phone.slice(-9);
                  return (c.from || '').includes(norm) || (c.to || '').includes(norm);
                }).map((call, idx) => (
                  <div key={call.sid} className="relative animate-in fade-in slide-in-from-right-4 duration-300" style={{ animationDelay: `${idx * 60}ms` }}>
                    <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-blue-400 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">{formatDate(call.startTime)}</p>
                    <div className="flex items-center gap-3 text-sm font-bold text-slate-700 dark:text-slate-300">
                      <Phone size={14} className="text-blue-500" />
                      <span>{call.direction === 'inbound' ? 'שיחה נכנסת' : 'שיחה יוצאת'}</span>
                      <span className="text-xs text-slate-400">({formatCallDuration(call.duration)})</span>
                    </div>
                  </div>
                ))}

                {/* Signed? */}
                {historyLead.isSigned && (
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-yellow-400 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-wider mb-1">חתימה 🏆</p>
                    <p className="text-sm font-bold text-emerald-600">{formatDate(historyLead.signedAt || null)}</p>
                  </div>
                )}

                {/* Empty state */}
                {!(historyLead.statusHistory || []).length && !(historyLead.callCount || 0) && !historyLead.isSigned && (
                  <div className="text-center py-8 text-slate-300">
                    <Clock size={32} className="mx-auto mb-3 opacity-30" />
                    <p className="font-bold text-sm">אין היסטוריה עדיין</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles for Shimmer and custom animations */}
      {/* Weekly Profit Report Modal */}
      {showWeeklyReport && (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-6 bg-slate-900/70 backdrop-blur-lg" onClick={() => setShowWeeklyReport(false)}>
          <div className="bg-indigo-600 w-full max-w-lg rounded-[48px] shadow-2xl p-10 relative overflow-hidden text-white" dir="rtl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 left-0 w-72 h-72 bg-white/5 blur-[100px] rounded-full -translate-x-20 -translate-y-20" />
            <button onClick={() => setShowWeeklyReport(false)} className="absolute left-6 top-6 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all z-20">
              <X size={16} />
            </button>
            
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 mt-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center"><DollarSign size={24} /></div>
                  <div>
                    <h3 className="text-2xl font-black">דוח רווח שבועי</h3>
                    <p className="text-indigo-200 text-xs font-bold">{weekOffset === 0 ? 'השבוע הנוכחי' : `${Math.abs(weekOffset)} שבועות אחורה`}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { const next = weekOffset + 1; if (next <= 0) { setWeekOffset(next); fetchWeeklyProfit(next); }}} className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${weekOffset >= 0 ? 'bg-white/5 text-white/20 cursor-not-allowed' : 'bg-white/10 hover:bg-white/20'}`}><ArrowUpRight size={16} className="rotate-45" /></button>
                  <button onClick={() => { const next = weekOffset - 1; setWeekOffset(next); fetchWeeklyProfit(next); }} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><ArrowUpRight size={16} className="rotate-[225deg]" /></button>
                </div>
              </div>
              {weeklyData && <p className="text-xs text-indigo-200 font-mono mb-4 bg-white/5 inline-block px-3 py-1 rounded-full" dir="ltr">{new Date(weeklyData.weekStart).toLocaleDateString('he-IL')} - {new Date(weeklyData.weekEnd).toLocaleDateString('he-IL')}</p>}
              
              {loadingWeekly ? (
                <div className="flex items-center justify-center py-16"><Loader2 className="animate-spin" size={32} /></div>
              ) : weeklyData ? (
                <div className="mt-8 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">שעות עבודה השבוע</p>
                      <p className="text-3xl font-black text-amber-400">{getWeeklyHours(weekOffset).toFixed(1)}<span className="text-lg mr-1">שעות</span></p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">חתימות השבוע</p>
                      <p className="text-3xl font-black text-emerald-400">{weeklyData.signedThisWeek}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">הכנסה ברוטו</p>
                      <p className="text-3xl font-black text-emerald-400">₪{weeklyData.grossRevenue.toLocaleString()}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">עלות Twilio</p>
                      <p className="text-3xl font-black text-red-400">₪{weeklyData.twilioCostNIS.toFixed(0)}</p>
                      <p className="text-[10px] text-indigo-300 mt-1">${weeklyData.twilioCostUSD}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/15 rounded-3xl p-6 border border-white/10 mt-6">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-2">רווח נקי</p>
                    <p className={`text-5xl font-black ${weeklyData.netProfit >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>₪{weeklyData.netProfit.toLocaleString()}</p>
                  </div>
                  
                  <div className="bg-white/10 rounded-2xl p-5">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-2">כסף לשעה</p>
                    <p className="text-4xl font-black text-amber-400">
                      ₪{getWeeklyHours(weekOffset) > 0 ? (weeklyData.netProfit / getWeeklyHours(weekOffset)).toFixed(0) : '0'}
                      <span className="text-lg mr-1 text-indigo-200">/שעה</span>
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-center py-12 text-indigo-200">שגיאה בטעינת הנתונים</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Switch Role Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-10 rounded-[48px] shadow-2xl border dark:border-white/5" dir="rtl">
            <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-3xl flex items-center justify-center text-emerald-600 mb-6 mx-auto"><Lock className="w-8 h-8" /></div>
            <h3 className="text-2xl font-black mb-2 text-center">מעבר לדשבורד עו"ד</h3>
            <p className="text-sm font-bold text-slate-400 mb-8 text-center">הזן סיסמת גישה</p>
            <form onSubmit={handleSwitchRole} className="space-y-4">
              <input type="password" value={switchPassword} onChange={e => setSwitchPassword(e.target.value)} autoFocus placeholder="סיסמה..." className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-6 py-4 text-center text-lg font-black outline-none focus:ring-4 focus:ring-emerald-500/10 transition-all" dir="ltr" />
              {switchError && <p className="text-xs font-black text-red-500 text-center">{switchError}</p>}
              <button type="submit" disabled={switchLoading || !switchPassword} className="w-full bg-emerald-600 text-white rounded-2xl py-4 font-black text-lg shadow-lg shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center">
                {switchLoading ? <Loader2 className="animate-spin" /> : "כניסה"}
              </button>
              <button type="button" onClick={() => { setShowSwitchModal(false); setSwitchError(""); setSwitchPassword(""); }} className="w-full py-2 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">ביטול</button>
            </form>
          </div>
        </div>
      )}

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
    </div>
  );
}
