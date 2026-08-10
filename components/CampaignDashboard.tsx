'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Lead } from '@/utils/storage';
import { 
  Send, Mail, RefreshCw, Upload, Search, MessageSquare, 
  CheckCircle2, Clock, XCircle, Play, Pause,
  Users, Reply, PhoneCall, Sparkles, ArrowRightLeft, Check, AlertCircle
} from 'lucide-react';

interface CampaignDashboardProps {
  onCallLead?: (phone: string) => void;
  onLeadMovedToMain?: () => void;
}

export default function CampaignDashboard({ onCallLead, onLeadMovedToMain }: CampaignDashboardProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'replied' | 'wa_pending' | 'wa_sent' | 'email_pending' | 'email_sent'>('all');
  
  // Default exact message template as requested by user (without name placeholders)
  const [waTemplate, setWaTemplate] = useState<string>(
`שלום, 
בעבר היית בקשר עם המשרד עו"ד HBA 
לגבי זכויותיך הרפואיות, 
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך או בטיפול במקרה
אם הנושא עדיין רלוונטי עבורך, ניתן להשיב להודעה זו ונציג מהמשרד יחזור אליך בהקדם.
תודה`
  );
  
  const [emailSubject, setEmailSubject] = useState<string>('פנייה ממשרד עו"ד HBA - בדיקת זכויות רפואיות');
  const [senderEmail, setSenderEmail] = useState<string>('office@hba-law.co.il');
  const [emailTemplate, setEmailTemplate] = useState<string>(
`שלום, 
בעבר היית בקשר עם המשרד עו"ד HBA 
לגבי זכויותיך הרפואיות, 
פנינו אליך כעת כדי לבדוק האם מאז חל שינוי במצבך או בטיפול במקרה
אם הנושא עדיין רלוונטי עבורך, ניתן להשיב להודעה זו ונציג מהמשרד יחזור אליך בהקדם.
תודה`
  );

  // Batch sending state
  const [isSendingWa, setIsSendingWa] = useState<boolean>(false);
  const [isSendingEmail, setIsSendingEmail] = useState<boolean>(false);
  const [sendLogs, setSendLogs] = useState<string[]>([]);
  const [currentSendingLead, setCurrentSendingLead] = useState<string | null>(null);
  const [movingLeadId, setMovingLeadId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Selected lead modal for reply details
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  
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
    const interval = setInterval(fetchCampaignLeads, 12000);
    return () => clearInterval(interval);
  }, []);

  // Show Toast Message
  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 4000);
  };

  // Stats calculation
  const totalLeads = leads.length;
  const waSentCount = leads.filter(l => l.campaignWhatsAppStatus === 'sent').length;
  const emailSentCount = leads.filter(l => l.campaignEmailStatus === 'sent').length;
  const repliedCount = leads.filter(l => l.campaignReplied || (l.liveCallNotes && (l.liveCallNotes.includes('תשובת וואטסאפ') || l.liveCallNotes.includes('הליד ענה')))).length;
  const hasEmailCount = leads.filter(l => l.email && l.email.includes('@')).length;

  // Move Lead to Main CRM Table ("טבלת מעקב")
  const moveLeadToMainTable = async (lead: Lead) => {
    try {
      setMovingLeadId(lead.id);
      const res = await fetch('/api/campaign/move-to-main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leadId: lead.id })
      });
      const data = await res.json();
      if (data.success) {
        triggerToast(`✅ הליד ${lead.clientName} הועבר בהצלחה לטבלה הראשית כליד חדש בסטטוס 'רלוונטי - לעקוב'!`);
        await fetchCampaignLeads();
        if (onLeadMovedToMain) onLeadMovedToMain();
      } else {
        alert(`שגיאה בהעברת הליד: ${data.error}`);
      }
    } catch (err: any) {
      alert(`שגיאה בהעברה: ${err.message}`);
    } finally {
      setMovingLeadId(null);
    }
  };

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
        triggerToast(`הודעת WhatsApp נשלחה בהצלחה ל-${lead.clientName}`);
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
          senderEmail,
          emailBodyTemplate: emailTemplate,
          targetLeadId: lead.id
        })
      });
      const data = await res.json();
      if (data.success) {
        setSendLogs(prev => [`✉️ נשלח במייל ל-${lead.clientName} (${lead.email})`, ...prev.slice(0, 30)]);
        triggerToast(`מייל נשלח בהצלחה ל-${lead.clientName}`);
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

  // Batch WhatsApp dispatch with delay (15-25s)
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
    setSendLogs(prev => [`✉️ מתחיל שליחת אימיילים אוטומטית ממייל ${senderEmail}...`, ...prev]);

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
            senderEmail,
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

  // Handle CSV file upload
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
        triggerToast(`הועלו בהצלחה ${data.added} לידים חדשים לדאשבורד הקמפיין!`);
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
    <div className="space-y-6 text-slate-900 dark:text-slate-100 font-sans" dir="rtl">

      {/* Floating Success Toast */}
      {successToast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-50 bg-emerald-600 text-white font-bold px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-2 border border-emerald-400 animate-in fade-in slide-in-from-top duration-300">
          <CheckCircle2 className="w-5 h-5" />
          <span>{successToast}</span>
        </div>
      )}
      
      {/* Top Banner Header with Light/Dark Mode Adaptation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/30 rounded-3xl p-6 shadow-xl relative overflow-hidden transition-colors">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="px-3 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-full border border-indigo-200 dark:border-indigo-500/40 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400" />
                טבלה משנית: קמפיין פולואפ לידים ישנים
              </span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-3">
              📢 מעקב קמפיין ותגובות בזמן אמת
            </h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
              טבלה נפרדת המוקדשת אך ורק ל-880 הלידים של הקמפיין. ניתן לשלוח הודעות/מיילים ולהעביר ליד לטבלה הראשית בלחיצת כפתור!
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={fetchCampaignLeads}
              disabled={loading}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-sm font-bold border border-slate-300 dark:border-slate-700 transition flex items-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              רענן נתונים
            </button>

            <label className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl cursor-pointer shadow-lg shadow-indigo-600/20 transition flex items-center gap-2">
              <Upload className="w-4 h-4" />
              העלה CSV חדש
              <input type="file" accept=".csv" onChange={handleCSVUpload} className="hidden" />
            </label>
          </div>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">סה"כ לידים בקמפיין</p>
              <p className="text-2xl font-bold text-slate-900 dark:text-white">{totalLeads}</p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">WhatsApp נשלחו</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{waSentCount} <span className="text-xs text-slate-500">/ {totalLeads}</span></p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-amber-500/30 rounded-2xl p-4 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
              <Mail className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">אימיילים שנשלחו</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{emailSentCount} <span className="text-xs text-slate-500">/ {hasEmailCount}</span></p>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950/60 border border-pink-500/40 rounded-2xl p-4 flex items-center gap-4 relative overflow-hidden">
            <div className="p-3 bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-xl">
              <Reply className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs text-pink-600 dark:text-pink-300 font-bold tracking-wide">💬 תשובות שהתקבלו</p>
              <p className="text-3xl font-extrabold text-pink-600 dark:text-pink-400 animate-pulse">{repliedCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Control Panel: Template Editor & Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* WhatsApp Template Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                <Send className="w-5 h-5" />
                נוסח הודעת WhatsApp לשליחה
              </h2>
            </div>
            <textarea
              value={waTemplate}
              onChange={(e) => setWaTemplate(e.target.value)}
              rows={5}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-emerald-500 transition resize-none font-medium"
              placeholder="רשום כאן את נוסח ההודעה לוואטסאפ..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {!isSendingWa ? (
              <button
                onClick={startBatchWhatsApp}
                className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-emerald-600/20 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-current" />
                התחל שליחת WhatsApp אוטומטית
              </button>
            ) : (
              <button
                onClick={stopSending}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4 fill-current" />
                עצור שליחת WhatsApp
              </button>
            )}
          </div>
        </div>

        {/* Email Template Card */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                <Mail className="w-5 h-5" />
                נוסח הודעת אימייל
              </h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-500 font-bold mb-1 block">שולח (Sender Email):</label>
                <input
                  type="text"
                  value={senderEmail}
                  onChange={(e) => setSenderEmail(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-mono text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="office@hba-law.co.il"
                />
              </div>

              <div>
                <label className="text-xs text-slate-500 font-bold mb-1 block">נושא האימייל:</label>
                <input
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-2 text-xs font-bold text-slate-800 dark:text-slate-200 focus:outline-none focus:border-amber-500"
                  placeholder="נושא האימייל"
                />
              </div>
            </div>

            <textarea
              value={emailTemplate}
              onChange={(e) => setEmailTemplate(e.target.value)}
              rows={4}
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3.5 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-amber-500 transition resize-none font-medium"
              placeholder="תוכן האימייל..."
            />
          </div>

          <div className="mt-4 flex items-center justify-between gap-3">
            {!isSendingEmail ? (
              <button
                onClick={startBatchEmail}
                className="w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-amber-600/20 transition flex items-center justify-center gap-2"
              >
                <Mail className="w-4 h-4" />
                התחל שליחת אימיילים
              </button>
            ) : (
              <button
                onClick={stopSending}
                className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold text-sm rounded-2xl shadow-lg shadow-red-600/20 transition flex items-center justify-center gap-2"
              >
                <Pause className="w-4 h-4 fill-current" />
                עצור שליחת מיילים
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Live Activity Logs */}
      {sendLogs.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
              <Clock className="w-4 h-4" /> יומן פעילות שליחה בלייב
            </span>
            <button onClick={() => setSendLogs([])} className="text-xs text-slate-500 hover:text-slate-700 dark:hover:text-slate-300">
              נקה יומן
            </button>
          </div>
          <div className="max-h-36 overflow-y-auto space-y-1 font-mono text-xs text-slate-700 dark:text-slate-300">
            {sendLogs.map((log, idx) => (
              <div key={idx} className="border-b border-slate-200 dark:border-slate-900 pb-1">{log}</div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Table Controls */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Search bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute right-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="חפש לפי שם, טלפון או מייל..."
              className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl pr-9 pl-4 py-2 text-sm text-slate-900 dark:text-slate-200 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${statusFilter === 'all' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              הכל ({leads.length})
            </button>

            <button
              onClick={() => setStatusFilter('replied')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${statusFilter === 'replied' ? 'bg-pink-600 text-white shadow-lg shadow-pink-600/30' : 'bg-pink-50 dark:bg-pink-950/40 text-pink-700 dark:text-pink-300 border border-pink-200 dark:border-pink-500/30 hover:bg-pink-100'}`}
            >
              💬 ענו בלבד ({repliedCount})
            </button>

            <button
              onClick={() => setStatusFilter('wa_pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${statusFilter === 'wa_pending' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              WhatsApp ממתין ({leads.filter(l => l.campaignWhatsAppStatus === 'pending' || !l.campaignWhatsAppStatus).length})
            </button>

            <button
              onClick={() => setStatusFilter('wa_sent')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${statusFilter === 'wa_sent' ? 'bg-indigo-600 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
            >
              WhatsApp נשלח ({waSentCount})
            </button>
          </div>
        </div>

        {/* Main Campaign Leads Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
          <table className="w-full text-right text-sm">
            <thead className="bg-slate-100 dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs font-bold uppercase border-b border-slate-200 dark:border-slate-800">
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
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900">
              {filteredLeads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    לא נמצאו לידים המתאימים לסינון
                  </td>
                </tr>
              ) : (
                filteredLeads.map((lead) => {
                  const hasReplied = lead.campaignReplied || (lead.liveCallNotes && (lead.liveCallNotes.includes('תשובת וואטסאפ') || lead.liveCallNotes.includes('הליד ענה')));
                  const isCurrentSending = currentSendingLead === lead.id;
                  const isMoving = movingLeadId === lead.id;

                  return (
                    <tr key={lead.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/40 transition ${hasReplied ? 'bg-pink-50/70 dark:bg-pink-950/20' : ''}`}>
                      
                      {/* Name */}
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                        <div className="flex items-center gap-2">
                          {hasReplied && (
                            <span className="w-2.5 h-2.5 rounded-full bg-pink-500 animate-ping inline-block" title="התקבלה תשובה!" />
                          )}
                          <span>{lead.clientName}</span>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 font-mono text-xs" dir="ltr">
                        {lead.phone || 'אין טלפון'}
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300 text-xs">
                        {lead.email || <span className="text-slate-400 dark:text-slate-600">אין מייל</span>}
                      </td>

                      {/* WhatsApp Status */}
                      <td className="py-3.5 px-4 text-center">
                        {isCurrentSending ? (
                          <span className="px-2.5 py-1 bg-indigo-50 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-300 rounded-full text-xs font-bold animate-pulse inline-flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" /> שולח...
                          </span>
                        ) : lead.campaignWhatsAppStatus === 'sent' ? (
                          <span className="px-2.5 py-1 bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> נשלח
                          </span>
                        ) : lead.campaignWhatsAppStatus === 'failed' ? (
                          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-500/15 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-500/30 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <XCircle className="w-3.5 h-3.5" /> נכשל
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ממתין
                          </span>
                        )}
                      </td>

                      {/* Email Status */}
                      <td className="py-3.5 px-4 text-center">
                        {lead.campaignEmailStatus === 'sent' ? (
                          <span className="px-2.5 py-1 bg-amber-50 dark:bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30 rounded-full text-xs font-bold inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> נשלח
                          </span>
                        ) : lead.campaignEmailStatus === 'no_email' ? (
                          <span className="text-xs text-slate-400 dark:text-slate-600">אין מייל</span>
                        ) : (
                          <span className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-xs font-medium inline-flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" /> ממתין
                          </span>
                        )}
                      </td>

                      {/* Response Status & Snippet */}
                      <td className="py-3.5 px-4 text-center">
                        {hasReplied ? (
                          <button
                            onClick={() => setSelectedLead(lead)}
                            className="px-3 py-1 bg-pink-100 dark:bg-pink-600/30 text-pink-700 dark:text-pink-300 border border-pink-300 dark:border-pink-500/50 hover:bg-pink-200 rounded-lg text-xs font-bold transition inline-flex items-center gap-1.5 shadow-sm"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            ראה תשובה ({lead.campaignReplyChannel || 'WhatsApp'})
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400 dark:text-slate-500">טרם ענה</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-left">
                        <div className="flex items-center justify-end gap-2">
                          
                          {/* Move to Main Table Button */}
                          <button
                            onClick={() => moveLeadToMainTable(lead)}
                            disabled={isMoving}
                            title="העבר לטבלה הראשית (כליד חדש בסטטוס 'רלוונטי - לעקוב' עם ההערות בתיבת הסיכום)"
                            className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-600/20 dark:hover:bg-indigo-600/40 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/40 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
                          >
                            {isMoving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
                            העבר לטבלה הראשית
                          </button>

                          {lead.phone && (
                            <button
                              onClick={() => sendSingleWhatsApp(lead)}
                              title="שלח WhatsApp לליד זה בלבד"
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-100 rounded-lg transition"
                            >
                              <Send className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {lead.email && (
                            <button
                              onClick={() => sendSingleEmail(lead)}
                              title="שלח מייל לליד זה בלבד"
                              className="p-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-100 rounded-lg transition"
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {lead.phone && onCallLead && (
                            <button
                              onClick={() => onCallLead(lead.phone!)}
                              title="חייג לליד"
                              className="p-1.5 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-lg transition"
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
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl relative">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute top-4 left-4 text-slate-400 hover:text-slate-700 dark:hover:text-white"
            >
              ✕
            </button>
            <div className="flex items-center gap-3">
              <div className="p-3 bg-pink-100 dark:bg-pink-500/20 text-pink-600 dark:text-pink-400 rounded-2xl">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedLead.clientName}</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 font-mono" dir="ltr">{selectedLead.phone}</p>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4">
              <p className="text-xs text-pink-600 dark:text-pink-400 font-bold mb-2">תוכן התשובה שהתקבלה:</p>
              <p className="text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap font-medium">
                {selectedLead.campaignReplyText || selectedLead.liveCallNotes || 'תגובה התקבלה ב-WhatsApp'}
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  const leadToMove = selectedLead;
                  setSelectedLead(null);
                  moveLeadToMainTable(leadToMove);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 shadow-md"
              >
                <ArrowRightLeft className="w-4 h-4" />
                העבר לטבלה הראשית
              </button>

              {selectedLead.phone && onCallLead && (
                <button
                  onClick={() => {
                    const phone = selectedLead.phone!;
                    setSelectedLead(null);
                    onCallLead(phone);
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl transition flex items-center gap-1.5 shadow-md"
                >
                  <PhoneCall className="w-4 h-4" />
                  חייג ללקוח
                </button>
              )}

              <button
                onClick={() => setSelectedLead(null)}
                className="px-4 py-2 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-medium rounded-xl transition"
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
