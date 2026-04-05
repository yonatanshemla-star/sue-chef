"use client";

import React, { useEffect, useState, useMemo } from "react";
import { Users, DollarSign, RefreshCw, Loader2, Moon, Sun, FileText, Search, CheckCircle, Clock, ChevronDown, Phone, LogOut, Briefcase, TrendingUp, Scale } from "lucide-react";
import type { Lead } from "@/utils/storage";

const CASE_STATUSES = ["בטיפול", "הוגשה תביעה", "ממתין לדיון", "הסתיים", "אחר"];

function formatDate(d: string | null | undefined) {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return d;
  return new Intl.DateTimeFormat("he-IL", { dateStyle: "short" }).format(date);
}

export default function LawyerDashboard() {
  const [mounted, setMounted] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // Switch Role Logic
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

  useEffect(() => { setMounted(true); }, []);

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
      if (!localStorage.getItem('theme')) {
        setDarkMode(e.matches);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  const fetchLeads = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/lawyer/leads");
      const data = await res.json();
      if (data.success) setLeads(data.leads || []);
    } catch (e) {
      console.error("Fetch error:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
    const interval = setInterval(fetchLeads, 60000);
    return () => clearInterval(interval);
  }, []);

  const handleUpdate = async (id: string, field: string, value: any) => {
    // Optimistic update
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value } : l));
    try {
      await fetch("/api/lawyer/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, [field]: value }),
      });
    } catch (e) {
      console.error("Update error:", e);
      fetchLeads();
    }
  };

  const handleLogout = () => {
    document.cookie = 'sue_chef_auth=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  const filteredLeads = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return leads;
    return leads.filter(l =>
      l.clientName?.toLowerCase().includes(q) ||
      l.phone?.includes(q)
    );
  }, [leads, search]);

  const totalProfit = useMemo(() =>
    leads.reduce((sum, l) => sum + (l.profit || 0), 0),
    [leads]
  );

  const activeCases = useMemo(() =>
    leads.filter(l => l.caseStatus && l.caseStatus !== 'הסתיים').length,
    [leads]
  );

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={48} />
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100' : 'text-slate-900'} relative`} style={{ zoom: 0.85 }}>
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <div className={`absolute inset-0 ${darkMode ? 'bg-[#080b14]' : 'bg-gradient-to-br from-slate-50 via-emerald-50/30 to-slate-100'}`} />
        <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full blur-[150px] opacity-20 bg-emerald-500" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[120px] opacity-15 bg-blue-600" />
      </div>

      <main className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-10 gap-4">
          <div className="flex items-center gap-5">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-3xl flex items-center justify-center shadow-xl shadow-emerald-500/20">
              <Scale className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-slate-300 flex items-center gap-3">
                Sue-Chef 
                <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2.5 py-1 rounded-full border border-emerald-500/20 font-black tracking-widest uppercase">עו"ד</span>
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">מעקב לקוחות חתומים</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setShowSwitchModal(true)} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-emerald-600 hover:text-emerald-700 font-bold flex items-center gap-2">
              <RefreshCw className="w-5 h-5" /> חיוג מחדש / חזרה ל-CRM
            </button>
            <button onClick={() => {
              const nextVal = !darkMode;
              setDarkMode(nextVal);
              localStorage.setItem('theme', nextVal ? 'dark' : 'light');
            }} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
              <div className="relative w-5 h-5">
                <Sun className={`absolute inset-0 w-5 h-5 text-yellow-500 transition-all duration-500 ${darkMode ? 'scale-0 opacity-0' : 'scale-100 opacity-100'}`} />
                <Moon className={`absolute inset-0 w-5 h-5 text-indigo-400 transition-all duration-500 ${darkMode ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`} />
              </div>
            </button>
            <button onClick={fetchLeads} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm hover:shadow-md transition-all">
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin text-emerald-500' : 'text-gray-500'}`} />
            </button>
            <button onClick={handleLogout} className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border dark:border-slate-800 shadow-sm hover:shadow-md transition-all text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">לקוחות חתומים</p>
            </div>
            <p className="text-4xl font-black text-emerald-600 dark:text-emerald-400">{leads.length}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <Briefcase className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">תיקים פעילים</p>
            </div>
            <p className="text-4xl font-black text-blue-600 dark:text-blue-400">{activeCases}</p>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border dark:border-slate-800 shadow-sm hover:shadow-lg transition-all hover:-translate-y-1">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-amber-600 dark:text-amber-400" />
              </div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">סה"כ רווחים</p>
            </div>
            <p className="text-4xl font-black text-amber-600 dark:text-amber-400">₪{totalProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-8 group">
          <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" size={20} />
          <input
            type="text"
            placeholder="חיפוש לפי שם או טלפון..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-2xl pr-14 pl-6 py-4 outline-none font-bold shadow-sm focus:ring-4 focus:ring-emerald-500/10 transition-all text-slate-900 dark:text-white"
          />
        </div>

        {/* Client Cards */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <Loader2 className="animate-spin text-emerald-500 mb-4" size={48} />
              <p className="font-black">טוען לקוחות חתומים...</p>
            </div>
          ) : filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <Users size={64} className="mb-6 opacity-10" />
              <p className="font-black text-xl opacity-50">אין לקוחות חתומים להצגה</p>
            </div>
          ) : (
            filteredLeads.map((lead, idx) => (
              <div
                key={lead.id}
                className="bg-white dark:bg-slate-900 rounded-3xl border dark:border-slate-800 shadow-sm overflow-hidden transition-all duration-300 hover:shadow-lg animate-in fade-in slide-in-from-bottom-4"
                style={{ animationDelay: `${idx * 60}ms` }}
              >
                {/* Card Header */}
                <div
                  className="flex items-center justify-between p-6 cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  onClick={() => setExpandedId(expandedId === lead.id ? null : lead.id)}
                >
                  <div className="flex items-center gap-5">
                    <div className="w-14 h-14 bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900/30 dark:to-teal-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-black text-xl">
                      {lead.clientName?.charAt(0) || '?'}
                    </div>
                    <div>
                      <h3 className="text-lg font-black text-slate-900 dark:text-white">{lead.clientName || 'לקוח'}</h3>
                      <div className="flex items-center gap-4 text-sm text-slate-400">
                        {lead.phone && <span className="font-mono" dir="ltr">{lead.phone}</span>}
                        <span className="flex items-center gap-1"><Clock size={12} /> {formatDate(lead.signedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    {lead.profit ? (
                      <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-4 py-1.5 rounded-full">
                        ₪{lead.profit.toLocaleString()}
                      </span>
                    ) : null}
                    {lead.caseStatus && (
                      <span className={`text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-wide ${
                        lead.caseStatus === 'הסתיים' ? 'bg-slate-100 dark:bg-slate-800 text-slate-400' :
                        lead.caseStatus === 'הוגשה תביעה' ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' :
                        lead.caseStatus === 'ממתין לדיון' ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' :
                        'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {lead.caseStatus}
                      </span>
                    )}
                    <ChevronDown className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${expandedId === lead.id ? 'rotate-180' : ''}`} />
                  </div>
                </div>

                {/* Expanded Panel */}
                {expandedId === lead.id && (
                  <div className="px-6 pb-6 border-t dark:border-slate-800 pt-5 animate-in fade-in slide-in-from-top-2 duration-300 space-y-5">
                    {/* Yonatan's notes — read-only */}
                    {(lead.generalNotes || lead.liveCallNotes) && (
                      <div className="bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl p-5 border border-indigo-100/50 dark:border-indigo-900/30">
                        <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 flex items-center gap-2"><FileText size={12} /> הערות מסדר הליד</p>
                        {lead.generalNotes && <p className="text-sm text-slate-600 dark:text-slate-300 font-medium whitespace-pre-wrap">{lead.generalNotes}</p>}
                        {lead.liveCallNotes && <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-2 whitespace-pre-wrap border-t border-indigo-100/50 dark:border-indigo-900/30 pt-2">{lead.liveCallNotes}</p>}
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Case Status */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">סטטוס תיק</label>
                        <div className="relative">
                          <select
                            value={lead.caseStatus || ''}
                            onChange={e => handleUpdate(lead.id, 'caseStatus', e.target.value)}
                            className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none appearance-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-white"
                          >
                            <option value="">בחר סטטוס...</option>
                            {CASE_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                          <ChevronDown size={14} className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400" />
                        </div>
                      </div>

                      {/* Profit */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">רווח מהלקוח (₪)</label>
                        <input
                          type="number"
                          value={lead.profit || ''}
                          onChange={e => handleUpdate(lead.id, 'profit', parseFloat(e.target.value) || 0)}
                          className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-900 dark:text-white"
                          placeholder="0"
                          dir="ltr"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">טלפון</label>
                        <a href={`tel:${lead.phone}`} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-xl px-4 py-3 text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-all" dir="ltr">
                          <Phone size={14} /> {lead.phone || '---'}
                        </a>
                      </div>
                    </div>

                    {/* Lawyer Notes */}
                    <div>
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">הערות עו"ד — מעקב התקדמות</label>
                      <textarea
                        value={lead.lawyerNotes || ''}
                        onChange={e => handleUpdate(lead.id, 'lawyerNotes', e.target.value)}
                        className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl p-5 text-sm font-bold outline-none h-28 resize-none focus:ring-2 focus:ring-emerald-500/20 transition-all placeholder:text-slate-300 text-slate-900 dark:text-white"
                        placeholder="כתוב כאן הערות על התקדמות התיק..."
                      />
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-16 text-center opacity-20">
          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center justify-center gap-2">
            <Scale size={10} /> Sue-Chef Lawyer Dashboard
          </p>
        </div>
      </main>

      {/* Switch Role Modal */}
      {showSwitchModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
          <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-10 rounded-[48px] shadow-2xl border dark:border-white/5" dir="rtl">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-3xl flex items-center justify-center text-blue-600 mb-6 mx-auto"><Briefcase className="w-8 h-8" /></div>
            <h3 className="text-2xl font-black mb-2 text-center">חזרה לניהול CRM</h3>
            <p className="text-sm font-bold text-slate-400 mb-8 text-center">הזן סיסמת יונתן לכניסה</p>
            <form onSubmit={handleSwitchRole} className="space-y-4">
              <input type="password" value={switchPassword} onChange={e => setSwitchPassword(e.target.value)} autoFocus placeholder="סיסמה..." className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-slate-700 rounded-2xl px-6 py-4 text-center text-lg font-black outline-none focus:ring-4 focus:ring-blue-500/10 transition-all" dir="ltr" />
              {switchError && <p className="text-xs font-black text-red-500 text-center">{switchError}</p>}
              <button type="submit" disabled={switchLoading || !switchPassword} className="w-full bg-blue-600 text-white rounded-2xl py-4 font-black text-lg shadow-lg shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center">
                {switchLoading ? <Loader2 className="animate-spin" /> : "כניסה"}
              </button>
              <button type="button" onClick={() => { setShowSwitchModal(false); setSwitchError(""); setSwitchPassword(""); }} className="w-full py-2 text-xs font-black text-slate-400 hover:text-slate-600 transition-colors">ביטול</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
