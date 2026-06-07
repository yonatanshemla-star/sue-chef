"use client";
// Force Vercel Redeploy - v5.9.5-final-restored


import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ChevronLeft, ArrowRight, ArrowUp, Star, Search, Calendar, ArrowUpRight, ArrowDownRight, TrendingUp, AlertTriangle, Users, Briefcase, Lock, Archive, Menu, Settings, Download, Upload, Shield, StickyNote, Square, CheckSquare, Sparkles } from "lucide-react";
import type { Lead, AITask } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';
import InteractiveSVGChart from "@/components/InteractiveSVGChart";
import DisqualificationDonutChart from "@/components/DisqualificationDonutChart";

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
  'רלוונטי - לעקוב': { label: '🟡 רלוונטי - לעקוב', color: 'text-white', bg: 'bg-amber-500', darkBg: 'dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900', border: 'border-amber-600 shadow-lg shadow-amber-500/30', importance: 3 },
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', color: 'text-white', bg: 'bg-pink-600', darkBg: 'dark:bg-pink-950/50 dark:text-pink-400 dark:border-pink-900', border: 'border-pink-700', importance: 0 },
  'גילי צריך לדבר איתו': { label: '💬 גילי צריך לדבר איתו', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950/50 dark:text-green-500 dark:border-green-900', border: 'border-green-300 dark:border-green-700', importance: 1 },
  'בבדיקה עם גילי': { label: '🔍 בבדיקה עם גילי', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950/50 dark:text-emerald-500 dark:border-emerald-900', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  'ממתין לעדכון': { label: '⏳ ממתין לעדכון', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-950/50 dark:text-orange-400 dark:border-orange-900', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 9 },
  'לחזור אליו': { label: '📞 לחזור אליו', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950/50 dark:text-blue-400 dark:border-blue-900', border: 'border-blue-300 dark:border-blue-700', importance: 6 },
  'אחר': { label: '📝 אחר', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-900/50 dark:text-gray-400 dark:border-gray-800', border: 'border-gray-300 dark:border-gray-600', importance: 5 },
  'לא ענה': { label: '📵 לא ענה', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-950/50 dark:text-gray-500 dark:border-gray-800', border: 'border-gray-600', importance: 7 },
  'חדש': { label: '🆕 חדש', color: 'text-white', bg: 'bg-indigo-600', darkBg: 'dark:bg-indigo-950/50 dark:text-indigo-400 dark:border-indigo-900', border: 'border-indigo-700 shadow-md', importance: 4 },
  'במעקב': { label: '⭐ במעקב', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-950/30 dark:text-amber-500 dark:border-amber-900/50', border: 'border-amber-200 dark:border-amber-800', importance: 10 },
  'חתם': { label: '🏆 חתם', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-700', border: 'border-amber-300 dark:border-amber-700', importance: 11 },
  'נגמר': { label: '❌ נגמר', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950/40 dark:text-red-400 dark:border-red-900', border: 'border-red-300 dark:border-red-700', importance: 12 },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', color: 'text-white', bg: 'bg-red-600', darkBg: 'dark:bg-red-950/50 dark:text-red-500 dark:border-red-900', border: 'border-red-700 shadow-md', importance: 8 },
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
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree' | 'followup' | 'settings' | 'noanswer'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [agentPhone, setAgentPhone] = useState("");
  
  // Modals
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [activeStatusDropdownLeadId, setActiveStatusDropdownLeadId] = useState<string | null>(null);
  const [showScriptPanel, setShowScriptPanel] = useState(false);
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  const [leftPanelTab, setLeftPanelTab] = useState<'script' | 'fields'>('script');
  const [isNegligenceActive, setIsNegligenceActive] = useState(false);
  const [pendingDisqualification, setPendingDisqualification] = useState<{ id: string, action: 'delete' | 'fail', targetStatus?: string } | null>(null);
  const [historyLead, setHistoryLead] = useState<Lead | null>(null);
  
  // Sorting/Search
  const [globalSearch, setGlobalSearch] = useState('');
  const [showAdvancedStageOnly, setShowAdvancedStageOnly] = useState(false);
  const [notifications, setNotifications] = useState<{id: string, name: string, time: string}[]>([]);
  const [currentInsightIndex, setCurrentInsightIndex] = useState(0);

  // Secret Profit Tracker
  const [showSecretPanel, setShowSecretPanel] = useState(false);
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [titleClickCount, setTitleClickCount] = useState(0);
  const [titleClickTimer, setTitleClickTimer] = useState<NodeJS.Timeout | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const [workStartTime, setWorkStartTime] = useState<number | null>(null);
  const [showWeeklyReport, setShowWeeklyReport] = useState(false);
  const [weeklyData, setWeeklyData] = useState<any>(null);
  const [loadingWeekly, setLoadingWeekly] = useState(false);
  const [weekOffset, setWeekOffset] = useState(0);
  const [analyticsTimeframe, setAnalyticsTimeframe] = useState<'lifetime' | '30days' | '7days' | 'currentMonth'>('lifetime');
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [switchPassword, setSwitchPassword] = useState("");
  const [switchLoading, setSwitchLoading] = useState(false);
  const [switchError, setSwitchError] = useState("");
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // AI Diagnostics State
  const [isAiAnalyzing, setIsAiAnalyzing] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAiDrawerOpen, setIsAiDrawerOpen] = useState(false);
  const [loadingAiStatus, setLoadingAiStatus] = useState("סורק ומקבץ שיחות ולידים לתקופה...");
  const [checkedActionItems, setCheckedActionItems] = useState<Record<number, boolean>>({});

  // Daily Sticky Notes
  const [showStickyNote, setShowStickyNote] = useState(false);
  const [stickyNoteDate, setStickyNoteDate] = useState(new Date().toISOString().split('T')[0]);
  const [stickyItems, setStickyItems] = useState<{id: string, text: string, done: boolean}[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [loadingNote, setLoadingNote] = useState(false);
  const [isAddingStickyNote, setIsAddingStickyNote] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [incomingCall, setIncomingCall] = useState<{ from: string, callerName: string | null, timestamp: string } | null>(null);

  const handleSwitchRole = async (e: React.FormEvent) => {
    if (e) e.preventDefault();
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

  // Reset negligence script when drawer closes
  useEffect(() => {
    if (!liveNotesLead) {
      setIsNegligenceActive(false);
    }
  }, [liveNotesLead]);

  // Persist current work start
  useEffect(() => {
    if (workStartTime) {
      localStorage.setItem('currentWorkStart', workStartTime.toString());
    } else {
      localStorage.removeItem('currentWorkStart');
    }
  }, [workStartTime]);

  // Reset bulk selection on tab switch or secret panel toggle
  useEffect(() => {
    setSelectedLeadIds([]);
  }, [activeTab, showSecretPanel]);

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

  // === Confetti celebration ===
  const fireConfetti = useCallback(async () => {
    try {
      let confetti = (window as any).confetti;
      if (!confetti) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement('script');
          script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.9.3/dist/confetti.browser.min.js';
          script.onload = () => resolve();
          script.onerror = () => reject();
          document.head.appendChild(script);
        });
        confetti = (window as any).confetti;
      }
      if (!confetti) return;
      // Fire from both sides
      const defaults = { spread: 70, ticks: 100, gravity: 0.8, decay: 0.94, startVelocity: 30, colors: ['#FFD700', '#FFA500', '#FF6347', '#4CAF50', '#2196F3', '#9C27B0'] };
      confetti({ ...defaults, particleCount: 80, origin: { x: 0.3, y: 0.6 }, angle: 60 });
      confetti({ ...defaults, particleCount: 80, origin: { x: 0.7, y: 0.6 }, angle: 120 });
      setTimeout(() => {
        confetti({ ...defaults, particleCount: 50, origin: { x: 0.5, y: 0.4 }, spread: 120, startVelocity: 40, scalar: 1.2 });
      }, 250);
    } catch (e) { console.error('Confetti error:', e); }
  }, []);
  // Fetch daily sticky note
  const fetchNote = useCallback(async (date: string) => {
    setLoadingNote(true);
    try {
      const res = await fetch(`/api/notes?date=${date}`);
      const json = await res.json();
      if (json.success) setStickyItems(json.items || []);
    } catch (e) { console.error('Failed to fetch note', e); }
    setLoadingNote(false);
  }, []);

  // Save daily sticky note
  const saveNote = useCallback(async (date: string, items: {id: string, text: string, done: boolean}[]) => {
    try {
      await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, items })
      });
    } catch (e) { console.error('Failed to save note', e); }
  }, []);

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
    const stored = localStorage.getItem('agentPhone');
    if (stored) setAgentPhone(stored);
  }, []);

  // Scroll to top listener
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowScrollTop(true);
      } else {
        setShowScrollTop(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Scroll Lock for modal
  useEffect(() => {
    if (liveNotesLead || isDrawerOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'auto';
    }
    return () => { document.body.style.overflow = 'auto'; };
  }, [liveNotesLead, isDrawerOpen]);

  // Analytics Fetching
  const fetchAnalyticsData = async (timeframe: string = analyticsTimeframe) => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`/api/analytics?timeframe=${timeframe}`);
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

  const runAiAnalysis = async () => {
    setIsAiAnalyzing(true);
    setIsAiDrawerOpen(true);
    setAiAnalysis(null);
    setCheckedActionItems({});
    
    const statuses = [
      "סורק ומקבץ שיחות ולידים לתקופה...",
      "מנתח סיבות פסילה מובילות ומחשב אובדן פוטנציאל...",
      "סוקר יעילות שיחות וממוצעי מענה...",
      "מנסח המלצות ייעול ייעודיות לדיני עבודה וביטוחים...",
      "מתרגם אסטרטגיה לצ'קליסט משימות מעשי..."
    ];
    let statusIdx = 0;
    setLoadingAiStatus(statuses[0]);
    const statusInterval = setInterval(() => {
      statusIdx = (statusIdx + 1) % statuses.length;
      setLoadingAiStatus(statuses[statusIdx]);
    }, 2000);

    try {
      const res = await fetch(`/api/analytics/ai-analyze?timeframe=${analyticsTimeframe}`);
      const data = await res.json();
      if (data.success && data.analysis) {
        setAiAnalysis(data.analysis);
      } else {
        throw new Error(data.error || "שגיאה בטעינת ניתוח הבינה המלאכותית");
      }
    } catch (e: any) {
      console.error("AI Analysis fetch fail", e);
      setAiAnalysis({
        error: true,
        message: e.message || "נכשל הניתוח באמצעות בינה מלאכותית. אנא ודא שהמערכת מחוברת ושמפתח ה-API תקין."
      });
    } finally {
      clearInterval(statusInterval);
      setIsAiAnalyzing(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalyticsData(analyticsTimeframe);
      const timer = setInterval(() => setCurrentInsightIndex(p => (p + 1) % 3), 6000);
      return () => clearInterval(timer);
    }
  }, [activeTab, analyticsTimeframe]);

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
  
  // Track which leads were recently modified locally to prevent auto-refresh from overwriting
  const localModifiedRef = useRef<Map<string, number>>(new Map());
  const pendingUpdatesRef = useRef<Record<string, Partial<Lead>>>({});
  const leadUpdateTimeoutRef = useRef<Record<string, NodeJS.Timeout>>({});

  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) {
        const serverLeads: Lead[] = data.leads || [];
        // Smart merge: keep locally-modified leads for 10 seconds after edit
        setLeads(prev => {
          if (prev.length === 0) return serverLeads; // First load, take server data
          const now = Date.now();
          const merged = serverLeads.map(serverLead => {
            const lastModified = localModifiedRef.current.get(serverLead.id);
            if (lastModified && (now - lastModified) < 10000) {
              // This lead was edited locally within the last 10 seconds - keep local version
              const localLead = prev.find(l => l.id === serverLead.id);
              return localLead || serverLead;
            }
            return serverLead;
          });
          // Also keep any locally-added leads that aren't on the server yet
          const serverIds = new Set(serverLeads.map(l => l.id));
          const localOnly = prev.filter(l => !serverIds.has(l.id) && localModifiedRef.current.has(l.id));
          return [...localOnly, ...merged];
        });
        // Clean up old entries from the modified map
        const now = Date.now();
        localModifiedRef.current.forEach((time, id) => {
          if (now - time > 15000) localModifiedRef.current.delete(id);
        });
      }
    } catch (e) { 
      console.error("Leads fetch fail", e); 
    } finally { 
      setLoadingLeads(false); 
    }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>, immediate = false) => {
    // Only 'נגמר' triggers the disqualification survey now. 'לא רלוונטי' stays in CRM.
    if (updates.status === 'נגמר') {
        setPendingDisqualification({ id, action: 'fail', targetStatus: updates.status });
        return;
    }

    if (updates.status) {
      const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב'].includes(updates.status);
      if (isRelevant) {
        updates.wasRelevant = true;
      } else if (['חדש', 'לא ענה', 'לחזור אליו', 'מספר שגוי', 'לא רלוונטי'].includes(updates.status)) {
        updates.wasRelevant = false;
      }
      if (updates.status === 'חתם') {
        updates.isSigned = true;
        updates.signedAt = new Date().toISOString();
        // 🎉 Celebrate!
        fireConfetti();
      } else {
        updates.isSigned = false;
        updates.signedAt = null as any;
      }
      // Track status history
      const currentLead = leads.find(l => l.id === id);
      if (currentLead && currentLead.status !== updates.status) {
        const history = currentLead.statusHistory || [];
        updates.statusHistory = [...history, { from: currentLead.status, to: updates.status, timestamp: new Date().toISOString() }];
      }
    }
    
    // 1. Immediately update local states synchronously for 100% lag-free typing!
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    localModifiedRef.current.set(id, Date.now()); // Mark as locally modified
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    if (historyLead?.id === id) setHistoryLead(prev => prev ? { ...prev, ...updates } : null);

    // 2. Debounce the network fetch to avoid crashing/lagging under rapid inputs
    const debouncedFields = ['liveCallNotes', 'generalNotes', 'clientName', 'phone', 'salary', 'employmentStatus', 'medicalStatus'];
    const hasDebouncedField = Object.keys(updates).some(k => debouncedFields.includes(k));

    if (hasDebouncedField && !immediate) {
      if (leadUpdateTimeoutRef.current[id]) {
        clearTimeout(leadUpdateTimeoutRef.current[id]);
      }
      if (!pendingUpdatesRef.current[id]) {
        pendingUpdatesRef.current[id] = {};
      }
      Object.assign(pendingUpdatesRef.current[id], updates);

      leadUpdateTimeoutRef.current[id] = setTimeout(async () => {
        const aggregatedUpdates = pendingUpdatesRef.current[id];
        delete pendingUpdatesRef.current[id];
        delete leadUpdateTimeoutRef.current[id];
        try {
          await fetch('/api/leads/update', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id, ...aggregatedUpdates }) 
          });
        } catch (e) { 
          console.error("Failed to save debounced lead updates:", e); 
          fetchLeads(); 
        }
      }, 1000);
    } else {
      // Immediate save for status changes, signatures, payments, etc.
      if (leadUpdateTimeoutRef.current[id]) {
        clearTimeout(leadUpdateTimeoutRef.current[id]);
        delete leadUpdateTimeoutRef.current[id];
      }
      const pending = pendingUpdatesRef.current[id] || {};
      delete pendingUpdatesRef.current[id];

      try {
        await fetch('/api/leads/update', { 
          method: 'POST', 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify({ id, ...pending, ...updates }) 
        });
      } catch (e) { 
        console.error(e); 
        fetchLeads(); 
      }
    }
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
        const currentLead = leads.find(l => l.id === id);
        const isNotRelevantReason = ['אין עילה רפואית', 'אין מספיק מס הכנסה', 'טעות במספר'].includes(reason);
        const updates: Partial<Lead> = { 
          status: targetStatus, 
          disqualificationReason: reason,
          ...(isNotRelevantReason ? { wasRelevant: false } : {})
        };
        if (currentLead && currentLead.status !== targetStatus && targetStatus) {
            const history = currentLead.statusHistory || [];
            updates.statusHistory = [...history, { from: currentLead.status, to: targetStatus, timestamp: new Date().toISOString() }];
        }
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

  const toggleLeadSelection = (leadId: string) => {
    setSelectedLeadIds(prev => 
      prev.includes(leadId) ? prev.filter(id => id !== leadId) : [...prev, leadId]
    );
  };

  const handleSelectAllLeads = (currentLeadsList: Lead[]) => {
    const currentIds = currentLeadsList.map(l => l.id);
    const allSelected = currentIds.every(id => selectedLeadIds.includes(id));
    if (allSelected) {
      setSelectedLeadIds(prev => prev.filter(id => !currentIds.includes(id)));
    } else {
      setSelectedLeadIds(prev => Array.from(new Set([...prev, ...currentIds])));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedLeadIds.length === 0) return;
    if (!window.confirm(`האם אתה בטוח שברצונך למחוק ${selectedLeadIds.length} לידים מסומנים?`)) return;
    
    setLeads(prev => prev.filter(l => !selectedLeadIds.includes(l.id)));
    const idsToDelete = [...selectedLeadIds];
    setSelectedLeadIds([]);
    
    try {
      await Promise.all(
        idsToDelete.map(id => 
          fetch('/api/leads/delete', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id, reason: "Direct Bulk Deletion" }) 
          })
        )
      );
    } catch (e) { 
      console.error(e); 
      fetchLeads(); 
    }
  };

  const handleBulkMove = async (newStatus: string) => {
    if (selectedLeadIds.length === 0 || !newStatus) return;
    if (!window.confirm(`האם אתה בטוח שברצונך להעביר ${selectedLeadIds.length} לידים לסטטוס "${STATUS_CONFIG[newStatus]?.label || newStatus}"?`)) return;
    
    const idsToMove = [...selectedLeadIds];
    setSelectedLeadIds([]);
    
    setLeads(prev => prev.map(l => {
      if (!idsToMove.includes(l.id)) return l;
      
      const updates: Partial<Lead> = { status: newStatus };
      const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב'].includes(newStatus);
      if (isRelevant) {
        updates.wasRelevant = true;
      } else if (['חדש', 'לא ענה', 'לחזור אליו', 'מספר שגוי', 'לא רלוונטי'].includes(newStatus)) {
        updates.wasRelevant = false;
      }
      if (newStatus === 'חתם') {
        updates.isSigned = true;
        updates.signedAt = new Date().toISOString();
      } else {
        updates.isSigned = false;
        updates.signedAt = null as any;
      }
      
      const history = l.statusHistory || [];
      if (l.status !== newStatus) {
        updates.statusHistory = [...history, { from: l.status, to: newStatus, timestamp: new Date().toISOString() }];
      }
      
      return { ...l, ...updates };
    }));
    
    if (newStatus === 'חתם') {
      fireConfetti();
    }
    
    try {
      await Promise.all(
        idsToMove.map(async (id) => {
          localModifiedRef.current.set(id, Date.now());
          const l = leads.find(lead => lead.id === id);
          if (!l) return;
          
          const updates: Partial<Lead> = { status: newStatus };
          const isRelevant = ['גילי צריך לדבר איתו', 'מחכה לחתימה', 'חתם', 'רלוונטי - לעקוב'].includes(newStatus);
          if (isRelevant) {
            updates.wasRelevant = true;
          } else if (['חדש', 'לא ענה', 'לחזור אליו', 'מספר שגוי', 'לא רלוונטי'].includes(newStatus)) {
            updates.wasRelevant = false;
          }
          if (newStatus === 'חתם') {
            updates.isSigned = true;
            updates.signedAt = new Date().toISOString();
          } else {
            updates.isSigned = false;
            updates.signedAt = null as any;
          }
          if (l.status !== newStatus) {
            const history = l.statusHistory || [];
            updates.statusHistory = [...history, { from: l.status, to: newStatus, timestamp: new Date().toISOString() }];
          }
          
          return fetch('/api/leads/update', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ id, ...updates }) 
          });
        })
      );
    } catch (e) {
      console.error(e);
      fetchLeads();
    }
  };

  const initiateCall = async (lead: Lead) => {
    if (!lead.phone) return;
    
    // Background ping to warm up the Twilio conference bridge serverless function (prevent cold starts)
    fetch('/api/twilio/call/bridge?ping=true').catch(() => {});

    const newCount = (lead.callCount || 0) + 1;
    const updates: Partial<Lead> = { callCount: newCount };
    if (lead.status === 'חדש') {
      updates.status = 'ממתין לעדכון';
    }
    handleLeadUpdate(lead.id, updates);
    try {
      fetch('/api/twilio/call/initiate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to: lead.phone, agentPhone }) });
      setLiveNotesLead(lead);
    } catch (err) { console.error(err); }
  };

  const handleHangupCall = async () => {
    try {
      const res = await fetch('/api/twilio/call/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        alert("השיחה נותקה בהצלחה.");
      } else {
        alert("לא נמצאה שיחה פעילה לניתוק או שחלה שגיאה.");
      }
    } catch (err) {
      console.error("Hangup error:", err);
      alert("שגיאת תקשורת בניסיון לנתק שיחה.");
    }
  };

  const handleCloseLiveNotes = async () => {
    const currentLead = liveNotesLead;
    if (!currentLead) return;

    // 1. Get the absolute latest version of notes directly from the DOM before unmounting the modal
    const textarea = document.getElementById('live-call-notes-textarea') as HTMLTextAreaElement | null;
    const notesToAnalyze = textarea ? textarea.value : (currentLead.liveCallNotes || '');

    // 2. Immediately save notes updates to state & PostgreSQL database (bypassing debounce)
    await handleLeadUpdate(currentLead.id, { liveCallNotes: notesToAnalyze }, true);

    // 3. Set to null to unmount the modal
    setLiveNotesLead(null);

    // 4. Trigger AI analysis asynchronously
    if (notesToAnalyze && notesToAnalyze.trim()) {
      try {
        const res = await fetch('/api/leads/analyze-call', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: notesToAnalyze, id: currentLead.id })
        });
        const data = await res.json();
        if (data.success && data.data) {
          const { salary, employmentStatus, medicalStatus } = data.data;
          const updates = {
            salary: salary || currentLead.salary || "",
            employmentStatus: employmentStatus || currentLead.employmentStatus || "",
            medicalStatus: medicalStatus || currentLead.medicalStatus || ""
          };
          // Persist the extracted AI fields to local state & PostgreSQL immediately
          await handleLeadUpdate(currentLead.id, updates, true);
        }
      } catch (err) {
        console.error("Error analyzing live call notes on close:", err);
      }
    }
  };

  const handleManualAnalyzeCall = async () => {
    if (!liveNotesLead) return;
    const textarea = document.getElementById('live-call-notes-textarea') as HTMLTextAreaElement | null;
    const notesToAnalyze = textarea ? textarea.value : (liveNotesLead.liveCallNotes || '');
    if (!notesToAnalyze.trim()) return;

    // Save notes immediately first
    await handleLeadUpdate(liveNotesLead.id, { liveCallNotes: notesToAnalyze }, true);

    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/leads/analyze-call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: notesToAnalyze, id: liveNotesLead.id })
      });
      const data = await res.json();
      if (data.success && data.data) {
        const { salary, employmentStatus, medicalStatus } = data.data;
        const updates = {
          salary: salary || liveNotesLead.salary || "",
          employmentStatus: employmentStatus || liveNotesLead.employmentStatus || "",
          medicalStatus: medicalStatus || liveNotesLead.medicalStatus || ""
        };
        await handleLeadUpdate(liveNotesLead.id, updates, true);
      }
    } catch (err) {
      console.error("Error running manual AI analysis:", err);
    } finally {
      setIsAnalyzing(false);
    }
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

  // Polling for live incoming calls
  const dismissedCallTimestampRef = useRef<string | null>(null);

  useEffect(() => {
    const checkLiveCall = async () => {
      try {
        const res = await fetch('/api/twilio/live-call');
        const data = await res.json();
        if (data.success && data.activeCall) {
          const callTime = new Date(data.activeCall.timestamp).getTime();
          if (dismissedCallTimestampRef.current === data.activeCall.timestamp) {
            return;
          }
          if (Date.now() - callTime < 35000) {
            let callerName = null;
            if (data.activeCall.from) {
              const normalized = data.activeCall.from.replace(/\D/g, '').slice(-9);
              if (normalized && normalized.length >= 7) {
                const matchedLead = leads.find(l => l.phone && l.phone.replace(/\D/g, '').includes(normalized));
                if (matchedLead && matchedLead.clientName?.trim()) {
                  callerName = matchedLead.clientName.trim();
                }
              }
            }
            setIncomingCall({ ...data.activeCall, callerName });
          } else {
            setIncomingCall(null);
          }
        } else {
          setIncomingCall(null);
        }
      } catch (e) {
        // silently ignore polling errors
      }
    };

    checkLiveCall();
    const interval = setInterval(checkLiveCall, 3000);
    return () => clearInterval(interval);
  }, [leads]);

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
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const savedTheme = localStorage.getItem('theme');
    
    if (savedTheme === 'dark' || (!savedTheme && mediaQuery.matches)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }

    const handleChange = (e: MediaQueryListEvent) => {
      // Whenever the OS changes theme, we follow it and clear any manual override
      setDarkMode(e.matches);
      localStorage.removeItem('theme');
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    // Add class to temporarily disable transitions during theme change
    document.documentElement.classList.add('disable-transitions');
    
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
    
    // Force a reflow to make sure the style change is applied immediately
    const _ = window.getComputedStyle(document.documentElement).opacity;
    
    // Re-enable transitions in the next animation frame
    const raf = requestAnimationFrame(() => {
      document.documentElement.classList.remove('disable-transitions');
    });
    
    return () => cancelAnimationFrame(raf);
  }, [darkMode]);

  // === Pre-process image for OCR (normalize DPI/contrast for external monitors) ===
  const preprocessImageForOCR = useCallback((blob: File): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(blob); return; }

        // Upscale small images to at least 1200px wide for consistent OCR
        const MIN_WIDTH = 1200;
        const scale = img.width < MIN_WIDTH ? MIN_WIDTH / img.width : 1;
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);

        // Draw with smooth upscaling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        // Convert to high-contrast grayscale
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let j = 0; j < data.length; j += 4) {
          // Luminance-weighted grayscale
          const gray = data[j] * 0.299 + data[j + 1] * 0.587 + data[j + 2] * 0.114;
          // Boost contrast: push toward black or white
          const contrast = gray < 128 ? Math.max(0, gray * 0.6) : Math.min(255, gray * 1.2 + 30);
          data[j] = data[j + 1] = data[j + 2] = contrast;
        }
        ctx.putImageData(imageData, 0, 0);

        canvas.toBlob((processedBlob) => {
          resolve(processedBlob || blob);
        }, 'image/png');
      };
      img.onerror = () => resolve(blob); // Fallback to original on error
      img.src = URL.createObjectURL(blob);
    });
  }, []);

  // === Image Paste Handler (with DPI-normalized preprocessing) ===
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
                // Pre-process: normalize resolution & contrast for consistent OCR
                const processedBlob = await preprocessImageForOCR(blob);

                const Tesseract = (window as any).Tesseract || await new Promise<any>((resolve, reject) => {
                    if ((window as any).Tesseract) { resolve((window as any).Tesseract); return; }
                    const script = document.createElement('script');
                    script.src = 'https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';
                    script.onload = () => resolve((window as any).Tesseract);
                    script.onerror = () => reject(new Error('Failed to load Tesseract.js'));
                    document.head.appendChild(script);
                });
                const result = await Tesseract.recognize(processedBlob, 'heb+eng');
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
  }, [handleLeadUpdate, preprocessImageForOCR]);

  const getLeadByPhone = useCallback((phone: string) => {
    if (!phone) return null;
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 7) return null;
    const normalized = clean.slice(-9);
    return leads.find(l => l.phone && l.phone.replace(/\D/g, '').includes(normalized));
  }, [leads]);

  // Duplicate detection: build a map of leadId -> duplicate info
  const duplicateMap = useMemo(() => {
    const map = new Map<string, { lead: Lead, location: string, matchType: 'phone' | 'name' }>();
    const phoneGroups = new Map<string, Lead[]>();
    const nameGroups = new Map<string, Lead[]>();
    for (const l of leads) {
      if (l.phone) {
        const norm = l.phone.replace(/\D/g, '').slice(-9);
        if (norm.length >= 7) {
          if (!phoneGroups.has(norm)) phoneGroups.set(norm, []);
          phoneGroups.get(norm)!.push(l);
        }
      }
      if (l.clientName?.trim()) {
        const norm = l.clientName.trim().toLowerCase();
        if (norm.length >= 2) {
          if (!nameGroups.has(norm)) nameGroups.set(norm, []);
          nameGroups.get(norm)!.push(l);
        }
      }
    }
    for (const l of leads) {
      if (l.phone) {
        const norm = l.phone.replace(/\D/g, '').slice(-9);
        const group = phoneGroups.get(norm);
        if (group && group.length > 1) {
          const dup = group.find(g => g.id !== l.id)!;
          const loc = (dup.status === 'חתם' || dup.status === 'נגמר') ? 'archive' : dup.status === 'במעקב' ? 'followup' : 'crm';
          map.set(l.id, { lead: dup, location: loc, matchType: 'phone' });
          continue;
        }
      }
      if (l.clientName?.trim()) {
        const norm = l.clientName.trim().toLowerCase();
        const group = nameGroups.get(norm);
        if (group && group.length > 1) {
          const dup = group.find(g => g.id !== l.id)!;
          const loc = (dup.status === 'חתם' || dup.status === 'נגמר') ? 'archive' : dup.status === 'במעקב' ? 'followup' : 'crm';
          map.set(l.id, { lead: dup, location: loc, matchType: 'name' });
        }
      }
    }
    return map;
  }, [leads]);

  const navigateToDuplicate = useCallback((dupInfo: { lead: Lead, location: string }) => {
    const lead = dupInfo.lead;
    let location = 'crm';
    if (lead.status === 'חתם' || lead.status === 'נגמר') location = 'archive';
    else if (lead.status === 'במעקב') location = 'followup';
    else if (lead.status === 'לא ענה') location = 'noanswer';
    else if (lead.status === 'לחזור אליו') {
      const hist = lead.statusHistory || [];
      const lastEntry = [...hist].reverse().find(h => h.to === 'לחזור אליו');
      const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(lead.createdAt);
      if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 14) location = 'noanswer';
    }

    setActiveTab(location as any);
    setGlobalSearch('');
    setShowAdvancedStageOnly(false);
    setTimeout(() => {
      const el = document.getElementById(`lead-row-${lead.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 4px rgba(239, 68, 68, 0.5)';
        el.style.transition = 'box-shadow 0.3s';
        setTimeout(() => { el.style.boxShadow = ''; }, 3000);
      }
    }, 400);
  }, []);

  const navigateToLead = useCallback((lead: Lead) => {
    let location = 'crm';
    if (lead.status === 'חתם' || lead.status === 'נגמר') location = 'archive';
    else if (lead.status === 'במעקב') location = 'followup';
    else if (lead.status === 'לא ענה') {
      const hist = lead.statusHistory || [];
      const lastEntry = [...hist].reverse().find(h => h.to === 'לא ענה');
      const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(lead.createdAt);
      if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 7) {
        location = 'noanswer';
      } else {
        location = 'crm';
      }
    }
    else if (lead.status === 'לחזור אליו') {
      const hist = lead.statusHistory || [];
      const lastEntry = [...hist].reverse().find(h => h.to === 'לחזור אליו');
      const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(lead.createdAt);
      if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 14) location = 'noanswer';
    }
    
    setActiveTab(location as any);
    setGlobalSearch('');
    setShowAdvancedStageOnly(false);
    setTimeout(() => {
      const el = document.getElementById(`lead-row-${lead.id}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.style.boxShadow = '0 0 0 4px rgba(99, 102, 241, 0.5)';
        el.style.transition = 'box-shadow 0.3s';
        setTimeout(() => { el.style.boxShadow = ''; }, 3000);
      }
    }, 400);
  }, []);

  const crmLeads = useMemo(() => leads
    .filter(l => {
      if (globalSearch.trim()) return true;
      if (l.status === 'חתם' || l.status === 'נגמר' || l.status === 'במעקב') return false;
      // Hide "לא ענה" leads older than 7 days from main CRM
      if (l.status === 'לא ענה') {
        const hist = l.statusHistory || [];
        const lastEntry = [...hist].reverse().find(h => h.to === 'לא ענה');
        const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(l.createdAt);
        if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 7) return false;
      }
      // Hide "לחזור אליו" leads unchanged for > 14 days from main CRM
      if (l.status === 'לחזור אליו') {
        const hist = l.statusHistory || [];
        const lastEntry = [...hist].reverse().find(h => h.to === 'לחזור אליו');
        const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(l.createdAt);
        if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 14) return false;
      }
      return true;
    })
    .filter(l => {
      const q = globalSearch.toLowerCase().trim();
      if (!q) return true;
      const nameMatch = l.clientName?.toLowerCase().includes(q);
      const phoneMatch = l.phone?.includes(q);
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
    .filter(l => globalSearch.trim() ? true : l.status === 'במעקב')
    .filter(l => {
      const q = globalSearch.toLowerCase().trim();
      if (!q) return true;
      return l.clientName?.toLowerCase().includes(q) || l.phone?.includes(q);
    })
    .sort((a, b) => new Date(a.followUpDate || a.createdAt).getTime() - new Date(b.followUpDate || b.createdAt).getTime()), [leads, globalSearch]);

  const noAnswerLeads = useMemo(() => leads
    .filter(l => {
      if (globalSearch.trim()) return true;
      if (l.status === 'לא ענה') {
        const hist = l.statusHistory || [];
        const lastEntry = [...hist].reverse().find(h => h.to === 'לא ענה');
        const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(l.createdAt);
        return (Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 7;
      }
      if (l.status === 'לחזור אליו') {
        const hist = l.statusHistory || [];
        const lastEntry = [...hist].reverse().find(h => h.to === 'לחזור אליו');
        const entered = lastEntry ? new Date(lastEntry.timestamp) : new Date(l.createdAt);
        if ((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24) > 14) return true;
      }
      return false;
    })
    .filter(l => {
      const q = globalSearch.toLowerCase().trim();
      if (!q) return true;
      return l.clientName?.toLowerCase().includes(q) || l.phone?.includes(q);
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [leads, globalSearch]);

  const archiveLeads = useMemo(() => leads
    .filter(l => globalSearch.trim() ? true : (l.status === 'חתם' || l.status === 'נגמר'))
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
        
        const getArchiveTime = (l: Lead) => {
          if (l.status === 'חתם') {
            if (l.signedAt) return new Date(l.signedAt).getTime();
          }
          const hist = l.statusHistory || [];
          const entry = [...hist].reverse().find(h => h.to === l.status);
          if (entry) return new Date(entry.timestamp).getTime();
          return new Date(l.createdAt).getTime();
        };
        
        return getArchiveTime(b) - getArchiveTime(a);
    }), [leads, globalSearch]);

  const cardClass = "premium-glass rounded-3xl transition-all duration-300 hover:scale-[1.02] hover:shadow-xl dark:hover:shadow-indigo-500/10";

  const formatCallDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };

  const copyToClipboard = (text: string) => { navigator.clipboard.writeText(text); };

  const handleBannerClick = () => {
    if (!incomingCall) return;
    const cleanPhone = (p: string) => p ? p.replace(/[^0-9]/g, '') : '';
    const normalizedFrom = cleanPhone(incomingCall.from);
    if (!normalizedFrom) return;
    const targetLead = leads.find(l => {
      if (!l.phone) return false;
      const lp = cleanPhone(l.phone);
      return lp.length >= 7 && normalizedFrom.length >= 7 && (lp.endsWith(normalizedFrom) || normalizedFrom.endsWith(lp));
    });
    if (targetLead) {
      navigateToLead(targetLead);
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${darkMode ? 'dark text-slate-100 bg-mesh' : 'text-slate-900 bg-mesh'} relative overflow-x-hidden`} style={{ zoom: 0.85 }}>
      {/* Live Incoming Call Banner */}
      {incomingCall && (
        <div 
          onClick={handleBannerClick}
          className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] w-11/12 max-w-md bg-gradient-to-r from-emerald-600 to-teal-700 text-white px-6 py-4 rounded-3xl shadow-[0_20px_60px_rgba(16,185,129,0.4)] border-2 border-emerald-400/40 animate-in fade-in slide-in-from-top-6 duration-500 flex items-center gap-4 cursor-pointer hover:scale-105 active:scale-95 transition-all" 
          dir="rtl"
        >
          <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center animate-pulse flex-shrink-0">
            <PhoneCall className="w-6 h-6 text-white animate-bounce" />
          </div>
          <div className="flex flex-col flex-1 text-right">
            <span className="text-[10px] font-black tracking-widest bg-emerald-500/50 text-emerald-100 px-2.5 py-0.5 rounded-full w-max mb-1 uppercase">
              📞 שיחה נכנסת כעת
            </span>
            <span className="text-lg font-black leading-tight text-white">
              {incomingCall.callerName ? incomingCall.callerName : "לקוח חדש / לא מזוהה"}
            </span>
            <span className="text-xs font-mono font-bold text-emerald-100/90 mt-0.5" dir="ltr">
              {incomingCall.from}
            </span>
          </div>
          <button 
            onClick={(e) => {
              e.stopPropagation();
              if (incomingCall) {
                dismissedCallTimestampRef.current = incomingCall.timestamp;
              }
              setIncomingCall(null);
            }} 
            className="w-8 h-8 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>
      )}
      {/* Sidebar Drawer (Slides from Right) */}
      <div 
        className={`fixed inset-0 z-[100] transition-opacity duration-300 ${isDrawerOpen ? 'bg-slate-950/40 backdrop-blur-sm pointer-events-auto' : 'bg-transparent pointer-events-none opacity-0'}`}
        onClick={() => setIsDrawerOpen(false)}
      />
      <aside 
        className={`fixed top-0 right-0 h-full w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-l dark:border-slate-800 z-[110] shadow-2xl transition-transform duration-500 transform ${isDrawerOpen ? 'translate-x-0' : 'translate-x-[100%]'}`}
        dir="rtl"
      >
        <div className="p-8 flex flex-col h-full">
          <div className="mb-10 flex items-center justify-between">
            <div className="flex flex-col">
              <h3 className="text-2xl font-black text-indigo-600 dark:text-indigo-400">תפריט Sue-Chef</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">ניהול מתקדם</p>
            </div>
            <button onClick={() => setIsDrawerOpen(false)} className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-400 hover:text-red-500 transition-all shadow-sm">
               <X className="w-5 h-5" />
            </button>
          </div>

          <nav className="space-y-4">
            {[
              { id: 'analytics', label: 'אנליטיקה', icon: BarChart, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-900/10' },
              { id: 'tree', label: 'עץ החלטות', icon: Brain, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-900/10' },
              { id: 'settings', label: 'הגדרות', icon: Settings, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
              { id: 'lawyer', label: 'דשבורד עו"ד', icon: Briefcase, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-900/10', action: () => { setShowSwitchModal(true); setIsDrawerOpen(false); } },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  if (item.action) item.action();
                  else { setActiveTab(item.id as any); setIsDrawerOpen(false); }
                }}
                className={`w-full flex items-center gap-4 px-6 py-5 rounded-3xl font-black text-base transition-all duration-200 group hover:scale-[1.02] border border-transparent hover:border-slate-100 dark:hover:border-slate-800 ${
                  activeTab === item.id 
                    ? `${item.bg} ${item.color} shadow-[0_10px_30px_rgba(0,0,0,0.05)]` 
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/40 hover:text-indigo-600 dark:hover:text-indigo-400'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl ${item.bg} flex items-center justify-center transition-transform duration-200 group-hover:rotate-12`}>
                   <item.icon className={item.color} size={24} />
                </div>
                <span className="flex-1 text-right">{item.label}</span>
                <ChevronRight className={`w-5 h-5 transition-transform ${activeTab === item.id ? 'translate-x-1' : 'opacity-0'}`} />
              </button>
            ))}
          </nav>

          <div className="mt-auto pt-10 border-t dark:border-slate-800 flex items-center justify-between">
             <div className="flex flex-col">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Version</p>
                <p className="text-xs font-black text-indigo-500">v5.9.5-drawer</p>
             </div>
             <div className="flex gap-2">
                <button onClick={() => {
                  const nextVal = !darkMode;
                  setDarkMode(nextVal);
                  localStorage.setItem('theme', nextVal ? 'dark' : 'light');
                }} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all hover:bg-indigo-50 dark:hover:bg-indigo-900/20 text-indigo-500`}>
                  {darkMode ? <Sun size={18}/> : <Moon size={18}/>}
                </button>
                <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`w-10 h-10 border rounded-xl flex items-center justify-center transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500`}>
                   <RefreshCw size={18} className={(loadingLeads || loadingCalls) ? 'animate-spin' : ''}/>
                </button>
             </div>
          </div>
        </div>
      </aside>

      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10 opacity-100" dir="rtl">
        
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsDrawerOpen(true)}
              className="w-14 h-14 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border dark:border-slate-800 flex items-center justify-center hover:bg-indigo-50 dark:hover:bg-indigo-950/20 text-indigo-500 transition-all shadow-sm active:scale-95"
            >
              <Menu size={24} />
            </button>
            <div className="flex flex-col">
              <h1 onClick={handleTitleClick} className="text-4xl font-black tracking-tight text-gray-900 dark:text-slate-300 flex items-center gap-3 cursor-default select-none">
                Sue-Chef 
                <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest uppercase">v5.9.5</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium opacity-70">מערכת ניהול לידים מתקדמת</p>
            </div>
          </div>

          {/* Secret Profit Tracker Panel (Profit Only) */}
          {showSecretPanel && (
            <div className="flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-300 bg-white/40 dark:bg-slate-800/40 backdrop-blur-xl p-2 rounded-3xl border dark:border-white/5">
              <button onClick={() => { setWeekOffset(0); fetchWeeklyProfit(0); setShowWeeklyReport(true); }} className="h-12 px-6 rounded-2xl font-black text-sm bg-indigo-600 text-white shadow-lg shadow-indigo-500/20 flex items-center gap-2 hover:scale-105 transition-all">
                <TrendingUp size={16} /> רווח שבועי
              </button>
              <button onClick={() => setShowSecretPanel(false)} className="w-12 h-12 rounded-2xl bg-slate-200/50 dark:bg-slate-800/50 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 transition-all">
                <X size={20} />
              </button>
            </div>
          )}
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1 px-1 py-1 ${cardClass}`}>
              <div className="flex items-center gap-3 pl-3 pr-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                  <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">יתרת טוויליו</p>
                  <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700 mx-1"></div>
              <button onClick={() => { setShowStickyNote(!showStickyNote); if (!showStickyNote) { const today = new Date().toISOString().split('T')[0]; setStickyNoteDate(today); fetchNote(today); } }} className={`p-3 mr-1 transition-all active:scale-95 rounded-xl group ${showStickyNote ? 'bg-amber-100 dark:bg-amber-900/40 shadow-inner border border-amber-300 dark:border-amber-700' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`} title="פתק יומי">
                <StickyNote className={`w-5 h-5 ${showStickyNote ? 'text-amber-500' : 'text-gray-400 group-hover:text-amber-400'}`} />
              </button>
            </div>
            <button onClick={() => {
              const nextVal = !darkMode;
              setDarkMode(nextVal);
              localStorage.setItem('theme', nextVal ? 'dark' : 'light');
            }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6">
                <Sun className={`theme-toggle-icon absolute inset-0 w-6 h-6 text-yellow-500 transition-all duration-500 transform ${darkMode ? 'rotate-[360deg] scale-0 opacity-0' : 'rotate-0 scale-100 opacity-100'}`} />
                <Moon className={`theme-toggle-icon absolute inset-0 w-6 h-6 text-indigo-400 transition-all duration-500 transform ${darkMode ? 'rotate-0 scale-100 opacity-100' : '-rotate-[360deg] scale-0 opacity-0'}`} />
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

        {/* Tabs and Desktop Sticky Note Container */}
        <div className="relative flex justify-center items-start mb-10 w-full z-30">
          {/* Tabs - Centered */}
          <div className="hidden md:flex flex-wrap gap-2 p-2 w-fit rounded-[28px] bg-indigo-600 dark:bg-slate-900/50 dark:border dark:border-indigo-500/30 shadow-2xl shadow-indigo-500/20 dark:shadow-none overflow-hidden backdrop-blur-xl relative z-10">
            <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 blur-[80px] rounded-full translate-x-12 -translate-y-12" />
            {([{id: 'crm', label: 'טבלת מעקב', accent: 'text-indigo-700 dark:text-indigo-300'}, {id: 'calls', label: 'שיחות אחרונות', accent: 'text-amber-600 dark:text-amber-400'}, {id: 'archive', label: 'ארכיון', accent: 'text-rose-600 dark:text-rose-400'}] as const).map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`px-10 py-4 rounded-[22px] text-sm font-black transition-all relative group overflow-hidden z-10 ${activeTab === tab.id ? `bg-white dark:bg-slate-800 ${tab.accent} shadow-xl scale-105` : 'text-white/70 hover:text-white hover:bg-white/10 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-800/50'}`}>
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Desktop Sticky Note - Positioned Left */}
          {showStickyNote && (
            <div className="hidden md:block fixed left-8 top-48 w-80 2xl:w-96 origin-left animate-in fade-in zoom-in duration-200 z-50">
              <div className="bg-amber-100 dark:bg-amber-900/30 rounded-[20px] p-5 shadow-xl border-2 border-amber-200 dark:border-amber-700/50 relative" style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-12 h-5 bg-amber-300/60 dark:bg-amber-600/40 rounded-b-lg" />
                <div className="flex items-center justify-between mb-4">
                  {/* Swapped ChevronLeft and ChevronRight logic for RTL */}
                  <button onClick={() => { const d = new Date(stickyNoteDate); d.setDate(d.getDate() - 1); const prev = d.toISOString().split('T')[0]; const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); if (d >= cutoff) { setStickyNoteDate(prev); fetchNote(prev); } }} className="p-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-all"><ChevronRight className="w-4 h-4 text-amber-700 dark:text-amber-400" /></button>
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-2">
                    <StickyNote className="w-4 h-4" />
                    {stickyNoteDate === new Date().toISOString().split('T')[0] ? 'פתק להיום' : new Date(stickyNoteDate).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </h4>
                  <button onClick={() => { const d = new Date(stickyNoteDate); d.setDate(d.getDate() + 1); const next = d.toISOString().split('T')[0]; if (next <= new Date().toISOString().split('T')[0]) { setStickyNoteDate(next); fetchNote(next); } }} className="p-1.5 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-800/50 transition-all"><ChevronLeft className="w-4 h-4 text-amber-700 dark:text-amber-400" /></button>
                </div>
                {loadingNote ? <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-amber-500" /></div> : (
                  <>
                    <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                      {stickyItems.map(item => (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <button onClick={() => { const updated = stickyItems.map(i => i.id === item.id ? {...i, done: !i.done} : i); setStickyItems(updated); saveNote(stickyNoteDate, updated); }} className="flex-shrink-0">
                            {item.done ? <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Square className="w-4 h-4 text-amber-600 dark:text-amber-400" />}
                          </button>
                          <span className={`text-xs font-bold flex-1 ${item.done ? 'line-through text-amber-400 dark:text-amber-600' : 'text-amber-900 dark:text-amber-200'}`}>{item.text}</span>
                          <button onClick={() => { const updated = stickyItems.filter(i => i.id !== item.id); setStickyItems(updated); saveNote(stickyNoteDate, updated); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-3.5 h-3.5 text-amber-400 hover:text-red-500" /></button>
                        </div>
                      ))}
                    </div>
                    {stickyNoteDate === new Date().toISOString().split('T')[0] && (
                      isAddingStickyNote ? (
                        <form onSubmit={(e) => { e.preventDefault(); if (!newItemText.trim()) return; const updated = [...stickyItems, { id: Date.now().toString(), text: newItemText.trim(), done: false }]; setStickyItems(updated); saveNote(stickyNoteDate, updated); setNewItemText(''); setIsAddingStickyNote(false); }} className="flex gap-2">
                          <input autoFocus value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="הוסף משימה..." className="flex-1 bg-white/50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-xl px-3 py-1.5 text-xs font-bold outline-none focus:ring-2 focus:ring-amber-400/30 text-amber-900 dark:text-amber-200" />
                          <button type="submit" className="bg-amber-400 dark:bg-amber-600 text-white px-3 py-1.5 rounded-xl font-black text-xs hover:scale-105 active:scale-95 transition-all"><Plus className="w-3.5 h-3.5" /></button>
                          <button type="button" onClick={() => setIsAddingStickyNote(false)} className="px-2 text-amber-500 hover:bg-amber-200 rounded-xl"><X size={14}/></button>
                        </form>
                      ) : (
                        <button onClick={() => setIsAddingStickyNote(true)} className="w-full text-center py-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded-lg transition-colors border border-dashed border-amber-300 dark:border-amber-700">
                          + הוסף משימה
                        </button>
                      )
                    )}
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mobile: full modal */}
        {showStickyNote && (
          <div className="md:hidden fixed inset-0 z-[999] flex items-end justify-center bg-black/40 backdrop-blur-sm" onClick={() => setShowStickyNote(false)}>
            <div className="bg-amber-100 dark:bg-amber-950 w-full max-h-[70vh] rounded-t-[32px] p-6 shadow-2xl border-t-2 border-amber-200 dark:border-amber-700" onClick={e => e.stopPropagation()} style={{ fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
              <div className="w-12 h-1.5 bg-amber-300 dark:bg-amber-700 rounded-full mx-auto mb-4" />
              <div className="flex items-center justify-between mb-5">
                <button onClick={() => { const d = new Date(stickyNoteDate); d.setDate(d.getDate() - 1); const prev = d.toISOString().split('T')[0]; const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7); if (d >= cutoff) { setStickyNoteDate(prev); fetchNote(prev); } }} className="p-2 rounded-xl bg-amber-200 dark:bg-amber-800"><ChevronRight className="w-5 h-5 text-amber-700 dark:text-amber-300" /></button>
                <h4 className="text-lg font-black text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <StickyNote className="w-5 h-5" />
                  {stickyNoteDate === new Date().toISOString().split('T')[0] ? 'פתק להיום' : new Date(stickyNoteDate).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' })}
                </h4>
                <button onClick={() => { const d = new Date(stickyNoteDate); d.setDate(d.getDate() + 1); const next = d.toISOString().split('T')[0]; if (next <= new Date().toISOString().split('T')[0]) { setStickyNoteDate(next); fetchNote(next); } }} className="p-2 rounded-xl bg-amber-200 dark:bg-amber-800"><ChevronLeft className="w-5 h-5 text-amber-700 dark:text-amber-300" /></button>
              </div>
              {loadingNote ? <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-amber-500" /></div> : (
                <>
                  <div className="space-y-3 mb-4 max-h-[40vh] overflow-y-auto">
                    {stickyItems.map(item => (
                      <div key={item.id} className="flex items-center gap-3">
                        <button onClick={() => { const updated = stickyItems.map(i => i.id === item.id ? {...i, done: !i.done} : i); setStickyItems(updated); saveNote(stickyNoteDate, updated); }}>
                          {item.done ? <CheckSquare className="w-6 h-6 text-emerald-600" /> : <Square className="w-6 h-6 text-amber-600" />}
                        </button>
                        <span className={`text-base font-bold flex-1 ${item.done ? 'line-through text-amber-400' : 'text-amber-900 dark:text-amber-200'}`}>{item.text}</span>
                        <button onClick={() => { const updated = stickyItems.filter(i => i.id !== item.id); setStickyItems(updated); saveNote(stickyNoteDate, updated); }}><X className="w-5 h-5 text-amber-400 hover:text-red-500" /></button>
                      </div>
                    ))}
                  </div>
                  {stickyNoteDate === new Date().toISOString().split('T')[0] && (
                    isAddingStickyNote ? (
                      <form onSubmit={(e) => { e.preventDefault(); if (!newItemText.trim()) return; const updated = [...stickyItems, { id: Date.now().toString(), text: newItemText.trim(), done: false }]; setStickyItems(updated); saveNote(stickyNoteDate, updated); setNewItemText(''); setIsAddingStickyNote(false); }} className="flex gap-2 mt-2">
                        <input autoFocus value={newItemText} onChange={e => setNewItemText(e.target.value)} placeholder="הוסף משימה..." className="flex-1 bg-amber-50 dark:bg-amber-900/40 border border-amber-300 dark:border-amber-700 rounded-xl px-4 py-3 text-base font-bold outline-none placeholder:text-amber-300 text-amber-900 dark:text-amber-200" />
                        <button type="submit" className="bg-amber-400 dark:bg-amber-600 text-white px-4 py-3 rounded-xl font-black text-base"><Plus className="w-5 h-5" /></button>
                      </form>
                    ) : (
                      <button onClick={() => setIsAddingStickyNote(true)} className="w-full mt-2 text-center py-3 text-sm font-bold text-amber-600 dark:text-amber-400 hover:bg-amber-200/50 dark:hover:bg-amber-800/30 rounded-xl transition-colors border-2 border-dashed border-amber-300 dark:border-amber-700">
                        + הוסף משימה
                      </button>
                    )
                  )}
                </>
              )}
            </div>
          </div>
        )}

        {/* Search & Actions */}
        {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive' || activeTab === 'noanswer') && (
          <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-8 items-center">
            {/* ACTION BUTTONS (Placed RIGHT in RTL flex-row) */}
            <div className="flex gap-2 md:gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 custom-scrollbar justify-center md:justify-start">
              {activeTab !== 'archive' && (
                <div className="flex gap-2">
                  <button onClick={addNewLead} className="flex-shrink-0 bg-indigo-600 dark:bg-slate-900/40 dark:border dark:border-indigo-500/30 text-white px-4 md:px-8 py-3 md:py-4 rounded-[14px] md:rounded-2xl font-black shadow-lg shadow-indigo-500/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 md:gap-2 relative group overflow-hidden backdrop-blur-sm text-xs md:text-sm">
                    <Plus size={16} className="md:w-[20px] md:h-[20px] group-hover:rotate-90 transition-transform duration-300" /> <span className="hidden sm:inline">הוסף ליד</span><span className="sm:hidden">הוסף</span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                  {showSecretPanel && (
                    <button onClick={() => setShowImportModal(true)} className="flex-shrink-0 bg-emerald-600 dark:bg-slate-900/40 dark:border dark:border-emerald-500/30 text-white px-4 md:px-8 py-3 md:py-4 rounded-[14px] md:rounded-2xl font-black shadow-lg shadow-emerald-500/20 dark:shadow-none hover:scale-105 active:scale-95 transition-all flex items-center gap-1.5 md:gap-2 relative group overflow-hidden backdrop-blur-sm text-xs md:text-sm">
                      <Upload size={16} className="md:w-[20px] md:h-[20px] transition-transform duration-300" /> <span>ייבוא מ-CSV</span>
                      <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  )}
                </div>
              )}
              {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'noanswer') && (
                <>
                  <button onClick={() => setActiveTab(activeTab === 'followup' ? 'crm' : 'followup')} className={`flex-shrink-0 px-4 md:px-8 py-3 md:py-4 rounded-[14px] md:rounded-2xl font-black text-xs md:text-sm border flex items-center gap-1.5 md:gap-2 transition-all shadow-sm ${activeTab === 'followup' ? 'bg-amber-500 text-white border-amber-600 ring-4 ring-amber-500/10' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-amber-400'}`}>
                    <Clock size={14} className="md:w-[18px] md:h-[18px]" /> במעקב
                  </button>
                  <button onClick={() => setShowAdvancedStageOnly(!showAdvancedStageOnly)} className={`flex-shrink-0 px-4 md:px-8 py-3 md:py-4 rounded-[14px] md:rounded-2xl font-black text-xs md:text-sm border flex items-center gap-1.5 md:gap-2 transition-all shadow-sm ${showAdvancedStageOnly ? 'bg-emerald-600 text-white border-emerald-700 ring-4 ring-emerald-500/10' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-emerald-400'}`}>
                    <Zap size={14} className="md:w-[18px] md:h-[18px]" /> שלב מתקדם
                  </button>
                  <button onClick={() => setActiveTab(activeTab === 'noanswer' ? 'crm' : 'noanswer')} className={`flex-shrink-0 px-4 md:px-8 py-3 md:py-4 rounded-[14px] md:rounded-2xl font-black text-xs md:text-sm border flex items-center gap-1.5 md:gap-2 transition-all shadow-sm ${activeTab === 'noanswer' ? 'bg-gray-700 text-white border-gray-800 ring-4 ring-gray-500/10' : 'bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:border-gray-400'}`}>
                    <PhoneOff size={14} className="md:w-[18px] md:h-[18px]" /> לא ענו ({noAnswerLeads.length})
                  </button>
                </>
              )}
            </div>

            <div className="relative flex-1 group">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
              <input type="text" placeholder="חיפוש לפי שם או טלפון..." value={globalSearch} onChange={e => setGlobalSearch(e.target.value)} className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl pr-14 pl-12 py-4 outline-none font-bold shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all font-assistant text-slate-900 dark:text-white" />
              {globalSearch && (
                <button onClick={() => setGlobalSearch('')} className="absolute left-4 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-red-100 hover:text-red-500 dark:hover:bg-red-900/30 transition-all">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Content Area */}
        <div className="bg-white dark:bg-slate-900 rounded-[32px] shadow-sm border dark:border-slate-800 overflow-hidden min-h-[500px]">
          {(activeTab === 'crm' || activeTab === 'followup' || activeTab === 'archive' || activeTab === 'noanswer') && (
            <>
              {/* Bulk Actions Panel */}
              {showSecretPanel && selectedLeadIds.length > 0 && (
                <div className="bg-indigo-50/70 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 px-8 py-5 flex items-center justify-between gap-4 animate-in slide-in-from-top duration-300" dir="rtl">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-black text-sm shadow-sm">{selectedLeadIds.length}</div>
                    <span className="font-black text-slate-700 dark:text-slate-200 text-sm">לידים נבחרו לפעולה קבוצתית:</span>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Bulk Status Move Selector */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">העבר סטטוס:</span>
                      <select 
                        onChange={(e) => {
                          if (e.target.value) {
                            handleBulkMove(e.target.value);
                            e.target.value = ''; // Reset dropdown
                          }
                        }}
                        className="text-xs font-black rounded-xl px-4 py-2.5 outline-none border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 cursor-pointer shadow-sm focus:ring-4 focus:ring-indigo-500/10 transition-all"
                        defaultValue=""
                      >
                        <option value="" disabled>בחר סטטוס...</option>
                        {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                          <option key={k} value={k}>{v.label}</option>
                        ))}
                      </select>
                    </div>

                    <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />

                    {/* Bulk Delete Button */}
                    <button 
                      onClick={handleBulkDelete}
                      className="px-5 py-2.5 bg-red-500 hover:bg-red-600 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-sm shadow-red-500/10 transition-all hover:scale-105 active:scale-95"
                    >
                      <Trash2 className="w-4 h-4" /> מחק {selectedLeadIds.length} לידים
                    </button>
                  </div>
                </div>
              )}

              <div className="overflow-x-auto md:overflow-visible">
              <table className="hidden md:table w-full text-sm text-right border-collapse">
                <thead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-indigo-500/10">
                  <tr>
                    {showSecretPanel && (
                      <th className="px-4 py-6 font-bold w-12 text-center">
                        <input 
                          type="checkbox" 
                          checked={
                            (() => {
                              const list = activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : activeTab === 'noanswer' ? noAnswerLeads : archiveLeads;
                              return list.length > 0 && list.every(l => selectedLeadIds.includes(l.id));
                            })()
                          }
                          onChange={() => handleSelectAllLeads(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : activeTab === 'noanswer' ? noAnswerLeads : archiveLeads)}
                          className="w-4.5 h-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-900 dark:border-slate-700"
                        />
                      </th>
                    )}
                    <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[300px]">פרטי ליד וחיוג</th>
                  <th className="px-2 py-6 font-bold w-12 text-center"></th>
                  <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[180px]">סטטוס טיפול</th>
                  <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[220px]">הערות ומעקב</th>
                  <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">מסך שיחה</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-indigo-500/5 opacity-100">
                {(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : activeTab === 'noanswer' ? noAnswerLeads : archiveLeads).map((lead, idx) => (
                  <tr 
                    key={lead.id}
                    id={`lead-row-${lead.id}`}
                    className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                    style={{ animationDelay: `${idx * 50}ms`, transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                  >
                    {showSecretPanel && (
                      <td className="px-4 py-5 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedLeadIds.includes(lead.id)}
                          onChange={() => toggleLeadSelection(lead.id)}
                          className="w-4.5 h-4.5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-900 dark:border-slate-700"
                        />
                      </td>
                    )}
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
                              <div className="flex items-center gap-2">
                                {lead.isStarred && (
                                  <Star size={18} className="text-amber-500 fill-amber-500 animate-in zoom-in duration-300 flex-shrink-0" />
                                )}
                                <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors flex-1" placeholder="שם הלקוח..." />
                                {duplicateMap.has(lead.id) && (
                                  <div className="flex flex-col items-center gap-0.5">
                                    <button 
                                      onClick={() => navigateToDuplicate(duplicateMap.get(lead.id)!)} 
                                      className={`flex-shrink-0 hover:scale-125 transition-all animate-pulse ${duplicateMap.get(lead.id)!.matchType === 'name' ? 'text-blue-500 hover:text-blue-600' : 'text-red-500 hover:text-red-600'}`} 
                                      title={`ליד כפול לפי ${duplicateMap.get(lead.id)!.matchType === 'name' ? 'שם' : 'מספר טלפון'}! (${duplicateMap.get(lead.id)!.lead.clientName || duplicateMap.get(lead.id)!.lead.phone})`}
                                    >
                                      <Star size={18} fill="currentColor" />
                                    </button>
                                    {duplicateMap.get(lead.id)!.matchType === 'phone' && (
                                      <span className="text-[10px] font-black px-1.5 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20 whitespace-nowrap leading-none select-none">
                                        {duplicateMap.get(lead.id)!.lead.status}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                              <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-medium text-slate-400 bg-transparent outline-none text-sm group-focus-within:text-slate-500" placeholder="05..." dir="ltr" />
                              {lead.campaign && (
                                <span className="text-[13px] font-black mt-1 inline-block">
                                  <span className="text-indigo-600 dark:text-indigo-400">קמפיין: </span>
                                  <span className="text-slate-800 dark:text-slate-200">{lead.campaign}</span>
                                </span>
                              )}
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
                                  const isNotRelevant = lead.status === 'לא רלוונטי';
                                  const msgText = isNotRelevant 
                                    ? "היי, זה יונתן ממשרד עו\"ד HBA, דיברנו קודם. בדקתי, ולצערי לא נוכל לעזור. רק בריאות 🙏"
                                    : `היי ${firstName}, קוראים לי יונתן אני ממשרד עורכי הדין HBA, השארת אצלנו פרטים בנוגע לזכויות רפואיות וניסיתי לחזור אלייך. אשמח אם נוכל לדבר כשיתאפשר`;
                                  const msg = encodeURIComponent(msgText);
                                  window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                  setOpenMenuId(null);
                                }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600 transition-colors"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                                <button onClick={() => { copyToClipboard(lead.phone || ''); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors text-slate-700 dark:text-slate-300"><Copy className="w-4 h-4" /> העתק מספר</button>
                                <button onClick={() => {
                                  handleLeadUpdate(lead.id, { isStarred: !lead.isStarred });
                                  setOpenMenuId(null);
                                }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-amber-50 dark:hover:bg-amber-950/20 text-amber-500 transition-colors">
                                  <Star className={`w-4 h-4 ${lead.isStarred ? 'fill-amber-500' : ''}`} /> 
                                  {lead.isStarred ? 'הסר כוכב' : 'סמן בכוכב'}
                                </button>
                                <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                <button onClick={() => { deleteLeadDirectly(lead.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/10 text-red-600 transition-colors"><Trash2 className="w-4 h-4" /> מחק ליד</button>
                              </div>
                            </>
                          )}
                       </div>
                    </td>
                    <td className="px-6 py-5">
                      <div className="relative group/select">
                        <button
                          onClick={() => setActiveStatusDropdownLeadId(activeStatusDropdownLeadId === lead.id ? null : lead.id)}
                          className={`text-[11px] font-bold font-assistant rounded-2xl px-4 py-3 outline-none border transition-all cursor-pointer w-full flex items-center justify-between shadow-sm ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border} group-hover/select:shadow-indigo-500/10`}
                        >
                          <span className="truncate">{STATUS_CONFIG[lead.status]?.label || lead.status}</span>
                          <ChevronDown size={14} className="opacity-70 flex-shrink-0" />
                        </button>
                        
                        {activeStatusDropdownLeadId === lead.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setActiveStatusDropdownLeadId(null)} />
                            <div className="absolute right-0 left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                                <button
                                  key={k}
                                  onClick={() => {
                                    handleLeadUpdate(lead.id, { status: k });
                                    setActiveStatusDropdownLeadId(null);
                                  }}
                                  className={`w-full text-right px-4 py-2 text-xs font-bold font-assistant transition-colors flex items-center gap-2.5
                                    ${lead.status === k 
                                      ? 'bg-indigo-600 text-white' 
                                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                                >
                                  <span>{v.label}</span>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                       {activeTab === 'archive' && lead.status === 'חתם' && (
                         <div className="mt-3 flex flex-col items-center gap-2">
                           <div className="flex items-center gap-4 text-[11px] font-bold">
                             <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-800/40">
                               <Calendar className="w-3.5 h-3.5" /> חתימה: {lead.signedAt ? formatDate(lead.signedAt) : 'לא צוין'}
                             </span>
                             {lead.isPaid && lead.paidAt && (
                               <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                                 <DollarSign className="w-3.5 h-3.5" /> תשלום: {formatDate(lead.paidAt)}
                               </span>
                             )}
                           </div>
                           <button
                             onClick={() => handleLeadUpdate(lead.id, { isPaid: !lead.isPaid, paidAt: !lead.isPaid ? new Date().toISOString() : undefined })}
                             className={`inline-flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                               lead.isPaid
                                 ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20 hover:bg-emerald-600'
                                 : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                             }`}
                           >
                             {lead.isPaid ? <><Check className="w-4 h-4" /> שולם</> : <><DollarSign className="w-4 h-4" /> סמן כשולם</>}
                           </button>
                         </div>
                       )}
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

            {/* Mobile Cards View */}
            <div className="md:hidden flex flex-col gap-4 p-4 overflow-y-auto pb-6">
              {(activeTab === 'crm' ? crmLeads : activeTab === 'followup' ? followupLeads : activeTab === 'noanswer' ? noAnswerLeads : archiveLeads).map((lead) => (
                <div key={`mob-${lead.id}`} id={`lead-row-${lead.id}`} className="bg-slate-50 dark:bg-slate-800/80 rounded-[32px] p-5 shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col gap-5 relative">
                  
                  {/* Bulk Select Checkbox (when developer panel is active) */}
                  {showSecretPanel && (
                    <div className="absolute top-4 right-4 z-10 flex items-center">
                      <input 
                        type="checkbox" 
                        checked={selectedLeadIds.includes(lead.id)}
                        onChange={() => toggleLeadSelection(lead.id)}
                        className="w-5 h-5 rounded-lg border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer dark:bg-slate-900 dark:border-slate-700"
                      />
                    </div>
                  )}

                  {/* Menu Button */}
                  <div className="absolute top-4 left-4 z-10">
                    <button onClick={() => setOpenMenuId(openMenuId === lead.id ? null : lead.id)} className="p-2 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all shadow-sm bg-white/50"><MoreVertical className="w-5 h-5 text-slate-500" /></button>
                    {openMenuId === lead.id && (
                      <>
                        <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
                        <div className="absolute left-0 mt-2 w-48 bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl shadow-2xl z-30 overflow-hidden" dir="rtl">
                          <button onClick={() => {
                            const phone = lead.phone?.replace(/^0/, '972');
                            const firstName = lead.clientName?.split(' ')[0] || 'לקוח';
                            const isNotRelevant = lead.status === 'לא רלוונטי';
                            const msgText = isNotRelevant 
                              ? "היי, זה יונתן ממשרד עו\"ד HBA, דיברנו קודם. בדקתי, ולצערי לא נוכל לעזור. רק בריאות 🙏"
                              : `היי ${firstName}, קוראים לי יונתן אני ממשרד עורכי הדין HBA, השארת אצלנו פרטים בנוגע לזכויות רפואיות וניסיתי לחזור אלייך. אשמח אם נוכל לדבר כשיתאפשר`;
                            const msg = encodeURIComponent(msgText);
                            window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                            setOpenMenuId(null);
                          }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 text-emerald-600 hover:bg-emerald-50"><MessageSquare className="w-4 h-4" /> שלח הודעה</button>
                          <button onClick={() => { copyToClipboard(lead.phone || ''); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 text-slate-700 dark:text-slate-300 hover:bg-slate-100"><Copy className="w-4 h-4" /> העתק מספר</button>
                          <button onClick={() => {
                            handleLeadUpdate(lead.id, { isStarred: !lead.isStarred });
                            setOpenMenuId(null);
                          }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/20 transition-colors">
                            <Star className={`w-4 h-4 ${lead.isStarred ? 'fill-amber-500' : ''}`} /> 
                            {lead.isStarred ? 'הסר כוכב' : 'סמן בכוכב'}
                          </button>
                          <div className="h-px bg-slate-100 dark:bg-slate-800" />
                          <button onClick={() => { deleteLeadDirectly(lead.id); setOpenMenuId(null); }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 text-red-600 hover:bg-red-50"><Trash2 className="w-4 h-4" /> מחק ליד</button>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Top: Name & Phone & Call */}
                  <div className="flex items-center gap-4 pl-12" onPaste={(e) => handlePaste(e, lead.id)}>
                    <button onClick={() => initiateCall(lead)} className="flex-shrink-0 flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-lg active:scale-95 transition-all"><Phone className="w-6 h-6" /></button>
                    <div className="flex flex-col flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {lead.isStarred && (
                          <Star size={16} className="text-amber-500 fill-amber-500 animate-in zoom-in duration-300 flex-shrink-0" />
                        )}
                        <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 flex-1 min-w-0 truncate" placeholder="שם הלקוח..." />
                        {duplicateMap.has(lead.id) && (
                          <div className="flex flex-col items-center gap-0.5">
                            <button 
                              onClick={() => navigateToDuplicate(duplicateMap.get(lead.id)!)} 
                              className={`flex-shrink-0 hover:scale-125 transition-all animate-pulse ${duplicateMap.get(lead.id)!.matchType === 'name' ? 'text-blue-500 hover:text-blue-600' : 'text-red-500 hover:text-red-600'}`} 
                              title={`ליד כפול לפי ${duplicateMap.get(lead.id)!.matchType === 'name' ? 'שם' : 'מספר טלפון'}! (${duplicateMap.get(lead.id)!.lead.clientName || duplicateMap.get(lead.id)!.lead.phone})`}
                            >
                              <Star size={16} fill="currentColor" />
                            </button>
                            {duplicateMap.get(lead.id)!.matchType === 'phone' && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-50 dark:bg-red-950/30 text-red-500 dark:text-red-400 border border-red-100 dark:border-red-900/20 whitespace-nowrap leading-none select-none">
                                {duplicateMap.get(lead.id)!.lead.status}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono text-slate-500 bg-transparent outline-none text-base w-full text-right" placeholder="05..." dir="ltr" style={{ direction: 'rtl', textAlign: 'right' }} />
                      {lead.campaign && (
                        <span className="text-[13px] font-black mt-1 block text-right">
                          <span className="text-indigo-600 dark:text-indigo-400">קמפיין: </span>
                          <span className="text-slate-800 dark:text-slate-200">{lead.campaign}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle: Notes */}
                  <textarea 
                    value={lead.generalNotes || ''} 
                    onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                    className="w-full text-sm font-bold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 h-24 resize-none outline-none focus:ring-4 focus:ring-indigo-500/10 shadow-inner" 
                    placeholder="הערות למעקב..." 
                  />

                  {/* Bottom: Status & Modals */}
                  <div className="flex flex-col gap-3">
                    <div className="relative group/select w-full">
                      <button
                        onClick={() => setActiveStatusDropdownLeadId(activeStatusDropdownLeadId === lead.id ? null : lead.id)}
                        className={`text-sm font-bold font-assistant rounded-xl px-4 py-3 outline-none border transition-all cursor-pointer w-full flex items-center justify-between shadow-sm ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}
                      >
                        <span className="truncate">{STATUS_CONFIG[lead.status]?.label || lead.status}</span>
                        <ChevronDown size={18} className="opacity-70 flex-shrink-0" />
                      </button>
                      
                      {activeStatusDropdownLeadId === lead.id && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setActiveStatusDropdownLeadId(null)} />
                          <div className="absolute right-0 left-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                              <button
                                key={k}
                                onClick={() => {
                                  handleLeadUpdate(lead.id, { status: k });
                                  setActiveStatusDropdownLeadId(null);
                                }}
                                className={`w-full text-right px-4 py-2.5 text-sm font-bold font-assistant transition-colors flex items-center gap-2.5
                                  ${lead.status === k 
                                    ? 'bg-indigo-600 text-white' 
                                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}`}
                              >
                                <span>{v.label}</span>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    
                    <div className="flex gap-2">
                       <button onClick={() => setLiveNotesLead(lead)} className="flex-1 inline-flex justify-center items-center gap-2 text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/30 px-4 py-3.5 rounded-xl active:scale-95 transition-all outline-none border border-indigo-200 dark:border-indigo-800"><Maximize2 className="w-4 h-4" /> פתח תיק נתונים</button>
                       <button onClick={() => setHistoryLead(lead)} className="inline-flex justify-center items-center text-xs font-black text-amber-700 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/30 px-5 py-3.5 rounded-xl active:scale-95 transition-all outline-none border border-amber-200 dark:border-amber-800"><History className="w-4 h-4" /></button>
                    </div>
                  </div>

                  {activeTab === 'archive' && lead.status === 'חתם' && (
                    <div className="flex flex-col gap-2 mt-2">
                      <div className="flex flex-wrap gap-2 justify-center">
                        <span className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-xl border border-amber-100 dark:border-amber-800/40">
                          <Calendar className="w-3.5 h-3.5" /> חתימה: {lead.signedAt ? formatDate(lead.signedAt) : 'לא צוין'}
                        </span>
                        {lead.isPaid && lead.paidAt && (
                          <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1.5 rounded-xl border border-emerald-100 dark:border-emerald-800/40">
                            <DollarSign className="w-3.5 h-3.5" /> תשלום: {formatDate(lead.paidAt)}
                          </span>
                        )}
                      </div>
                      <button
                        onClick={() => handleLeadUpdate(lead.id, { isPaid: !lead.isPaid, paidAt: !lead.isPaid ? new Date().toISOString() : undefined })}
                        className={`w-full inline-flex justify-center items-center gap-2 text-sm font-black px-5 py-3.5 rounded-2xl border transition-all active:scale-95 shadow-sm ${
                          lead.isPaid
                            ? 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20 hover:bg-emerald-600'
                            : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:text-emerald-600 dark:hover:text-emerald-400'
                        }`}
                      >
                        {lead.isPaid ? <><Check className="w-4 h-4" /> שולם</> : <><DollarSign className="w-4 h-4" /> סמן כשולם</>}
                      </button>
                    </div>
                  )}

                  {activeTab === 'archive' && lead.status === 'נגמר' && lead.disqualificationReason && (
                    <div className="text-xs font-bold text-red-500 bg-red-50 px-3 py-2 rounded-xl mt-1 text-center">
                      ❌ {lead.disqualificationReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
            </div>
            </>
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
                        <div 
                          className={lead ? "cursor-pointer hover:opacity-80 transition-opacity" : ""} 
                          onClick={() => { if (lead) navigateToLead(lead); }}
                          title={lead ? "לחץ למעבר לליד" : ""}
                        >
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
            <div className="p-4 md:p-10 space-y-10 min-h-[500px]">
               {/* Timeframe Selector & Title Row */}
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md p-6 rounded-[32px] border dark:border-slate-800/80 shadow-sm">
                 <div>
                   <h3 className="text-2xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">📊 אנליטיקה וביצועי משרד</h3>
                   <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1">מדדים סטטיסטיים מתקדמים לחילוץ וזיהוי מגמות</p>
                 </div>
                 
                 <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                   <div className="flex flex-wrap items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900/60 border dark:border-slate-800 rounded-2xl shadow-inner">
                     {[
                       { id: 'lifetime', label: 'כל הזמן', icon: History },
                       { id: '30days', label: '30 ימים אחרונים', icon: Calendar },
                       { id: 'currentMonth', label: 'החודש הנוכחי', icon: Clock },
                       { id: '7days', label: '7 ימים אחרונים', icon: Zap }
                     ].map(tf => {
                       const Icon = tf.icon;
                       const active = analyticsTimeframe === tf.id;
                       return (
                         <button
                           key={tf.id}
                           onClick={() => setAnalyticsTimeframe(tf.id as any)}
                           className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all active:scale-95 ${
                             active
                               ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                               : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800/40 hover:text-slate-800 dark:hover:text-slate-200'
                           }`}
                         >
                           <Icon size={14} />
                           {tf.label}
                         </button>
                       );
                     })}
                   </div>

                   <button
                     onClick={runAiAnalysis}
                     className="flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-black transition-all active:scale-95 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-indigo-500/20 border border-indigo-500/30 hover:shadow-indigo-500/40 cursor-pointer"
                   >
                     <Sparkles size={14} className="animate-pulse" />
                     נתח באמצעות בינה מלאכותית
                   </button>
                 </div>
               </div>

               {loadingAnalytics ? (
                 <div className="flex flex-col items-center justify-center h-96 gap-6">
                   <Loader2 className="animate-spin text-indigo-500" size={64} />
                   <p className="font-black text-slate-400 text-xl animate-pulse tracking-wide">מחשב מדדים דטרמיניסטיים...</p>
                 </div>
               ) : analyticsData ? (
                 <>
                   {/* 5 KPI Grid */}
                   <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
                     {[
                       { icon: Users, label: 'סה"כ לידים', value: analyticsData.funnel?.total || 0, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50/50 dark:bg-indigo-950/20', border: 'border-indigo-100/80 dark:border-indigo-900/30' },
                       { icon: TrendingUp, label: 'איכות הלידים (רלוונטיות)', value: analyticsData.insights?.leadQualityRatio || 0, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50/50 dark:bg-purple-950/20', border: 'border-purple-100/80 dark:border-purple-900/30', isPercent: true },
                       { 
                         icon: Star, 
                         label: 'יחס סגירה מרלוונטיים', 
                         value: analyticsData.funnel?.relevant > 0 ? Math.round((analyticsData.funnel.signed / analyticsData.funnel.relevant) * 100) : 0, 
                         color: 'text-blue-600 dark:text-blue-400', 
                         bg: 'bg-blue-50/50 dark:bg-blue-950/20', 
                         border: 'border-blue-100/80 dark:border-blue-900/30', 
                         isPercent: true,
                         sub: 'יעילות המכירה מתוך בעלי עילה'
                       },
                       { 
                         icon: CheckCircle, 
                         label: 'חתימות', 
                         value: analyticsData.funnel?.signed || 0, 
                         color: 'text-emerald-600 dark:text-emerald-400', 
                         bg: 'bg-emerald-50/50 dark:bg-emerald-950/20', 
                         border: 'border-emerald-100/80 dark:border-emerald-900/30', 
                         sub: `${analyticsData.funnel?.total > 0 ? ((analyticsData.funnel.signed / analyticsData.funnel.total)*100).toFixed(1) : 0}% המרה כוללת` 
                       },
                       { icon: Zap, label: 'ממוצע שיחות לסגירה', value: analyticsData.insights?.avgCallsPerSigned || 0, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50/50 dark:bg-amber-950/20', border: 'border-amber-100/80 dark:border-amber-900/30' }
                     ].map((kpi, idx) => (
                       <div key={idx} className={`${kpi.bg} p-6 rounded-3xl border ${kpi.border} transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl`}>
                          <kpi.icon className={kpi.color + " mb-4"} size={26} />
                          <p className="text-[9px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-wider mb-1.5">{kpi.label}</p>
                          <p className={`text-4xl font-black ${kpi.color}`}><SimpleCountUp value={kpi.value || 0} suffix={kpi.isPercent ? "%" : ""} /></p>
                          {kpi.sub && <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-3 flex items-center gap-1"><ArrowUpRight size={12} /> {kpi.sub}</p>}
                       </div>
                     ))}
                   </div>

                   {/* Funnel & Relevance Progress Ring */}
                   {/* Charts Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
                      <InteractiveSVGChart
                        data={analyticsData.leadsTimeSeries || []}
                        title="גרף כניסת לידים למערכת"
                        type="line"
                        color="indigo"
                        yLabel="לידים חדשים"
                      />
                      <InteractiveSVGChart
                        data={analyticsData.signaturesTimeSeries || []}
                        title="גרף חתימות לקוחות (הסכמי ייצוג)"
                        type="bar"
                        color="emerald"
                        yLabel="חתימות"
                      />
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-12">
                     {/* Left: Progress Ring */}
                     <div className="bg-slate-100/30 dark:bg-slate-800/20 p-8 rounded-3xl md:rounded-[48px] border dark:border-slate-800 shadow-inner flex flex-col items-center justify-center text-center relative overflow-hidden group min-h-[350px]">
                       <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500/5 blur-[50px] rounded-full translate-x-10 -translate-y-10" />
                       <h4 className="text-base font-black mb-6 text-slate-800 dark:text-slate-200">איכות הלידים בטווח הנבחר</h4>
                       <div className="relative flex items-center justify-center mb-6">
                         <svg className="w-44 h-44 transform -rotate-90">
                           <circle
                             cx="88"
                             cy="88"
                             r="70"
                             className="text-slate-200 dark:text-slate-800/60"
                             strokeWidth="12"
                             stroke="currentColor"
                             fill="transparent"
                           />
                           <circle
                             cx="88"
                             cy="88"
                             r="70"
                             className="text-indigo-600 dark:text-indigo-500 transition-all duration-[1500ms] ease-out"
                             strokeWidth="12"
                             strokeDasharray={439.8}
                             strokeDashoffset={439.8 - ((analyticsData.insights?.leadQualityRatio || 0) / 100) * 439.8}
                             strokeLinecap="round"
                             stroke="currentColor"
                             fill="transparent"
                           />
                         </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                           <span className="text-4xl font-black text-slate-800 dark:text-white">{analyticsData.insights?.leadQualityRatio || 0}%</span>
                           <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">רלוונטיות לתקופה</span>
                         </div>
                       </div>
                       <p className="text-xs font-bold text-slate-500 dark:text-slate-400 max-w-xs leading-relaxed">
                         {analyticsData.insights?.leadQualityRatio >= 35 
                           ? 'איכות הלידים שלכם מעולה! מרבית הלידים שעונים לשיחה אכן בעלי עילה משפטית רלוונטית.' 
                           : 'איכות הלידים בינונית לתקופה זו. מומלץ לטייב את מקורות הפרסום כדי למנוע שיחות סרק.'}
                       </p>
                     </div>

                     {/* Right: Funnel (Spans 2 columns) */}
                     <div className="lg:col-span-2 bg-slate-100/30 dark:bg-slate-800/20 p-8 md:p-10 rounded-3xl md:rounded-[48px] border dark:border-slate-800 shadow-inner overflow-hidden flex flex-col justify-center">
                       <h4 className="text-base font-black mb-6 flex items-center gap-3 text-slate-900 dark:text-white">משפך המרה דינמי <ArrowDownRight size={20} className="text-indigo-500" /></h4>
                       <div className="space-y-8">
                         {[
                           { label: "נוצר קשר (ענו)", count: analyticsData.funnel?.contacted || 0, drop: analyticsData.funnel?.total > 0 ? (100 - (analyticsData.funnel.contacted / analyticsData.funnel.total * 100)) : 0, dropVal: analyticsData.funnel?.total - analyticsData.funnel?.contacted, color: "bg-gradient-to-r from-indigo-600 to-indigo-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.contacted / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", desc: "לידים שענו לטלפון או שסטטוסם התקדם מעבר ל'חדש'." },
                           { label: "רלוונטיות (בבדיקה/המשך טיפול)", count: analyticsData.funnel?.relevant || 0, drop: analyticsData.funnel?.contacted > 0 ? (100 - (analyticsData.funnel.relevant / analyticsData.funnel.contacted * 100)) : 0, dropVal: analyticsData.funnel?.contacted - analyticsData.funnel?.relevant, color: "bg-gradient-to-r from-purple-600 to-purple-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.relevant / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", desc: "לידים שסומנו כבעלי עילה והועברו הלאה במערכת." },
                           { label: "חתומים", count: analyticsData.funnel?.signed || 0, drop: analyticsData.funnel?.relevant > 0 ? (100 - (analyticsData.funnel.signed / analyticsData.funnel.relevant * 100)) : 0, dropVal: analyticsData.funnel?.relevant - analyticsData.funnel?.signed, color: "bg-gradient-to-r from-emerald-600 to-emerald-500", val: (analyticsData.funnel?.total > 0 ? (analyticsData.funnel.signed / analyticsData.funnel.total * 100).toFixed(1) : 0) + "%", shadow: "shadow-emerald-500/30", desc: "מטופלים שהמרו והפכו לייצוג רשמי." }
                         ].map((step, idx) => (
                           <div key={idx} className="relative group opacity-100">
                              {idx > 0 && <div className="absolute -top-7 left-4 text-[9px] font-black bg-red-50 dark:bg-red-950/20 text-red-500 px-2.5 py-0.5 rounded-full z-10 border border-red-100 dark:border-red-900/30 flex items-center gap-1"><ArrowDownRight size={10}/> נשרו {step.drop.toFixed(1)}% ({step.dropVal} אבדו בשלב הקודם)</div>}
                              <div className="flex justify-between items-center mb-2 px-2 relative z-20">
                                <div className="flex flex-col">
                                  <span className="text-sm font-black text-slate-700 dark:text-slate-200 tracking-tight">{step.label}</span>
                                  <span className="text-[10px] text-slate-400 font-bold mt-0.5 leading-none">{step.desc}</span>
                                </div>
                                <span className="text-xs font-black text-slate-800 dark:text-white px-3 py-1 bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">{step.count} ({step.val})</span>
                              </div>
                              <div className="w-full h-8 bg-slate-200/50 dark:bg-slate-800/60 rounded-full overflow-hidden flex flex-row-reverse shadow-inner relative z-20">
                                <div className={`${step.color} h-full transition-all duration-[1500ms] ease-out flex items-center justify-end px-6 text-xs font-black text-white ${step.shadow || 'shadow-lg'}`} style={{ width: step.val }}>
                                </div>
                              </div>
                           </div>
                         ))}
                       </div>
                     </div>
                   </div>

                   {/* Disqualification & Smart Insights */}
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mt-12 pb-12">
                      <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] border dark:border-slate-800 shadow-xl group">
                         <h4 className="text-xl font-black mb-8 flex items-center gap-3 text-slate-900 dark:text-white">סיבות פסילה לתקופה <AlertTriangle className="text-red-500" /></h4>
                         <div className="mt-4">
                            <DisqualificationDonutChart data={analyticsData.disqualificationReasons || []} />
                         </div>
                      </div>
                      <div className="bg-indigo-600 rounded-[40px] p-8 text-white shadow-2xl flex flex-col justify-center relative overflow-hidden group min-h-[350px]">
                         <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 blur-[120px] rounded-full translate-x-32 -translate-y-32 transition-transform duration-1000 group-hover:scale-110" />
                         
                         <div className="flex justify-between items-center mb-8 relative z-10">
                            <h4 className="text-xl font-black flex items-center gap-3 bg-white/10 px-6 py-2 rounded-full uppercase tracking-widest text-[10px]"><Brain size={16} /> תובנות חכמות מבוססות נתונים</h4>
                            <div className="flex gap-2">
                               <button onClick={() => setCurrentInsightIndex(p => (p + 1) % 3)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><ArrowUpRight size={14} className="rotate-45" /></button>
                               {[0, 1, 2].map(i => <button key={i} onClick={() => setCurrentInsightIndex(i)} className={`h-2 rounded-full transition-all duration-500 cursor-pointer hover:bg-white/60 ${currentInsightIndex === i ? 'bg-white w-6' : 'bg-white/30 w-2'}`} />)}
                               <button onClick={() => setCurrentInsightIndex(p => (p + 2) % 3)} className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all"><ArrowUpRight size={14} className="rotate-[225deg]" /></button>
                            </div>
                         </div>

                         <div className="relative h-48 z-10 w-full">
                            {currentInsightIndex === 0 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <Zap size={44} className="text-amber-400 mb-6 opacity-80" />
                                   <p className="text-2xl font-black opacity-90 leading-tight font-assistant">
                                      {analyticsData.insights?.quickSignedRate || 0}% מהחוזים נחתמים ב-<span className="text-amber-400">3 השיחות הראשונות</span>. נדרשות בממוצע {analyticsData.insights?.avgCallsPerSigned || 0} שיחות לסגירה.
                                   </p>
                                   <p className="mt-3 text-indigo-200 font-bold text-xs">מסקנה: השקעת מאמץ מעבר ל-4 צלצולים מפחיתה דרסטית את סיכויי ההמרה.</p>
                               </div>
                            )}
                            {currentInsightIndex === 1 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <Star size={44} className="text-emerald-400 mb-6 opacity-80" />
                                   <p className="text-2xl font-black opacity-90 leading-tight font-assistant">
                                      מדד איכות הלידים שלך: <span className="text-emerald-400">{analyticsData.insights?.leadQualityRatio || 0}%</span> מאלו שענו באמת עברו את הסינון שלך והוגדרו כרלוונטיים.
                                   </p>
                                   <p className="mt-3 text-indigo-200 font-bold text-xs">מסקנה: זהו אחוז הלידים הבשלים שהתקדמו לבדיקה מתוך הסך הכל הכללי עמו הושג קשר.</p>
                               </div>
                            )}
                            {currentInsightIndex === 2 && (
                               <div className="absolute inset-0 animate-in fade-in slide-in-from-right-8 duration-500">
                                   <PhoneOff size={44} className="text-red-400 mb-6 opacity-80" />
                                   <p className="text-2xl font-black opacity-90 leading-tight font-assistant">
                                      לידים שנפסלו על 'אין מענה' קיבלו בממוצע רק <span className="text-red-400">{analyticsData.insights?.avgCallsNoAnswer || 0}</span> צלצולים בלבד.
                                   </p>
                                   <p className="mt-3 text-indigo-200 font-bold text-xs">מסקנה: ייתכן ואנחנו ממהרים מדי לפסול. מומלץ להגדיל מספר ניסיונות לפני פסילה סופית.</p>
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
          
          {activeTab === 'settings' && (
            <div className="p-4 md:p-10 max-w-2xl mx-auto h-full min-h-[500px] space-y-8">
              <h2 className="text-3xl font-black mb-8 flex items-center gap-3 text-slate-900 dark:text-white"><Settings className="text-indigo-500" /> הגדרות מערכת</h2>
              
              {/* Agent Phone Section */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 blur-[50px] rounded-full translate-x-10 -translate-y-10" />
                <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white">מספר נייד של הנציג</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">על מנת שהמערכת תחייג אליך כראוי, יש להזין את המספר שממנו תבצע את השיחות. אם נשאר ריק, החיוג יתבצע למספר הברירת מחדל של המערכת.</p>
                <input 
                  type="text" 
                  dir="ltr"
                  placeholder="לדוגמה: 0541234567 או +97254..." 
                  value={agentPhone} 
                  onChange={(e) => {
                    const val = e.target.value;
                    setAgentPhone(val);
                    localStorage.setItem('agentPhone', val);
                  }} 
                  className="w-full max-w-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-left text-lg font-black outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-inner" 
                />
              </div>

              {/* Backup & Restore Section */}
              <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] p-8 md:p-10 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-emerald-500/5 blur-[50px] rounded-full -translate-x-10 -translate-y-10" />
                <h3 className="text-xl font-black mb-2 text-slate-900 dark:text-white flex items-center gap-3"><Shield className="w-6 h-6 text-emerald-500" /> גיבוי ושחזור נתונים</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 mb-8 font-medium">הורד את כל הנתונים כקובץ JSON, או שחזר מגיבוי קודם. הגיבוי האוטומטי רץ כל יום ב-06:00 ושומר לדרייב.</p>
                
                <div className="flex flex-col sm:flex-row gap-4">
                  {/* Download Backup */}
                  <button
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/backup');
                        if (!res.ok) throw new Error('Backup failed');
                        const blob = await res.blob();
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `suechef-backup-${new Date().toISOString().split('T')[0]}.json`;
                        a.click();
                        URL.revokeObjectURL(url);
                      } catch (e) { alert('שגיאה בהורדת הגיבוי'); console.error(e); }
                    }}
                    className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-emerald-600 text-white font-black text-base shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all group"
                  >
                    <Download className="w-5 h-5 group-hover:translate-y-0.5 transition-transform" />
                    הורד גיבוי
                  </button>

                  {/* Restore from Backup */}
                  <label className="flex-1 flex items-center justify-center gap-3 px-8 py-5 rounded-2xl bg-amber-500 text-white font-black text-base shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer group">
                    <Upload className="w-5 h-5 group-hover:-translate-y-0.5 transition-transform" />
                    שחזר מגיבוי
                    <input
                      type="file"
                      accept=".json"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (!window.confirm(`⚠️ פעולה זו תחליף את כל הנתונים הקיימים בנתונים מהקובץ:\n${file.name}\n\nהאם להמשיך?`)) {
                          e.target.value = '';
                          return;
                        }
                        try {
                          const text = await file.text();
                          const json = JSON.parse(text);
                          const res = await fetch('/api/backup/restore', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(json)
                          });
                          const result = await res.json();
                          if (result.success) {
                            alert(`✅ שוחזרו ${result.count} לידים בהצלחה!`);
                            fetchLeads();
                          } else {
                            alert(`❌ שגיאה: ${result.error}`);
                          }
                        } catch (err) {
                          alert('❌ קובץ לא תקין או שגיאת תקשורת');
                          console.error(err);
                        }
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>

                <div className="mt-6 flex items-center gap-3 text-xs font-bold text-slate-400 bg-slate-50 dark:bg-slate-800/50 px-5 py-3 rounded-xl">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  גיבוי אוטומטי יומי ל-Google Drive פעיל
                </div>
              </div>
            </div>
          )}
        </div>

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

      {/* CSV Import Modal */}
      {showImportModal && (
        <CsvImportModal 
          onClose={() => setShowImportModal(false)}
          onImportComplete={() => {
            setShowImportModal(false);
            fetchLeads();
            fireConfetti();
          }}
          leadsList={leads}
        />
      )}

      {/* Live Notes Modal */}
      {liveNotesLead && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-4 bg-slate-900/80 backdrop-blur-xl transition-all">
          <div className="bg-white dark:bg-slate-900 w-full h-[100dvh] md:max-w-[95vw] md:h-[95vh] rounded-none md:rounded-[48px] shadow-2xl flex flex-col overflow-hidden border-none md:border dark:border-slate-800">
            {/* Header - Compact */}
            <div className="p-4 border-b dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 z-10" dir="rtl">
              <div className="flex items-center gap-4 text-right">
                <button 
                  onClick={() => liveNotesLead && initiateCall(liveNotesLead)} 
                  title="חייג לליד"
                  className="w-12 h-12 bg-indigo-600 rounded-[20px] flex items-center justify-center text-white shadow-xl animate-pulse hover:scale-105 active:scale-95 transition-all outline-none"
                >
                  <PhoneCall size={24} />
                </button>
                <button 
                  onClick={handleHangupCall} 
                  title="נתק שיחה פעילה"
                  className="w-12 h-12 bg-rose-600 hover:bg-rose-700 rounded-[20px] flex items-center justify-center text-white shadow-xl hover:scale-105 active:scale-95 transition-all outline-none"
                >
                  <PhoneOff size={24} />
                </button>
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <h2 className="text-2xl font-black tracking-tight mb-0 text-slate-900 dark:text-white leading-none">
                      {liveNotesLead?.clientName || 'לקוח בשיחה'}
                    </h2>
                    {liveNotesLead?.campaign && (
                      <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-950/40 px-2.5 py-1 rounded-xl border border-indigo-100/60 dark:border-indigo-900/30 whitespace-nowrap self-center">
                        קמפיין: {liveNotesLead.campaign}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-mono text-slate-400" dir="ltr">{liveNotesLead?.phone}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`px-6 py-2.5 rounded-2xl border font-black text-xs transition-all flex items-center gap-2 hover:scale-105 ${showDecisionTree ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}>
                  <ClipboardList size={18} /> {showDecisionTree ? 'חזרה' : 'עץ החלטות'}
                </button>
                <button onClick={handleCloseLiveNotes} className="w-10 h-10 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 rounded-full text-slate-400 hover:text-red-500 transition-all"><X size={24} /></button>
              </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden bg-white dark:bg-slate-900 relative" dir="rtl">
               {showDecisionTree ? (
                 <div className="flex-1 overflow-y-auto p-6 custom-scrollbar"><LegalDecisionTree compact={true} onComplete={handleTreeComplete} /></div>
               ) : (
                 <div className="flex-1 flex flex-col md:flex-row h-full overflow-y-auto md:overflow-hidden">
                    {/* RIGHT SIDE: Notes Area (Expanded) */}
                    <div className="flex-[2] flex flex-col p-4 md:p-5 border-b md:border-b-0 md:border-l dark:border-slate-800 bg-white dark:bg-slate-900 relative min-h-[40vh] md:min-h-0">
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

                    {/* LEFT SIDE: New Permanent Script & Key Fields (Expanded) */}
                    <div className="flex-[1.2] flex flex-col p-4 md:p-6 bg-slate-50/50 dark:bg-slate-950/40 overflow-y-auto custom-scrollbar md:border-r border-t md:border-t-0 dark:border-slate-800">
                       
                       {/* Glassmorphic Tabs Toggle */}
                       <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-[22px] mb-6 border dark:border-slate-700/50 shadow-inner">
                         <button 
                           onClick={() => setLeftPanelTab('script')}
                           className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2.5 ${leftPanelTab === 'script' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border dark:border-slate-800' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                         >
                           <FileText size={16} /> תסריט שיחה
                         </button>
                         <button 
                           onClick={() => setLeftPanelTab('fields')}
                           className={`flex-1 py-3 text-center text-xs font-black rounded-xl transition-all flex items-center justify-center gap-2.5 ${leftPanelTab === 'fields' ? 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-md border dark:border-slate-800' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                         >
                           <Settings size={16} /> שדות מפתח
                         </button>
                       </div>

                       {isNegligenceActive ? (
                         <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border border-red-500/20 dark:border-red-900/40 shadow-sm border-indigo-500/10 animate-in fade-in slide-in-from-left-4 duration-300">
                           <h4 className="text-xl font-black text-red-600 dark:text-red-400 mb-6 flex items-center gap-3 underline decoration-red-500/30 underline-offset-8">
                             <ClipboardList size={24} /> במקרה של רשלנות
                           </h4>
                           
                           <div className="space-y-8 text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed font-assistant animate-in fade-in duration-300" dir="rtl">
                             <section className="space-y-5">
                               <div className="flex gap-4 items-start bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100/30 dark:border-red-900/20">
                                 <span className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-black shadow-sm">1</span>
                                 <p className="text-base text-slate-800 dark:text-slate-200">
                                   גיל עד 65 רלוונטי לתביעות
                                 </p>
                               </div>

                               <div className="flex gap-4 items-start bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100/30 dark:border-red-900/20">
                                 <span className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-black shadow-sm">2</span>
                                 <p className="text-base text-slate-800 dark:text-slate-200">
                                   מה האבחנה
                                 </p>
                               </div>

                               <div className="flex gap-4 items-start bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100/30 dark:border-red-900/20">
                                 <span className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-black shadow-sm">3</span>
                                 <p className="text-base text-slate-800 dark:text-slate-200">
                                   באיזה שלב אובחנה המחלה? אנחנו מחפשים את אלו שאובחנו בשלב 4 או סרטן גרורתי
                                 </p>
                               </div>

                               <div className="flex gap-4 items-start bg-red-50/30 dark:bg-red-950/10 p-5 rounded-2xl border border-red-100/30 dark:border-red-900/20">
                                 <span className="flex-shrink-0 w-8 h-8 bg-red-100 dark:bg-red-900/50 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center text-sm font-black shadow-sm">4</span>
                                 <p className="text-base text-slate-800 dark:text-slate-200">
                                   התביעות האלה גם רלוונטיות לנפטרים - היורשים תובעים.
                                 </p>
                               </div>
                             </section>
                           </div>
                         </div>
                       ) : leftPanelTab === 'script' ? (
                         <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800 shadow-sm border-indigo-500/10 animate-in fade-in slide-in-from-left-4 duration-300">
                            <h4 className="text-xl font-black text-indigo-600 mb-6 flex items-center gap-3 underline decoration-indigo-500/30 underline-offset-8">
                              <FileText size={24} /> תסריט שיחה מלא
                            </h4>
                            
                            <div className="space-y-8 text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed font-assistant" dir="rtl">
                              <section>
                                <h5 className="text-indigo-500 font-black text-lg mb-2">פתיחה</h5>
                                <p className="bg-indigo-50/50 dark:bg-indigo-900/10 p-4 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                                  היי, קוראים לי יונתן אני ממשרד עורכי הדין HBA. השארת אצלנו פרטים לגבי זכויות רפואיות. אם יש לך כמה דקות אני אשמח לשאול אותך כמה שאלות ולראות אם נוכל לעזור.
                                </p>
                              </section>

                              <section className="space-y-4">
                                <h5 className="text-indigo-500 font-black text-lg mb-2">שאלות סינון</h5>
                                <div className="space-y-4">
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">1</span>
                                    <p>מה שמך המלא? ומה גילך?</p>
                                  </div>
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">2</span>
                                    <p>תוכל לספר לי קצת על מצבך הרפואי?</p>
                                  </div>
                                  <div className="flex gap-3">
                                    <span className="flex-shrink-0 w-6 h-6 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 rounded-full flex items-center justify-center text-xs font-black">3</span>
                                    <div>
                                      <p>יש לך כרגע הכנסות? אם כן – מאיפה הן מגיעות (קצבה, עבודה, פנסיה וכו') ומה הסכום בערך?</p>
                                      <p className="text-[10px] text-slate-400 mt-2 italic">(לבדוק אם משלם מס הכנסה וכמה)</p>
                                    </div>
                                  </div>
                                  <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                    <div className="flex gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center text-xs font-black">4</span>
                                      <p>האם יש קושי בפעולות יומיומיות (לבוש, רחצה, תפקוד בסיסי)? תשאלו רק אם אתה שומע תיאור שמעיד על מצב תפקודי קשה.</p>
                                    </div>
                                  </div>
                                  <div className="p-4 bg-red-50/50 dark:bg-red-900/10 rounded-2xl border border-red-100/50 dark:border-red-900/30 text-red-600 dark:text-red-400">
                                    <div className="flex gap-3">
                                      <span className="flex-shrink-0 w-6 h-6 bg-red-100 dark:bg-red-900/50 text-red-600 rounded-full flex items-center justify-center text-xs font-black">5</span>
                                      <p>האם יש לך ביטוח סיעודי בקופת חולים?</p>
                                    </div>
                                  </div>
                                </div>
                              </section>
                            </div>
                         </div>
                       ) : (
                         <div className="bg-white dark:bg-slate-900 p-8 rounded-3xl border dark:border-slate-800 shadow-sm border-indigo-500/10 animate-in fade-in slide-in-from-left-4 duration-300 flex flex-col gap-6">
                            <h4 className="text-xl font-black text-indigo-600 mb-2 flex items-center gap-3 underline decoration-indigo-500/30 underline-offset-8">
                              <Settings size={24} /> שדות מפתח לשיחה
                            </h4>
                            <p className="text-xs text-slate-400 dark:text-slate-500 font-bold -mt-2 leading-relaxed">
                              💡 השדות נשמרים אוטומטית. בסיום השיחה, ה-AI ינתח את תיעוד השיחה החופשי וישלים שדות אלו ברקע במידה ולא מילאת אותם ידנית!
                            </p>

                            <button
                              onClick={handleManualAnalyzeCall}
                              disabled={isAnalyzing || !liveNotesLead.liveCallNotes?.trim()}
                              className={`w-full py-3.5 px-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 border transition-all duration-300 ${
                                isAnalyzing 
                                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800 cursor-not-allowed'
                                  : !liveNotesLead.liveCallNotes?.trim()
                                    ? 'bg-slate-50 dark:bg-slate-900/50 text-slate-400 dark:text-slate-600 border-slate-100 dark:border-slate-800 cursor-not-allowed opacity-60'
                                    : 'bg-indigo-50/50 dark:bg-indigo-950/20 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border-indigo-200/60 dark:border-indigo-900/40 hover:border-indigo-300 dark:hover:border-indigo-800 shadow-sm hover:shadow active:scale-[0.98]'
                              }`}
                            >
                              {isAnalyzing ? (
                                <>
                                  <span className="animate-spin inline-block w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full" />
                                  מנתח סיכום שיחה...
                                </>
                              ) : (
                                <>
                                  <span>✨ ניתוח סיכום שיחה ע״י AI</span>
                                </>
                              )}
                            </button>

                            <div className="space-y-5 mt-2">
                              {/* Salary Field */}
                              <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                                  <DollarSign size={14} className="text-indigo-500" /> שכר חודשי מוערך
                                </label>
                                <input 
                                  type="text"
                                  value={liveNotesLead.salary || ''}
                                  onChange={e => handleLeadUpdate(liveNotesLead.id, { salary: e.target.value })}
                                  placeholder="לדוגמה: 12,000 ש״ח / לא צוין"
                                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-base font-bold outline-none focus:border-indigo-500/30 dark:focus:border-indigo-500/20 transition-all text-slate-900 dark:text-white"
                                />
                              </div>

                              {/* Employment Status */}
                              <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                                  <Briefcase size={14} className="text-indigo-500" /> מצב תעסוקתי
                                </label>
                                <input 
                                  type="text"
                                  value={liveNotesLead.employmentStatus || ''}
                                  onChange={e => handleLeadUpdate(liveNotesLead.id, { employmentStatus: e.target.value })}
                                  placeholder="לדוגמה: שכיר / עצמאי / פנסיונר / לא עובד"
                                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-base font-bold outline-none focus:border-indigo-500/30 dark:focus:border-indigo-500/20 transition-all text-slate-900 dark:text-white"
                                />
                              </div>

                              {/* Medical Status */}
                              <div>
                                <label className="block text-xs font-black text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-2">
                                  <Brain size={14} className="text-indigo-500" /> מצב רפואי ואבחנה
                                </label>
                                <textarea 
                                  rows={4}
                                  value={liveNotesLead.medicalStatus || ''}
                                  onChange={e => handleLeadUpdate(liveNotesLead.id, { medicalStatus: e.target.value })}
                                  placeholder="לדוגמה: עבר התקף לב לאחרונה, מתקשה בניידות..."
                                  className="w-full bg-slate-50 dark:bg-slate-800/50 border-2 border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-base font-bold outline-none focus:border-indigo-500/30 dark:focus:border-indigo-500/20 transition-all text-slate-900 dark:text-white resize-none leading-relaxed font-assistant"
                                />
                              </div>
                            </div>
                         </div>
                       )}

                       <div className="mt-8 opacity-20 text-[9px] items-center flex gap-2 font-black text-slate-400 uppercase tracking-tighter self-center">
                          <Zap size={10} /> Sue-Chef v5.9 Master
                       </div>
                    </div>
                 </div>
               )}
            </div>

            {/* Footer - Compact */}
            <div className="p-4 border-t dark:border-slate-800 bg-white dark:bg-slate-900 z-10 flex justify-between items-center px-8" dir="rtl">
               <div className="flex items-center gap-6">
                 <div className="hidden sm:flex items-center gap-3 uppercase font-black text-[9px] tracking-widest text-slate-300 pointer-events-none">
                   <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                   <span>Secure Connection</span>
                 </div>
                 <button 
                   onClick={() => setIsNegligenceActive(!isNegligenceActive)}
                   className={`px-6 py-2.5 rounded-2xl border font-black text-xs transition-all flex items-center gap-2 hover:scale-105 active:scale-95 shadow-sm
                     ${isNegligenceActive 
                       ? 'bg-red-500 text-white border-red-600 shadow-red-500/20 hover:bg-red-600' 
                       : 'bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'}`}
                 >
                   <ClipboardList size={14} /> במקרה של רשלנות
                 </button>
               </div>
               <button onClick={handleCloseLiveNotes} className="px-16 py-3.5 rounded-2xl bg-indigo-600 text-white font-black shadow-xl hover:scale-105 active:scale-95 transition-all flex items-center gap-3 font-assistant text-xl group overflow-hidden relative shadow-indigo-500/20">
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
              {/* Key Details Card */}
              {(historyLead.salary || historyLead.employmentStatus || historyLead.medicalStatus) && (
                <div className="mb-6 p-5 bg-gradient-to-br from-indigo-50/60 to-violet-50/30 dark:from-slate-800/50 dark:to-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-3xl shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Brain size={16} />
                    </div>
                    <span className="text-sm font-black text-indigo-950 dark:text-white">נתוני מפתח לתיק</span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-3.5">
                    {historyLead.salary && (
                      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <DollarSign size={14} className="text-indigo-500" /> שכר חודשי:
                        </span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{historyLead.salary}</span>
                      </div>
                    )}

                    {historyLead.employmentStatus && (
                      <div className="flex items-center justify-between bg-white/70 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                          <Briefcase size={14} className="text-indigo-500" /> מצב תעסוקתי:
                        </span>
                        <span className="text-sm font-black text-slate-800 dark:text-slate-200">{historyLead.employmentStatus}</span>
                      </div>
                    )}

                    {historyLead.medicalStatus && (
                      <div className="bg-white/70 dark:bg-slate-900/40 p-3.5 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                        <span className="text-xs font-black text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mb-1.5">
                          <Brain size={14} className="text-indigo-500" /> מצב רפואי ואבחנה:
                        </span>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed pr-5 whitespace-pre-line">{historyLead.medicalStatus}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className="relative pr-6 border-r-2 border-indigo-100 dark:border-indigo-900/30 space-y-6">
                {/* Created */}
                <div className="relative">
                  <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-indigo-500 border-4 border-white dark:border-slate-900 shadow-md" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">נוצר</p>
                  <p className="text-sm font-bold text-slate-700 dark:text-slate-300">{formatDate(historyLead.createdAt)}</p>
                  <p className="text-xs text-slate-400">מקור: {historyLead.source}</p>
                </div>

                {/* WhatsApp Message */}
                {historyLead.whatsappSentAt && (
                  <div className="relative">
                    <div className="absolute -right-[33px] top-1 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white dark:border-slate-900 shadow-md" />
                    <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">וואטסאפ 💬</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">נשלחה הודעת פתיחה אוטומטית</p>
                    <p className="text-xs text-slate-400">נשלחה ב: {formatDate(historyLead.whatsappSentAt)}</p>
                  </div>
                )}

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
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">חתימות השבוע</p>
                      <p className="text-3xl font-black text-emerald-400">{weeklyData.signedThisWeek}</p>
                    </div>
                    <div className="bg-white/10 rounded-2xl p-4">
                      <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-1">בזבוז Twilio</p>
                      <p className="text-3xl font-black text-red-400">${weeklyData.twilioCostUSD.toFixed(2)}</p>
                      <p className="text-[10px] text-indigo-300 mt-1">₪{weeklyData.twilioCostNIS.toFixed(0)}</p>
                    </div>
                  </div>
                  
                  <div className="bg-white/15 rounded-3xl p-6 border border-white/10 mt-6">
                    <p className="text-[10px] font-black text-indigo-200 uppercase tracking-wider mb-2">הכנסה שבועית</p>
                    <p className="text-5xl font-black text-emerald-400">₪{weeklyData.grossRevenue.toLocaleString()}</p>
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

      {/* Mobile Bottom Navigation */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t dark:border-white/5 pb-safe z-50 flex justify-around p-2 pb-6 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
        {([{id: 'crm', label: 'מעקב', icon: ClipboardList}, {id: 'calls', label: 'שיחות', icon: PhoneCall}, {id: 'archive', label: 'ארכיון', icon: Archive}] as const).map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as 'crm'|'calls'|'archive')} className={`flex flex-col items-center gap-1 p-2 w-20 rounded-2xl transition-all ${isActive ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}>
            <Icon size={20} className={isActive ? 'animate-bounce' : ''} />
            <span className="text-[10px] font-black">{tab.label}</span>
          </button>
        )})}
      </div>

      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 md:bottom-8 left-6 z-50 p-4 rounded-full bg-indigo-600 text-white shadow-2xl shadow-indigo-500/40 hover:bg-indigo-700 hover:scale-110 active:scale-95 transition-all duration-300 animate-in fade-in zoom-in group border border-white/20"
          title="חזור למעלה"
        >
          <ArrowUp className="w-6 h-6 group-hover:-translate-y-1 transition-transform duration-300" />
        </button>
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
      `}</style>

      {/* AI Strategic Diagnostics Drawer (Slides from Right) */}
      <div 
        className={`fixed inset-0 z-[120] transition-opacity duration-300 ${isAiDrawerOpen ? 'bg-slate-950/60 backdrop-blur-md pointer-events-auto' : 'bg-transparent pointer-events-none opacity-0'}`}
        onClick={() => { if (!isAiAnalyzing) setIsAiDrawerOpen(false); }}
      />
      <aside 
        className={`fixed top-0 right-0 h-full w-full max-w-4xl bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-l dark:border-slate-800 z-[130] shadow-2xl transition-transform duration-500 transform ${isAiDrawerOpen ? 'translate-x-0' : 'translate-x-full'} overflow-y-auto`}
        dir="rtl"
      >
        <div className="p-6 md:p-8 flex flex-col min-h-full">
          {/* Header */}
          <div className="flex items-center justify-between border-b dark:border-slate-800 pb-5 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-black bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent dark:from-violet-400 dark:to-indigo-400">סו-שף AI • אבחון אסטרטגי</h3>
                <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-0.5">ניתוח דטרמיניסטי מתקדם והמלצות ייעול אופרטיביות</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <span className="text-xs font-black px-3.5 py-1.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 border border-indigo-100/50 dark:border-indigo-900/30">
                {analyticsTimeframe === '7days' && '7 ימים אחרונים'}
                {analyticsTimeframe === '30days' && '30 ימים אחרונים'}
                {analyticsTimeframe === 'currentMonth' && 'החודש הנוכחי'}
                {analyticsTimeframe === 'lifetime' && 'כל הזמן'}
              </span>
              
              <button 
                onClick={() => setIsAiDrawerOpen(false)} 
                disabled={isAiAnalyzing}
                className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/10 text-slate-400 hover:text-red-500 transition-all shadow-sm cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          {isAiAnalyzing ? (
            /* Loading State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 gap-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-24 h-24 rounded-full border-4 border-violet-500/10 border-t-violet-500 animate-spin" />
                <div className="absolute w-16 h-16 rounded-full border-4 border-indigo-500/10 border-b-indigo-500 animate-spin duration-1000" />
                <Brain className="w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
              <div className="text-center space-y-2 max-w-sm">
                <h4 className="font-black text-slate-700 dark:text-slate-200 text-lg">סו-שף AI מנתח את הנתונים...</h4>
                <p className="text-sm font-bold text-violet-600 dark:text-violet-400 animate-pulse min-h-[20px]">{loadingAiStatus}</p>
                <p className="text-xs font-bold text-slate-400 mt-2">אנחנו מחשבים סיבות פסילה, עלויות שיחות, ויחסי המרה אקטיביים לתקופה הנבחרת.</p>
              </div>
            </div>
          ) : aiAnalysis?.error ? (
            /* Error State */
            <div className="flex-1 flex flex-col items-center justify-center py-20 text-center gap-6">
              <div className="w-16 h-16 rounded-3xl bg-red-50 dark:bg-red-950/20 text-red-500 flex items-center justify-center border border-red-100 dark:border-red-900/30">
                <AlertTriangle size={32} />
              </div>
              <div className="max-w-md space-y-2">
                <h4 className="text-lg font-black text-slate-800 dark:text-slate-200">לא הצלחנו לייצר ניתוח בינה מלאכותית</h4>
                <p className="text-sm font-bold text-slate-500 dark:text-slate-400">{aiAnalysis.message}</p>
              </div>
              <button 
                onClick={runAiAnalysis} 
                className="px-6 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-black text-xs rounded-xl shadow-lg hover:shadow-indigo-500/25 active:scale-95 transition-all cursor-pointer"
              >
                נסה שוב
              </button>
            </div>
          ) : aiAnalysis ? (
            /* Content Loaded State */
            <div className="space-y-8 flex-1">
              
              {/* Executive Summary */}
              <div className="p-6 rounded-3xl bg-gradient-to-br from-violet-50/50 to-indigo-50/30 dark:from-violet-950/10 dark:to-indigo-950/5 border border-violet-100/50 dark:border-violet-900/20 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-24 h-24 bg-violet-500/5 blur-[30px] rounded-full" />
                <h4 className="text-xs font-black uppercase text-violet-600 dark:text-violet-400 tracking-wider mb-2 flex items-center gap-1.5"><Sparkles size={12}/> סיכום מנהלים אסטרטגי</h4>
                <p className="text-sm font-black text-slate-800 dark:text-slate-200 leading-relaxed">{(aiAnalysis.analysis || aiAnalysis).summary}</p>
              </div>

              {/* Premium Score Speedometers / SVG Gauges */}
              {(() => {
                const rawMetrics = aiAnalysis.raw_metrics || {};
                const stats = rawMetrics.stats || {};
                const relRate = stats.relevanceRate || 0;
                const wastedCalls = parseFloat(stats.avgCallsNoAnswer || "0");
                const opEfficiency = Math.max(10, Math.min(100, Math.round(100 - (wastedCalls * 8))));
                
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Gauge 1: Relevance Score */}
                    <div className="p-6 rounded-3xl border dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md flex items-center justify-between gap-6 shadow-inner relative overflow-hidden group">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">מדד איכות הלידים (רלוונטיות)</span>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white">ציון איכות תקופתי</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mt-1">אחוז הלידים שענו והיו בעלי עילה רלוונטית בתקופה הנוכחית.</p>
                      </div>
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" className="text-slate-100 dark:text-slate-800/60" strokeWidth="6" stroke="currentColor" fill="transparent" />
                          <circle cx="48" cy="48" r="40" className="text-purple-600 dark:text-purple-500 transition-all duration-[1500ms] ease-out" strokeWidth="6" strokeDasharray={251.2} strokeDashoffset={251.2 - (relRate / 100) * 251.2} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-800 dark:text-white">{relRate}%</span>
                          <span className="text-[8px] font-black text-purple-500 uppercase tracking-widest mt-0.5">{relRate >= 35 ? 'מעולה' : 'טעון שיפור'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Gauge 2: Operational Efficiency */}
                    <div className="p-6 rounded-3xl border dark:border-slate-800/80 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md flex items-center justify-between gap-6 shadow-inner relative overflow-hidden group">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">מדד יעילות תפעולית (שיחות סרק)</span>
                        <h4 className="text-lg font-black text-slate-800 dark:text-white">יעילות תפעול שיחות</h4>
                        <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed mt-1">מדידת האנרגיה שהושקעה בשיחות ללא מענה חוזר מול סגירות.</p>
                      </div>
                      <div className="relative flex items-center justify-center flex-shrink-0">
                        <svg className="w-24 h-24 transform -rotate-90">
                          <circle cx="48" cy="48" r="40" className="text-slate-100 dark:text-slate-800/60" strokeWidth="6" stroke="currentColor" fill="transparent" />
                          <circle cx="48" cy="48" r="40" className="text-blue-600 dark:text-blue-500 transition-all duration-[1500ms] ease-out" strokeWidth="6" strokeDasharray={251.2} strokeDashoffset={251.2 - (opEfficiency / 100) * 251.2} strokeLinecap="round" stroke="currentColor" fill="transparent" />
                        </svg>
                        <div className="absolute flex flex-col items-center">
                          <span className="text-2xl font-black text-slate-800 dark:text-white">{opEfficiency}%</span>
                          <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest mt-0.5">{opEfficiency >= 75 ? 'מצוין' : 'עמוס שיחות'}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Commentary Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-5 rounded-2xl border dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md">
                  <h5 className="text-xs font-black uppercase text-purple-600 dark:text-purple-400 tracking-wider mb-2">אבחון איכות הלידים (רלוונטיות)</h5>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{(aiAnalysis.analysis || aiAnalysis).metrics_evaluation?.relevance_rate_commentary}</p>
                </div>
                
                <div className="p-5 rounded-2xl border dark:border-slate-800 bg-white/40 dark:bg-slate-900/20 backdrop-blur-md">
                  <h5 className="text-xs font-black uppercase text-blue-600 dark:text-blue-400 tracking-wider mb-2">אבחון יחס סגירה (מתוך רלוונטיים)</h5>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed">{(aiAnalysis.analysis || aiAnalysis).metrics_evaluation?.conversion_rate_commentary}</p>
                </div>
              </div>

              {/* Deep AI Diagnostics Grid */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-r-4 border-indigo-500 pr-3.5">🔍 אבחון עומק תפעולי</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {(aiAnalysis.analysis || aiAnalysis).diagnostics?.map((diag: any, idx: number) => {
                    const statusStyles: Record<string, string> = {
                      success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border-emerald-100/50 dark:border-emerald-900/30",
                      warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/20 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/30",
                      danger: "bg-red-50 text-red-700 dark:bg-red-950/20 dark:text-red-400 border-red-100/50 dark:border-red-900/30",
                    };
                    const statusLabels: Record<string, string> = {
                      success: "חיובי",
                      warning: "דרוש שיפור",
                      danger: "קריטי"
                    };
                    const statusClass = statusStyles[diag.status] || statusStyles.warning;
                    const statusLabel = statusLabels[diag.status] || "טעון שיפור";
                    
                    return (
                      <div key={idx} className="p-6 rounded-3xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 hover:-translate-y-1 hover:shadow-lg transition-all duration-300 flex flex-col justify-between">
                        <div>
                          <div className="flex items-center justify-between gap-3 mb-4">
                            <span className="text-xs font-black text-slate-800 dark:text-slate-100 leading-tight">{diag.title}</span>
                            <span className={"text-[9px] font-black px-2.5 py-1 rounded-full border " + statusClass}>{statusLabel}</span>
                          </div>
                          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed">{diag.explanation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* CRM Quantitative Charts Section (The Dynamic Graphs) */}
              {(() => {
                const rawMetrics = aiAnalysis.raw_metrics || {};
                const employment = rawMetrics.employmentBreakdown || [];
                const salary = rawMetrics.salaryBreakdown || [];
                const disqualifications = rawMetrics.disqualificationReasons || [];
                
                if (employment.length === 0 && salary.length === 0 && disqualifications.length === 0) return null;
                
                const totalEmp = employment.reduce((acc: number, item: any) => acc + item.count, 0) || 1;
                const totalSal = salary.reduce((acc: number, item: any) => acc + item.count, 0) || 1;
                const totalDisq = disqualifications.reduce((acc: number, item: any) => acc + item.count, 0) || 1;
                
                return (
                  <div className="space-y-6">
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-r-4 border-indigo-500 pr-3.5">📊 פילוח נתונים כמותי (מתוך בסיס הנתונים)</h4>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      
                      {/* Employment Status Chart */}
                      <div className="p-6 rounded-3xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                        <div>
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">פילוח תעסוקתי של הלידים</h5>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">התפלגות מקום עבודה המדווחת בשיחות</p>
                        </div>
                        <div className="space-y-3.5">
                          {employment.map((item: any, idx: number) => {
                            const pct = Math.round((item.count / totalEmp) * 100);
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-700 dark:text-slate-300">👤 {item.status || 'לא צוין'}</span>
                                  <span className="text-indigo-600 dark:text-indigo-400 font-black">{item.count} לידים ({pct}%)</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                  <div className="bg-gradient-to-r from-violet-600 to-indigo-600 h-full rounded-full transition-all duration-[1500ms] ease-out" style={{ width: pct + "%" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Salary Levels Chart */}
                      <div className="p-6 rounded-3xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                        <div>
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">פילוח רמות שכר מדווחות</h5>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">פוטנציאל החזר מס ע"פ גובה שכר</p>
                        </div>
                        <div className="space-y-3.5">
                          {salary.map((item: any, idx: number) => {
                            const pct = Math.round((item.count / totalSal) * 100);
                            const isHigh = item.salary?.includes('12') || item.salary?.includes('15') || item.salary?.includes('10') || parseFloat(item.salary || '0') >= 10000;
                            const color = isHigh ? 'from-emerald-500 to-teal-500' : 'from-indigo-500 to-violet-500';
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-700 dark:text-slate-300">💰 {item.salary || 'לא צוין'}</span>
                                  <span className="text-emerald-600 dark:text-emerald-400 font-black">{item.count} ({pct}%)</span>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                  <div className={"bg-gradient-to-r h-full rounded-full transition-all duration-[1500ms] ease-out " + color} style={{ width: pct + "%" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                      {/* Disqualifications & Alternative channels Chart */}
                      <div className="p-6 rounded-3xl border dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 space-y-4">
                        <div>
                          <h5 className="text-xs font-black text-slate-800 dark:text-slate-200">סיבות פסילת לידים ותעלות חלופיות</h5>
                          <p className="text-[9px] font-bold text-slate-400 mt-0.5">זיהוי אובדן פוטנציאל עסקי מסיבות פסילה</p>
                        </div>
                        <div className="space-y-3.5">
                          {disqualifications.map((item: any, idx: number) => {
                            const pct = Math.round((item.count / totalDisq) * 100);
                            let tip = "";
                            let color = "from-rose-500 to-red-500";
                            if (item.reason === 'אין מספיק מס הכנסה') {
                              tip = "💡 סיעודי/פנסיה";
                              color = "from-amber-500 to-orange-500";
                            } else if (item.reason === 'אין עילה רפואית') {
                              tip = "💡 מסלול החזר מס";
                              color = "from-indigo-500 to-violet-500";
                            } else if (item.reason === 'אין מענה חוזר') {
                              tip = "💡 חוק 3 ניסיונות";
                              color = "from-slate-500 to-slate-600";
                            }
                            return (
                              <div key={idx} className="space-y-1.5">
                                <div className="flex justify-between items-center text-[10px] font-bold">
                                  <span className="text-slate-700 dark:text-slate-300 truncate max-w-[100px]" title={item.reason}>⚠️ {item.reason || 'אחר'}</span>
                                  <div className="flex items-center gap-1 flex-shrink-0">
                                    {tip && <span className="text-[8px] font-black bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 px-1.5 py-0.5 rounded border border-indigo-100/50 dark:border-indigo-900/30">{tip}</span>}
                                    <span className="text-rose-500 font-black">{item.count}</span>
                                  </div>
                                </div>
                                <div className="w-full h-3 bg-slate-100 dark:bg-slate-800/80 rounded-full overflow-hidden shadow-inner">
                                  <div className={"bg-gradient-to-r h-full rounded-full transition-all duration-[1500ms] ease-out " + color} style={{ width: pct + "%" }} />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      
                    </div>
                  </div>
                );
              })()}

              {/* Action items checklist */}
              <div className="space-y-4">
                <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-r-4 border-indigo-500 pr-3.5">⚡ צ'קליסט משימות אופרטיבי לגילי</h4>
                <div className="space-y-4">
                  {(aiAnalysis.analysis || aiAnalysis).action_items?.map((item: any, idx: number) => {
                    const checked = !!checkedActionItems[idx];
                    const priorityColors: Record<string, string> = {
                      high: "bg-red-50 text-red-600 dark:bg-red-950/25 dark:text-red-400 border-red-100/50 dark:border-red-900/20",
                      medium: "bg-amber-50 text-amber-600 dark:bg-amber-950/25 dark:text-amber-400 border-amber-100/50 dark:border-amber-900/20",
                      low: "bg-blue-50 text-blue-600 dark:bg-blue-950/25 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/20",
                    };
                    const priorityLabels: Record<string, string> = {
                      high: "עדיפות דחופה",
                      medium: "עדיפות בינונית",
                      low: "עדיפות משנית"
                    };
                    const pClass = priorityColors[item.priority] || priorityColors.medium;
                    const pLabel = priorityLabels[item.priority] || "בינונית";
                    
                    return (
                      <div 
                        key={idx} 
                        onClick={() => setCheckedActionItems(prev => ({ ...prev, [idx]: !prev[idx] }))}
                        className={"p-5 rounded-2xl border transition-all duration-300 cursor-pointer flex gap-4 " + (checked ? "bg-slate-50 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800/80 opacity-60" : "bg-white dark:bg-slate-900 border-indigo-100/60 dark:border-indigo-950/40 hover:border-indigo-400 hover:shadow-md")}
                      >
                        <div className="mt-1 flex-shrink-0">
                          {checked ? (
                            <CheckSquare className="w-5 h-5 text-indigo-500" />
                          ) : (
                            <Square className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                          )}
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex flex-wrap items-center gap-2.5">
                            <span className={"text-sm font-black " + (checked ? "line-through text-slate-400 dark:text-slate-500" : "text-slate-800 dark:text-slate-100")}>{item.action}</span>
                            <span className={"text-[9px] font-black px-2.5 py-0.5 rounded-full border " + pClass}>{pLabel}</span>
                            <span className="text-[9px] font-black px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/25 dark:text-emerald-400 border border-emerald-100/50 dark:border-emerald-900/20">השפעה: {item.impact}</span>
                          </div>
                          
                          <p className={"text-xs font-bold leading-relaxed " + (checked ? "text-slate-400 dark:text-slate-500" : "text-slate-500 dark:text-slate-400")}>{item.explanation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Trend insight footer card */}
              <div className="p-6 rounded-2xl bg-slate-950 text-slate-100 border border-slate-800 shadow-xl flex items-start gap-4">
                <Brain className="w-8 h-8 text-indigo-400 flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h5 className="text-xs font-black text-indigo-300 uppercase tracking-wider">תובנת מגמה רוחבית (סו-שף Insights)</h5>
                  <p className="text-xs font-bold leading-relaxed text-slate-300">{aiAnalysis.leads_trend_insight}</p>
                </div>
              </div>

            </div>
          ) : null}

        </div>
      </aside>

      </main>
    </div>
  );
}

interface CsvImportModalProps {
  onClose: () => void;
  onImportComplete: () => void;
  leadsList: Lead[];
}

function CsvImportModal({ onClose, onImportComplete, leadsList }: CsvImportModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [csvText, setCsvText] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [selectedNameHeader, setSelectedNameHeader] = useState("");
  const [selectedPhoneHeader, setSelectedPhoneHeader] = useState("");
  const [selectedCampaignHeader, setSelectedCampaignHeader] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");

  const parseCsvLine = (line: string, sep: string) => {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === sep && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMsg("");
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      setErrorMsg("נא לבחור קובץ CSV תקין בלבד (סיומת .csv)");
      return;
    }

    setFile(selectedFile);
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        setCsvText(text);
        
        // Split by newlines
        const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
        if (lines.length === 0) {
          setErrorMsg("קובץ ה-CSV ריק.");
          return;
        }

        const firstLine = lines[0];
        // Auto detect separator
        const separators = [',', ';', '\t'];
        let bestSep = ',';
        let maxCount = -1;
        separators.forEach(sep => {
          const count = firstLine.split(sep).length - 1;
          if (count > maxCount) {
            maxCount = count;
            bestSep = sep;
          }
        });

        // Parse headers
        const rawHeaders = parseCsvLine(firstLine, bestSep);
        const parsedHeaders = rawHeaders.map(h => h.replace(/^["']|["']$/g, '').trim());
        setHeaders(parsedHeaders);

        // Parse rows
        const parsedRows = lines.slice(1).map(line => {
          const vals = parseCsvLine(line, bestSep);
          return vals.map(v => v.replace(/^["']|["']$/g, '').trim());
        });
        setRows(parsedRows);

        // Auto select best headers
        const bestNameIdx = parsedHeaders.findIndex(h => 
          h.includes('שם') || h.includes('לקוח') || h.toLowerCase().includes('name') || h.toLowerCase().includes('client')
        );
        if (bestNameIdx !== -1) setSelectedNameHeader(parsedHeaders[bestNameIdx]);

        const bestPhoneIdx = parsedHeaders.findIndex(h => 
          h.includes('טלפון') || h.includes('נייד') || h.toLowerCase().includes('phone') || h.toLowerCase().includes('mobile') || h.includes('מספר')
        );
        if (bestPhoneIdx !== -1) setSelectedPhoneHeader(parsedHeaders[bestPhoneIdx]);

        const bestCampaignIdx = parsedHeaders.findIndex(h => 
          h.includes('קמפיין') || h.includes('ערוץ') || h.toLowerCase().includes('campaign') || h.toLowerCase().includes('utm_campaign') || h.toLowerCase().includes('source')
        );
        if (bestCampaignIdx !== -1) setSelectedCampaignHeader(parsedHeaders[bestCampaignIdx]);

      } catch (err: any) {
        setErrorMsg(`כשל בניתוח הקובץ: ${err.message}`);
      }
    };
    reader.readAsText(selectedFile, "utf-8");
  };

  const handleStartImport = async () => {
    const nameIdx = headers.indexOf(selectedNameHeader);
    const phoneIdx = headers.indexOf(selectedPhoneHeader);
    const campaignIdx = selectedCampaignHeader ? headers.indexOf(selectedCampaignHeader) : -1;

    if (nameIdx === -1 || phoneIdx === -1) {
      setErrorMsg("נא לבחור עמודת שם ועמודת טלפון למיפוי.");
      return;
    }

    setIsImporting(true);
    setImportProgress(0);

    let successCount = 0;
    try {
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rawName = row[nameIdx] || "";
        const rawPhone = row[phoneIdx] || "";
        const rawCampaign = campaignIdx !== -1 ? row[campaignIdx] || "" : "";

        // Skip rows with empty names and phones
        if (!rawName.trim() && !rawPhone.trim()) continue;

        // Generate Lead object
        const newLead: Lead = {
          id: crypto.randomUUID(),
          clientName: rawName.trim() || "לקוח ייבוא",
          phone: rawPhone.trim(),
          source: "Manual",
          createdAt: new Date().toISOString(),
          lastContacted: null,
          status: "חדש",
          followUpDate: "",
          generalNotes: "",
          liveCallNotes: "",
          urgency: "בינונית",
          callCount: 0,
          campaign: rawCampaign.trim() || undefined
        };

        // Call database update api
        await fetch('/api/leads/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newLead)
        });

        successCount++;
        setImportProgress(Math.round(((i + 1) / rows.length) * 100));
      }

      onImportComplete();
    } catch (err: any) {
      setErrorMsg(`שגיאה במהלך הייבוא: ${err.message}. ${successCount} לידים יובאו בהצלחה.`);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-300" dir="rtl">
      <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-[36px] border dark:border-slate-800 shadow-2xl p-8 flex flex-col gap-6 overflow-hidden max-h-[90vh]">
        
        {/* Header */}
        <div className="flex justify-between items-center border-b dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center"><Upload className="w-5 h-5" /></div>
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white">ייבוא לידים מקובץ CSV</h3>
              <p className="text-xs font-bold text-slate-400">ייבוא המוני של לקוחות ישירות למערכת</p>
            </div>
          </div>
          <button onClick={onClose} disabled={isImporting} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-600 transition-all"><X className="w-5 h-5" /></button>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/30 text-sm font-bold flex items-start gap-2">
            <span className="mt-0.5">⚠️</span>
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Content */}
        {!file ? (
          /* Step 1: Upload File */
          <div className="flex flex-col items-center justify-center border-4 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-12 hover:border-emerald-500/50 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer relative group">
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <Upload className="w-16 h-16 text-slate-300 dark:text-slate-700 group-hover:text-emerald-500 transition-colors mb-4" />
            <h4 className="font-black text-slate-700 dark:text-slate-200 text-lg mb-1">לחץ לבחירת קובץ או גרור לכאן</h4>
            <p className="text-xs font-bold text-slate-400">קובץ CSV בלבד (.csv)</p>
          </div>
        ) : isImporting ? (
          /* Step 3: Progress */
          <div className="flex flex-col items-center justify-center py-12 gap-5">
            <Loader2 className="animate-spin text-emerald-500 w-12 h-12" />
            <div className="text-center">
              <h4 className="font-black text-slate-700 dark:text-slate-200 text-lg">מייבא לידים למסד הנתונים...</h4>
              <p className="text-xs font-bold text-slate-400 mt-1">נא לא לסגור חלון זה</p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 h-3 rounded-full overflow-hidden mt-2 max-w-sm">
              <div 
                className="bg-emerald-500 h-full transition-all duration-300 rounded-full" 
                style={{ width: `${importProgress}%` }}
              />
            </div>
            <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">{importProgress}%</span>
          </div>
        ) : (
          /* Step 2: Mapping Columns */
          <div className="flex flex-col gap-6 overflow-y-auto">
            <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-800/30 border dark:border-slate-800 p-4 rounded-2xl">
              <div>
                <h4 className="font-black text-sm text-slate-700 dark:text-slate-200">{file.name}</h4>
                <p className="text-xs text-slate-400 font-bold mt-0.5">גודל: {(file.size / 1024).toFixed(1)} KB | נמצאו {rows.length} שורות</p>
              </div>
              <button 
                onClick={() => { setFile(null); setHeaders([]); setRows([]); }}
                className="text-xs font-black text-slate-400 hover:text-red-500 transition-all underline"
              >
                החלף קובץ
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Name Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-500">עמודת שם לקוח (Client Name)</label>
                <select 
                  value={selectedNameHeader}
                  onChange={(e) => setSelectedNameHeader(e.target.value)}
                  className="w-full rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                >
                  <option value="" disabled>בחר עמודה...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Phone Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-500">עמודת מספר טלפון (Phone)</label>
                <select 
                  value={selectedPhoneHeader}
                  onChange={(e) => setSelectedPhoneHeader(e.target.value)}
                  className="w-full rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                >
                  <option value="" disabled>בחר עמודה...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>

              {/* Campaign Selection */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-black text-slate-500">עמודת קמפיין (Campaign - אופציונלי)</label>
                <select 
                  value={selectedCampaignHeader}
                  onChange={(e) => setSelectedCampaignHeader(e.target.value)}
                  className="w-full rounded-2xl border dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-sm px-4 py-3 outline-none focus:ring-4 focus:ring-indigo-500/10 transition-all shadow-sm"
                >
                  <option value="">ללא מיפוי (ריק)...</option>
                  {headers.map(h => <option key={h} value={h}>{h}</option>)}
                </select>
              </div>
            </div>

            {/* Live Preview */}
            {selectedNameHeader && selectedPhoneHeader && (
              <div className="flex flex-col gap-3 border-2 border-dashed dark:border-slate-800 rounded-2xl p-4">
                <h5 className="text-xs font-black text-slate-400">תצוגה מקדימה של 3 השורות הראשונות:</h5>
                <div className="divide-y dark:divide-slate-800">
                  {rows.slice(0, 3).map((row, idx) => {
                    const nameVal = row[headers.indexOf(selectedNameHeader)] || "";
                    const phoneVal = row[headers.indexOf(selectedPhoneHeader)] || "";
                    const campaignVal = selectedCampaignHeader ? row[headers.indexOf(selectedCampaignHeader)] || "" : "";
                    return (
                      <div key={idx} className="flex justify-between items-center py-2 text-xs font-bold text-slate-600 dark:text-slate-300">
                        <div className="flex items-center gap-2">
                          <span>👤 {nameVal || "(ריק)"}</span>
                          {campaignVal && (
                            <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                              📢 קמפיין: {campaignVal}
                            </span>
                          )}
                        </div>
                        <span className="font-mono">{phoneVal || "(ריק)"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Footer Buttons */}
            <div className="flex gap-3 justify-end mt-4">
              <button 
                onClick={onClose}
                className="px-6 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 text-sm font-black transition-all"
              >
                ביטול
              </button>
              <button 
                onClick={handleStartImport}
                disabled={!selectedNameHeader || !selectedPhoneHeader}
                className="px-8 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm shadow-md shadow-emerald-600/15 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
              >
                ייבא {rows.length} לידים
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
