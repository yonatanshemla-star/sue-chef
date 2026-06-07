import React, { useState } from 'react';

interface DisqualificationReason {
  reason: string;
  count: number;
}

interface DisqualificationPieChartProps {
  data: DisqualificationReason[];
}

export default function DisqualificationDonutChart({ data }: DisqualificationPieChartProps) {
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
        <p className="font-bold text-sm">אין נתונים לתקופה זו</p>
      </div>
    );
  }

  // Predefined vibrant colors for pie segments (Tailwind colors matching the rest of the dashboard)
  const colors = [
    '#f43f5e', // Rose
    '#f97316', // Orange
    '#eab308', // Yellow/Amber
    '#06b6d4', // Cyan/Teal
    '#6366f1', // Indigo
    '#a855f7', // Purple
    '#ec4899', // Pink
  ];

  const svgSize = 130;
  const center = svgSize / 2;
  const r = 55;
  const isFullCircle = cleanData.length === 1;

  // Let's pre-calculate all slices path data and angles
  let currentAngle = -Math.PI / 2; // Start at 12 o'clock

  const slices = cleanData.map((item, idx) => {
    const percentage = item.count / total;
    const angleRange = percentage * 2 * Math.PI;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleRange;
    currentAngle = endAngle; // Update for next slice

    // Calculate slice mid-angle for pop-out translation and label placement
    const midAngle = startAngle + angleRange / 2;

    // Translation vector on hover
    const popDistance = 6;
    const dx = popDistance * Math.cos(midAngle);
    const dy = popDistance * Math.sin(midAngle);

    // Circumference coordinates
    const x1 = center + r * Math.cos(startAngle);
    const y1 = center + r * Math.sin(startAngle);
    const x2 = center + r * Math.cos(endAngle);
    const y2 = center + r * Math.sin(endAngle);

    const largeArcFlag = percentage > 0.5 ? 1 : 0;

    // SVG path d attribute
    const pathData = [
      `M ${center} ${center}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    // Center coordinates for the text percentage label
    const labelRadius = r * 0.65;
    const lx = isFullCircle ? center : center + labelRadius * Math.cos(midAngle);
    const ly = isFullCircle ? center : center + labelRadius * Math.sin(midAngle);

    return {
      pathData,
      dx,
      dy,
      lx,
      ly,
      color: colors[idx % colors.length],
      label: item.reason,
      value: item.count,
      percentage,
      isLarge: percentage > 0.05
    };
  });

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-8" dir="rtl">
      {/* Solid Pie Chart SVG */}
      <div className="relative w-52 h-52 flex-shrink-0 flex items-center justify-center">
        <svg 
          viewBox={`0 0 ${svgSize} ${svgSize}`} 
          className="w-full h-full overflow-visible"
        >
          {isFullCircle ? (
            <circle
              cx={center}
              cy={center}
              r={r}
              fill={slices[0].color}
              className="cursor-pointer transition-transform duration-300"
              style={{
                transform: hoveredIdx === 0 ? 'scale(1.03)' : 'scale(1)',
                transformOrigin: `${center}px ${center}px`
              }}
              onMouseEnter={() => setHoveredIdx(0)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          ) : (
            slices.map((slice, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <path
                  key={idx}
                  d={slice.pathData}
                  fill={slice.color}
                  className="transition-transform duration-300 cursor-pointer"
                  style={{
                    transform: isHovered ? `translate(${slice.dx}px, ${slice.dy}px)` : 'translate(0px, 0px)',
                    transformOrigin: `${center}px ${center}px`
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })
          )}

          {/* Inner Percentage Labels */}
          {slices.map((slice, idx) => {
            if (!slice.isLarge && hoveredIdx !== idx) return null;
            const isHovered = hoveredIdx === idx;
            return (
              <text
                key={idx}
                x={slice.lx}
                y={slice.ly}
                textAnchor="middle"
                dominantBaseline="central"
                className="fill-white font-assistant font-bold pointer-events-none select-none text-[8px]"
                style={{
                  fontSize: isHovered ? '9px' : '7.5px',
                  transform: isHovered ? `translate(${slice.dx}px, ${slice.dy}px)` : 'translate(0px, 0px)',
                  transformOrigin: `${center}px ${center}px`,
                  transition: 'all 0.3s ease-out'
                }}
              >
                {Math.round(slice.percentage * 100)}%
              </text>
            );
          })}
        </svg>
      </div>

      {/* Side Legend List */}
      <div className="flex-1 w-full">
        {/* Total Summary Badge */}
        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 px-4 py-2.5 rounded-2xl border border-slate-100 dark:border-slate-850">
          <span className="font-assistant">סה"כ נפסלו בתקופה:</span>
          <span className="font-mono text-xs font-bold text-slate-800 dark:text-white px-2.5 py-0.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm border dark:border-slate-700">
            {total} לידים
          </span>
        </div>

        <div className="space-y-2">
          {slices.map((slice, idx) => {
            const isHovered = hoveredIdx === idx;
            return (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-2xl border transition-all duration-200 cursor-pointer
                  ${isHovered 
                    ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 shadow-sm scale-[1.02]' 
                    : 'bg-transparent border-transparent'}`}
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-3.5 h-3.5 rounded-full flex-shrink-0" 
                    style={{ backgroundColor: slice.color }} 
                  />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                    {slice.label}
                  </span>
                </div>
                <span className="text-xs font-mono font-bold text-slate-800 dark:text-white px-2.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded-lg">
                  {slice.value} ({Math.round(slice.percentage * 100)}%)
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
