import React, { useState } from 'react';

interface DisqualificationReason {
  reason: string;
  count: number;
}

interface DisqualificationDonutChartProps {
  data: DisqualificationReason[];
}

export default function DisqualificationDonutChart({ data }: DisqualificationDonutChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const cleanData = data.filter(d => d.count > 0);
  const total = cleanData.reduce((sum, item) => sum + item.count, 0);

  if (cleanData.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 opacity-25" dir="rtl">
        <svg className="w-16 h-16 text-slate-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="10" strokeWidth="1.5" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8v4m0 4h.01" />
        </svg>
        <p className="font-black text-sm">אין נתונים לתקופה זו</p>
      </div>
    );
  }

  // Predefined colors for donut segments
  const colors = [
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow
    '#06b6d4', // Cyan
    '#6366f1', // Indigo
    '#a855f7', // Purple
  ];

  // Circle dimensions
  const r = 50;
  const circumference = 2 * Math.PI * r; // ~314.16

  let accumulatedPercent = 0;

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-6" dir="rtl">
      {/* Donut Chart (SVG) */}
      <div className="relative w-48 h-48 flex-shrink-0">
        <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
          <circle
            cx="60"
            cy="60"
            r={r}
            fill="transparent"
            className="stroke-slate-100 dark:stroke-slate-800"
            strokeWidth="12"
          />
          {cleanData.map((item, idx) => {
            const percentage = item.count / total;
            const strokeLength = percentage * circumference;
            const strokeOffset = circumference - (accumulatedPercent * circumference);
            accumulatedPercent += percentage;

            const isHovered = hoveredIdx === idx;
            const color = colors[idx % colors.length];

            return (
              <circle
                key={idx}
                cx="60"
                cy="60"
                r={r}
                fill="transparent"
                stroke={color}
                strokeWidth={isHovered ? 16 : 12}
                strokeDasharray={`${strokeLength} ${circumference}`}
                strokeDashoffset={strokeOffset}
                strokeLinecap="round"
                className="transition-all duration-300 cursor-pointer origin-center"
                style={{
                  transform: isHovered ? 'scale(1.02)' : 'scale(1)',
                }}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>

        {/* Center Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
          {hoveredIdx !== null && cleanData[hoveredIdx] ? (
            <>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider leading-none mb-1 max-w-[90px] truncate">
                {cleanData[hoveredIdx].reason}
              </span>
              <span className="text-xl font-black text-slate-800 dark:text-white leading-none">
                {Math.round((cleanData[hoveredIdx].count / total) * 100)}%
              </span>
              <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                ({cleanData[hoveredIdx].count} מתוך {total})
              </span>
            </>
          ) : (
            <>
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none mb-1">
                סה"כ נפסלו
              </span>
              <span className="text-3xl font-black text-slate-800 dark:text-white leading-none">
                {total}
              </span>
              <span className="text-[8px] font-bold text-slate-400 mt-0.5">
                לידים בתקופה
              </span>
            </>
          )}
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-3 w-full">
        {cleanData.map((item, idx) => {
          const color = colors[idx % colors.length];
          const isHovered = hoveredIdx === idx;
          return (
            <div
              key={idx}
              className={`flex items-center justify-between p-2.5 rounded-2xl border transition-all duration-200 cursor-pointer
                ${isHovered 
                  ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm scale-[1.02]' 
                  : 'bg-transparent border-transparent'}`}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
            >
              <div className="flex items-center gap-3">
                <div 
                  className="w-3.5 h-3.5 rounded-full" 
                  style={{ backgroundColor: color }} 
                />
                <span className="text-xs font-black text-slate-700 dark:text-slate-300">
                  {item.reason}
                </span>
              </div>
              <span className="text-xs font-mono font-black text-slate-800 dark:text-white px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                {item.count} ({Math.round((item.count / total) * 100)}%)
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
