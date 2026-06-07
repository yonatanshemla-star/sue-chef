import React, { useState } from 'react';

interface ChartDataPoint {
  period: string;
  count: number;
}

interface InteractiveSVGChartProps {
  data: ChartDataPoint[];
  title: string;
  type: 'line' | 'bar';
  color: 'indigo' | 'emerald';
  yLabel?: string;
}

export default function InteractiveSVGChart({
  data,
  title,
  type,
  color,
  yLabel = 'כמות'
}: InteractiveSVGChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] p-6 h-72 flex items-center justify-center text-slate-400 font-bold">
        אין מספיק נתונים להצגת הגרף
      </div>
    );
  }

  // Dimension setup
  const svgWidth = 500;
  const svgHeight = 220;
  const paddingLeft = 45;
  const paddingRight = 15;
  const paddingTop = 25;
  const paddingBottom = 35;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Math conversions
  const maxVal = Math.max(...data.map(d => d.count), 1);
  const chartMaxY = Math.ceil(maxVal * 1.15); // Add 15% margin on top

  // Y-axis grid values
  const yTicks = [0, Math.round(chartMaxY / 2), chartMaxY];

  const points = data.map((d, i) => {
    const x = paddingLeft + (i * chartWidth) / Math.max(data.length - 1, 1);
    const y = svgHeight - paddingBottom - (d.count * chartHeight) / chartMaxY;
    return { x, y, label: d.period, value: d.count };
  });

  // SVG Line path strings
  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = points.length > 0 
    ? `${linePath} L ${points[points.length - 1].x} ${svgHeight - paddingBottom} L ${points[0].x} ${svgHeight - paddingBottom} Z` 
    : '';

  // Themes config
  const colorMap = {
    indigo: {
      stroke: '#4f46e5',
      fillGrad: 'from-indigo-500/20 to-indigo-500/0',
      fillSolid: '#4f46e5',
      glow: 'shadow-indigo-500/20',
      hex: '#4f46e5'
    },
    emerald: {
      stroke: '#10b981',
      fillGrad: 'from-emerald-500/20 to-emerald-500/0',
      fillSolid: '#10b981',
      glow: 'shadow-emerald-500/20',
      hex: '#10b981'
    }
  };

  const theme = colorMap[color];

  // Simplify ticks logic for X-axis to prevent label overlap
  const getXAxisLabels = () => {
    if (data.length <= 10) return points;
    // Return a subset of points (e.g. every N-th point)
    const step = Math.ceil(data.length / 6);
    return points.filter((_, idx) => idx % step === 0 || idx === data.length - 1);
  };

  const xAxisLabels = getXAxisLabels();

  return (
    <div className="bg-white dark:bg-slate-900 border dark:border-slate-800 rounded-[32px] p-6 shadow-sm hover:shadow-md transition-all duration-300 relative flex flex-col w-full h-full select-none" dir="rtl">
      {/* Title */}
      <div className="flex justify-between items-center mb-4">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">{title}</h4>
        <span className="text-[10px] font-bold text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{yLabel}</span>
      </div>

      {/* SVG Container */}
      <div className="relative flex-1 w-full min-h-[160px]">
        {/* Tooltip Overlay */}
        {hoveredIdx !== null && points[hoveredIdx] && (
          <div
            style={{
              position: 'absolute',
              left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
              top: `${(points[hoveredIdx].y / svgHeight) * 100}%`,
              transform: 'translate(-50%, -100%) translateY(-12px)',
            }}
            className="z-30 bg-white/95 dark:bg-slate-950/95 border border-slate-100 dark:border-slate-800/80 px-4 py-2.5 rounded-2xl shadow-xl backdrop-blur-md pointer-events-none flex flex-col items-center gap-0.5 text-center min-w-[80px] transition-all duration-75"
          >
            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">{points[hoveredIdx].label}</span>
            <span className="text-sm font-bold text-slate-900 dark:text-white mt-0.5">{points[hoveredIdx].value} לידים</span>
          </div>
        )}

        <svg 
          viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
          className="w-full h-full overflow-visible"
        >
          <defs>
            {/* Gradients */}
            <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.hex} stopOpacity="0.25" />
              <stop offset="100%" stopColor={theme.hex} stopOpacity="0.00" />
            </linearGradient>
            <linearGradient id={`barGrad-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={theme.hex} stopOpacity="1" />
              <stop offset="100%" stopColor={theme.hex} stopOpacity="0.6" />
            </linearGradient>
          </defs>

          {/* Grid lines & Y Axis labels */}
          {yTicks.map((val, idx) => {
            const y = svgHeight - paddingBottom - (val * chartHeight) / chartMaxY;
            return (
              <g key={idx} className="opacity-40 dark:opacity-20">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="#94a3b8"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                />
                <text
                  x={paddingLeft - 10}
                  y={y + 4}
                  textAnchor="end"
                  className="fill-slate-400 dark:fill-slate-500 font-mono text-[9px] font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* X Axis line */}
          <line
            x1={paddingLeft}
            y1={svgHeight - paddingBottom}
            x2={svgWidth - paddingRight}
            y2={svgHeight - paddingBottom}
            className="stroke-slate-200 dark:stroke-slate-800"
            strokeWidth="1.5"
          />

          {/* Render Area / Line */}
          {type === 'line' && points.length > 0 && (
            <>
              {/* Area Gradient Fill */}
              <path
                d={areaPath}
                fill={`url(#grad-${color})`}
                className="transition-all duration-500"
              />
              {/* Line path */}
              <path
                d={linePath}
                fill="none"
                stroke={theme.stroke}
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-500"
              />
            </>
          )}

          {/* Render Bars */}
          {type === 'bar' && points.map((p, i) => {
            const totalBars = data.length;
            const fullSpacing = chartWidth / totalBars;
            const barW = Math.max(fullSpacing * 0.55, 3);
            const barX = p.x - barW / 2;
            const barH = svgHeight - paddingBottom - p.y;
            const isHovered = hoveredIdx === i;

            return (
              <rect
                key={i}
                x={barX}
                y={p.y}
                width={barW}
                height={Math.max(barH, 1)} // Min height 1px
                fill={`url(#barGrad-${color})`}
                rx={Math.min(barW / 2, 4)}
                className="transition-all duration-300"
                style={{
                  opacity: hoveredIdx === null ? 1 : isHovered ? 1 : 0.45
                }}
              />
            );
          })}

          {/* X Axis Labels */}
          {xAxisLabels.map((p, idx) => (
            <text
              key={idx}
              x={p.x}
              y={svgHeight - paddingBottom + 18}
              textAnchor="middle"
              className="fill-slate-400 dark:fill-slate-500 font-assistant text-[8px] md:text-[9px] font-bold"
            >
              {p.label}
            </text>
          ))}

          {/* Hover Indicators (Vertical line + glowing dot) */}
          {hoveredIdx !== null && points[hoveredIdx] && (
            <g>
              {/* Vertical Guide Line */}
              <line
                x1={points[hoveredIdx].x}
                y1={paddingTop}
                x2={points[hoveredIdx].x}
                y2={svgHeight - paddingBottom}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="3 3"
                className="opacity-55"
              />

              {/* Glowing Dot (Only for Line Charts) */}
              {type === 'line' && (
                <>
                  <circle
                    cx={points[hoveredIdx].x}
                    cy={points[hoveredIdx].y}
                    r="6.5"
                    fill={theme.stroke}
                    className="opacity-25"
                  />
                  <circle
                    cx={points[hoveredIdx].x}
                    cy={points[hoveredIdx].y}
                    r="4"
                    fill={theme.stroke}
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </>
              )}
            </g>
          )}

          {/* Invisible interactive hover rects mapping columns */}
          {points.map((p, i) => {
            const colWidth = chartWidth / data.length;
            const colX = p.x - colWidth / 2;
            return (
              <rect
                key={i}
                x={colX}
                y={paddingTop}
                width={colWidth}
                height={chartHeight}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseMove={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
