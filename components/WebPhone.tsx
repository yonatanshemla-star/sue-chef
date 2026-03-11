"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX, Plus, User, Info, X, LayoutGrid, Video, UserPlus, Grid3X3, PhoneOff } from 'lucide-react';

interface WebPhoneProps {
  isOpen: boolean; // Tells it to pop open for an outbound dial request
  onClose: () => void;
  onCallEnd?: (phone: string) => void;
  targetName: string; // The outbound name
  targetPhone: string; // The outbound phone
  leads: any[]; // Used for Smart Caller ID
}

export default function WebPhone({ isOpen, onClose, onCallEnd, targetName, targetPhone, leads }: WebPhoneProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended' | 'incoming'>('idle');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [twilioLoaded, setTwilioLoaded] = useState(false);
  const [isKeypad, setIsKeypad] = useState(false);
  
  const [incomingCallerId, setIncomingCallerId] = useState<{name: string, phone: string} | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const deviceRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);
  const onCallEndRef = useRef(onCallEnd);

  useEffect(() => {
    onCallEndRef.current = onCallEnd;
  }, [onCallEnd]);

  // Load Twilio SDK from CDN
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // @ts-ignore
    if (window.Twilio) {
      setTwilioLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = "https://sdk.twilio.com/js/voice/releases/2.11.0/twilio.min.js";
    script.async = true;
    script.onload = () => {
      console.log('Twilio Voice SDK loaded');
      setTwilioLoaded(true);
    };
    document.body.appendChild(script);

    // Keep script on unmount to avoid reloading issues
  }, []);

  useEffect(() => {
    if (callStatus === 'connected') {
      timerRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      if (callStatus === 'idle') setDuration(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callStatus]);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Initialize Twilio Device for INCOMING calls as soon as SDK is loaded
  useEffect(() => {
    if (twilioLoaded && !deviceRef.current) {
      initTwilioDevice();
    }
  }, [twilioLoaded]);

  // Outbound Trigger
  useEffect(() => {
    if (isOpen && callStatus === 'idle' && targetPhone && twilioLoaded) {
      handleOutboundCall();
    } else if (isOpen && callStatus === 'idle' && targetPhone && !twilioLoaded) {
       setErrorMessage('טוען מערכת חיוג...'); 
    }
  }, [isOpen, targetPhone, twilioLoaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initTwilioDevice = async () => {
    try {
      const resp = await fetch('/api/twilio/token');
      if (!resp.ok) throw new Error('Failed to fetch token');
      const { token } = await resp.json();

      // @ts-ignore
      const Twilio = window.Twilio;
      const device = new Twilio.Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        audioConstraints: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        maxAverageBitrate: 64000,
        edge: ['dublin', 'frankfurt', 'roaming'],
        dscp: true,
        fakeLocalAudio: false,
        allowIncomingWhileBusy: true,
        debug: true
      });

      deviceRef.current = device;

      device.on('registered', () => console.log('WebPhone ready for incoming calls'));

      device.on('incoming', (connection: any) => {
        console.log('Incoming call!', connection);
        connectionRef.current = connection;
        
        const rawPhone = connection.parameters.From;
        
        // Smart Caller ID: find lead by phone
        const normalizedIn = rawPhone.replace(/\D/g, '');
        const currentLeads = leads || [];
        const match = currentLeads.find(l => {
          const lPhone = (l.phone || '').replace(/\D/g, '');
          // match last 9 digits in case of country code diffs
          if (lPhone.length >= 9 && normalizedIn.length >= 9) {
             return normalizedIn.slice(-9) === lPhone.slice(-9);
          }
          return false;
        });

        setIncomingCallerId({
           phone: rawPhone,
           name: match ? match.clientName : 'מספר לא מזוהה'
        });
        setCallStatus('incoming');

        connection.on('accept', () => setCallStatus('connected'));
        connection.on('disconnect', () => handleEndCall());
        connection.on('cancel', () => handleEndCall());
        connection.on('reject', () => handleEndCall());
      });

      await device.register();
    } catch (err) {
      console.error('Twilio init failed', err);
    }
  };

  const handleOutboundCall = async () => {
    setCallStatus('calling');
    setErrorMessage(null);
    
    try {
      if (!deviceRef.current) {
        await initTwilioDevice();
      }
      const device = deviceRef.current;
      if (!device) throw new Error("Device not initialized");

      const leadForCall = (leads || []).find(l => {
        const lp = (l.phone || '').replace(/\D/g, '');
        const tp = (targetPhone || '').replace(/\D/g, '');
        return lp.length >= 9 && tp.length >= 9 && lp.slice(-9) === tp.slice(-9);
      });

      const call = device.connect({ 
        params: { 
          To: targetPhone,
          leadId: leadForCall?.id || ''
        } 
      });
      connectionRef.current = call;

      call.on('accept', () => {
        console.log('Call accepted');
        setCallStatus('connected');
      });

      call.on('disconnect', () => {
        console.log('Call disconnected');
        handleEndCall();
      });

      call.on('error', (error: any) => {
        console.error('Call Error:', error);
        setErrorMessage(`שגיאת שיחה: ${error.message || 'לא ידוע'}`);
        setCallStatus('ended');
        setTimeout(() => setCallStatus('idle'), 3000);
      });

    } catch (err: any) {
      console.error('Failed to start outbound call:', err);
      setErrorMessage(err.message || 'נכשל להתחיל שיחה יוצאת');
      setCallStatus('ended');
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  };

  const handleAcceptIncoming = () => {
    if (connectionRef.current && callStatus === 'incoming') {
      connectionRef.current.accept();
      setCallStatus('connected');
    }
  };

  const handleEndCall = () => {
    if (connectionRef.current) {
      if (callStatus === 'incoming') {
        connectionRef.current.reject();
      } else {
        connectionRef.current.disconnect();
      }
    }
    const finalPhone = incomingCallerId ? incomingCallerId.phone : targetPhone;
    setCallStatus('ended');
    setIncomingCallerId(null);
    setTimeout(() => {
      setCallStatus('idle');
      if (onCallEndRef.current) {
        onCallEndRef.current(finalPhone);
      }
      onClose();
    }, 1500);
  };
  const toggleMute = () => {
    if (connectionRef.current) {
      const muted = !isMuted;
      connectionRef.current.mute(muted);
      setIsMuted(muted);
    }
  };

  const [isMinimized, setIsMinimized] = useState(false);

  if (!isOpen && callStatus === 'idle') return null;

  return (
    <div className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen || callStatus !== 'idle' ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* Minimized Floating Bar (iPhone Dynamic Island Style) */}
      <div 
        className={`bg-slate-950/80 backdrop-blur-3xl border border-white/20 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)] rounded-full px-8 py-4 flex items-center gap-8 mb-8 transition-all duration-700 cursor-pointer hover:bg-black group premium-glass-active ${isMinimized ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-10 pointer-events-none absolute'}`}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-4">
          <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
          <div className="flex flex-col">
            <span className="text-white font-black text-sm tracking-tight">{targetName}</span>
            <span className="text-white/40 font-mono text-[10px] uppercase font-black tracking-widest">{formatDuration(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-4 border-l border-white/10 pl-6">
          <button onClick={(e) => { e.stopPropagation(); handleEndCall(); }} className="p-3 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-500/20">
            <PhoneOff className="w-4 h-4" />
          </button>
          <LayoutGrid className="w-5 h-5 text-white/40 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Main Expanded Panel (Functional, not a phone mockup) */}
      <div 
        className={`w-full max-w-2xl premium-glass border-t border-white/20 shadow-[0_-32px_128px_-12px_rgba(0,0,0,0.7)] rounded-t-[50px] px-10 pt-8 pb-12 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMinimized ? 'translate-y-full opacity-0 pointer-events-none absolute' : 'translate-y-0'}`}
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-10">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-3 hover:bg-white/10 rounded-[20px] text-white/40 hover:text-white transition-all duration-300"
            title="מזער"
          >
            <X className="w-8 h-8" />
          </button>
          <div className="flex flex-col items-center text-center">
             <div className={`text-[11px] font-black px-4 py-1.5 rounded-full mb-4 uppercase tracking-[0.2em] border shadow-sm transition-all duration-500
               ${callStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' : 
                 callStatus === 'calling' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-indigo-500/10' : 
                 callStatus === 'incoming' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10 animate-pulse' : 
                 callStatus === 'ended' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
               {callStatus === 'connected' ? 'שיחה פעילה' : 
                callStatus === 'calling' ? 'חיוג...' : 
                callStatus === 'incoming' ? 'שיחה נכנסת!' : 
                callStatus === 'ended' ? 'השיחה נותקה' : 'ממתין'}
             </div>
             
             <h2 className="text-4xl font-black text-white leading-tight tracking-tight text-glow">
               {callStatus === 'incoming' && incomingCallerId ? incomingCallerId.name : (targetName || 'חיוג')}
             </h2>
             <p className="text-base text-white/30 font-bold mt-2 tracking-widest opacity-60" dir="ltr">
               {callStatus === 'incoming' && incomingCallerId ? incomingCallerId.phone : targetPhone}
             </p>
             
             {errorMessage && (
                <div className="mt-4 text-sm font-black text-red-400 bg-red-400/10 px-4 py-2 rounded-2xl border border-red-400/20 animate-in fade-in zoom-in duration-300">
                  ⚠️ {errorMessage}
                </div>
             )}
          </div>
          <div className="w-14 h-14" /> {/* Balancer */}
        </div>

        {/* Duration & Pulse */}
        <div className="flex flex-col items-center mb-12">
          <div className="text-5xl font-mono font-black text-white mb-6 tracking-tighter">
            {formatDuration(duration)}
          </div>
          <div className="flex gap-2 h-2.5 items-center">
            {[1,2,3,4,5,6,7].map(i => (
              <div key={i} className={`w-2.5 bg-indigo-500 rounded-full transition-all duration-700 ${callStatus === 'connected' ? 'animate-bounce' : 'h-1.5 opacity-10'}`} style={{ animationDelay: `${i * 0.1}s`, height: callStatus === 'connected' ? `${10 + Math.sin(i) * 10}px` : '4px' }} />
            ))}
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-4 gap-8 max-w-lg mx-auto mb-12">
          <ActionButton 
            icon={isMuted ? MicOff : Mic} 
            label={isMuted ? "בטל השתקה" : "השתק"} 
            active={isMuted} 
            onClick={toggleMute}
            disabled={callStatus !== 'connected'}
          />
          <ActionButton 
            icon={Grid3X3} 
            label="מקשים" 
            active={isKeypad} 
            onClick={() => setIsKeypad(!isKeypad)}
            disabled={callStatus !== 'connected'}
          />
          <ActionButton 
            icon={isSpeaker ? VolumeX : Volume2} 
            label="רמקול" 
            active={isSpeaker} 
            onClick={() => setIsSpeaker(!isSpeaker)}
            disabled={callStatus !== 'connected'}
          />
           <ActionButton 
            icon={Plus} 
            label="שיחה נוספת" 
            onClick={() => {}}
            disabled={callStatus !== 'connected'}
          />
        </div>

        {/* Primary Bottom Actions */}
        <div className="flex items-center justify-center gap-16">
            {callStatus === 'incoming' && (
              <button 
                onClick={handleAcceptIncoming}
                className="group flex flex-col items-center gap-4"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-emerald-600 text-white rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(16,185,129,0.4)] animate-bounce transition-all duration-300 active:scale-90 group-hover:scale-110 group-hover:rotate-6">
                  <Phone className="w-12 h-12 fill-current" />
                </div>
                <span className="text-[11px] font-black text-emerald-400 uppercase tracking-[0.2em] group-hover:text-emerald-300 transition-colors">מענה לשיחה</span>
              </button>
            )}

            <button 
              onClick={handleEndCall}
              className="group flex flex-col items-center gap-4"
            >
              <div className="w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 text-white rounded-[32px] flex items-center justify-center shadow-[0_20px_50px_rgba(239,68,68,0.4)] transition-all duration-300 active:scale-90 group-hover:scale-110 group-hover:-rotate-6">
                <PhoneOff className="w-12 h-12 fill-current" />
              </div>
              <span className="text-[11px] font-black text-red-400 uppercase tracking-[0.2em] group-hover:text-red-300 transition-colors">
                {callStatus === 'incoming' ? 'דחיית שיחה' : 'ניתוק שיחה'}
              </span>
            </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, active, onClick, disabled }: { icon: any, label: string, active?: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-3 transition-opacity duration-300 ${disabled ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
      <button 
        onClick={onClick}
        className={`w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-300 active:scale-90 shadow-lg ${active ? 'bg-white text-slate-900 shadow-white/20' : 'bg-white/5 text-white hover:bg-white/10 border border-white/5'}`}
      >
        <Icon className={`w-8 h-8 ${active ? 'fill-slate-900' : ''}`} />
      </button>
      <span className="text-[11px] text-white/60 font-black uppercase tracking-wider">{label}</span>
    </div>
  );
}
