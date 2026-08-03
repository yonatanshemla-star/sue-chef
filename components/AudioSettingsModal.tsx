"use client";

import React, { useEffect, useState, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, Play, Square, Settings, X, Check, Loader2, RefreshCw, Radio } from 'lucide-react';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectDevices?: (micId: string, speakerId: string) => void;
}

export default function AudioSettingsModal({ isOpen, onClose, onSelectDevices }: AudioSettingsModalProps) {
  const [microphones, setMicrophones] = useState<MediaDeviceInfo[]>([]);
  const [speakers, setSpeakers] = useState<MediaDeviceInfo[]>([]);
  const [selectedMicId, setSelectedMicId] = useState<string>('');
  const [selectedSpeakerId, setSelectedSpeakerId] = useState<string>('');
  
  // Volume Level Meter state
  const [volumeLevel, setVolumeLevel] = useState<number>(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);

  // Recording Test state
  const [testState, setTestState] = useState<'idle' | 'recording' | 'playing'>('idle');
  const [recordCountdown, setRecordCountdown] = useState<number>(5);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const testAudioPlayerRef = useRef<HTMLAudioElement | null>(null);

  // Load saved device selections & enumerate devices
  useEffect(() => {
    if (!isOpen) {
      stopMicStream();
      return;
    }

    const savedMic = localStorage.getItem('selectedMicId') || '';
    const savedSpeaker = localStorage.getItem('selectedSpeakerId') || '';
    setSelectedMicId(savedMic);
    setSelectedSpeakerId(savedSpeaker);

    loadAudioDevices();
  }, [isOpen]);

  const loadAudioDevices = async () => {
    try {
      // Request mic permission first if labels are hidden
      let stream: MediaStream | null = null;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      } catch (err) {
        console.warn('Microphone permission denied or not yet granted');
      }

      const devices = await navigator.mediaDevices.enumerateDevices();
      const micList = devices.filter(d => d.kind === 'audioinput');
      const speakerList = devices.filter(d => d.kind === 'audiooutput');

      setMicrophones(micList);
      setSpeakers(speakerList);

      if (micList.length > 0) {
        const defaultMic = micList.find(m => m.deviceId === 'default') || micList[0];
        const micToUse = localStorage.getItem('selectedMicId') || defaultMic.deviceId;
        setSelectedMicId(micToUse);
        startLiveVolumeMeter(micToUse, stream);
      } else if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }

      if (speakerList.length > 0) {
        const defaultSpeaker = speakerList.find(s => s.deviceId === 'default') || speakerList[0];
        const speakerToUse = localStorage.getItem('selectedSpeakerId') || defaultSpeaker.deviceId;
        setSelectedSpeakerId(speakerToUse);
      }
    } catch (err) {
      console.error('Error loading audio devices:', err);
    }
  };

  const stopMicStream = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    setVolumeLevel(0);
  };

  const startLiveVolumeMeter = async (micId: string, existingStream?: MediaStream | null) => {
    stopMicStream();
    try {
      const constraints: MediaStreamConstraints = {
        audio: micId ? { deviceId: { exact: micId } } : true
      };

      const stream = existingStream || await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(stream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const avg = sum / dataArray.length;
        const normalized = Math.min(100, Math.round((avg / 128) * 100));
        setVolumeLevel(normalized);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error('Failed to start mic volume meter:', err);
    }
  };

  const handleMicChange = (micId: string) => {
    setSelectedMicId(micId);
    localStorage.setItem('selectedMicId', micId);
    startLiveVolumeMeter(micId);
    if (onSelectDevices) onSelectDevices(micId, selectedSpeakerId);
  };

  const handleSpeakerChange = (speakerId: string) => {
    setSelectedSpeakerId(speakerId);
    localStorage.setItem('selectedSpeakerId', speakerId);
    if (onSelectDevices) onSelectDevices(selectedMicId, speakerId);
  };

  // Start 5-second Recording Test
  const handleStartMicTest = async () => {
    if (testState !== 'idle') return;
    try {
      setTestState('recording');
      setRecordCountdown(5);
      recordedChunksRef.current = [];

      const stream = streamRef.current || await navigator.mediaDevices.getUserMedia({
        audio: selectedMicId ? { deviceId: { exact: selectedMicId } } : true
      });

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(recordedChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);

        const player = new Audio(audioUrl);
        testAudioPlayerRef.current = player;

        if (selectedSpeakerId && (player as any).setSinkId) {
          (player as any).setSinkId(selectedSpeakerId).catch(() => {});
        }

        setTestState('playing');
        player.play();

        player.onended = () => {
          setTestState('idle');
        };
      };

      mediaRecorder.start();

      let timeLeft = 5;
      const interval = setInterval(() => {
        timeLeft -= 1;
        setRecordCountdown(timeLeft);
        if (timeLeft <= 0) {
          clearInterval(interval);
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Failed to run mic test:', err);
      setTestState('idle');
    }
  };

  const handleCloseModal = () => {
    stopMicStream();
    if (testAudioPlayerRef.current) {
      try { testAudioPlayerRef.current.pause(); } catch (e) {}
      testAudioPlayerRef.current = null;
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xl animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden" dir="rtl">
        {/* Header */}
        <div className="p-5 border-b dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">הגדרות שמע ובדיקת מיקרופון</h3>
              <p className="text-xs text-slate-400">בחר את המיקרופון והרמקולים ובדוק את איכות ההקלטה</p>
            </div>
          </div>
          <button 
            onClick={handleCloseModal}
            className="w-9 h-9 rounded-full bg-slate-200/60 dark:bg-slate-800 flex items-center justify-center text-slate-400 hover:text-red-500 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* 1. Microphone Selection */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
              <Mic className="w-4 h-4 text-indigo-500" /> בחירת מיקרופון (קלט)
            </label>
            <select
              value={selectedMicId}
              onChange={(e) => handleMicChange(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {microphones.map(m => (
                <option key={m.deviceId} value={m.deviceId}>
                  {m.label || `מיקרופון ${m.deviceId.slice(0, 5)}...`}
                </option>
              ))}
              {microphones.length === 0 && <option value="">לא נמצאו מיקרופונים</option>}
            </select>
          </div>

          {/* 2. Speaker Selection */}
          <div>
            <label className="text-xs font-bold uppercase text-slate-400 tracking-wider mb-2 flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-emerald-500" /> בחירת רמקולים / אוזניות (פלט)
            </label>
            <select
              value={selectedSpeakerId}
              onChange={(e) => handleSpeakerChange(e.target.value)}
              className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {speakers.map(s => (
                <option key={s.deviceId} value={s.deviceId}>
                  {s.label || `רמקולים ${s.deviceId.slice(0, 5)}...`}
                </option>
              ))}
              {speakers.length === 0 && <option value="">רמקולים ברירת מחדל של המכשיר</option>}
            </select>
          </div>

          {/* 3. Live Volume Indicator Bar */}
          <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border dark:border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-xs font-bold text-slate-600 dark:text-slate-300">
              <span className="flex items-center gap-2">
                <Radio className="w-4 h-4 text-rose-500 animate-pulse" /> עוצמת קול בזמן אמת (דבר למיקרופון):
              </span>
              <span>{volumeLevel}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden p-0.5">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-600 rounded-full transition-all duration-75"
                style={{ width: `${volumeLevel}%` }}
              />
            </div>
          </div>

          {/* 4. Record & Audio Test Section */}
          <div className="bg-indigo-50/70 dark:bg-indigo-950/30 p-5 rounded-2xl border border-indigo-200 dark:border-indigo-900/40 text-center space-y-3">
            <h4 className="font-bold text-sm text-indigo-900 dark:text-indigo-200 flex items-center justify-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-600" /> בדיקת הקלטה והשמעה
            </h4>
            <p className="text-xs text-indigo-700/80 dark:text-indigo-300/80">
              לחץ על הכפתור, דבר למשך 5 שניות, והמערכת תשמיע לך מיד איך שומעים אותך ברמקולים/אוזניות שבחרת.
            </p>

            <button
              onClick={handleStartMicTest}
              disabled={testState !== 'idle'}
              className={`w-full py-3.5 px-6 rounded-2xl font-bold text-sm text-white shadow-lg transition-all flex items-center justify-center gap-2 ${
                testState === 'recording'
                  ? 'bg-rose-600 animate-pulse'
                  : testState === 'playing'
                  ? 'bg-emerald-600 animate-pulse'
                  : 'bg-indigo-600 hover:bg-indigo-700 hover:scale-[1.02] active:scale-95'
              }`}
            >
              {testState === 'recording' && (
                <>
                  <div className="w-3 h-3 rounded-full bg-white animate-ping" />
                  <span>מקליט ניסיון... ({recordCountdown} שניות)</span>
                </>
              )}
              {testState === 'playing' && (
                <>
                  <Volume2 className="w-5 h-5 animate-bounce" />
                  <span>משמיע את ההקלטה שלך כעת...</span>
                </>
              )}
              {testState === 'idle' && (
                <>
                  <Play className="w-4 h-4 fill-white" />
                  <span>התחל בדיקת שמע (הקלטה ל-5 שניות)</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t dark:border-slate-800 bg-slate-50 dark:bg-slate-800/40 flex justify-end">
          <button
            onClick={handleCloseModal}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 transition-all flex items-center gap-2"
          >
            <Check className="w-4 h-4" /> שמור וסגור
          </button>
        </div>
      </div>
    </div>
  );
}
