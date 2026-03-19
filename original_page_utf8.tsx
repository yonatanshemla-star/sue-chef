"use client";

import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { Phone, Clock, RefreshCw, History, DollarSign, Plus, Moon, Sun, TableProperties, PhoneCall, ArrowUpDown, X, Maximize2, Loader2, FileText, Trash2, Copy, Check, HelpCircle, PhoneOff, BarChart, CheckCircle, MessageSquare, MoreVertical, UserPlus, ClipboardList, ChevronDown, Zap, Brain, Filter, ChevronRight, ArrowRight, Download, Mail, ExternalLink, Clipboard, AlertCircle, MonitorPlay } from "lucide-react";
import type { Lead } from "@/utils/storage";
import LegalDecisionTree from '@/components/LegalDecisionTree';
import { legalQuestions } from '@/utils/legalQuestions';
import { evaluateResults } from '@/utils/legalLogic';
import AudioWhatsApp from "@/components/AudioWhatsApp";
import WebPhone from "@/components/WebPhone";

// === Status Configuration ===
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; darkBg: string; border: string; importance: number }> = {
  '╫₧╫ù╫¢╫ö ╫£╫ù╫¬╫Ö╫₧╫ö': { label: 'Γ£ì∩╕Å ╫₧╫ù╫¢╫ö ╫£╫ù╫¬╫Ö╫₧╫ö', color: 'text-pink-600', bg: 'bg-pink-100/80', darkBg: 'dark:bg-pink-900/60 dark:text-pink-200', border: 'border-pink-300 dark:border-pink-500', importance: 1 },
  '╫æ╫æ╫ô╫Ö╫º╫ö ╫ó╫¥ ╫Æ╫Ö╫£╫Ö': { label: '≡ƒöì ╫æ╫æ╫ô╫Ö╫º╫ö ╫ó╫¥ ╫Æ╫Ö╫£╫Ö', color: 'text-emerald-800', bg: 'bg-emerald-100', darkBg: 'dark:bg-emerald-950 dark:text-emerald-300', border: 'border-emerald-400 dark:border-emerald-700', importance: 2 },
  '╫Æ╫Ö╫£╫Ö ╫ª╫¿╫Ö╫Ü ╫£╫ô╫æ╫¿ ╫É╫Ö╫¬╫ò': { label: '≡ƒÆ¼ ╫Æ╫Ö╫£╫Ö ╫ª╫¿╫Ö╫Ü ╫£╫ô╫æ╫¿ ╫É╫Ö╫¬╫ò', color: 'text-green-700', bg: 'bg-green-50', darkBg: 'dark:bg-green-950 dark:text-green-300', border: 'border-green-300 dark:border-green-700', importance: 3 },
  '╫£╫ù╫û╫ò╫¿ ╫É╫£╫Ö╫ò': { label: '≡ƒô₧ ╫£╫ù╫û╫ò╫¿ ╫É╫£╫Ö╫ò', color: 'text-blue-700', bg: 'bg-blue-50', darkBg: 'dark:bg-blue-950 dark:text-blue-300', border: 'border-blue-300 dark:border-blue-700', importance: 4 },
  '╫£╫É ╫ó╫á╫ö': { label: '≡ƒô╡ ╫£╫É ╫ó╫á╫ö', color: 'text-gray-100', bg: 'bg-gray-800', darkBg: 'dark:bg-gray-900 dark:text-gray-400', border: 'border-gray-600', importance: 5 },
  '╫á╫Æ╫₧╫¿': { label: 'Γ¥î ╫á╫Æ╫₧╫¿', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 3 },
  '╫ù╫ô╫⌐': { label: '≡ƒåò ╫ù╫ô╫⌐', color: 'text-indigo-700', bg: 'bg-indigo-50', darkBg: 'dark:bg-indigo-950 dark:text-indigo-300', border: 'border-indigo-300 dark:border-indigo-700', importance: 0 },
  '╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ': { label: 'ΓÅ│ ╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ', color: 'text-orange-900', bg: 'bg-orange-200', darkBg: 'dark:bg-orange-900/80 dark:text-orange-200', border: 'border-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.2)]', importance: 1 },
  '╫ù╫¬╫¥': { label: '≡ƒÅå ╫ù╫¬╫¥', color: 'text-amber-700', bg: 'bg-amber-100', darkBg: 'dark:bg-amber-900/40 dark:text-amber-300', border: 'border-amber-300 dark:border-amber-700', importance: 0 },
  '╫æ╫₧╫ó╫º╫æ': { label: 'Γ¡É ╫æ╫₧╫ó╫º╫æ', color: 'text-amber-600', bg: 'bg-amber-50', darkBg: 'dark:bg-amber-900/20 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', importance: 1 },
  '╫£╫É ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö': { label: '≡ƒöç ╫£╫É ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö', color: 'text-red-700', bg: 'bg-red-50', darkBg: 'dark:bg-red-950 dark:text-red-300', border: 'border-red-300 dark:border-red-700', importance: 5 },
  '╫É╫ù╫¿': { label: '≡ƒô¥ ╫É╫ù╫¿', color: 'text-gray-600', bg: 'bg-gray-100', darkBg: 'dark:bg-gray-800 dark:text-gray-300', border: 'border-gray-300 dark:border-gray-600', importance: 3 },
};

// Statuses that should NOT appear in the manual dropdown
const AUTO_ONLY_STATUSES = new Set(['╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ']);

function getStatusStyle(status: string) {
  return STATUS_CONFIG[status] || STATUS_CONFIG['╫É╫ù╫¿'];
}

// === Phone number normalization for matching ===
function normalizePhone(phone: string): string {
  if (!phone) return "";
  // Handle SIP URIs by taking the user part (before @)
  const cleanPhone = phone.startsWith('sip:') ? phone.split('@')[0].replace('sip:', '') : phone;
  const digits = cleanPhone.replace(/[^\d]/g, '');
  // Israeli numbers are usually 10 digits (05...) or 12 digits (9725...)
  // We'll take the last 9 digits to match regardless of prefix (0 or 972)
  if (digits.length >= 9) {
    return digits.slice(-9);
  }
  return digits;
}

function findLeadNameByPhone(phone: string, leads: Lead[]): string | null {
  const normalized = normalizePhone(phone);
  if (!normalized || normalized.length < 9) return null;
  for (const lead of leads) {
    if (lead.phone) {
      const leadNorm = normalizePhone(lead.phone);
      if (leadNorm === normalized) return lead.clientName;
    }
  }
  return null;
}

// === Call Script ===
const CALL_SCRIPT = `╫ñ╫¬╫Ö╫ù╫ö
"╫É╫ö╫£╫ƒ, ╫º╫ò╫¿╫É╫Ö╫¥ ╫£╫Ö ╫Ö╫ò╫á╫¬╫ƒ ╫É╫á╫Ö ╫₧╫₧╫⌐╫¿╫ô ╫ó╫ò╫¿╫¢╫Ö ╫ö╫ô╫Ö╫ƒ HBA. ╫ö╫⌐╫É╫¿╫¬ ╫É╫ª╫£╫á╫ò ╫ñ╫¿╫ÿ╫Ö╫¥ ╫£╫Æ╫æ╫Ö ╫û╫¢╫ò╫Ö╫ò╫¬ ╫¿╫ñ╫ò╫É╫Ö╫ò╫¬, ╫ò╫¿╫ª╫Ö╫¬╫Ö ╫£╫⌐╫ò╫ù╫ù ╫É╫Ö╫¬╫Ü ╫¢╫ô╫Ö ╫£╫ö╫æ╫Ö╫ƒ ╫É╫Ö╫Ü ╫á╫ò╫¢╫£ ╫£╫ó╫û╫ò╫¿. ╫Ö╫⌐ ╫£╫Ü ╫¢╫₧╫ö ╫ô╫º╫ò╫¬ ╫£╫ô╫æ╫¿?"

╫æ╫Ö╫¿╫ò╫¿ ╫¢╫ò╫ò╫á╫ö
"╫É╫á╫Ö ╫¿╫º ╫¿╫ò╫ª╫ö ╫£╫ò╫ò╫ô╫É ΓÇô ╫É╫¬╫ö ╫ó╫ô╫Ö╫Ö╫ƒ ╫₧╫ó╫ò╫á╫Ö╫Ö╫ƒ ╫⌐╫á╫æ╫ô╫ò╫º ╫ó╫æ╫ò╫¿╫Ü ╫ö╫É╫¥ ╫á╫ò╫¢╫£ ╫£╫í╫Ö╫Ö╫ó?"

╫⌐╫É╫£╫ò╫¬ ╫í╫Ö╫á╫ò╫ƒ
1. ╫₧╫ö ╫⌐╫₧╫Ü ╫ö╫₧╫£╫É ╫ò╫₧╫ö ╫ö╫Æ╫Ö╫£ ╫⌐╫£╫Ü?

2. ╫Ö╫⌐ ╫£╫Ü ╫¢╫¿╫Æ╫ó ╫ö╫¢╫á╫í╫ò╫¬?
╫É╫¥ ╫¢╫ƒ ΓÇô ╫₧╫É╫Ö╫ñ╫ö ╫ö╫ƒ ╫₧╫Æ╫Ö╫ó╫ò╫¬ (╫º╫ª╫æ╫ö, ╫ó╫æ╫ò╫ô╫ö, ╫ñ╫á╫í╫Ö╫ö ╫ò╫¢╫ò') ╫ò╫₧╫ö ╫ö╫í╫¢╫ò╫¥ ╫æ╫ó╫¿╫Ü?

3. ╫¬╫ò╫¢╫£ ╫£╫ñ╫¿╫ÿ ╫º╫ª╫¬ ╫ó╫£ ╫ö╫₧╫ª╫æ ╫ö╫¿╫ñ╫ò╫É╫Ö ╫⌐╫£╫Ü?
╫₧╫₧╫ö ╫É╫¬╫ö ╫í╫ò╫æ╫£ ╫¢╫Ö╫ò╫¥, ╫₧╫ö ╫Ö╫⌐ ╫æ╫É╫æ╫ù╫á╫ò╫¬, ╫ò╫₧╫ö ╫ö╫¢╫Ö ╫₧╫⌐╫ñ╫Ö╫ó ╫ó╫£ ╫ö╫¬╫ñ╫º╫ò╫ô ╫ö╫Ö╫ò╫₧╫Ö╫ò╫₧╫Ö?
(╫É╫¥ ╫₧╫í╫ñ╫¿ ╫¢╫₧╫ö ╫æ╫ó╫Ö╫ò╫¬ ΓåÆ ╫¬╫Æ╫Ö╫ô: "╫É╫ò╫º╫Ö╫Ö, ╫ù╫⌐╫ò╫æ ╫£╫Ö ╫£╫ö╫æ╫Ö╫ƒ ╫¢╫£ ╫ô╫æ╫¿ ╫æ╫á╫ñ╫¿╫ô ╫¢╫ô╫Ö ╫£╫ö╫ó╫æ╫Ö╫¿ ╫£╫ó╫ò"╫ô ╫æ╫ª╫ò╫¿╫ö ╫₧╫ô╫ò╫Ö╫º╫¬").

4. ╫Ö╫⌐ ╫£╫Ü ╫¢╫¿╫Æ╫ó ╫º╫ª╫æ╫É╫ò╫¬ ╫¢╫£╫⌐╫ö╫ƒ? ╫É╫¥ ╫¢╫ƒ ΓÇô ╫₧╫É╫Ö╫ñ╫ö?
╫É╫¥ ╫û╫ò ╫º╫ª╫æ╫ö ╫₧╫æ╫Ö╫ÿ╫ò╫ù ╫£╫É╫ò╫₧╫Ö ΓÇô ╫É╫¬╫ö ╫Ö╫ò╫ô╫ó ╫₧╫ö ╫ô╫¿╫Æ╫¬ ╫ö╫á╫¢╫ò╫¬ ╫⌐╫º╫Ö╫æ╫£╫¬?

5. ╫ö╫É╫¥ ╫Ö╫⌐ ╫º╫ò╫⌐╫Ö ╫æ╫ñ╫ó╫ò╫£╫ò╫¬ ╫Ö╫ò╫₧╫Ö╫ò╫₧╫Ö╫ò╫¬ (╫£╫æ╫ò╫⌐, ╫¿╫ù╫ª╫ö, ╫¬╫ñ╫º╫ò╫ô ╫æ╫í╫Ö╫í╫Ö)?
╫¬╫⌐╫É╫£ ╫¿╫º ╫É╫¥ ╫É╫¬╫ö ╫⌐╫ò╫₧╫ó ╫¬╫Ö╫É╫ò╫¿ ╫⌐╫₧╫ó╫Ö╫ô ╫ó╫£ ╫₧╫ª╫æ ╫¬╫ñ╫º╫ò╫ô╫Ö ╫º╫⌐╫ö.

6. ╫ö╫É╫¥ ╫Ö╫⌐ ╫£╫Ü ╫æ╫Ö╫ÿ╫ò╫ù ╫í╫Ö╫ó╫ò╫ô╫Ö ╫æ╫º╫ò╫ñ╫¬ ╫ù╫ò╫£╫Ö╫¥?

7. ╫₧╫⌐╫£╫¥ ╫₧╫í ╫ö╫¢╫á╫í╫ö? ╫É╫¥ ╫¢╫ƒ, ╫¢╫₧╫ö?`;

export default function Home() {
  // === State ===
  const [activeTab, setActiveTab] = useState<'crm' | 'calls' | 'archive' | 'analytics' | 'tree' | 'followup'>('crm');
  const [darkMode, setDarkMode] = useState(false);
  const [twilioBalance, setTwilioBalance] = useState<string | null>(null);
  const [recentCalls, setRecentCalls] = useState<any[]>([]);
  const [loadingCalls, setLoadingCalls] = useState(true);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(true);
  const [processingImageId, setProcessingImageId] = useState<string | null>(null);
  
  // Live notes modal
  const [liveNotesLead, setLiveNotesLead] = useState<Lead | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showScript, setShowScript] = useState(true);
  
  // WebPhone state
  const [isPhoneOpen, setIsPhoneOpen] = useState(false);
  const [phoneTarget, setPhoneTarget] = useState({ name: '', phone: '' });
  
  // Decision Tree state in modal
  const [showDecisionTree, setShowDecisionTree] = useState(false);
  
  const [sortBy, setSortBy] = useState<'date' | 'importance'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterImportance, setFilterImportance] = useState<number | null>(null);
  const [globalSearch, setGlobalSearch] = useState('');
  const [archiveSearch, setArchiveSearch] = useState('');
  const [expandedCallSid, setExpandedCallSid] = useState<string | null>(null);
  const [activeAudioSid, setActiveAudioSid] = useState<string | null>(null);
  const [transcribingSids, setTranscribingSids] = useState<Set<string>>(new Set());
  
  // Agent Assist State
  const [assistCards, setAssistCards] = useState<{emoji: string, text: string}[]>([]);
  const [isAssistLoading, setIsAssistLoading] = useState(false);
  const [assistError, setAssistError] = useState<string | null>(null);
  const assistTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const leadsRef = useRef<Lead[]>(leads);
  const lastFetchedNotesRef = useRef<string>('');

  useEffect(() => {
    leadsRef.current = leads;
  }, [leads]);

  // === Data Fetching ===
  const fetchLeads = async () => {
    try {
      const res = await fetch("/api/leads");
      const data = await res.json();
      if (data.success) setLeads(data.leads);
    } catch (e) { console.error("Failed to fetch leads", e); }
    finally { setLoadingLeads(false); }
  };

  const handleLeadUpdate = async (id: string, updates: Partial<Lead>) => {
    // If status is being updated, check if it's one of the "relevant" ones
    if (updates.status) {
      const isRelevant = ['╫Æ╫Ö╫£╫Ö ╫ª╫¿╫Ö╫Ü ╫£╫ô╫æ╫¿ ╫É╫Ö╫¬╫ò', '╫₧╫ù╫¢╫ö ╫£╫ù╫¬╫Ö╫₧╫ö', '╫ù╫¬╫¥'].includes(updates.status);
      if (isRelevant) {
        updates.wasRelevant = true;
      }
    }

    setLeads(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l));
    if (liveNotesLead?.id === id) setLiveNotesLead(prev => prev ? { ...prev, ...updates } : null);
    try {
      await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...updates }) });
    } catch (error) { console.error('Failed to update lead:', error); fetchLeads(); }
  };

  const initiateCall = async (lead: any) => {
    if (!lead.phone) return;
    
    // 1. Update status to "╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ" ONLY if current status is "╫ù╫ô╫⌐"
    if (lead.status === '╫ù╫ô╫⌐') {
      handleLeadUpdate(lead.id, { status: '╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ' });
    }
    
    // 2. Trigger WebPhone directly (Browser Call)
    setPhoneTarget({ name: lead.clientName, phone: lead.phone });
    setIsPhoneOpen(true);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const deleteLead = async (id: string, name: string) => {
    if (!confirm(`╫£╫₧╫ù╫ò╫º ╫É╫¬ ╫ö╫£╫Ö╫ô "${name || '╫£╫£╫É ╫⌐╫¥'}"?`)) return;
    setLeads(prev => prev.filter(l => l.id !== id));
    const deletedCount = parseInt(localStorage.getItem('analytics_deleted_leads') || '0');
    localStorage.setItem('analytics_deleted_leads', (deletedCount + 1).toString());
    try { await fetch('/api/leads/delete', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) }); } catch(e) { console.error(e); fetchLeads(); }
  };

  const addNewLead = async () => {
    const newLead: Lead = {
      id: crypto.randomUUID(), clientName: "", source: "Manual", createdAt: new Date().toISOString(),
      lastContacted: null, status: "╫ù╫ô╫⌐", followUpDate: "", generalNotes: "", liveCallNotes: "", urgency: "╫æ╫Ö╫á╫ò╫á╫Ö╫¬"
    };
    setLeads(prev => [newLead, ...prev]);
    try { await fetch('/api/leads/update', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newLead) }); } catch(e) { console.error(e); }
  };

  const fetchTwilioData = async () => {
    setLoadingCalls(true);
    try {
      const balRes = await fetch("/api/twilio/balance"); const balData = await balRes.json();
      if (balData.success) setTwilioBalance(balData.balance);
      const callsRes = await fetch("/api/twilio/calls");
      if (callsRes.ok) {
        const data = await callsRes.json();
        setRecentCalls(data.calls || []);
      }
    } catch (e) { console.error("Failed to fetch Twilio data", e); }
    finally { setLoadingCalls(false); }
  };

  const handleCallEnd = useCallback(async (phone: string) => {
    console.log("Call ended for phone:", phone);
    const normalized = normalizePhone(phone);
    if (!normalized) return;
    
    // Use leadsRef.current to avoid stale closures and unnecessary re-creations
    const lead = leadsRef.current.find(l => {
      if (!l.phone) return false;
      const leadNorm = normalizePhone(l.phone);
      return leadNorm === normalized;
    });

    if (lead && lead.status === '╫ù╫ô╫⌐') {
      console.log("Found new lead, updating status to awaiting update:", lead.clientName);
      handleLeadUpdate(lead.id, { status: '╫₧╫₧╫¬╫Ö╫ƒ ╫£╫ó╫ô╫¢╫ò╫ƒ' });
    } else {
      console.log("Lead not new or not found, skipping status update.");
    }
  }, [handleLeadUpdate]); // leads is no longer a dependency

  const fetchAgentAssist = async (notes: string) => {
    if (!notes || notes.trim().length < 5) return;
    setIsAssistLoading(true);
    setAssistError(null);
    try {
      const res = await fetch('/api/gemini/agent-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes })
      });
      const data = await res.json();
      if (data.success) {
        setAssistCards(data.alerts);
      } else {
        setAssistError(data.error || "╫⌐╫Æ╫Ö╫É╫ö ╫æ-AI");
      }
    } catch (err) {
      console.error("Agent Assist Fetch Error:", err);
      setAssistError("╫á╫¢╫⌐╫£ ╫æ╫ù╫Ö╫æ╫ò╫¿ ╫£╫⌐╫¿╫¬");
    } finally {
      setIsAssistLoading(false);
    }
  };

  const debouncedAgentAssist = useCallback((notes: string) => {
    if (assistTimeoutRef.current) clearTimeout(assistTimeoutRef.current);
    
    // Only fetch if notes have changed significantly (more than 15 chars)
    // and if the length is at least 5
    const diff = Math.abs(notes.length - lastFetchedNotesRef.current.length);
    if (diff < 15 && notes.length > 5) return;

    assistTimeoutRef.current = setTimeout(() => {
      fetchAgentAssist(notes);
      lastFetchedNotesRef.current = notes;
    }, 3000); // 3 seconds debounce for free tier
  }, []);

  const handleTranscribe = async (callSid: string, recordingUrl: string, phone: string) => {
    if (transcribingSids.has(callSid)) return;
    
    // Find the lead for this phone
    const normalized = normalizePhone(phone);
    const lead = leads.find(l => l.phone && normalizePhone(l.phone) === normalized);
    
    if (!lead) {
      alert("╫£╫É ╫á╫₧╫ª╫É ╫£╫Ö╫ô ╫₧╫¬╫É╫Ö╫¥ ╫£╫₧╫í╫ñ╫¿ ╫ö╫ÿ╫£╫ñ╫ò╫ƒ ╫ö╫û╫ö. ╫Ö╫⌐ ╫£╫ò╫ò╫ô╫É ╫⌐╫ö╫£╫Ö╫ô ╫º╫Ö╫Ö╫¥ ╫æ╫ÿ╫æ╫£╫ö.");
      return;
    }

    setTranscribingSids(prev => new Set(prev).add(callSid));
    try {
      const res = await fetch('/api/twilio/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          leadId: lead.id,
          recordingUrl,
          callSid
        })
      });
      
      const data = await res.json();
      if (data.success) {
        // Refresh leads to get the new transcription
        await fetchLeads();
      } else {
        alert("╫⌐╫Æ╫Ö╫É╫ö ╫æ╫¬╫₧╫£╫ò╫£: " + (data.error || "╫⌐╫Æ╫Ö╫É╫ö ╫£╫É ╫Ö╫ô╫ò╫ó╫ö"));
      }
    } catch (err) {
      console.error("Transcription error:", err);
      alert("╫¢╫⌐╫£ ╫æ╫ù╫Ö╫æ╫ò╫¿ ╫£╫⌐╫¿╫¬ ╫ö╫¬╫₧╫£╫ò╫£");
    } finally {
      setTranscribingSids(prev => {
        const next = new Set(prev);
        next.delete(callSid);
        return next;
      });
    }
  };

  useEffect(() => { 
    fetchTwilioData(); 
    fetchLeads(); 
    const i1 = setInterval(fetchTwilioData, 60000); 
    const i2 = setInterval(fetchLeads, 30000); 
    return () => { clearInterval(i1); clearInterval(i2); }; 
  }, []);

  // One-time migration for historical relevance on mount/data load
  useEffect(() => {
    if (leads.length > 0) {
      const needsMigration = leads.filter(l => 
        !l.wasRelevant && ['╫Æ╫Ö╫£╫Ö ╫ª╫¿╫Ö╫Ü ╫£╫ô╫æ╫¿ ╫É╫Ö╫¬╫ò', '╫₧╫ù╫¢╫ö ╫£╫ù╫¬╫Ö╫₧╫ö', '╫ù╫¬╫¥'].includes(l.status)
      );
      if (needsMigration.length > 0) {
        console.log(`Migrating ${needsMigration.length} leads for relevance history...`);
        needsMigration.forEach(l => handleLeadUpdate(l.id, { wasRelevant: true }));
      }
    }
  }, [leads.length]); // Only run when leads are first loaded or count changes

  const handleTreeComplete = (answers: any) => {
    if (!liveNotesLead) return;
    
    const summaryParts = [];
    if (answers.name) summaryParts.push(`╫⌐╫¥: ${answers.name}`);
    if (answers.age) summaryParts.push(`╫Æ╫Ö╫£: ${answers.age}`);
    if (answers.income) summaryParts.push(`╫ö╫¢╫á╫í╫ö: ${answers.income}`);
    if (answers.medicalCondition) {
      const conditionLabel = legalQuestions.find(q => q.id === 'medicalCondition')?.options?.find(o => o.value === answers.medicalCondition)?.label || answers.medicalCondition;
      summaryParts.push(`╫₧╫ª╫æ ╫¿╫ñ╫ò╫É╫Ö: ${conditionLabel}`);
    }
    if (answers.taxPaid) summaryParts.push(`╫₧╫í ╫⌐╫⌐╫ò╫£╫¥: ${answers.taxPaid}`);
    
    const treeSummary = `\n╫í╫Ö╫¢╫ò╫¥ ╫ó╫Ñ ╫ö╫ù╫£╫ÿ╫ò╫¬:\n${summaryParts.join('\n')}\n`;
    const newNotes = (liveNotesLead.liveCallNotes || '') + treeSummary;
    
    handleLeadUpdate(liveNotesLead.id, { liveCallNotes: newNotes });
    setShowDecisionTree(false);
  };

  // === Dark Mode & Body Scroll Lock ===
  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [darkMode]);

  useEffect(() => {
    if (liveNotesLead) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = 'auto'; };
  }, [liveNotesLead]);

  // === Image Paste Handler ===
  const handlePaste = useCallback(async (e: React.ClipboardEvent<HTMLDivElement>, leadId: string) => {
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
          if (!text) {
            alert('╫£╫É ╫û╫Ö╫ö╫Ö╫á╫ò ╫ÿ╫º╫í╫ÿ ╫æ╫¬╫₧╫ò╫á╫ö. ╫á╫í╫ö ╫¬╫₧╫ò╫á╫ö ╫æ╫¿╫ò╫¿╫ö ╫Ö╫ò╫¬╫¿.');
            setProcessingImageId(null);
            return;
          }
          const phoneMatch = text.match(/0[2-9]\d[-.\s]?\d{3}[-.\s]?\d{4}|0[2-9]\d{8}/) || text.match(/\d{9,10}/);
          const phone = phoneMatch ? phoneMatch[0].replace(/[-.\s]/g, '') : '';
          let name = text;
          if (phone) name = name.replace(phoneMatch![0], '');
          name = name.replace(/[\d\n\r\t|]/g, ' ').replace(/\s+/g, ' ').trim();
          const updates: Partial<Lead> = {};
          if (name) updates.clientName = name;
          if (phone) updates.phone = phone;
          if (Object.keys(updates).length > 0) handleLeadUpdate(leadId, updates);
          else alert('╫£╫É ╫ö╫ª╫£╫ù╫á╫ò ╫£╫ù╫£╫Ñ ╫⌐╫¥ ╫É╫ò ╫ÿ╫£╫ñ╫ò╫ƒ ╫₧╫ö╫¬╫₧╫ò╫á╫ö.');
        } catch (err) {
          console.error('OCR Error:', err);
          alert('╫⌐╫Æ╫Ö╫É╫ö ╫æ╫á╫Ö╫¬╫ò╫ù ╫ö╫¬╫₧╫ò╫á╫ö');
        } finally {
          setProcessingImageId(null);
        }
        break;
      }
    }
  }, []);

  // === Sorting & Filtering ===
  const crmLeads = useMemo(() => leads
    .filter(l => l.status !== '╫ù╫¬╫¥' && l.status !== '╫á╫Æ╫₧╫¿' && l.status !== '╫æ╫₧╫ó╫º╫æ')
    .filter(l => {
      if (!globalSearch) return true;
      const q = globalSearch.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)) || (l.generalNotes && l.generalNotes.toLowerCase().includes(q));
    })
    .filter(l => filterImportance === null || getStatusStyle(l.status).importance === filterImportance)
    .sort((a, b) => {
      if (sortBy === 'importance') {
        const impA = getStatusStyle(a.status).importance;
        const impB = getStatusStyle(b.status).importance;
        if (impA !== impB) return impA - impB;
      }
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, filterImportance, sortOrder, globalSearch, sortBy]);

  const followUpLeads = useMemo(() => leads
    .filter(l => l.status === '╫æ╫₧╫ó╫º╫æ')
    .filter(l => {
      if (!globalSearch) return true;
      const q = globalSearch.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)) || (l.generalNotes && l.generalNotes.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      const dateA = new Date(a.createdAt).getTime();
      const dateB = new Date(b.createdAt).getTime();
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    }), [leads, sortOrder, globalSearch]);

  const archiveLeads = useMemo(() => leads
    .filter(l => l.status === '╫ù╫¬╫¥' || l.status === '╫£╫É ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö' || l.status === '╫á╫Æ╫₧╫¿')
    .filter(l => {
      const search = globalSearch || archiveSearch;
      if (!search) return true;
      const q = search.toLowerCase();
      return (l.clientName && l.clientName.toLowerCase().includes(q)) || (l.phone && l.phone.includes(q)) || (l.generalNotes && l.generalNotes.toLowerCase().includes(q));
    })
    .sort((a, b) => {
      if (a.status === '╫ù╫¬╫¥' && b.status !== '╫ù╫¬╫¥') return -1;
      if (b.status === '╫ù╫¬╫¥' && a.status !== '╫ù╫¬╫¥') return 1;
      const dateA = new Date(a.signedAt || a.createdAt).getTime();
      const dateB = new Date(b.signedAt || b.createdAt).getTime();
      return dateB - dateA;
    }), [leads, archiveSearch]);
  
  const stats = useMemo(() => {
    const total = leads.length;
    const signed = leads.filter(l => l.status === '╫ù╫¬╫¥').length;
    const disqualified = leads.filter(l => l.status === '╫£╫É ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö').length;
    const noAnswer = leads.filter(l => l.status === '╫£╫É ╫ó╫á╫ö').length;
    const newLeads = leads.filter(l => l.status === '╫ù╫ô╫⌐').length;
    
    // Total screened (not new)
    const screened = total - newLeads;
    
    // Leads that were deemed relevant after screening
    const actuallyRelevant = leads.filter(l => 
      l.wasRelevant === true ||
      l.status === '╫Æ╫Ö╫£╫Ö ╫ª╫¿╫Ö╫Ü ╫£╫ô╫æ╫¿ ╫É╫Ö╫¬╫ò' || 
      l.status === '╫₧╫ù╫¢╫ö ╫£╫ù╫¬╫Ö╫₧╫ö' || 
      l.status === '╫ù╫¬╫¥'
    ).length;

    // Leads that were relevant but ended without a deal
    const lostRelevant = leads.filter(l => l.status === '╫á╫Æ╫₧╫¿').length;
    
    const successRate = actuallyRelevant > 0 ? ((signed / actuallyRelevant) * 100).toFixed(1) : "0";
    const disqualificationRate = screened > 0 ? ((disqualified / screened) * 100).toFixed(1) : "0";
    
    // Average cost per call
    const callsWithPrice = recentCalls.filter(c => c.price && parseFloat(c.price) !== 0);
    const totalCost = callsWithPrice.reduce((sum, c) => sum + Math.abs(parseFloat(c.price)), 0);
    const avgCost = callsWithPrice.length > 0 ? (totalCost / callsWithPrice.length).toFixed(3) : "0.00";

    const byStatus = leads.reduce((acc, l) => {
      acc[l.status] = (acc[l.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return { 
      total, signed, actuallyRelevant, lostRelevant, disqualified, noAnswer, newLeads, screened,
      successRate, disqualificationRate, byStatus, avgCost 
    };
  }, [leads, recentCalls]);

  // === Helpers ===
  const formatDuration = (seconds: string) => { if (!seconds) return "00:00"; const s = parseInt(seconds); return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`; };
  const formatDate = (d: string) => new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(new Date(d));

  const cardClass = "premium-glass rounded-3xl";
  const cardClassSoft = "bg-white/40 dark:bg-slate-800/40 backdrop-blur-md border border-white/20 dark:border-white/5 rounded-2xl";

  return (
    <div className={`min-h-screen transition-all duration-700 ${darkMode ? 'dark text-slate-100' : 'text-slate-900'} bg-mesh relative overflow-hidden selection:bg-indigo-500/20`}>
      <main className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 py-10 font-sans relative z-10" dir="rtl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white flex items-center gap-3">Sue-Chef <span className="text-[10px] bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full border border-indigo-500/20 font-black tracking-widest">v5.1</span></h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 font-medium">{crmLeads.length} ╫£╫Ö╫ô╫Ö╫¥ ╫ñ╫ó╫Ö╫£╫Ö╫¥ ╫æ╫ÿ╫Ö╫ñ╫ò╫£ ╫⌐╫ò╫ÿ╫ú</p>
          </div>
          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-3 px-5 py-3.5 ${cardClass}`}>
              <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase tracking-wider">╫Ö╫¬╫¿╫¬ ╫ù╫⌐╫æ╫ò╫ƒ</p>
                <p className="text-xl font-black leading-none text-emerald-600 dark:text-emerald-400" dir="ltr">{twilioBalance || "..."}</p>
              </div>
            </div>
            <button onClick={() => setDarkMode(!darkMode)} className={`p-4 transition-all active:scale-95 hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <div className="relative w-6 h-6">
                <Sun className={`absolute inset-0 w-6 h-6 text-yellow-500 transition-transform duration-500 ${darkMode ? 'rotate-90 scale-0' : 'rotate-0 scale-100'}`} />
                <Moon className={`absolute inset-0 w-6 h-6 text-indigo-400 transition-transform duration-500 ${darkMode ? 'rotate-0 scale-100' : '-rotate-90 scale-0'}`} />
              </div>
            </button>
            <button onClick={() => { fetchTwilioData(); fetchLeads(); }} className={`p-4 transition-all active:scale-95 group hover:bg-white dark:hover:bg-gray-800 ${cardClass}`}>
              <RefreshCw className={`w-6 h-6 transition-transform ${(loadingCalls||loadingLeads) ? 'animate-spin text-indigo-500' : 'text-gray-600 dark:text-gray-300 group-hover:rotate-180 duration-500 group-hover:text-indigo-500'}`} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-10 p-2 w-fit rounded-[24px] premium-glass relative overflow-hidden group">
          <button onClick={() => setActiveTab('crm')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'crm' ? 'bg-indigo-600 text-white shadow-[0_8px_20px_-4px_rgba(79,70,229,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <TableProperties className="w-4.5 h-4.5" /> ╫ÿ╫æ╫£╫¬ ╫₧╫ó╫º╫æ
          </button>
          <button onClick={() => setActiveTab('calls')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'calls' ? 'bg-blue-600 text-white shadow-[0_8px_20px_-4px_rgba(37,99,235,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <PhoneCall className="w-4.5 h-4.5" /> ╫⌐╫Ö╫ù╫ò╫¬ ╫É╫ù╫¿╫ò╫á╫ò╫¬
          </button>
          <button onClick={() => setActiveTab('archive')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'archive' ? 'bg-amber-600 text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <CheckCircle className="w-4.5 h-4.5" /> ╫É╫¿╫¢╫Ö╫ò╫ƒ
          </button>
          <button onClick={() => setActiveTab('analytics')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'analytics' ? 'bg-purple-600 text-white shadow-[0_8px_20px_-4px_rgba(147,51,234,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <BarChart className="w-4.5 h-4.5" /> ╫É╫á╫£╫Ö╫ÿ╫Ö╫º╫ö
          </button>
          <button onClick={() => setActiveTab('tree')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'tree' ? 'bg-emerald-600 text-white shadow-[0_8px_20px_-4px_rgba(5,150,105,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <ClipboardList className="w-4.5 h-4.5" /> ╫ó╫Ñ ╫ö╫ù╫£╫ÿ╫ò╫¬
          </button>
          <button onClick={() => setActiveTab('followup')} className={`flex items-center gap-2.5 px-8 py-3.5 rounded-2xl text-sm font-bold transition-all duration-500 relative z-10 ${activeTab === 'followup' ? 'bg-amber-600 text-white shadow-[0_8px_20px_-4px_rgba(217,119,6,0.4)] scale-105' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100/50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'}`}>
            <History className="w-4.5 h-4.5" /> ╫æ╫₧╫ó╫º╫æ ({leads.filter(l => l.status === '╫æ╫₧╫ó╫º╫æ').length})
          </button>
        </div>

        {/* CRM Content */}
        {activeTab === 'crm' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <button onClick={addNewLead} className="flex items-center gap-3 bg-indigo-600 hover:bg-indigo-700 text-white px-8 py-4 rounded-[24px] text-sm font-black shadow-xl shadow-indigo-500/20 active:scale-95 transition-all animate-in slide-in-from-right-4 duration-500">
                <Plus className="w-5 h-5" /> ╫ö╫ò╫í╫ú ╫£╫Ö╫ô ╫ù╫ô╫⌐
              </button>

              <div className="flex flex-wrap items-center gap-4 flex-1 justify-end animate-in slide-in-from-left-4 duration-500">
                <div className="flex items-center gap-3 px-6 py-3.5 premium-glass rounded-[24px] w-full max-w-md group focus-within:premium-glass-active transition-all duration-500">
                  <RefreshCw className={`w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors ${loadingLeads ? 'animate-spin' : ''}`} />
                  <input type="text" placeholder="╫ù╫Ö╫ñ╫ò╫⌐ ╫₧╫ö╫Ö╫¿ ╫æ╫¢╫£ ╫ö╫£╫Ö╫ô╫Ö╫¥..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="bg-transparent outline-none text-sm w-full font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />
                <div className="flex flex-wrap items-center gap-2 p-1.5 premium-glass rounded-[20px] shadow-sm">
                  <button onClick={() => setSortBy(s => s === 'date' ? 'importance' : 'date')} className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all border ${sortBy === 'importance' ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-500/20' : 'bg-white/40 dark:bg-slate-800/40 border-white/20 dark:border-white/5 active:scale-95'}`}>
                    <ArrowUpDown className={`w-3.5 h-3.5 ${sortBy === 'importance' ? 'text-white' : 'text-indigo-500'}`} /> {sortBy === 'importance' ? '╫£╫ñ╫Ö ╫ù╫⌐╫Ö╫æ╫ò╫¬' : '╫í╫ô╫¿ ╫¢╫¿╫ò╫á╫ò╫£╫ò╫Æ╫Ö'}
                  </button>
                  <button onClick={() => setSortOrder(s => s === 'desc' ? 'asc' : 'desc')} className="flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-wider transition-all bg-white/40 dark:bg-slate-800/40 hover:bg-white dark:hover:bg-slate-700 active:scale-95 border border-white/20 dark:border-white/5 mx-1">
                    {sortOrder === 'desc' ? '╫ö╫¢╫Ö ╫ù╫ô╫⌐╫Ö╫¥' : '╫ö╫¢╫Ö ╫Ö╫⌐╫á╫Ö╫¥'}
                  </button>
                </div>
              </div>
            </div>

            {crmLeads.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-bold">╫É╫Ö╫ƒ ╫£╫Ö╫ô╫Ö╫¥ ╫ñ╫ó╫Ö╫£╫Ö╫¥</div>
            ) : (
              <div className="premium-glass rounded-[32px] overflow-hidden shadow-2xl border-white/50">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-indigo-500/10">
                      <tr>
                        <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[300px]">╫ñ╫¿╫ÿ╫Ö ╫£╫Ö╫ô ╫ò╫ù╫Ö╫ò╫Æ</th>
                        <th className="px-2 py-6 font-bold w-12 text-center"></th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[180px]">╫í╫ÿ╫ÿ╫ò╫í ╫ÿ╫Ö╫ñ╫ò╫£</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[220px]">╫ö╫ó╫¿╫ò╫¬ ╫ò╫₧╫ó╫º╫æ</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">╫₧╫í╫Ü ╫⌐╫Ö╫ù╫ö</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/5">
                      {crmLeads.map((lead, idx) => (
                        <tr 
                          key={lead.id} 
                          className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                          style={{ animationDelay: `${idx * 50}ms`, transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                        >
                          <td className="px-8 py-5">
                            <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-5 p-2 rounded-2xl transition-all duration-300 group-hover:translate-x-1">
                              <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[20px] shadow-lg shadow-indigo-500/20 active:scale-90 transition-all hover:scale-110"><Phone className="w-6 h-6" /></button>
                              <div className="flex flex-col flex-1 gap-1">
                                <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors" placeholder="╫⌐╫¥ ╫ö╫£╫º╫ò╫ù..." />
                                <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-medium text-slate-400 bg-transparent outline-none text-sm group-focus-within:text-slate-500" placeholder="05..." dir="ltr" />
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
                                        const phone = normalizePhone(lead.phone || '').replace(/^0/, '972');
                                        const firstName = lead.clientName ? lead.clientName.split(' ')[0] : '╫£╫º╫ò╫ù';
                                        const msg = encodeURIComponent(`╫ö╫Ö╫Ö ${firstName}, ╫º╫ò╫¿╫É╫Ö╫¥ ╫£╫Ö ╫Ö╫ò╫á╫¬╫ƒ ╫É╫á╫Ö ╫₧╫₧╫⌐╫¿╫ô ╫ó╫ò"╫ô HBA. ╫ö╫⌐╫É╫¿╫¬ ╫É╫ª╫£╫á╫ò ╫ñ╫¿╫ÿ╫Ö╫¥ ╫æ╫á╫ò╫Æ╫ó ╫£╫û╫¢╫ò╫Ö╫ò╫¬ ╫¿╫ñ╫ò╫É╫Ö╫ò╫¬ ╫ò╫á╫Ö╫í╫Ö╫¬╫Ö ╫£╫ù╫û╫ò╫¿ ╫É╫£╫Ö╫Ö╫Ü, ╫É╫⌐╫₧╫ù ╫É╫¥ ╫á╫ò╫¢╫£ ╫£╫⌐╫ò╫ù╫ù ╫¢╫⌐╫Ö╫ö╫Ö╫ö ╫û╫₧╫ƒ`);
                                        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><MessageSquare className="w-4 h-4" /> ╫⌐╫£╫ù ╫ö╫ò╫ô╫ó╫ö</button>
                                      <button onClick={() => {
                                        copyToClipboard(lead.phone || '');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /> ╫ö╫ó╫¬╫º ╫₧╫í╫ñ╫¿</button>
                                      <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                      <button onClick={() => {
                                        deleteLead(lead.id, lead.clientName);
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 className="w-4 h-4" /> ╫₧╫ù╫º ╫£╫Ö╫ô</button>
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
                                {Object.entries(STATUS_CONFIG).filter(([k]) => k === lead.status || !AUTO_ONLY_STATUSES.has(k)).map(([k,v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDown size={14} /></div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <textarea 
                              value={lead.generalNotes || ''} 
                              onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                              className="w-full text-sm font-bold bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none h-20 resize-none focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                              placeholder="╫ö╫ó╫¿╫ò╫¬ ╫£╫₧╫ó╫º╫æ..." 
                            />
                          </td>
                          <td className="px-6 py-5 text-center">
                             <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-800/60 px-6 py-3 rounded-2xl border border-white dark:border-white/10 transition-all hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 shadow-sm active:scale-95"><Maximize2 className="w-4 h-4" /> ╫ñ╫¬╫ù ╫¬╫Ö╫º</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Follow-Up Tab */}
        {activeTab === 'followup' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
              <div className="flex flex-col">
                <h2 className="text-2xl font-black flex items-center gap-3"><History className="w-6 h-6 text-amber-500" /> ╫£╫Ö╫ô╫Ö╫¥ ╫æ╫₧╫ó╫º╫æ</h2>
                <p className="text-xs font-bold text-slate-500 mt-1 uppercase tracking-widest">╫£╫Ö╫ô╫Ö╫¥ ╫⌐╫ù╫⌐╫ò╫æ ╫£╫ù╫û╫ò╫¿ ╫É╫£╫Ö╫ö╫¥ ╫æ╫ó╫¬╫Ö╫ô</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-6 py-3.5 premium-glass rounded-[24px] w-full max-w-md group focus-within:premium-glass-active transition-all duration-500">
                  <RefreshCw className={`w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors ${loadingLeads ? 'animate-spin' : ''}`} />
                  <input type="text" placeholder="╫ù╫Ö╫ñ╫ò╫⌐ ╫æ╫₧╫ó╫º╫æ..." value={globalSearch} onChange={(e) => setGlobalSearch(e.target.value)} className="bg-transparent outline-none text-sm w-full font-bold placeholder:text-slate-400 dark:placeholder:text-slate-500" />
                </div>
              </div>
            </div>

            {followUpLeads.length === 0 ? (
              <div className="text-center py-20 text-gray-400 font-bold">╫É╫Ö╫ƒ ╫£╫Ö╫ô╫Ö╫¥ ╫æ╫₧╫ó╫º╫æ ╫¢╫¿╫Æ╫ó</div>
            ) : (
              <div className="premium-glass rounded-[32px] overflow-hidden shadow-2xl border-white/50">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-sm text-right border-collapse">
                    <thead className="bg-slate-50/50 dark:bg-slate-950/20 border-b border-indigo-500/10">
                      <tr>
                        <th className="px-8 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[300px]">╫ñ╫¿╫ÿ╫Ö ╫£╫Ö╫ô ╫ò╫ù╫Ö╫ò╫Æ</th>
                        <th className="px-2 py-6 font-bold w-12 text-center"></th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[180px]">╫í╫ÿ╫ÿ╫ò╫í ╫ÿ╫Ö╫ñ╫ò╫£</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 min-w-[220px]">╫ö╫ó╫¿╫ò╫¬ ╫ò╫₧╫ó╫º╫æ</th>
                        <th className="px-6 py-6 font-black text-[10px] uppercase tracking-widest text-slate-400 text-center">╫₧╫í╫Ü ╫⌐╫Ö╫ù╫ö</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-indigo-500/5">
                      {followUpLeads.map((lead, idx) => (
                        <tr 
                          key={lead.id} 
                          className="group hover:bg-white/60 dark:hover:bg-white/5 transition-all duration-500 animate-in fade-in slide-in-from-bottom-4 fill-mode-both"
                          style={{ animationDelay: `${idx * 50}ms`, transitionTimingFunction: 'cubic-bezier(0.23, 1, 0.32, 1)' }}
                        >
                          <td className="px-8 py-5">
                            <div onPaste={(e) => handlePaste(e, lead.id)} className="flex items-center gap-5 p-2 rounded-2xl transition-all duration-300 group-hover:translate-x-1">
                              <button onClick={() => initiateCall(lead)} className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-[20px] shadow-lg shadow-indigo-500/20 active:scale-90 transition-all hover:scale-110"><Phone className="w-6 h-6" /></button>
                              <div className="flex flex-col flex-1 gap-1">
                                <input type="text" value={lead.clientName} onChange={e => handleLeadUpdate(lead.id, { clientName: e.target.value })} className="font-black text-xl bg-transparent outline-none focus:text-indigo-600 dark:focus:text-indigo-400 transition-colors" placeholder="╫⌐╫¥ ╫ö╫£╫º╫ò╫ù..." />
                                <input type="text" value={lead.phone} onChange={e => handleLeadUpdate(lead.id, { phone: e.target.value })} className="font-mono font-medium text-slate-400 bg-transparent outline-none text-sm group-focus-within:text-slate-500" placeholder="05..." dir="ltr" />
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
                                        const phone = normalizePhone(lead.phone || '').replace(/^0/, '972');
                                        const firstName = lead.clientName ? lead.clientName.split(' ')[0] : '╫£╫º╫ò╫ù';
                                        const msg = encodeURIComponent(`╫ö╫Ö╫Ö ${firstName}, ╫º╫ò╫¿╫É╫Ö╫¥ ╫£╫Ö ╫Ö╫ò╫á╫¬╫ƒ ╫É╫á╫Ö ╫₧╫₧╫⌐╫¿╫ô ╫ó╫ò"╫ô HBA. ╫ö╫⌐╫É╫¿╫¬ ╫É╫ª╫£╫á╫ò ╫ñ╫¿╫ÿ╫Ö╫¥ ╫æ╫á╫ò╫Æ╫ó ╫£╫û╫¢╫ò╫Ö╫ò╫¬ ╫¿╫ñ╫ò╫É╫Ö╫ò╫¬ ╫ò╫á╫Ö╫í╫Ö╫¬╫Ö ╫£╫ù╫û╫ò╫¿ ╫É╫£╫Ö╫Ö╫Ü, ╫É╫⌐╫₧╫ù ╫É╫¥ ╫á╫ò╫¢╫£ ╫£╫⌐╫ò╫ù╫ù ╫¢╫⌐╫Ö╫ö╫Ö╫ö ╫û╫₧╫ƒ`);
                                        window.open(`https://web.whatsapp.com/send?phone=${phone}&text=${msg}`, '_blank');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-600"><MessageSquare className="w-4 h-4" /> ╫⌐╫£╫ù ╫ö╫ò╫ô╫ó╫ö</button>
                                      <button onClick={() => {
                                        copyToClipboard(lead.phone || '');
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-gray-100 dark:hover:bg-gray-800"><Copy className="w-4 h-4" /> ╫ö╫ó╫¬╫º ╫₧╫í╫ñ╫¿</button>
                                      <div className="h-px bg-gray-100 dark:bg-gray-800" />
                                      <button onClick={() => {
                                        deleteLead(lead.id, lead.clientName);
                                        setOpenMenuId(null);
                                      }} className="w-full text-right px-4 py-3 text-sm font-bold flex items-center gap-3 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600"><Trash2 className="w-4 h-4" /> ╫₧╫ù╫º ╫£╫Ö╫ô</button>
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
                                {Object.entries(STATUS_CONFIG).filter(([k]) => k === lead.status || !AUTO_ONLY_STATUSES.has(k)).map(([k,v]) => (
                                  <option key={k} value={k}>{v.label}</option>
                                ))}
                              </select>
                              <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ChevronDown size={14} /></div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            <textarea 
                              value={lead.generalNotes || ''} 
                              onChange={e => handleLeadUpdate(lead.id, { generalNotes: e.target.value })} 
                              className="w-full text-sm font-bold bg-white/60 dark:bg-slate-950/60 border border-slate-200 dark:border-white/10 rounded-2xl p-4 outline-none h-20 resize-none focus:bg-white dark:focus:bg-slate-900 transition-all placeholder:text-slate-400 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-indigo-500/10 shadow-sm" 
                              placeholder="╫ö╫ó╫¿╫ò╫¬ ╫£╫₧╫ó╫º╫æ..." 
                            />
                          </td>
                          <td className="px-6 py-5 text-center">
                             <button onClick={() => setLiveNotesLead(lead)} className="inline-flex items-center gap-2.5 text-xs font-black text-indigo-600 dark:text-indigo-400 bg-white/60 dark:bg-slate-800/60 px-6 py-3 rounded-2xl border border-white dark:border-white/10 transition-all hover:bg-indigo-600 hover:text-white dark:hover:bg-indigo-500 shadow-sm active:scale-95"><Maximize2 className="w-4 h-4" /> ╫ñ╫¬╫ù ╫¬╫Ö╫º</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Calls Tab */}
        {activeTab === 'calls' && (
          <div className={`p-6 ${cardClass}`}>
            
            <h3 className="font-bold text-lg mb-6 flex items-center gap-3"><History className="w-6 h-6 text-indigo-500" /> ╫⌐╫Ö╫ù╫ò╫¬ ╫É╫ù╫¿╫ò╫á╫ò╫¬</h3>
            <div className="flex flex-col gap-3 max-w-3xl mx-auto">
              {recentCalls.map(call => {
                const callPhone = call.direction === 'inbound' ? call.from : call.to;
                const matchedName = findLeadNameByPhone(callPhone || '', leads);
                return (
                  <div key={call.sid} className={`p-5 rounded-3xl flex flex-col gap-4 border transition-all duration-300 hover:shadow-lg ${cardClassSoft}`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-black text-lg text-indigo-600 dark:text-indigo-400">{matchedName || '╫£╫Ö╫ô ╫£╫É ╫₧╫û╫ò╫ö╫ö'}</p>
                          {leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary && (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400 text-[9px] font-black uppercase tracking-wider">╫¬╫ò╫₧╫£╫£ ≡ƒñû</span>
                          )}
                        </div>
                        <p className="text-xs font-mono font-bold text-slate-400" dir="ltr">{callPhone}</p>
                        <p className="text-[10px] text-gray-400 mt-1 uppercase tracking-widest">{formatDate(call.startTime)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-[9px] opacity-30 font-mono mt-1 text-right truncate max-w-[80px]" dir="ltr">
                    {call.sid}
                  </div>

                        <div className="flex items-center gap-2">
                          {call.recordingUrl && (
                            <button 
                              onClick={() => setActiveAudioSid(activeAudioSid === call.sid ? null : call.sid)}
                              className={`flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[11px] font-black transition-all active:scale-95 shadow-lg ${activeAudioSid === call.sid ? 'bg-indigo-600 text-white shadow-indigo-600/30 ring-2 ring-indigo-500/20' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-500/10'}`}
                            >
                              <MonitorPlay className={`w-4 h-4 ${activeAudioSid === call.sid ? 'text-white' : 'text-indigo-500'}`} />
                              {activeAudioSid === call.sid ? '╫í╫Æ╫ò╫¿ ╫á╫Æ╫ƒ' : '╫ö╫É╫û╫ƒ ╫£╫ö╫º╫£╫ÿ╫ö'}
                            </button>
                          )}
                        </div>
                        <span className="text-xs font-mono font-black bg-white dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-white/50 dark:border-white/5">{formatDuration(call.duration)}</span>
                        {call.price && (
                          <span className="text-[10px] font-mono font-black text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-2.5 py-1.5 rounded-xl border border-amber-200/50 mr-2" dir="ltr">
                            {Math.abs(parseFloat(call.price)).toFixed(3)}$
                          </span>
                        )}
                        <span className={`text-[9px] font-black px-2.5 py-1.5 rounded-xl border uppercase tracking-wider ${call.status === 'completed' ? 'border-emerald-200 text-emerald-600 bg-emerald-50' : 'border-red-200 text-red-600 bg-red-50'}`}>{call.direction === 'inbound' ? '╫á╫¢╫á╫í╫¬' : '╫Ö╫ò╫ª╫É╫¬'}</span>
                      </div>
                    </div>

                    {/* Expandable WhatsApp Player Row */}
                    {activeAudioSid === call.sid && call.recordingUrl && (
                      <div className="mt-2 p-5 rounded-[32px] bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/10 animate-in slide-in-from-top-4 duration-500 flex flex-col gap-5">
                        <div className="flex items-center justify-between px-2">
                           <div className="flex items-center gap-2.5">
                              <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                              <span className="text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest">╫á╫Æ╫ƒ ╫ö╫º╫£╫ÿ╫ö ╫ù╫¢╫¥</span>
                           </div>
                           <button 
                              onClick={(e) => { e.stopPropagation(); handleTranscribe(call.sid, call.recordingUrl, callPhone); }}
                              disabled={transcribingSids.has(call.sid)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-[10px] font-black transition-all active:scale-95 ${transcribingSids.has(call.sid) ? 'bg-gray-100 text-gray-400' : 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 border border-indigo-500/10 shadow-sm'}`}
                            >
                              {transcribingSids.has(call.sid) ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                              {transcribingSids.has(call.sid) ? '╫₧╫¬╫₧╫£╫£...' : '╫¬╫₧╫£╫£ ╫ó╫¥ AI'}
                            </button>
                        </div>
                        <AudioWhatsApp src={call.recordingUrl} />
                      </div>
                    )}
                    
                    {/* Transcription Preview */}
                    {leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary && (
                      <div className="p-4 rounded-2xl bg-white/50 dark:bg-black/20 border border-indigo-500/5 animate-in slide-in-from-top-2 duration-500">
                        <div className="flex items-center gap-2 mb-2">
                          <Brain className="w-3.5 h-3.5 text-indigo-500" />
                          <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">╫í╫Ö╫¢╫ò╫¥ AI</span>
                        </div>
                        <p className="text-xs font-bold leading-relaxed opacity-80">{leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || ''))?.aiSummary}</p>
                        <button 
                          onClick={() => setLiveNotesLead(leads.find(l => l.phone && normalizePhone(l.phone) === normalizePhone(callPhone || '')) || null)}
                          className="mt-3 text-[10px] font-black text-indigo-600 hover:underline flex items-center gap-1"
                        >
                          ╫º╫¿╫É ╫¬╫₧╫£╫ò╫£ ╫₧╫£╫É ╫ò╫ñ╫¿╫ÿ╫Ö╫¥ ╫₧╫¿╫¢╫û╫Ö╫Ö╫¥ <ArrowUpDown className="w-3 h-3 rotate-180" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-20">
            {/* 1. Funnel Overview */}
            <div className={`mb-12 p-10 ${cardClass} border border-white/20 shadow-2xl overflow-hidden relative`}>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/5 blur-[100px] rounded-full pointer-events-none" />
              <div className="absolute bottom-0 left-10 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full pointer-events-none" />
              
              <div className="flex flex-col md:flex-row items-center justify-between gap-12 relative z-10">
                <div className="w-full md:w-1/2">
                  <h3 className="text-3xl font-black tracking-tight mb-2">╫₧╫⌐╫ñ╫Ü ╫ö╫₧╫¿╫ò╫¬ ╫ó╫₧╫ò╫º</h3>
                  <p className="text-gray-500 dark:text-gray-400 font-bold text-sm mb-10 italic">╫á╫Ö╫¬╫ò╫ù ╫æ╫Ö╫ª╫ò╫ó╫Ö╫¥ ╫₧╫æ╫ò╫í╫í ╫ó╫£ "╫£╫Ö╫ô╫Ö╫¥ ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö╫Ö╫¥" ╫æ╫£╫æ╫ô</p>
                  
                  <div className="flex flex-col gap-6">
                    {[
                      { label: '╫¢╫£ ╫ö╫£╫Ö╫ô╫Ö╫¥', count: stats.total, color: 'bg-slate-200 dark:bg-slate-700', text: 'text-slate-600 dark:text-slate-400', icon: <UserPlus className="w-4 h-4" /> },
                      { label: '╫á╫í╫¿╫º╫ò (Screened)', count: stats.screened, color: 'bg-indigo-300 dark:bg-indigo-700', text: 'text-indigo-700 dark:text-indigo-300', icon: <PhoneCall className="w-4 h-4" /> },
                      { label: '╫¿╫£╫ò╫ò╫á╫ÿ╫Ö╫Ö╫¥ ╫æ╫É╫₧╫¬', count: stats.actuallyRelevant, color: 'bg-blue-400 dark:bg-blue-600', text: 'text-blue-800 dark:text-blue-200', icon: <CheckCircle className="w-4 h-4" /> },
                      { label: '╫ù╫¬╫Ö╫₧╫ò╫¬ (╫ö╫ª╫£╫ù╫ö)', count: stats.signed, color: 'bg-emerald-500', text: 'text-emerald-900 dark:text-emerald-100', icon: <DollarSign className="w-4 h-4" /> }
                    ].map((step, idx) => {
                      const perc = stats.total > 0 ? (step.count / stats.total * 100) : 0;
                      return (
                        <div key={idx} className="group flex items-center gap-6">
                          <div className="w-48 text-left">
                            <p className={`text-sm font-black uppercase tracking-widest ${step.text}`}>{step.label}</p>
                            <p className="text-2xl font-black tracking-tighter">{step.count}</p>
                          </div>
                          <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden shadow-inner">
                            <div 
                              className={`h-full transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] rounded-full ${step.color} shadow-lg`}
                              style={{ width: `${perc}%`, transitionDelay: `${idx * 150}ms` }}
                            />
                          </div>
                          <div className="w-16 text-right font-black opacity-30 text-xs">{perc.toFixed(0)}%</div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="w-full md:w-1/3 flex flex-col gap-6">
                   <div className="p-8 rounded-[32px] bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-2xl relative overflow-hidden group">
                      <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl transition-transform group-hover:scale-150 duration-700" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70 mb-2">╫É╫ù╫ò╫û ╫ö╫ª╫£╫ù╫ö ╫₧╫ö╫¿╫£╫ò╫ò╫á╫ÿ╫Ö╫Ö╫¥</p>
                      <h4 className="text-6xl font-black tracking-tighter mb-4">{stats.successRate}<span className="text-2xl opacity-50">%</span></h4>
                      <p className="text-xs font-bold leading-relaxed opacity-80">╫û╫ö╫ò ╫ö╫É╫ù╫ò╫û ╫ö╫É╫₧╫Ö╫¬╫Ö ╫⌐╫₧╫Ö╫Ö╫ª╫Æ ╫É╫¬ ╫ö╫Ö╫¢╫ò╫£╫¬ ╫⌐╫£ ╫ö╫₧╫⌐╫¿╫ô ╫£╫ö╫ù╫¬╫Ö╫¥ ╫£╫º╫ò╫ù╫ò╫¬ ╫⌐╫ó╫æ╫¿╫ò ╫í╫Ö╫á╫ò╫ƒ.</p>
                   </div>
                   
                   <div className="p-8 rounded-[32px] bg-white dark:bg-slate-900 border border-indigo-500/10 shadow-xl">
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">╫É╫ù╫ò╫û ╫ñ╫í╫Ö╫£╫ö ╫¿╫É╫⌐╫ò╫á╫Ö</p>
                      <h4 className="text-4xl font-black tracking-tighter mb-2">{stats.disqualificationRate}<span className="text-xl opacity-30">%</span></h4>
                      <p className="text-xs font-bold text-slate-500 leading-relaxed">╫É╫ù╫ò╫û ╫ö╫£╫Ö╫ô╫Ö╫¥ (╫£╫É╫ù╫¿ ╫⌐╫Ö╫ù╫ö ╫¿╫É╫⌐╫ò╫á╫ö) ╫⌐╫á╫₧╫ª╫É╫ò ╫¢╫£╫É ╫¿╫£╫ò╫ò╫á╫ÿ╫Ö╫Ö╫¥ ╫₧╫Ö╫ô.</p>
                   </div>
                </div>
              </div>
            </div>

            {/* 2. Detailed Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Lost & Status Breakdown */}
              <div className={`p-8 ${cardClass}`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-3"><PhoneOff className="w-5 h-5 text-red-500" /> ╫£╫Ö╫ô╫Ö╫¥ ╫⌐╫É╫æ╫ô╫ò</h3>
                <div className="space-y-6">
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30">
                      <div>
                        <p className="text-[10px] font-black text-red-600 dark:text-red-400 uppercase">╫á╫í╫Æ╫¿╫ò ╫¢-"╫á╫Æ╫₧╫¿"</p>
                        <p className="text-2xl font-black text-red-700 dark:text-red-300">{stats.lostRelevant}</p>
                      </div>
                      <X className="w-8 h-8 text-red-200 dark:text-red-800" />
                   </div>
                   <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase">╫£╫É ╫ó╫á╫ò (╫á╫ÿ╫£╫ò)</p>
                        <p className="text-2xl font-black">{stats.noAnswer}</p>
                      </div>
                      <Phone className="w-8 h-8 text-slate-200 dark:text-slate-700" />
                   </div>
                </div>
              </div>

              {/* Status Efficiency */}
              <div className={`p-8 ${cardClass} md:col-span-2`}>
                <h3 className="text-lg font-black mb-6 flex items-center gap-3"><BarChart className="w-5 h-5 text-indigo-500" /> ╫ö╫¬╫ñ╫£╫Æ╫ò╫¬ ╫₧╫£╫É╫ö (╫¢╫ò╫£╫£ ╫É╫¿╫¢╫Ö╫ò╫ƒ)</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                   {Object.entries(STATUS_CONFIG).map(([k,v]) => {
                     const count = stats.byStatus[k] || 0;
                     if (count === 0) return null;
                     return (
                       <div key={k} className={`p-5 rounded-3xl border ${v.bg} ${v.border} group transition-all hover:scale-105 duration-300`}>
                          <p className={`text-[10px] font-black uppercase mb-1 opacity-60 ${v.color}`}>{v.label.substring(v.label.indexOf(' ') + 1)}</p>
                          <p className={`text-2xl font-black ${v.color}`}>{count}</p>
                       </div>
                     );
                   })}
                </div>
              </div>
            </div>

            {/* 3. Financial Info */}
            <div className={`mt-8 p-10 ${cardClass} flex flex-col md:flex-row items-center justify-between gap-8 group`}>
               <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                    <DollarSign className="w-8 h-8 text-amber-600 dark:text-amber-400 shadow-glow" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">╫ó╫£╫ò╫¬ ╫¬╫º╫⌐╫ò╫¿╫¬ ╫₧╫₧╫ò╫ª╫ó╫¬ ╫£╫£╫Ö╫ô</h4>
                    <p className="text-4xl font-black text-amber-600 dark:text-amber-400" dir="ltr">{stats.avgCost}$</p>
                  </div>
               </div>
               <div className="text-left md:text-right max-w-sm">
                  <p className="text-xs font-bold text-slate-500 leading-relaxed italic">╫ö╫á╫¬╫ò╫ƒ ╫₧╫ù╫ò╫⌐╫æ ╫£╫ñ╫Ö ╫ó╫£╫ò╫¬ ╫⌐╫Ö╫ù╫ò╫¬ ╫ÿ╫ò╫ò╫Ö╫£╫Ö╫ò ╫æ╫û╫₧╫ƒ ╫É╫₧╫¬. ╫£╫Ö╫ô╫Ö╫¥ ╫⌐╫á╫í╫Æ╫¿╫Ö╫¥ ╫æ╫ù╫¬╫Ö╫₧╫ö ╫₧╫ù╫û╫Ö╫¿╫Ö╫¥ ╫É╫¬ ╫ö╫ö╫⌐╫º╫ó╫ö ╫¬╫ò╫Ü ╫ñ╫ù╫ò╫¬ ╫₧-24 ╫⌐╫ó╫ò╫¬.</p>
               </div>
            </div>
          </div>
        )}

        {/* Archive Tab */}
        {activeTab === 'archive' && (
          <div className="animate-in fade-in duration-500 pb-20">
            <div className="flex items-center gap-4 mb-6">
              <div className={`flex items-center gap-3 px-4 py-3 w-full md:w-96 ${cardClass}`}>
                <RefreshCw className="w-4 h-4 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="╫ù╫Ö╫ñ╫ò╫⌐ ╫æ╫É╫¿╫¢╫Ö╫ò╫ƒ..." 
                  value={archiveSearch} 
                  onChange={(e) => setArchiveSearch(e.target.value)} 
                  className="bg-transparent outline-none text-sm w-full font-bold" 
                />
              </div>
              <p className="text-sm font-bold text-gray-500">{archiveLeads.length} ╫£╫Ö╫ô╫Ö╫¥ ╫₧╫É╫ò╫¿╫¢╫æ╫Ö╫¥</p>
            </div>
            
            <div className={`overflow-hidden rounded-3xl ${cardClass}`}>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-right">
                  <thead className="bg-gray-50/50 dark:bg-[#151822]/80 border-b border-gray-100 dark:border-gray-800/50">
                    <tr>
                      <th className="px-6 py-4 font-bold min-w-[250px]">╫⌐╫¥ ╫ò╫ÿ╫£╫ñ╫ò╫ƒ</th>
                      <th className="px-4 py-4 font-bold min-w-[170px]">╫í╫ÿ╫ÿ╫ò╫í ╫í╫ò╫ñ╫Ö</th>
                      <th className="px-4 py-4 font-bold min-w-[200px]">╫ö╫ó╫¿╫ò╫¬</th>
                      <th className="px-4 py-4 font-bold text-center">╫¬╫É╫¿╫Ö╫Ü ╫í╫Æ╫Ö╫¿╫ö</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100/50 dark:divide-gray-800/50">
                    {archiveLeads.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-6 py-20 text-center text-gray-400 font-bold">╫É╫Ö╫ƒ ╫£╫Ö╫ô╫Ö╫¥ ╫æ╫É╫¿╫¢╫Ö╫ò╫ƒ</td>
                      </tr>
                    ) : (
                      archiveLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-500/5 transition-all">
                          <td className="px-6 py-4">
                            <div className="flex flex-col">
                              <span className="font-black text-lg">{lead.clientName || '╫£╫£╫É ╫⌐╫¥'}</span>
                              <span className="font-mono font-bold text-gray-500" dir="ltr">{lead.phone}</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`text-xs font-black rounded-xl px-3 py-2 border ${getStatusStyle(lead.status).bg} ${getStatusStyle(lead.status).color} ${getStatusStyle(lead.status).border}`}>
                              {getStatusStyle(lead.status).label}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold opacity-70 line-clamp-2">{lead.generalNotes || lead.liveCallNotes || '╫É╫Ö╫ƒ ╫ö╫ó╫¿╫ò╫¬'}</p>
                          </td>
                          <td className="px-4 py-4 text-center font-bold text-gray-400">
                            {lead.signedAt ? formatDate(lead.signedAt) : lead.lastContacted ? formatDate(lead.lastContacted) : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Decision Tree Tab */}
        {activeTab === 'tree' && (
          <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
            <LegalDecisionTree />
          </div>
        )}

        {/* =================== LIVE NOTES MODAL =================== */}
        {liveNotesLead && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-500">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xl" onClick={() => setLiveNotesLead(null)} />
            <div className={`relative w-full max-w-[1280px] h-[90vh] flex flex-col rounded-[40px] shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] border border-white/20 overflow-hidden premium-glass`}>
              {/* Modal Header */}
              <div className="flex items-center justify-between p-8 border-b border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl z-10 transition-colors duration-500">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-[24px] bg-gradient-to-br from-indigo-500 to-indigo-700 shadow-lg shadow-indigo-500/30 flex items-center justify-center animate-float"><PhoneCall className="w-8 h-8 text-white" /></div>
                  <div>
                    <h3 className="font-black text-3xl tracking-tight text-glow">╫⌐╫Ö╫ù╫ö ╫ó╫¥ {liveNotesLead.clientName || '╫£╫º╫ò╫ù'}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <p className="text-sm font-black text-indigo-500/80 uppercase tracking-widest" dir="ltr">{liveNotesLead.phone}</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => setShowDecisionTree(!showDecisionTree)} className={`flex items-center gap-3 px-6 py-3.5 rounded-2xl border font-black text-xs transition-all duration-300 shadow-sm active:scale-95 ${showDecisionTree ? 'bg-emerald-600 text-white border-emerald-500 shadow-emerald-500/20' : 'bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10'}`}><ClipboardList className="w-4 h-4" /> {showDecisionTree ? '╫ù╫û╫¿╫ö ╫£╫⌐╫Ö╫ù╫ö' : '╫ó╫Ñ ╫ö╫ù╫£╫ÿ╫ò╫¬'}</button>
                  <button onClick={() => setShowScript(!showScript)} className="flex items-center gap-3 px-6 py-3.5 rounded-2xl border font-black text-xs transition-all duration-300 shadow-sm active:scale-95 bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10"><FileText className="w-4 h-4" /> {showScript ? '╫ö╫í╫¬╫¿ ╫¬╫í╫¿╫Ö╫ÿ' : '╫ö╫ª╫Æ ╫¬╫í╫¿╫Ö╫ÿ'}</button>
                  <button onClick={() => setLiveNotesLead(null)} className="p-3.5 rounded-2xl border bg-white/50 dark:bg-slate-800/50 border-white/20 dark:border-white/10 text-slate-400 hover:text-red-500 hover:rotate-90 transition-all duration-300"><X className="w-6 h-6" /></button>
                </div>
              </div>

                {/* Modal Body: 3-Panel Layout */}
                <div className="flex-1 flex overflow-hidden min-h-0 bg-white/10 dark:bg-black/10">
                  {showDecisionTree ? (
                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-slate-50/30 dark:bg-slate-950/20 backdrop-blur-md">
                      <LegalDecisionTree compact={true} onComplete={handleTreeComplete} />
                    </div>
                  ) : (
                    <>
                      {/* 1. Agent Assist (Right Panel) */}
                      <div className="w-96 border-l border-slate-200 dark:border-white/5 p-8 flex flex-col gap-6 overflow-y-auto bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-xl custom-scrollbar animate-in slide-in-from-right-8 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-3">
                            <RefreshCw className={`w-5 h-5 ${isAssistLoading ? 'animate-spin' : ''} text-indigo-500`} /> ╫ö╫₧╫£╫ª╫ò╫¬ AI ╫æ╫û╫₧╫ƒ ╫É╫₧╫¬
                          </h4>
                          <button
                            onClick={() => fetchAgentAssist(liveNotesLead.liveCallNotes || '')}
                            disabled={isAssistLoading}
                            className="p-1.5 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
                            title="╫¿╫ó╫á╫ƒ ╫ö╫₧╫£╫ª╫ò╫¬ ╫æ╫É╫ò╫ñ╫ƒ ╫Ö╫ô╫á╫Ö"
                          >
                            <RefreshCw size={14} className={isAssistLoading ? 'animate-spin' : ''} />
                          </button>
                        </div>
                        {assistError && (
                          <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 text-amber-700 dark:text-amber-400 text-xs font-bold text-center">
                             ΓÜá∩╕Å {assistError}
                          </div>
                        )}

                        {assistCards.length === 0 && !isAssistLoading && !assistError && (
                          <div className="text-center py-20 opacity-30"><HelpCircle size={40} className="mx-auto mb-2 text-slate-400" /><p className="text-xs font-black uppercase tracking-tighter">╫ö╫º╫£╫ô ╫ö╫ó╫¿╫ò╫¬ ╫£╫º╫æ╫£╫¬ ╫í╫Ö╫ò╫ó</p></div>
                        )}
                        {assistCards.map((card, idx) => (
                          <div key={idx} className={`p-6 rounded-3xl border animate-in slide-in-from-right-4 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${card.emoji === '≡ƒö┤' ? 'bg-red-50 dark:bg-red-900/20 border-red-200 shadow-[0_8px_32px_-4px_rgba(239,68,68,0.15)]' : 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 shadow-[0_8px_32px_-4px_rgba(245,158,11,0.15)]'}`}>
                            <p className="text-base font-bold leading-snug">{card.emoji} {card.text}</p>
                          </div>
                        ))}
                      </div>

                      {/* 2. Main Notes Area (Center) */}
                      <div className="flex-1 p-12 flex flex-col bg-white dark:bg-slate-950 overflow-y-auto custom-scrollbar relative animate-in fade-in duration-1000">
                        <div className="flex items-center gap-3 mb-8">
                          <div className="w-3.5 h-3.5 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse" />
                          <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">╫¬╫Ö╫ó╫ò╫ô ╫⌐╫Ö╫ù╫ö ╫æ╫⌐╫Ö╫ô╫ò╫¿ ╫ù╫Ö - {liveNotesLead.clientName}</h4>
                        </div>
                        <textarea
                          autoFocus
                          value={liveNotesLead.liveCallNotes || ''}
                          onChange={e => {
                            const v = e.target.value;
                            handleLeadUpdate(liveNotesLead.id, { liveCallNotes: v });
                            debouncedAgentAssist(v);
                          }}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              if (assistTimeoutRef.current) clearTimeout(assistTimeoutRef.current);
                              fetchAgentAssist(liveNotesLead.liveCallNotes || '');
                            }
                          }}
                          placeholder="╫¢╫¬╫ò╫æ ╫¢╫É╫ƒ ╫á╫º╫ò╫ô╫ò╫¬ ╫₧╫¿╫¢╫û╫Ö╫ò╫¬ ╫₧╫ö╫⌐╫Ö╫ù╫ö..."
                          className="w-full flex-1 text-lg leading-loose bg-transparent outline-none resize-none font-bold text-slate-700 dark:text-slate-300 placeholder:text-slate-200 dark:placeholder:text-slate-800 selection:bg-indigo-500/20"
                        />
                      </div>
                    </>
                  )}

                  {/* 3. Script / Help (Left Panel - Collapsible) */}
                  <div className={`transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] border-r border-slate-200 dark:border-white/5 bg-slate-50/80 dark:bg-slate-900/80 backdrop-blur-3xl overflow-y-auto custom-scrollbar ${showScript ? 'w-[480px] opacity-100' : 'w-0 opacity-0 overflow-hidden'}`}>
                    {showScript && (
                      <div className="p-12 animate-in fade-in slide-in-from-left-8 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)]">
                        <h4 className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-10 flex items-center gap-3"><FileText size={18} className="text-indigo-500" /> ╫¬╫í╫¿╫Ö╫ÿ ╫⌐╫Ö╫ù╫ö ╫₧╫á╫ª╫ù</h4>
                        <div className="prose dark:prose-invert max-w-none">
                          <p className="text-lg leading-loose whitespace-pre-wrap font-bold text-slate-700 dark:text-slate-300 opacity-90">{CALL_SCRIPT}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

              {/* Modal Footer */}
              <div className="p-8 border-t border-indigo-500/10 bg-white/40 dark:bg-slate-950/40 backdrop-blur-3xl flex justify-between items-center z-10 transition-colors duration-500">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-slate-400 animate-pulse" />
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">╫¬╫Ö╫ó╫ò╫ô ╫ö╫⌐╫Ö╫ù╫ö ╫á╫⌐╫₧╫¿ ╫É╫ò╫ÿ╫ò╫₧╫ÿ╫Ö╫¬ ╫æ╫¿╫º╫ó</span>
                </div>
                <div className="flex items-center gap-4">
                  <button onClick={() => {
                    copyToClipboard(liveNotesLead.liveCallNotes || '');
                  }} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3.5 rounded-2xl text-sm font-bold shadow-lg flex items-center gap-2 transition-all active:scale-95"><Copy size={18} /> ╫ö╫ó╫¬╫º ╫¬╫Ö╫ó╫ò╫ô</button>
                  <button onClick={() => setLiveNotesLead(null)} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:scale-105 text-white px-10 py-3.5 rounded-2xl text-sm font-bold shadow-xl transition-all active:scale-95 flex items-center gap-2"><Check size={20} /> ╫í╫Ö╫ò╫¥ ╫⌐╫Ö╫₧╫ò╫⌐</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <WebPhone 
        isOpen={isPhoneOpen} 
        onClose={() => setIsPhoneOpen(false)}
        targetName={phoneTarget.name}
        targetPhone={phoneTarget.phone}
        leads={leads}
        onCallEnd={handleCallEnd}
      />
    </div>
  );
}

