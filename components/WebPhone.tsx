"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX, Plus, User, Info, X, LayoutGrid, Video, UserPlus, Grid3X3, PhoneOff, ChevronDown } from 'lucide-react';

interface WebPhoneProps {
  isOpen: boolean; // Tells it to pop open for an outbound dial request
  onClose: () => void;
  onCallEnd?: (phone: string) => void;
  targetName: string;
  targetPhone: string;
  leads: any[];
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
    if (isOpen && (callStatus === 'idle' || callStatus === 'ended')) {
      if (twilioLoaded) {
        handleOutboundCall();
      } else {
        setErrorMessage('טוען מערכת חיוג... שימו לב: יש לוודא אישור מיקרופון בדפדפן');
      }
    }
  }, [isOpen, targetPhone, twilioLoaded]); // Removed callStatus check from deps to avoid re-triggering during call

  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const initTwilioDevice = async () => {
    try {
      const resp = await fetch('/api/twilio/token');
      if (!resp.ok) throw new Error('Failed to fetch token');
      const { token } = await resp.json();

      // @ts-ignore
      const Twilio = window.Twilio;
      const device = new Twilio.Device(token, {
        codecPreferences: ['opus', 'pcmu'], // Opus is high quality and works well on weak connections
        audioConstraints: {
          autoGainControl: true,
          echoCancellation: true,
          noiseSuppression: true,
        },
        maxAverageBitrate: 16000, // Reduced bitrate for better stability on weak internet
        edge: ['frankfurt'], // Force Frankfurt (Germany) for lowest latency in Israel
        dscp: true,
        fakeLocalAudio: false,
        allowIncomingWhileBusy: true,
        debug: false
      });

      deviceRef.current = device;

      device.on('registered', () => console.log('WebPhone ready for incoming calls (Frankfurt Edge)'));

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
    setIsMinimized(false); // Open expanded UI for outbound initiation
    
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
    <div className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center pb-8 pointer-events-none transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isOpen || callStatus !== 'idle' ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* Dynamic Island style at bottom center */}
      <div 
        className={`pointer-events-auto bg-slate-950/80 backdrop-blur-3xl border border-white/20 shadow-[0_24px_64px_-12px_rgba(0,0,0,0.6)] rounded-full px-6 py-3 flex items-center gap-6 transition-all duration-700 cursor-pointer hover:bg-black group premium-glass-active ${isMinimized ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-20 pointer-events-none absolute'}`}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
          <div className="flex items-center gap-2.5">
            <span className="text-white font-black text-xs tracking-tight">{targetName || incomingCallerId?.name || 'שיחה'}</span>
            <span className="h-3 w-px bg-white/10" />
            <span className="text-white/40 font-mono text-[9px] uppercase font-black tracking-widest">{formatDuration(duration)}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); handleEndCall(); }} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-all hover:scale-110 active:scale-90 shadow-lg shadow-red-500/20">
            <PhoneOff className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Expanded Panel - Modern Glass UI from the bottom */}
      <div 
        className={`pointer-events-auto w-[400px] premium-glass border border-white/20 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.7)] rounded-[40px] px-8 pt-6 pb-10 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${isMinimized ? 'translate-y-[150%] opacity-0 pointer-events-none absolute scale-90' : 'translate-y-0 opacity-100 scale-100'}`}
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-2.5 hover:bg-white/10 rounded-2xl text-white/40 hover:text-white transition-all duration-300"
            title="מזער חלונית"
          >
            <ChevronDown className="w-6 h-6" />
          </button>
          
          <div className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-[0.2em] border shadow-sm transition-all duration-500
               ${callStatus === 'connected' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' : 
                 callStatus === 'calling' ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20 shadow-indigo-500/10' : 
                 callStatus === 'incoming' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 shadow-amber-500/10 animate-pulse' : 
                 callStatus === 'ended' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                 'bg-slate-500/10 text-slate-400 border-slate-500/20'}`}>
               {callStatus === 'connected' ? 'מחובר' : 
                callStatus === 'calling' ? 'מחייג' : 
                callStatus === 'incoming' ? 'נכנסת' : 
                callStatus === 'ended' ? 'נותקה' : 'ממתין'}
          </div>

          <div className="w-10 h-10" /> {/* Balancer */}
        </div>

        {/* Contact Info */}
        <div className="flex flex-col items-center text-center mb-10">
           <h2 className="text-3xl font-black text-white leading-tight tracking-tight text-glow">
             {callStatus === 'incoming' && incomingCallerId ? incomingCallerId.name : (targetName || 'שיחה')}
           </h2>
           <p className="text-sm font-mono text-white/30 font-bold mt-2 tracking-widest opacity-60" dir="ltr">
             {callStatus === 'incoming' && incomingCallerId ? incomingCallerId.phone : targetPhone}
           </p>
           
           {errorMessage && (
              <div className="mt-4 text-[10px] font-black text-red-400 bg-red-400/10 px-3 py-1.5 rounded-xl border border-red-400/20 animate-in fade-in zoom-in duration-300 uppercase tracking-widest">
                {errorMessage}
              </div>
           )}
        </div>

        {/* Duration & Wave */}
        <div className="flex flex-col items-center mb-10">
          <div className="text-4xl font-mono font-black text-white mb-6 tracking-tighter">
            {formatDuration(duration)}
          </div>
          <div className="flex gap-1.5 h-6 items-center">
            {[1,2,3,4,5,6,7,8,9,10].map(i => (
              <div key={i} className={`w-1 bg-indigo-500 rounded-full transition-all duration-700 ${callStatus === 'connected' ? 'animate-bounce' : 'h-1.5 opacity-10'}`} style={{ animationDelay: `${i * 0.05}s`, height: callStatus === 'connected' ? `${8 + Math.random() * 16}px` : '4px' }} />
            ))}
          </div>
        </div>

        {/* Action Grid */}
        <div className="grid grid-cols-2 gap-4 max-w-[280px] mx-auto mb-10">
          <ActionButton 
            icon={isMuted ? MicOff : Mic} 
            label={isMuted ? "בטל השתקה" : "השתק"} 
            active={isMuted} 
            onClick={toggleMute}
            disabled={callStatus !== 'connected'}
          />
          <ActionButton 
            icon={isSpeaker ? VolumeX : Volume2} 
            label="רמקול" 
            active={isSpeaker} 
            onClick={() => setIsSpeaker(!isSpeaker)}
            disabled={callStatus !== 'connected'}
          />
        </div>

        {/* Primary Bottom Actions */}
        <div className="flex items-center justify-center gap-8">
            {callStatus === 'incoming' ? (
              <>
                <button 
                  onClick={handleEndCall}
                  className="w-16 h-16 bg-red-500 hover:bg-red-600 text-white rounded-[24px] flex items-center justify-center shadow-lg transition-all duration-300 active:scale-90"
                >
                  <PhoneOff className="w-8 h-8 fill-current" />
                </button>
                <button 
                  onClick={handleAcceptIncoming}
                  className="w-20 h-20 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[28px] flex items-center justify-center shadow-[0_12px_40px_rgba(16,185,129,0.3)] animate-pulse transition-all duration-300 active:scale-90"
                >
                  <Phone className="w-10 h-10 fill-current" />
                </button>
              </>
            ) : (
              <button 
                onClick={handleEndCall}
                className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-[28px] flex items-center justify-center shadow-[0_12px_40px_rgba(239,68,68,0.3)] transition-all duration-300 active:scale-90"
              >
                <PhoneOff className="w-10 h-10 fill-current" />
              </button>
            )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, active, onClick, disabled }: { icon: any, label: string, active?: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 transition-opacity duration-300 ${disabled ? 'opacity-20 pointer-events-none' : 'opacity-100'}`}>
      <button 
        onClick={onClick}
        className={`w-full h-12 rounded-2xl flex items-center justify-center transition-all duration-300 active:scale-95 border ${active ? 'bg-white text-slate-900 border-white' : 'bg-white/5 text-white/60 hover:text-white border-white/10 hover:bg-white/10'}`}
      >
        <Icon className={`w-5 h-5 ${active ? 'fill-slate-900' : ''}`} />
        <span className="mr-2 text-[10px] font-black uppercase tracking-widest">{label}</span>
      </button>
    </div>
  );
}
