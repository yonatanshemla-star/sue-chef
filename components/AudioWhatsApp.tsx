'use client';
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause } from 'lucide-react';

interface AudioWhatsAppProps {
  src: string;
}

const AudioWhatsApp: React.FC<AudioWhatsAppProps> = ({ src }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate]);

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const current = audioRef.current.currentTime;
      const total = audioRef.current.duration || 0;
      setCurrentTime(current);
      setProgress(total > 0 ? (current / total) * 100 : 0);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    if (audioRef.current) {
      const total = audioRef.current.duration || 0;
      const newTime = (val / 100) * total;
      audioRef.current.currentTime = newTime;
      setProgress(val);
    }
  };

  const cyclePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const rates = [1, 1.5, 2];
    const nextRate = rates[(rates.indexOf(playbackRate) + 1) % rates.length];
    setPlaybackRate(nextRate);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "0:00";
    const min = Math.floor(time / 60);
    const sec = Math.floor(time % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex items-center gap-4 bg-gray-100/80 dark:bg-slate-800/80 p-4 rounded-[24px] w-full max-w-lg border border-white/20 dark:border-white/5 shadow-inner" onClick={e => e.stopPropagation()}>
      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
      />
      
      <button 
        onClick={togglePlay}
        className="w-12 h-12 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 transition-all active:scale-90 shadow-lg shadow-indigo-600/20"
      >
        {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="translate-x-0.5" />}
      </button>

      <div className="flex-1 flex flex-col gap-1.5">
        <div className="relative group/progress">
          <input 
            type="range" 
            min="0"
            max="100"
            step="0.1"
            value={progress} 
            onChange={handleSeek}
            className="w-full h-1.5 bg-gray-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-600 hover:accent-indigo-500 transition-all"
          />
        </div>
        <div className="flex justify-between text-[10px] font-black text-slate-500 dark:text-slate-400 tabular-nums tracking-widest">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      <button 
        onClick={cyclePlaybackRate}
        className="w-12 h-8 flex items-center justify-center bg-white dark:bg-slate-700 text-[11px] font-black rounded-xl border border-slate-200 dark:border-white/10 hover:border-indigo-500/50 transition-all active:scale-95 text-indigo-600 dark:text-indigo-400 shadow-sm"
      >
        {playbackRate}x
      </button>
    </div>
  );
};

export default AudioWhatsApp;
