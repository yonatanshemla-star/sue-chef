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
      <div className={`flex flex-col gap-6 ${compact ? 'p-0' : 'p-8 max-w-3xl mx-auto'}`}>
        {!compact && <h1 className="text-3xl font-black text-indigo-900 dark:text-white flex items-center gap-3"><CheckCircle2 className="w-8 h-8 text-emerald-500" /> סיכום זכויות ופוטנציאל</h1>}
        <div className="grid gap-4">
          {results.map((res, idx) => (
            <div key={idx} className={`p-6 rounded-2xl border-l-8 bg-white dark:bg-gray-800 shadow-xl shadow-gray-200/50 dark:shadow-none animate-in slide-in-from-bottom-4 duration-500 delay-${idx*100} ${res.type === 'tax' ? 'border-amber-500' : 'border-indigo-600'}`}>
              <h3 className={`text-xl font-bold mb-2 ${res.type === 'tax' ? 'text-amber-600' : 'text-indigo-600 dark:text-indigo-400'}`}>{res.title}</h3>
              <p className="text-gray-600 dark:text-gray-300 leading-relaxed font-medium">{res.description}</p>
            </div>
          ))}
        </div>
        <button onClick={reset} className="mt-8 flex items-center gap-2.5 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-bold self-center hover:bg-indigo-700 transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none">
          <RotateCcw className="w-5 h-5" /> התחל תשאול חדש
        </button>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-8 ${compact ? 'p-0' : 'p-8 max-w-3xl mx-auto'}`}>
      {/* Progress */}
      <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-700 ease-out" style={{ width: `${progress}%` }}></div>
      </div>

      {!compact && (
        <div className="flex flex-wrap gap-2 justify-center">
          {history.map((idx, i) => (
            <span key={i} className="px-3 py-1.5 rounded-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-[10px] font-bold text-gray-400">
              {legalQuestions[idx].text.substring(0, 15)}...
            </span>
          ))}
        </div>
      )}

      <div className={`relative p-8 md:p-12 rounded-3xl bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-2xl flex flex-col gap-10 animate-in fade-in zoom-in-95 duration-500`}>
        <h2 className="text-2xl md:text-3xl font-black text-center text-gray-900 dark:text-white leading-tight">
          {currentQuestion.text}
        </h2>

        <div className="flex flex-col gap-6">
          {(currentQuestion.type === 'text' || currentQuestion.type === 'number') && (
            <input 
              type={currentQuestion.type} 
              autoFocus
              className="w-full px-6 py-5 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-xl font-bold focus:border-indigo-500 outline-none transition-all text-center"
              value={answers[currentQuestion.id] || ''} 
              onChange={(e) => handleSelect(e.target.value)}
              placeholder="הקלד כאן..."
            />
          )}

          {(currentQuestion.type === 'select' || currentQuestion.type === 'multiselect') && (
            <div className={`grid gap-3 ${currentQuestion.options!.length > 3 ? 'grid-cols-1 md:grid-cols-2' : 'grid-cols-1'}`}>
              {currentQuestion.options!.map(opt => {
                const isSelected = currentQuestion.type === 'multiselect' 
                  ? (answers[currentQuestion.id] || []).includes(opt.value)
                  : answers[currentQuestion.id] === opt.value;
                
                return (
                  <button 
                    key={opt.value}
                    className={`flex items-center justify-between p-5 rounded-2xl border-2 font-bold text-lg transition-all active:scale-[0.98] ${isSelected ? 'bg-indigo-50 border-indigo-500 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400' : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-700 hover:border-indigo-200 hover:bg-gray-50 dark:hover:bg-gray-800'}`}
                    onClick={() => handleSelect(opt.value)}
                  >
                    <span>{opt.label}</span>
                    {isSelected && <CheckCircle2 className="w-6 h-6" />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between pt-6 border-t border-gray-100 dark:border-gray-700">
          <button 
            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gray-50 dark:bg-gray-900 text-gray-500 hover:bg-gray-100 transition-all disabled:opacity-30 disabled:pointer-events-none" 
            onClick={handleBack}
            disabled={history.length <= 1}
          >
            <ChevronRight className="w-5 h-5" /> חזור
          </button>
          <button 
            className="flex items-center gap-2 px-8 py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-2xl font-black shadow-xl hover:scale-105 active:scale-95 transition-all" 
            onClick={() => handleNext()}
          >
            <span>המשך</span> <ChevronLeft className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
