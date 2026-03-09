"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Phone, Mic, MicOff, Volume2, VolumeX, Plus, User, Info, X, LayoutGrid, Video, UserPlus, Grid3X3, PhoneOff } from 'lucide-react';

interface WebPhoneProps {
  isOpen: boolean;
  onClose: () => void;
  targetName: string;
  targetPhone: string;
}

export default function WebPhone({ isOpen, onClose, targetName, targetPhone }: WebPhoneProps) {
  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaker, setIsSpeaker] = useState(false);
  const [twilioLoaded, setTwilioLoaded] = useState(false);
  const [isKeypad, setIsKeypad] = useState(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const deviceRef = useRef<any>(null);
  const connectionRef = useRef<any>(null);

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

  // Automatically start call when opened AND SDK is ready
  useEffect(() => {
    if (isOpen && callStatus === 'idle' && targetPhone && twilioLoaded) {
      handleStartCall();
    } else if (isOpen && callStatus === 'idle' && targetPhone && !twilioLoaded) {
       setErrorMessage('טוען מערכת חיוג...'); 
    }
  }, [isOpen, targetPhone, twilioLoaded]);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleStartCall = async () => {
    setCallStatus('calling');
    setErrorMessage(null);
    
    try {
      // 1. Get Token
      const resp = await fetch('/api/twilio/token');
      if (!resp.ok) {
        const errData = await resp.json();
        throw new Error(errData.error || 'Failed to fetch token');
      }
      const { token } = await resp.json();

      // 2. Setup Device
      // @ts-ignore
      const Twilio = window.Twilio;
      if (!Twilio) throw new Error('Twilio SDK not loaded (CDN issue)');

      const device = new Twilio.Device(token, {
        codecPreferences: ['opus', 'pcmu'],
        fakeLocalAudio: false,
        debug: true
      });

      deviceRef.current = device;

      device.on('registered', () => {
        console.log('Device registered');
        // 3. Initiate Call
        const call = device.connect({ params: { To: targetPhone } });
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
      });

      device.on('error', (error: any) => {
        console.error('Device Error:', error);
        setErrorMessage(`שגיאת מכשיר: ${error.message || 'לא ידוע'}`);
      });

      await device.register();

    } catch (err: any) {
      console.error('Failed to start call:', err);
      setErrorMessage(err.message || 'נכשל להתחיל שיחה');
      setCallStatus('ended');
      setTimeout(() => setCallStatus('idle'), 3000);
    }
  };

  const handleEndCall = () => {
    if (connectionRef.current) {
      connectionRef.current.disconnect();
    }
    if (deviceRef.current) {
      deviceRef.current.destroy();
    }
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
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
    <div className={`fixed bottom-0 left-0 right-0 z-[60] flex flex-col items-center transition-all duration-500 ease-in-out ${isOpen || callStatus !== 'idle' ? 'translate-y-0' : 'translate-y-full'}`}>
      
      {/* Minimized Floating Bar (iPhone Dynamic Island Style) */}
      <div 
        className={`bg-black/90 backdrop-blur-xl border border-white/10 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6 mb-6 transition-all duration-500 cursor-pointer hover:bg-black group ${isMinimized ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none absolute'}`}
        onClick={() => setIsMinimized(false)}
      >
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          <span className="text-white font-medium text-sm">{targetName}</span>
          <span className="text-white/40 font-mono text-sm">{formatDuration(duration)}</span>
        </div>
        <div className="flex items-center gap-3 border-l border-white/10 pl-4">
          <button onClick={(e) => { e.stopPropagation(); handleEndCall(); }} className="p-2 bg-red-500 hover:bg-red-600 rounded-full text-white transition-colors">
            <PhoneOff className="w-4 h-4" />
          </button>
          <LayoutGrid className="w-4 h-4 text-white/40 group-hover:text-white transition-colors" />
        </div>
      </div>

      {/* Main Expanded Panel (Functional, not a phone mockup) */}
      <div 
        className={`w-full max-w-2xl bg-[#1c1c1e] dark:bg-[#0c0c0e] border-t border-white/10 shadow-[0_-20px_50px_-12px_rgba(0,0,0,0.5)] rounded-t-[40px] px-8 pt-6 pb-10 transition-all duration-500 ease-in-out ${isMinimized ? 'translate-y-full opacity-0 pointer-events-none absolute' : 'translate-y-0'}`}
      >
        {/* Header Controls */}
        <div className="flex items-center justify-between mb-8">
          <button 
            onClick={() => setIsMinimized(true)}
            className="p-2 hover:bg-white/10 rounded-full text-white/60 transition-colors"
            title="מזער"
          >
            <X className="w-6 h-6" />
          </button>
        <div className="flex flex-col items-center text-center">
             <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wider border 
               ${callStatus === 'connected' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                 callStatus === 'calling' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 
                 callStatus === 'ended' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
               {callStatus === 'connected' ? 'שיחה פעילה' : 
                callStatus === 'calling' ? 'מתקשר...' : 
                callStatus === 'ended' ? 'שיחה נותקה' : 'ממתין'}
             </div>
             <h2 className="text-2xl font-bold text-white leading-tight">{targetName || 'בנטוסף'}</h2>
             <p className="text-sm text-white/40 font-normal mt-1 tracking-wide" dir="ltr">{targetPhone}</p>
             {errorMessage && (
               <div className="mt-2 text-xs font-medium text-red-500 bg-red-500/10 px-3 py-1 rounded-md border border-red-500/20">
                 {errorMessage}
               </div>
             )}
          </div>
          <div className="w-10 h-10" /> {/* Balancer */}
        </div>

        {/* Duration & Pulse */}
        <div className="flex flex-col items-center mb-10">
          <div className="text-4xl font-mono font-medium text-white mb-4 tracking-tighter">
            {formatDuration(duration)}
          </div>
          <div className="flex gap-1 h-1.5 items-center">
            {[1,2,3,4,5].map(i => (
              <div key={i} className={`w-1.5 bg-indigo-500 rounded-full transition-all duration-300 ${callStatus === 'connected' ? 'animate-bounce' : 'h-1.5 opacity-20'}`} style={{ animationDelay: `${i * 0.1}s` }} />
            ))}
          </div>
        </div>

        {/* Action Grid (iPhone Styled Buttons, Sleeker Layout) */}
        <div className="grid grid-cols-4 gap-6 max-w-lg mx-auto mb-10">
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
            icon={UserPlus} 
            label="צרף" 
            onClick={() => {}}
            disabled={callStatus !== 'connected'}
          />
        </div>

        {/* Primary Bottom Actions */}
        <div className="flex items-center justify-center gap-12">
            <button 
              onClick={handleEndCall}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-2xl shadow-red-500/20 transition-all active:scale-90 group-hover:scale-110">
                <PhoneOff className="w-10 h-10 fill-current" />
              </div>
              <span className="text-xs font-bold text-red-500/60 group-hover:text-red-500 transition-colors uppercase tracking-widest">ניתוק</span>
            </button>
        </div>
      </div>
    </div>
  );
}

function ActionButton({ icon: Icon, label, active, onClick, disabled }: { icon: any, label: string, active?: boolean, onClick: () => void, disabled?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 ${disabled ? 'opacity-30 pointer-events-none' : ''}`}>
      <button 
        onClick={onClick}
        className={`w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-90 ${active ? 'bg-white text-black' : 'bg-white/10 text-white hover:bg-white/20'}`}
      >
        <Icon className="w-7 h-7" />
      </button>
      <span className="text-[12px] text-white/80 font-medium">{label}</span>
    </div>
  );
}
