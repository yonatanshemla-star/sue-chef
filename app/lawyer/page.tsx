"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import { 
  Phone, Clock, RefreshCw, Moon, Sun, PhoneCall, PhoneOff, X, 
  Loader2, Search, Calendar, Users, Briefcase, Settings, LogOut, 
  CheckCircle, ChevronDown, Mic, MicOff, Scale, Archive, ArrowRight,
  Filter, Check, FileText, AlertCircle, Sparkles, MessageSquare, Tag
} from "lucide-react";
import type { Lead } from "@/utils/storage";

const STATUS_OPTIONS: Record<string, { label: string; badge: string }> = {
  'חדש': { label: '🆕 חדש', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800' },
  'רלוונטי - לעקוב': { label: '🟡 רלוונטי - לעקוב', badge: 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800' },
  'מחכה לחתימה': { label: '✍️ מחכה לחתימה', badge: 'bg-yellow-100 text-yellow-900 dark:bg-yellow-950/60 dark:text-yellow-300 border-yellow-300 dark:border-yellow-800' },
  'לחזור אליו': { label: '📞 לחזור אליו', badge: 'bg-teal-100 text-teal-900 dark:bg-teal-950/60 dark:text-teal-300 border-teal-300 dark:border-teal-800' },
  'בטיפול': { label: '⚖️ בטיפול', badge: 'bg-lime-100 text-lime-900 dark:bg-lime-950/60 dark:text-lime-300 border-lime-300 dark:border-lime-800' },
  'לא ענה': { label: '📵 לא ענה', badge: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-300 dark:border-slate-700' },
  'חתם': { label: '🏆 חתם', badge: 'bg-emerald-200 text-emerald-950 dark:bg-emerald-900 dark:text-emerald-200 border-emerald-400 dark:border-emerald-600' },
  'לא רלוונטי': { label: '🔇 לא רלוונטי', badge: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800' },
  'אחר': { label: '📝 אחר', badge: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300 dark:border-gray-700' },
};

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
}

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export default function LawyerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'campaigns'>('crm');
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("הכל");
  
  // Twilio WebRTC State
  const [deviceInstance, setDeviceInstance] = useState<any>(null);
  const [callStatus, setCallStatus] = useState<'idle' | 'initiating' | 'ringing' | 'connected' | 'completed'>('idle');
  const [activeCall, setActiveCall] = useState<any>(null);
  const [activeLead, setActiveLead] = useState<Lead | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callStatusMessage, setCallStatusMessage] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<any>(null);
  const [recentCalls, setRecentCalls] = useState<{ id: string; name: string; phone: string; duration: number; time: string }[]>([]);

  // Notes Modal State
  const [notesModalLead, setNotesModalLead] = useState<Lead | null>(null);
  const [modalGeneralNotes, setModalGeneralNotes] = useState("");
  const [modalLiveNotes, setModalLiveNotes] = useState("");
  const [isSavingNotes, setIsSavingNotes] = useState(false);

  // Campaign Settings State
  const [campaignsList, setCampaignsList] = useState<{ name: string; count: number; isExcluded: boolean }[]>([]);
  const [excludedCampaigns, setExcludedCampaigns] = useState<string[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);
  const [savingCampaign, setSavingCampaign] = useState<string | null>(null);

  // Audio elements for ringback
  const ringbackAudioRef = useRef<HTMLAudioElement | null>(null);
  const durationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Detect theme & role
  useEffect(() => {
    setMounted(true);
    const isUserAdmin = document.cookie.split(';').some(c => c.trim().startsWith('sue_chef_auth=admin'));
    setIsAdmin(isUserAdmin);

    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    } else {
      setDarkMode(false);
      document.documentElement.classList.remove('dark');
    }
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  // Call timer
  useEffect(() => {
    if (callStatus === 'connected') {
      durationTimerRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
      if (callStatus === 'idle') setCallDuration(0);
    }
    return () => {
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, [callStatus]);

  // Initialize Twilio Device for WebRTC
  const initTwilioDevice = async () => {
    if (deviceInstance) return deviceInstance;
    try {
      const res = await fetch('/api/twilio/token?role=lawyer');
      const data = await res.json();
      if (!data.token) throw new Error(data.error || 'נכשלה הפקת טוקן שיחה');

      const { Device } = await import('@twilio/voice-sdk');
      const device = new Device(data.token, {
        logLevel: 1,
        codecPreferences: ['opus' as any, 'pcmu' as any],
        edge: ['roaming', 'frankfurt', 'ashburn'],
      });

      device.on('error', (err: any) => console.error('Twilio Voice Error:', err));

      device.on('incoming', (call: any) => {
        const callerNum = call.customParameters?.get('leadPhone') || call.parameters?.From || '';
        setIncomingCall({ call, callerNumber: callerNum });

        call.on('disconnect', () => {
          setIncomingCall(null);
          setCallStatus('completed');
          setActiveCall(null);
        });
        call.on('cancel', () => setIncomingCall(null));
      });

      setDeviceInstance(device);
      return device;
    } catch (e) {
      console.error('Failed to init WebRTC device:', e);
      return null;
    }
  };

  // Fetch leads
  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/lawyer/leads');
      const data = await res.json();
      if (data.success) {
        setLeads(data.leads || []);
        if (data.excludedCampaigns) setExcludedCampaigns(data.excludedCampaigns);
      }
    } catch (err) {
      console.error('Fetch leads error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch campaign settings
  const fetchCampaignSettings = async () => {
    setLoadingCampaigns(true);
    try {
      const res = await fetch('/api/lawyer/settings/campaigns');
      const data = await res.json();
      if (data.success) {
        setCampaignsList(data.campaigns || []);
        setExcludedCampaigns(data.excludedCampaigns || []);
      }
    } catch (err) {
      console.error('Fetch campaigns error:', err);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 45000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (activeTab === 'campaigns') {
      fetchCampaignSettings();
    }
  }, [activeTab]);

  // Update lead
  const handleUpdateLead = async (id: string, updates: Partial<Lead>) => {
    // Optimistic UI update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    try {
      await fetch('/api/lawyer/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates })
      });
    } catch (err) {
      console.error('Update lead error:', err);
      fetchLeads();
    }
  };

  // Toggle Campaign exclusion
  const handleToggleCampaign = async (campaignName: string, currentExcluded: boolean) => {
    setSavingCampaign(campaignName);
    const newExcluded = currentExcluded
      ? excludedCampaigns.filter(c => c.toLowerCase() !== campaignName.toLowerCase())
      : [...excludedCampaigns, campaignName];

    setExcludedCampaigns(newExcluded);
    setCampaignsList(prev => prev.map(c => c.name === campaignName ? { ...c, isExcluded: !currentExcluded } : c));

    try {
      await fetch('/api/lawyer/settings/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedCampaigns: newExcluded })
      });
      // Refresh leads to reflect newly excluded/included campaigns
      fetchLeads();
    } catch (err) {
      console.error('Toggle campaign error:', err);
      fetchCampaignSettings();
    } finally {
      setSavingCampaign(null);
    }
  };

  // Call lead via Twilio WebRTC
  const handleCallLead = async (lead: Lead) => {
    if (!lead.phone) return;
    try {
      setCallStatus('initiating');
      setCallStatusMessage('מאתחל שיחה...');
      setActiveLead(lead);

      const device = await initTwilioDevice();
      if (!device) {
        setCallStatus('completed');
        setCallStatusMessage('שגיאה בחיבור לשירות השיחות');
        setTimeout(() => setCallStatus('idle'), 3000);
        return;
      }

      setCallStatus('ringing');
      setCallStatusMessage('מחייג ללקוח...');

      const call = await device.connect({
        params: {
          phone: lead.phone,
          to: lead.phone,
          To: lead.phone,
          callerRole: 'lawyer',
          role: 'lawyer'
        }
      });

      setActiveCall(call);
      setIsMuted(false);

      call.on('accept', () => {
        setCallStatus('connected');
        setCallStatusMessage('בשיחה פעילה (קו 053-7710090)');
      });

      call.on('disconnect', () => {
        setCallStatus('completed');
        setCallStatusMessage('השיחה הסתיימה');
        setActiveCall(null);
        setRecentCalls(prev => [
          { id: lead.id, name: lead.clientName, phone: lead.phone || '', duration: callDuration, time: new Date().toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' }) },
          ...prev.slice(0, 19)
        ]);
        // Increment call count
        handleUpdateLead(lead.id, {
          callCount: (lead.callCount || 0) + 1,
          lastContacted: new Date().toISOString()
        });
        setTimeout(() => setCallStatus('idle'), 3000);
      });

      call.on('cancel', () => {
        setCallStatus('completed');
        setCallStatusMessage('השיחה בוטלה או לא נענתה');
        setActiveCall(null);
        setTimeout(() => setCallStatus('idle'), 3000);
      });

    } catch (err: any) {
      console.error('Call failed:', err);
      setCallStatus('completed');
      setCallStatusMessage('שגיאה בביצוע השיחה');
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  };

  const handleHangup = () => {
    if (activeCall) {
      activeCall.disconnect();
    }
    setCallStatus('completed');
    setTimeout(() => setCallStatus('idle'), 2000);
  };

  const handleToggleMute = () => {
    if (activeCall) {
      const nextMute = !isMuted;
      activeCall.mute(nextMute);
      setIsMuted(nextMute);
    }
  };

  const handleAcceptIncoming = () => {
    if (incomingCall && incomingCall.call) {
      incomingCall.call.accept();
      setActiveCall(incomingCall.call);
      setCallStatus('connected');
      setCallStatusMessage('בשיחה נכנסת פעילה');
      setIncomingCall(null);
    }
  };

  const handleRejectIncoming = () => {
    if (incomingCall && incomingCall.call) {
      incomingCall.call.reject();
      setIncomingCall(null);
    }
  };

  const handleLogout = () => {
    document.cookie = 'sue_chef_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  // Filter leads
  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      // Archive vs CRM filter
      const isArchived = lead.status === 'לא רלוונטי' || lead.status === 'נגמר';
      if (activeTab === 'archive' && !isArchived) return false;
      if (activeTab === 'crm' && isArchived) return false;

      // Status filter
      if (statusFilter !== 'הכל' && lead.status !== statusFilter) return false;

      // Search filter
      if (search.trim()) {
        const q = search.toLowerCase();
        const nameMatch = lead.clientName?.toLowerCase().includes(q);
        const phoneMatch = lead.phone?.includes(q);
        const notesMatch = lead.generalNotes?.toLowerCase().includes(q) || lead.liveCallNotes?.toLowerCase().includes(q);
        const campaignMatch = lead.campaign?.toLowerCase().includes(q);
        return Boolean(nameMatch || phoneMatch || notesMatch || campaignMatch);
      }

      return true;
    });
  }, [leads, activeTab, statusFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = leads.filter(l => l.status !== 'לא רלוונטי' && l.status !== 'נגמר').length;
    const newCount = leads.filter(l => l.status === 'חדש').length;
    const inProgress = leads.filter(l => l.status === 'בטיפול' || l.status === 'רלוונטי - לעקוב' || l.status === 'מחכה לחתימה').length;
    const signedCount = leads.filter(l => l.status === 'חתם' || l.isSigned).length;
    return { total, newCount, inProgress, signedCount };
  }, [leads]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-300 ${darkMode ? 'dark text-slate-100 bg-[#0a0f0d]' : 'text-slate-900 bg-gradient-to-br from-emerald-50/40 via-amber-50/30 to-slate-50'} relative overflow-x-hidden`} style={{ zoom: 0.88 }}>
      
      {/* Background ambient luxury glow (Warm Amber & Emerald Green) */}
      <div className="fixed inset-0 -z-10 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] right-[-5%] w-[600px] h-[600px] rounded-full blur-[160px] opacity-25 bg-emerald-500 dark:bg-emerald-600/20" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[550px] h-[550px] rounded-full blur-[150px] opacity-20 bg-amber-400 dark:bg-amber-600/15" />
      </div>

      {/* Floating Incoming Call Alert */}
      {incomingCall && (
        <div 
          dir="rtl"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[400] w-11/12 max-w-lg bg-gradient-to-r from-emerald-800 via-teal-900 to-slate-900 text-white p-5 rounded-3xl shadow-[0_20px_60px_rgba(16,185,129,0.5)] border-2 border-emerald-400/60 animate-in fade-in slide-in-from-top-6 duration-300 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/30 flex items-center justify-center animate-bounce flex-shrink-0">
              <PhoneCall className="w-6 h-6 text-emerald-300" />
            </div>
            <div>
              <span className="text-[10px] font-bold tracking-widest bg-emerald-500/40 text-emerald-200 px-2.5 py-0.5 rounded-full uppercase">
                שיחה נכנסת לקו 053-7710090
              </span>
              <h4 className="font-bold text-base text-white mt-1">
                {incomingCall.callerNumber ? `מספר: ${incomingCall.callerNumber}` : 'שיחה נכנסת חדשה'}
              </h4>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAcceptIncoming}
              className="px-5 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/40 hover:scale-105 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" /> ענה בדפדפן
            </button>
            <button
              onClick={handleRejectIncoming}
              className="p-3 rounded-2xl bg-slate-800/80 hover:bg-rose-700 text-slate-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Active Call Floating Widget */}
      {(callStatus === 'initiating' || callStatus === 'ringing' || callStatus === 'connected') && (
        <div 
          dir="rtl"
          className="fixed top-5 left-1/2 -translate-x-1/2 z-[300] w-11/12 max-w-xl bg-slate-900/95 text-white px-5 py-4 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] border border-emerald-500/40 backdrop-blur-xl animate-in fade-in slide-in-from-top-6 duration-300 flex items-center justify-between gap-4"
        >
          <div className="flex items-center gap-3">
            <div className={`w-12 h-10 rounded-2xl flex items-center justify-center font-mono font-bold text-xs shadow-inner ${
              callStatus === 'connected' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 animate-pulse' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
            }`}>
              {callStatus === 'connected' ? formatDuration(callDuration) : '...'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${callStatus === 'connected' ? 'bg-emerald-400 animate-ping' : 'bg-amber-400 animate-pulse'}`} />
                <h4 className="font-bold text-sm text-white leading-tight">
                  {activeLead?.clientName || 'לקוח בשיחה'}
                </h4>
              </div>
              <p className="text-xs text-emerald-300/80 font-mono mt-0.5" dir="ltr">
                {activeLead?.phone || ''}
              </p>
            </div>
          </div>

          <div className="text-xs font-bold text-slate-300 bg-slate-800/90 px-3 py-1.5 rounded-xl border border-slate-700/60 hidden sm:block">
            {callStatusMessage || 'מחייג...'}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleMute}
              className={`p-2.5 rounded-xl transition-all ${isMuted ? 'bg-amber-500/30 text-amber-300' : 'bg-slate-800 text-slate-300 hover:text-white'}`}
              title={isMuted ? 'בטל השתקה' : 'השתק'}
            >
              {isMuted ? <MicOff className="w-5 h-5 text-amber-400" /> : <Mic className="w-5 h-5" />}
            </button>
            <button
              onClick={handleHangup}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-rose-600/30 hover:scale-105 active:scale-95 transition-all"
            >
              <PhoneOff className="w-4 h-4" />
              <span>נתק</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Container */}
      <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans relative z-10" dir="rtl">
        
        {/* Top Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          
          {/* Logo & Title */}
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 text-white flex-shrink-0">
              <Scale className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
                  Sue-Chef
                </h1>
                <span className="text-[10px] bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/30 font-bold tracking-widest uppercase">
                  Lead Management
                </span>
                <span className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/30 font-bold tracking-widest uppercase">
                  v5.9.5
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                מערכת ניהול לידים מתקדמת
              </p>
            </div>
          </div>

          {/* Action Header Controls */}
          <div className="flex items-center gap-3 flex-wrap">
            
            {/* Active Phone Badge */}
            <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/90 dark:bg-slate-900/90 border border-emerald-500/30 dark:border-emerald-500/20 shadow-sm">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">קו שיחות יוצאות</p>
                <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400 font-mono" dir="ltr">053-7710090</p>
              </div>
            </div>

            {/* Admin Switcher Button (Only shown if admin logged in) */}
            {isAdmin && (
              <a
                href="/"
                className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 font-bold text-xs border border-amber-300/50 dark:border-amber-700/50 transition-all flex items-center gap-2 shadow-sm"
              >
                <span>← חזרה לדשבורד הראשי</span>
              </a>
            )}

            {/* Dark Mode Toggle */}
            <button
              onClick={() => {
                const nextVal = !darkMode;
                setDarkMode(nextVal);
                localStorage.setItem('theme', nextVal ? 'dark' : 'light');
              }}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all text-amber-500"
              title="החלף מצב תצוגה"
            >
              {darkMode ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {/* Refresh */}
            <button
              onClick={fetchLeads}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow transition-all text-emerald-600 dark:text-emerald-400"
              title="רענן לידים"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-600 transition-all"
              title="התנתק מהמערכת"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400">סה"כ לידים פעילים</span>
              <Users className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-emerald-200/60 dark:border-emerald-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">לידים חדשים</span>
              <Sparkles className="w-5 h-5 text-emerald-500" />
            </div>
            <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.newCount}</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-amber-200/60 dark:border-amber-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-amber-600 dark:text-amber-400">בטיפול / מעקב</span>
              <Clock className="w-5 h-5 text-amber-500" />
            </div>
            <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.inProgress}</p>
          </div>

          <div className="bg-white/90 dark:bg-slate-900/90 rounded-2xl p-5 border border-lime-200/60 dark:border-lime-900/40 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-lime-700 dark:text-lime-400">חתמו</span>
              <CheckCircle className="w-5 h-5 text-lime-600" />
            </div>
            <p className="text-3xl font-bold text-lime-700 dark:text-lime-400">{stats.signedCount}</p>
          </div>
        </div>

        {/* Tab Buttons (Refined Amber & Emerald Theme) */}
        <div className="flex flex-wrap gap-2 mb-6 p-1.5 rounded-2xl bg-white/70 dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-sm w-fit backdrop-blur-md">
          <button
            onClick={() => setActiveTab('crm')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'crm'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/30 scale-102'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400'
            }`}
          >
            <Briefcase size={16} /> טבלת מעקב
          </button>

          <button
            onClick={() => setActiveTab('calls')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'calls'
                ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/30 scale-102'
                : 'text-slate-600 dark:text-slate-400 hover:text-amber-600 dark:hover:text-amber-400'
            }`}
          >
            <Phone size={16} /> שיחות שבוצעו ({recentCalls.length})
          </button>

          <button
            onClick={() => setActiveTab('campaigns')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'campaigns'
                ? 'bg-gradient-to-r from-lime-600 to-emerald-600 text-white shadow-md shadow-lime-600/30 scale-102'
                : 'text-slate-600 dark:text-slate-400 hover:text-lime-600 dark:hover:text-lime-400'
            }`}
          >
            <Settings size={16} /> הגדרות קמפיינים
          </button>

          <button
            onClick={() => setActiveTab('archive')}
            className={`px-6 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-2 ${
              activeTab === 'archive'
                ? 'bg-gradient-to-r from-slate-700 to-slate-800 text-white shadow-md scale-102'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Archive size={16} /> ארכיון
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'campaigns' ? (
          /* Campaign Exclusion Settings */
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
            <div className="flex items-center justify-between mb-6 pb-4 border-b dark:border-slate-800">
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Tag className="w-5 h-5 text-emerald-500" /> סינון קמפיינים מ-lead.im
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  קבע אילו קמפיינים יכנסו לדשבורד שלך. קמפיין שמסומן כ"מוחרג" לא יציג לידים.
                </p>
              </div>
              <button
                onClick={fetchCampaignSettings}
                className="px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-700 transition-all flex items-center gap-1.5"
              >
                <RefreshCw size={14} className={loadingCampaigns ? 'animate-spin' : ''} /> רענן קמפיינים
              </button>
            </div>

            {loadingCampaigns ? (
              <div className="py-20 flex flex-col items-center justify-center text-slate-400">
                <Loader2 className="animate-spin text-emerald-500 mb-3" size={36} />
                <p className="text-sm font-bold">טוען הגדרות קמפיינים...</p>
              </div>
            ) : campaignsList.length === 0 ? (
              <div className="py-16 text-center text-slate-400">
                <p className="font-bold">לא נמצאו קמפיינים פעילים במערכת</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {campaignsList.map(camp => {
                  const isExcluded = excludedCampaigns.some(ex => ex.toLowerCase() === camp.name.toLowerCase());
                  const isBusy = savingCampaign === camp.name;

                  return (
                    <div
                      key={camp.name}
                      className={`p-4 rounded-2xl border transition-all flex items-center justify-between ${
                        isExcluded
                          ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/40 opacity-70'
                          : 'bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 shadow-sm'
                      }`}
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white">{camp.name}</h4>
                        <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">
                          {camp.count} לידים סה"כ
                        </span>
                      </div>

                      <button
                        onClick={() => handleToggleCampaign(camp.name, isExcluded)}
                        disabled={isBusy}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 ${
                          isExcluded
                            ? 'bg-rose-200 dark:bg-rose-900/60 text-rose-800 dark:text-rose-200 hover:bg-rose-300'
                            : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm'
                        }`}
                      >
                        {isBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : isExcluded ? (
                          <span>מוחרג (לחץ לקבל)</span>
                        ) : (
                          <>
                            <Check size={14} /> <span>פעיל</span>
                          </>
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === 'calls' ? (
          /* Recent Calls Tab */
          <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-sm animate-in fade-in">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
              <Phone className="w-5 h-5 text-amber-500" /> יומן שיחות אחרונות (קו 053-7710090)
            </h3>
            {recentCalls.length === 0 ? (
              <div className="py-20 text-center text-slate-400">
                <Phone className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p className="font-bold">טרם בוצעו שיחות בסשן הנוכחי</p>
                <p className="text-xs text-slate-400 mt-1">כל שיחה שתחייג מהדפדפן תתועד כאן עם משך השיחה והשעה</p>
              </div>
            ) : (
              <div className="divide-y dark:divide-slate-800">
                {recentCalls.map((c, i) => (
                  <div key={i} className="py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 flex items-center justify-center font-bold">
                        <Phone size={16} />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-slate-900 dark:text-white">{c.name}</p>
                        <p className="text-xs text-slate-400 font-mono" dir="ltr">{c.phone}</p>
                      </div>
                    </div>
                    <div className="text-left font-mono">
                      <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">{formatDuration(c.duration)}</p>
                      <p className="text-[10px] text-slate-400">{c.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* CRM Table (Main or Archive) */
          <div className="space-y-4">
            
            {/* Search and Filter Row */}
            <div className="flex flex-col sm:flex-row items-center gap-3 justify-between bg-white/90 dark:bg-slate-900/90 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="relative w-full sm:w-96">
                <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder="חיפוש לפי שם, טלפון, פתק, קמפיין..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="w-full pr-11 pl-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                {['הכל', 'חדש', 'רלוונטי - לעקוב', 'מחכה לחתימה', 'בטיפול', 'לא ענה', 'חתם'].map(st => (
                  <button
                    key={st}
                    onClick={() => setStatusFilter(st)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      statusFilter === st
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Leads Table Container */}
            <div className="bg-white/95 dark:bg-slate-900/95 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
              {loading ? (
                <div className="py-32 flex flex-col items-center justify-center text-slate-400">
                  <Loader2 className="animate-spin text-emerald-500 mb-4" size={44} />
                  <p className="font-bold text-sm">טוען לידים מהמערכת...</p>
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="py-24 text-center text-slate-400">
                  <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-bold text-base">לא נמצאו לידים תואמים</p>
                  <p className="text-xs text-slate-400 mt-1">נסה לשנות את מונח החיפוש או את סינון הסטטוס</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-sm">
                    <thead>
                      <tr className="border-b dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-xs font-bold">
                        <th className="py-4 px-6">שם לקוח</th>
                        <th className="py-4 px-4">טלפון וחיוג</th>
                        <th className="py-4 px-4">קמפיין</th>
                        <th className="py-4 px-4">תאריך קליטה</th>
                        <th className="py-4 px-4">סטטוס</th>
                        <th className="py-4 px-6 text-center">פתק והערות</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y dark:divide-slate-800/60 font-medium">
                      {filteredLeads.map(lead => {
                        const statusConf = STATUS_OPTIONS[lead.status] || STATUS_OPTIONS['אחר'];

                        return (
                          <tr key={lead.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors">
                            {/* Client Name */}
                            <td className="py-4 px-6">
                              <span className="font-bold text-slate-900 dark:text-white text-base">
                                {lead.clientName}
                              </span>
                              {lead.callCount && lead.callCount > 0 ? (
                                <span className="mr-2 text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 rounded-full font-mono">
                                  📞 {lead.callCount}
                                </span>
                              ) : null}
                            </td>

                            {/* Phone & 1-Click Dial */}
                            <td className="py-4 px-4">
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-700 dark:text-slate-300" dir="ltr">
                                  {lead.phone || '-'}
                                </span>
                                {lead.phone && (
                                  <button
                                    onClick={() => handleCallLead(lead)}
                                    title="חייג עכשיו מקו 053-7710090"
                                    className="p-2 rounded-xl bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900 text-emerald-700 dark:text-emerald-300 transition-all hover:scale-105 active:scale-95 shadow-sm"
                                  >
                                    <Phone size={15} />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* Campaign */}
                            <td className="py-4 px-4">
                              {lead.campaign ? (
                                <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border dark:border-slate-700 inline-block">
                                  {lead.campaign}
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400">-</span>
                              )}
                            </td>

                            {/* Date */}
                            <td className="py-4 px-4 text-xs text-slate-500 dark:text-slate-400">
                              {formatDate(lead.createdAt)}
                            </td>

                            {/* Status Selector */}
                            <td className="py-4 px-4">
                              <select
                                value={lead.status}
                                onChange={e => handleUpdateLead(lead.id, { status: e.target.value })}
                                className={`text-xs font-bold px-3 py-1.5 rounded-xl border outline-none cursor-pointer transition-all ${statusConf.badge}`}
                              >
                                {Object.keys(STATUS_OPTIONS).map(stKey => (
                                  <option key={stKey} value={stKey} className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">
                                    {STATUS_OPTIONS[stKey].label}
                                  </option>
                                ))}
                              </select>
                            </td>

                            {/* Notes Button */}
                            <td className="py-4 px-6 text-center">
                              <button
                                onClick={() => {
                                  setNotesModalLead(lead);
                                  setModalGeneralNotes(lead.generalNotes || "");
                                  setModalLiveNotes(lead.liveCallNotes || "");
                                }}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 mx-auto ${
                                  lead.generalNotes || lead.liveCallNotes
                                    ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                                }`}
                              >
                                <FileText size={14} />
                                <span>{lead.generalNotes || lead.liveCallNotes ? 'צפה / ערוך פתק' : 'הוסף פתק'}</span>
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Notes Modal */}
      {notesModalLead && (
        <div className="fixed inset-0 z-[350] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-in fade-in" dir="rtl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl p-6 border dark:border-slate-800 shadow-2xl flex flex-col gap-4">
            
            <div className="flex items-center justify-between pb-3 border-b dark:border-slate-800">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  פתק עבור {notesModalLead.clientName}
                </h3>
                <p className="text-xs text-slate-400 font-mono" dir="ltr">{notesModalLead.phone}</p>
              </div>
              <button
                onClick={() => setNotesModalLead(null)}
                className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  הערות כלליות / פתק לקוח:
                </label>
                <textarea
                  rows={4}
                  value={modalGeneralNotes}
                  onChange={e => setModalGeneralNotes(e.target.value)}
                  placeholder="כתוב כאן הערות לגבי הליד, תנאי התיק, סיכום פגישה וכו'..."
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 dark:text-slate-300 mb-1.5">
                  סיכום שיחות טלפון:
                </label>
                <textarea
                  rows={3}
                  value={modalLiveNotes}
                  onChange={e => setModalLiveNotes(e.target.value)}
                  placeholder="נקודות שעלו במהלך שיחות הטלפון..."
                  className="w-full p-3 rounded-2xl bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 text-sm font-medium outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900 dark:text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setNotesModalLead(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all"
              >
                ביטול
              </button>
              <button
                onClick={async () => {
                  setIsSavingNotes(true);
                  await handleUpdateLead(notesModalLead.id, {
                    generalNotes: modalGeneralNotes,
                    liveCallNotes: modalLiveNotes
                  });
                  setIsSavingNotes(false);
                  setNotesModalLead(null);
                }}
                disabled={isSavingNotes}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all shadow-md flex items-center gap-1.5"
              >
                {isSavingNotes ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                <span>שמור פתק</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
