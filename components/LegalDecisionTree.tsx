import React, { useState, useEffect, useCallback } from 'react';
import { legalQuestions } from '../utils/legalQuestions';
import { calculateRetirementAge, evaluateResults, LegalResult } from '../utils/legalLogic';
import { ChevronLeft, ChevronRight, CheckCircle2, RotateCcw, ClipboardList } from 'lucide-react';

interface LegalDecisionTreeProps {
  onFinish?: (results: LegalResult[]) => void;
  onComplete?: (answers: any) => void;
  compact?: boolean;
}

export default function LegalDecisionTree({ onFinish, onComplete, compact = false }: LegalDecisionTreeProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [history, setHistory] = useState<number[]>([0]);
  const [isFinished, setIsFinished] = useState(false);

  const currentQuestion = legalQuestions[currentStepIndex];

  const handleNext = useCallback((overrideAnswers?: any) => {
    const currentAnswers = overrideAnswers || answers;
    const currentId = currentQuestion.id;

    let updatedAnswers = { ...currentAnswers };
    
    if (currentId === 'age' || currentId === 'gender') {
      const age = parseInt(updatedAnswers.age);
      const gender = updatedAnswers.gender;
      if (age && gender) {
        updatedAnswers.retirementAge = calculateRetirementAge(age, gender);
      }
    }

    let nextStepId;
    if (typeof currentQuestion.next === 'function') {
      nextStepId = currentQuestion.next(updatedAnswers);
    } else {
      nextStepId = currentQuestion.next;
    }

    if (nextStepId === 'results') {
      setIsFinished(true);
      if (onFinish) {
        const results = evaluateResults(updatedAnswers);
        onFinish(results);
      }
      if (onComplete) {
        onComplete(updatedAnswers);
      }
      return;
    }

    const nextIndex = legalQuestions.findIndex(q => q.id === nextStepId);
    if (nextIndex !== -1) {
      setHistory(prev => [...prev, nextIndex]);
      setCurrentStepIndex(nextIndex);
    }
  }, [currentQuestion, answers, onFinish]);

  const handleBack = () => {
    if (history.length > 1) {
      const newHistory = [...history];
      newHistory.pop();
      const prevIndex = newHistory[newHistory.length - 1];
      setHistory(newHistory);
      setCurrentStepIndex(prevIndex);
      setIsFinished(false);
    }
  };

  const handleSelect = (value: any) => {
    if (currentQuestion.type === 'multiselect') {
      const currentList = answers[currentQuestion.id] || [];
      const newList = currentList.includes(value) 
        ? currentList.filter((v: any) => v !== value)
        : [...currentList, value];
      
      setAnswers({ ...answers, [currentQuestion.id]: newList });
    } else {
      const newAnswers = { ...answers, [currentQuestion.id]: value };
      setAnswers(newAnswers);
      
      if (currentQuestion.type === 'select') {
        handleNext(newAnswers);
      }
    }
  };

  const reset = () => {
    setCurrentStepIndex(0);
    setAnswers({});
    setHistory([0]);
    setIsFinished(false);
  };

  const progress = (currentStepIndex / (legalQuestions.length - 1)) * 100;

  if (isFinished) {
    const results = evaluateResults(answers);
    return (
      <div className={`flex flex-col gap-8 ${compact ? 'p-0' : 'p-10 max-w-4xl mx-auto'} animate-in fade-in duration-700`}>
        {!compact && (
          <div className="text-center mb-4">
            <h1 className="text-4xl font-black text-glow mb-2 flex items-center justify-center gap-4">
              <CheckCircle2 className="w-10 h-10 text-emerald-500" /> סיכום זכויות ופוטנציאל
            </h1>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">תוצאות ראשוניות המבוססות על נתוני הלקוח</p>
          </div>
        )}
        <div className="grid gap-6">
          {results.map((res, idx) => (
            <div key={idx} className={`p-8 rounded-[32px] border border-white/20 premium-glass shadow-xl animate-in slide-in-from-bottom-8 duration-700 delay-${idx*100}`}>
              <div className="flex items-start gap-4 mb-4">
                <div className={`w-3 h-10 rounded-full ${res.type === 'tax' ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.4)]' : 'bg-indigo-600 shadow-[0_0_15px_rgba(79,70,229,0.4)]'}`} />
                <h3 className={`text-2xl font-black ${res.type === 'tax' ? 'text-amber-600 dark:text-amber-400' : 'text-indigo-600 dark:text-indigo-400'}`}>{res.title}</h3>
              </div>
              <p className="text-slate-600 dark:text-slate-300 leading-loose font-bold text-lg opacity-90 pr-7">{res.description}</p>
            </div>
          ))}
        </div>
        <button onClick={reset} className="mt-10 flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-indigo-600 to-indigo-800 text-white rounded-[24px] font-black self-center hover:scale-110 hover:-rotate-1 transition-all active:scale-95 shadow-2xl shadow-indigo-500/20">
          <RotateCcw className="w-6 h-6" /> התחל תשאול חדש
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-10 ${compact ? 'p-0' : 'p-10 max-w-4xl mx-auto'} animate-in fade-in duration-700`}>
      {/* Progress */}
      <div className="relative w-full h-4 bg-slate-200/50 dark:bg-slate-800/50 rounded-full overflow-hidden backdrop-blur-sm border border-white/10">
        <div 
          className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-emerald-500 transition-all duration-1000 ease-[cubic-bezier(0.23,1,0.32,1)] shadow-[0_0_20px_rgba(99,102,241,0.5)]" 
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.2)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.2)_50%,rgba(255,255,255,0.2)_75%,transparent_75%,transparent)] bg-[length:20px_20px] animate-[pulse_3s_linear_infinite]" />
        </div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2.5 justify-center">
          {history.map((idx, i) => (
            <span key={i} className="px-4 py-2 rounded-full bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border border-white/20 text-[10px] font-black text-slate-400 uppercase tracking-widest animate-in fade-in slide-in-from-top-2 duration-500">
              {legalQuestions[idx].text.substring(0, 20)}...
            </span>
          ))}
        </div>
      )}

      <div className={`relative p-10 md:p-16 rounded-[48px] premium-glass border border-white/20 shadow-[0_32px_128px_-12px_rgba(0,0,0,0.5)] flex flex-col gap-12 animate-in fade-in zoom-in-95 duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] text-center`}>
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-500 text-[10px] font-black uppercase tracking-[0.2em] mb-4">
            שאלון זכויות רפואיות
          </div>
          <h2 className="text-3xl md:text-5xl font-black text-slate-800 dark:text-white leading-[1.1] tracking-tight text-glow">
            {currentQuestion.text}
          </h2>
        </div>

        <div className="flex flex-col gap-8 w-full max-w-2xl mx-auto">
          {(currentQuestion.type === 'text' || currentQuestion.type === 'number') && (
            <div className="relative group">
              <input 
                type={currentQuestion.type} 
                autoFocus
                className="w-full px-8 py-8 bg-white/20 dark:bg-slate-950/20 border-2 border-indigo-500/10 dark:border-white/5 rounded-[32px] text-4xl font-black focus:border-indigo-500/50 dark:focus:border-indigo-500/50 outline-none transition-all text-center text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-inner group-hover/input:shadow-indigo-500/5"
                value={answers[currentQuestion.id] || ''} 
                onChange={(e) => handleSelect(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && answers[currentQuestion.id]) {
                    handleNext();
                  }
                }}
                placeholder="..."
              />
              <div className="absolute inset-0 rounded-[32px] pointer-events-none border-2 border-indigo-500/0 group-focus-within:border-indigo-500/30 transition-all duration-500 scale-[1.02] opacity-0 group-focus-within:opacity-100" />
            </div>
          )}

          {(currentQuestion.type === 'select' || currentQuestion.type === 'multiselect') && (
            <div className={`grid gap-5 ${currentQuestion.options!.length > 3 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {currentQuestion.options!.map(opt => {
                const isSelected = currentQuestion.type === 'multiselect' 
                  ? (answers[currentQuestion.id] || []).includes(opt.value)
                  : answers[currentQuestion.id] === opt.value;
                
                return (
                  <button 
                    key={opt.value}
                    className={`flex items-center justify-between p-8 rounded-[32px] border-2 font-black text-xl transition-all duration-300 active:scale-95 shadow-sm group/btn
                      ${isSelected 
                        ? 'bg-indigo-600 border-indigo-500 text-white shadow-indigo-500/40 rotate-1' 
                        : 'bg-white/40 dark:bg-slate-900/40 border-white/20 dark:border-white/5 text-slate-700 dark:text-slate-300 hover:border-indigo-500/30 hover:bg-white/60 dark:hover:bg-slate-800/60 hover:-translate-y-1'}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span className="tracking-tight">{opt.label}</span>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-500 
                      ${isSelected ? 'bg-white/20 text-white rotate-[360deg]' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 group-hover/btn:rotate-12'}`}>
                      {isSelected ? <CheckCircle2 className="w-6 h-6" /> : <ChevronLeft className="w-6 h-6" />}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-10 mt-4 border-t border-indigo-500/10">
          <button 
            className="flex items-center gap-3 px-8 py-4 rounded-[20px] font-black text-sm uppercase tracking-widest bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all disabled:opacity-0 disabled:pointer-events-none transition-all duration-500 hover:-translate-x-2" 
            onClick={handleBack}
            disabled={history.length <= 1}
          >
            <ChevronRight className="w-5 h-5" /> חזור
          </button>
          <button 
            className="flex items-center gap-4 px-12 py-5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-[28px] font-black text-lg shadow-2xl hover:scale-110 hover:rotate-1 active:scale-95 transition-all duration-300" 
            onClick={() => handleNext()}
          >
            <span>המשך</span> <div className="w-8 h-8 rounded-full bg-current/10 flex items-center justify-center"><ChevronLeft className="w-6 h-6" /></div>
          </button>
        </div>
      </div>
    </div>
  );
}
