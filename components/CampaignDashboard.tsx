'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '@/utils/storage';
import { 
  Send, Mail, RefreshCw, Upload, Search, MessageSquare, 
  CheckCircle2, Clock, XCircle, AlertCircle, Play, Pause,
  Users, Reply, PhoneCall, Sparkles, Filter, ChevronRight
} from 'lucide-react';

interface CampaignDashboardProps {
  onCallLead?: (phone: string) => void;
}

export default function CampaignDashboard({ onCallLead }: CampaignDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'replied' | 'wa_pending' | 'wa_sent' | 'email_pending' | 'email_sent'>('all');
  
  // Message templates
  const [waTemplate, setWaTemplate] = useState<string>(
`שלום {name},
בעבר היית בקשר עם המשרד עו"ד HBA לגבי זכויותיך הרפואיות,
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך או בטיפול במקרה.
אם הנושא עדיין רלוונטי עבורך, ניתן להשיב להודעה זו ונציג מהמשרד יחזור אליך בהקדם.
תודה`
  );
  
  const [emailSubject, setEmailSubject] = useState<string>('פנייה ממשרד עו"ד HBA - מעקב זכויות רפואיות');
  const [emailTemplate, setEmailTemplate] = useState<string>(
`שלום {name},

בעבר היית בקשר עם משרד עורכי הדין HBA לגבי זכויותיך הרפואיות.
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך הרפואי או בטיפול במקרה.

אם הנושא עדיין רלוונטי עבורך, ניתן להשיב למייל זה ונציג מהמשרד יחזור אליך בהקדם.

בברכה,
צוות משרד עו"ד HBA`
  );

  // Batch sending state
  const [isSendingWa, setIsSendingWa] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [currentSendingLead, setCurrentSendingLead] = useState<string | null>(null);
  
  // Selected lead modal for reply details
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
  // Ref for cancellation
  const cancelSendingRef = useRef<boolean>(false);

  // Fetch campaign leads
  const fetchCampaignLeads = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/campaign/leads');
      const data = await res.json();
      if (data.success && Array.isArray(data.leads)) {
        setLeads(data.leads);
      }
    } catch (err) {
      console.error('Failed to load campaign leads:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignLeads();
    const interval = setInterval(fetchCampaignLeads, 12000); // Auto-refresh status & replies every 12s
    return () => clearInterval(interval);
  }, []);

  // Stats calculation
  const totalLeads = leads.length;
  const waSentCount = leads.filter(l => l.campaignWhatsAppStatus === 'sent').length;
  const emailSentCount = leads.filter(l => l.campaignEmailStatus === 'sent').length;
  const repliedCount = leads.filter(l => l.campaignReplied || (l.liveCallNotes && (l.liveCallNotes.includes('תשובת וואטסאפ') || l.liveCallNotes.includes('הליד ענה')))).length;
  const hasEmailCount = leads.filter(l => l.email && l.email.includes('@')).length;

  // Handle single WhatsApp send
  const sendSingleWhatsApp = async (lead: Lead) => {
    try {
      setCurrentSendingLead(lead.id);
      const res = await fetch('/api/campaign/send-whatsapp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageTemplate: waTemplate,
          targetLeadId: lead.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setSendLogs(prev => [`🟢 נשלח ב-WhatsApp ל-${lead.clientName}`, ...prev.slice(0, 30)]);
        await fetchCampaignLeads();
      } else {
        alert(`שגיאה בשליחת WhatsApp ל-${lead.clientName}: ${data.error}`);
        setSendLogs(prev => [`❌ נכשל WhatsApp ל-${lead.clientName}: ${data.error}`, ...prev.slice(0, 30)]);
      }
    } catch (err: any) {
      alert(`שגיאת תקשורת: ${err.message}`);
    } finally {
      setCurrentSendingLead(null);
    }
  };

  // Handle single Email send
  const sendSingleEmail = async (lead: Lead) => {
    try {
      setCurrentSendingLead(lead.id);
      const res = await fetch('/api/campaign/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emailSubject,
          emailBodyTemplate: emailTemplate,
          targetLeadId: lead.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setSendLogs(prev => [`✉️ נשלח במייל ל-${lead.clientName} (${lead.email})`, ...prev.slice(0, 30)]);
        await fetchCampaignLeads();
      } else {
        alert(`שגיאה בשליחת מייל ל-${lead.clientName}: ${data.error}`);
      }
    } catch (err: any) {
      alert(`שגיאת תקשורת: ${err.message}`);
    } finally {
      setCurrentSendingLead(null);
    }
  };

  // Batch WhatsApp dispatch with delay (20-30s)
  const startBatchWhatsApp = async () => {
    setIsSendingWa(true);
    cancelSendingRef.current = false;
    setSendLogs(prev => [`🚀 מתחיל שליחת WhatsApp אוטומטית...`, ...prev]);

    const pendingLeads = leads.filter(l => l.campaignWhatsAppStatus === 'pending' || !l.campaignWhatsAppStatus);

    for (let i = 0; i < pendingLeads.length; i++) {
      if (cancelSendingRef.current) {
        setSendLogs(prev => [`🛑 שליחה הופסקה על ידי המשתמש`, ...prev]);
        break;
      }

      const lead = pendingLeads[i];
      setCurrentSendingLead(lead.id);

      setSendLogs(prev => [`[${i + 1}/${pendingLeads.length}] שולח WhatsApp ל-${lead.clientName} (${lead.phone})...`, ...prev]);

      try {
        const res = await fetch('/api/campaign/send-whatsapp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messageTemplate: waTemplate,
            targetLeadId: lead.id
          })
        });

        const data = await res.json();
        if (data.success) {
          setSendLogs(prev => [`✅ [${i + 1}/${pendingLeads.length}] נשלח בהצלחה ל-${lead.clientName}`, ...prev]);
          await fetchCampaignLeads();
        } else {
          setSendLogs(prev => [`❌ [${i + 1}/${pendingLeads.length}] נכשל ל-${lead.clientName}: ${data.error}`, ...prev]);
        }
      } catch (err: any) {
        setSendLogs(prev => [`⚠️ שגיאה בשליחה ל-${lead.clientName}: ${err.message}`, ...prev]);
      }

      // Delay 15-25 seconds before next message unless last item or canceled
      if (i < pendingLeads.length - 1 && !cancelSendingRef.current) {
        const delay = Math.floor(Math.random() * 10000) + 15000;
        setSendLogs(prev => [`⏱️ ממתין ${Math.round(delay / 1000)} שניות לפני ההודעה הבאה (למניעת חסימות ב-WhatsApp)...`, ...prev]);
        await new Promise(r => setTimeout(r, delay));
      }
    }

    setIsSendingWa(false);
    setCurrentSendingLead(null);
  };

  // Batch Email dispatch
  const startBatchEmail = async () => {
    setIsSendingEmail(true);
    cancelSendingRef.current = false;
    setSendLogs(prev => [`✉️ מתחיל שליחת אימיילים אוטומטית...`, ...prev]);

    const pendingLeads = leads.filter(l => l.email && l.email.includes('@') && (l.campaignEmailStatus === 'pending' || !l.campaignEmailStatus));

    for (let i = 0; i < pendingLeads.length; i++) {
      if (cancelSendingRef.current) {
        setSendLogs(prev => [`🛑 שליחת אימיילים הופסקה על ידי המשתמש`, ...prev]);
        break;
      }

      const lead = pendingLeads[i];
      setCurrentSendingLead(lead.id);

      try {
        const res = await fetch('/api/campaign/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            emailSubject,
            emailBodyTemplate: emailTemplate,
            targetLeadId: lead.id
          })
        });

        const data = await res.json();
        if (data.success) {
          setSendLogs(prev => [`✅ מייל נשלח ל-${lead.clientName} (${lead.email})`, ...prev]);
          await fetchCampaignLeads();
        } else {
          setSendLogs(prev => [`❌ מייל נכשל ל-${lead.clientName}: ${data.error}`, ...prev]);
        }
      } catch (err: any) {
        setSendLogs(prev => [`⚠️ שגיאת מייל ל-${lead.clientName}: ${err.message}`, ...prev]);
      }

      // Small 1.5 second delay between emails
      await new Promise(r => setTimeout(r, 1500));
    }

    setIsSendingEmail(false);
    setCurrentSendingLead(null);
  };

  const stopSending = () => {
    cancelSendingRef.current = true;
    setIsSendingWa(false);
    setIsSendingEmail(false);
  };

  // Handle CSV file upload directly in UI
  const handleCSVUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const text = await file.text();
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length < 2) {
      alert('קובץ CSV ריק או לא תקין');
      return;
    }

    const newLeadsToImport = [];
    for (let i = 1; i < lines.length; i++) {
      const parts = lines[i].split(',').map(p => p.replace(/^"|"$/g, '').trim());
      if (parts.length >= 3) {
        const name = parts[8] || parts[0] || 'ליד מ-CSV';
        const phone = parts[9] || parts[1] || '';
        const email = parts[10] || parts[2] || '';
        if (phone || name) {
          newLeadsToImport.push({
            clientName: name,
            phone,
            email,
            status: 'במעקב',
            generalNotes: parts[41] || ''
          });
        }
      }
    }

    if (newLeadsToImport.length === 0) {
      alert('לא נמצאו לידים תקינים בקובץ');
      return;
    }

    try {
      const res = await fetch('/api/campaign/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads: newLeadsToImport })
      });
      const data = await res.json();
      if (data.success) {
        alert(`הועלו בהצלחה ${data.added} לידים חדשים לדאשבורד הקמפיין!`);
        fetchCampaignLeads();
      }
    } catch (err: any) {
      alert(`שגיאה בהעלאת CSV: ${err.message}`);
    }
  };

  // Filter leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      (lead.clientName && lead.clientName.includes(searchQuery)) ||
      (lead.phone && lead.phone.includes(searchQuery)) ||
      (lead.email && lead.email.includes(searchQuery));

    if (!matchesSearch) return false;

    if (statusFilter === 'replied') {
      return lead.campaignReplied || (lead.liveCallNotes && (lead.liveCallNotes.includes('תשובת וואטסאפ') || lead.liveCallNotes.includes('הליד ענה')));
    }
    if (statusFilter === 'wa_pending') return lead.campaignWhatsAppStatus === 'pending' || !lead.campaignWhatsAppStatus;
    if (statusFilter === 'wa_sent') return lead.campaignWhatsAppStatus === 'sent';
    if (statusFilter === 'email_pending') return lead.campaignEmailStatus === 'pending';
    if (statusFilter === 'email_sent') return lead.campaignEmailStatus === 'sent';

    return true;
  });

  return (
    <div className="space-y-6 text-slate-100 font-sans" dir="rtl">
      
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-xs font-semibold rounded-full border border-indigo-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                קמפיין פולואפ לידים ישנים 2026
              </span>
            </div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              📢 ניהול קמפיין ומעקב תשובות בזמן אמת
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              מעקב מלא אחר שליחת הודעות WhatsApp ואימיילים וקליטת מענה ישיר מהלקוחות בדאשבורד.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchCampaignLeads}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-800/80 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium border border-slate-700 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              רענן נתונים
            </button>

            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/30 transition flex items-center gap-2">
              <Upload className="w-4 h-4" />
              העלה CSV חדש
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-950/60 backdrop-blur border border-slate-800/80 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-lg">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">סה"כ לידים בקמפיין</p>
              <p className="text-2xl font-bold text-white">{totalLeads}</p>
            </div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-emerald-500/30 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">WhatsApp נשלחו</p>
              <p className="text-2xl font-bold text-emerald-400">{waSentCount} <span className="text-xs text-slate-400">/ {totalLeads}</span></p>
            </div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-amber-500/30 rounded-xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">אימיילים שנשלחו</p>
              <p className="text-2xl font-bold text-amber-400">{emailSentCount} <span className="text-xs text-slate-400">/ {hasEmailCount}</span></p>
            </div>
          </div>

          <div className="bg-slate-950/60 backdrop-blur border border-pink-500/40 rounded-xl p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="absolute -right-4 -bottom-4 w-20 h-20 bg-pink-500/20 rounded-full blur-xl animate-pulse" />
            <div className="p-3 bg-pink-500/20 text-pink-400 rounded-lg">
              <Reply className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-pink-300 font-bold tracking-wide">💬 תשובות שהתקבלו</p>
              <p className="text-3xl font-extrabold text-pink-400 animate-pulse">{repliedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Template Editor & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WhatsApp Template Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-emerald-400 flex items-center gap-2">
                <Send className="w-5 h-5" />
                נוסח הודעת WhatsApp
              </h2>
              <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-md">
                השתמש ב-{"{name}"} לשם הלקוח
              </span>
            </div>
            <textarea
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              rows={5}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-emerald-500/60 transition resize-none"
              placeholder="רשום כאן את נוסח ההודעה לוואטסאפ..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {!isSendingWa ? (
              <button
                onClick={startBatchWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                התחל שליחת WhatsApp אוטומטית
              </button>
            ) : (
              <button
                onClick={stopSending}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4 fill-current" />
                עצור שליחת WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Email Template Card */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                נוסח הודעת אימייל
              </h2>
            </div>
            <input
              type="text"
              value={emailSubject}
              onChange={(e) => setEmailSubject(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 mb-3 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60"
              placeholder="נושא האימייל"
            />
            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3.5 text-sm text-slate-200 focus:outline-none focus:border-amber-500/60 transition resize-none"
              placeholder="תוכן האימייל..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {!isSendingEmail ? (
              <button
                onClick={startBatchEmail}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-amber-600/30 transition flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                התחל שליחת אימיילים
              </button>
            ) : (
              <button
                onClick={stopSending}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-red-600/30 transition flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4 fill-current" />
                עצור שליחת מיילים
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Activity Logs (If sending is active or logs exist) */}
      {sendLogs.length > 0 && (
        <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> יומן פעילות שליחה בלייב
            </span>
            <button onClick={() => setSendLogs([])} className="text-xs text-slate-500 hover:text-slate-300">
              נקה יומן
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-xs text-slate-300">
            {sendLogs.map((log, idx) => (
              <div key={idx} className="border-b border-slate-900/60 pb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Table Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש לפי שם, טלפון או מייל..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pr-9 pl-4 py-2 text-sm text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              הכל ({leads.length})
            </button>

            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${statusFilter === 'replied' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/40' : 'bg-pink-950/40 text-pink-300 border border-pink-500/30 hover:bg-pink-900/40'}`}
            >
              💬 ענו בלבד ({repliedCount})
            </button>

            <button
              onClick={() => setStatusFilter('wa_pending')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === 'wa_pending' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              WhatsApp ממתין ({leads.filter(l => l.campaignWhatsAppStatus === 'pending' || !l.campaignWhatsAppStatus).length})
            </button>

            <button
              onClick={() => setStatusFilter('wa_sent')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${statusFilter === 'wa_sent' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
            >
              WhatsApp נשלח ({waSentCount})
            </button>
          </div>
        </div>

        {/* Main Leads Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-950/80 text-slate-400 text-xs font-semibold uppercase border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">שם הליד</th>
                <th className="py-3.5 px-4">טלפון</th>
                <th className="py-3.5 px-4">אימייל</th>
                <th className="py-3.5 px-4 text-center">סטטוס WhatsApp</th>
                <th className="py-3.5 px-4 text-center">סטטוס מייל</th>
                <th className="py-3.5 px-4 text-center">תשובת הלקוח</th>
                <th className="py-3.5 px-4 text-left">פעולות</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    לא נמצאו לידים המתאימים לסינון
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const hasReplied = lead.campaignReplied || (lead.liveCallNotes && (lead.liveCallNotes.includes('תשובת וואטסאפ') || lead.liveCallNotes.includes('הליד ענה')));
                  const isCurrentSending = currentSendingLead === lead.id;

                  return (
                    <tr key={lead.id} className={`hover:bg-slate-800/40 transition ${hasReplied ? 'bg-pink-950/20' : ''}`}>
                      
                      {/* Name */}
                      <td className="py-3.5 px-4 font-semibold text-slate-100 flex items-center gap-2">
                        {hasReplied && (
                          <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping inline-block" title="התקבלה תשובה!" />
                        )}
                        {lead.clientName}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-slate-300 font-mono text-xs" dir="ltr">
                        {lead.phone || 'אין טלפון'}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-300 text-xs">
                        {lead.email || <span className="text-slate-600">אין מייל</span>}
                      </td>

                      {/* WhatsApp Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCurrentSending ? (
                          <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 rounded-full text-xs font-medium animate-pulse inline-flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> שולח...
                          </span>
                        ) : lead.campaignWhatsAppStatus === 'sent' ? (
                          <span className="px-2.5 py-1 bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> נשלח
                          </span>
                        ) : lead.campaignWhatsAppStatus === 'failed' ? (
                          <span className="px-2.5 py-1 bg-red-500/15 text-red-400 border border-red-500/30 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> נכשל
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ממתין
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td className="py-3.5 px-4 text-center">
                        {lead.campaignEmailStatus === 'sent' ? (
                          <span className="px-2.5 py-1 bg-amber-500/15 text-amber-400 border border-amber-500/30 rounded-full text-xs font-semibold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> נשלח
                          </span>
                        ) : lead.campaignEmailStatus === 'no_email' ? (
                          <span className="text-xs text-slate-600">אין מייל</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-800 text-slate-400 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ממתין
                          </span>
                        )}
                      </td>

                      {/* Response Status & Snippet */}
                      <td className="py-3.5 px-4 text-center">
                        {hasReplied ? (
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1 bg-pink-600/30 text-pink-300 border border-pink-500/50 hover:bg-pink-600/50 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-md shadow-pink-600/20"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            ראה תשובה ({lead.campaignReplyChannel || 'WhatsApp'})
                          </button>
                        ) : (
                          <span className="text-xs text-slate-500">טרם ענה</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          {lead.phone && (
                            <button
                              onClick={() => sendSingleWhatsApp(lead)}
                              title="שלח WhatsApp לליד זה בלבד"
                              className="p-1.5 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {lead.email && (
                            <button
                              onClick={() => sendSingleEmail(lead)}
                              title="שלח מייל לליד זה בלבד"
                              className="p-1.5 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 rounded-lg transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {lead.phone && onCallLead && (
                            <button
                              onClick={() => onCallLead(lead.phone!)}
                              title="חייג לליד"
                              className="p-1.5 bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 rounded-lg transition"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reply Detail Modal */}
      {selectedLead && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-500/20 text-pink-400 rounded-xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{selectedLead.clientName}</h3>
                <p className="text-xs text-slate-400 font-mono" dir="ltr">{selectedLead.phone}</p>
              </div>
            </div>

            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
              <p className="text-xs text-pink-400 font-bold mb-2">תוכן התשובה שהתקצרה/נותחה:</p>
              <p className="text-sm text-slate-200 whitespace-pre-wrap">
                {selectedLead.campaignReplyText || selectedLead.liveCallNotes || 'תשובה התקבל ב-WhatsApp'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              {selectedLead.phone && onCallLead && (
                <button
                  onClick={() => {
                    const phone = selectedLead.phone!;
                    setSelectedLead(null);
                    onCallLead(phone);
                  }}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-sm rounded-xl transition flex items-center gap-2"
                >
                  <PhoneCall className="w-4 h-4" />
                  חייג ללקוח עכשיו
                </button>
              )}
              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-xl transition"
              >
                סגור
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
