'use client';

import React, { useState } from 'react';

/**
 * Interactive SVG Area & Line Chart for Revenue & Publishing Trends
 */
export const InteractiveAreaChart: React.FC<{
  data: Array<{ label: string; value: number }>;
  color?: string;
  fillColor?: string;
  valuePrefix?: string;
  valueSuffix?: string;
  height?: number;
}> = ({
  data,
  color = '#10b981',
  fillColor = 'rgba(16, 185, 129, 0.12)',
  valuePrefix = '',
  valueSuffix = '',
  height = 180,
}) => {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="h-44 flex items-center justify-center text-xs text-gray-400">No chart data</div>;
  }

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 10);
  const minVal = 0;
  const range = maxVal - minVal;

  const width = 600;
  const paddingX = 30;
  const paddingY = 25;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(1, data.length - 1)) * chartWidth;
    const y = height - paddingY - ((d.value - minVal) / range) * chartHeight;
    return { x, y, label: d.label, value: d.value };
  });

  const lineD = points.reduce((acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`, '');
  const areaD = `${lineD} L ${points[points.length - 1].x} ${height - paddingY} L ${points[0].x} ${height - paddingY} Z`;

  return (
    <div className="relative w-full overflow-hidden select-none">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
        <defs>
          <linearGradient id={`areaGrad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.25" />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Horizontal gridlines */}
        {[0, 0.5, 1].map((pct, idx) => {
          const y = height - paddingY - pct * chartHeight;
          return (
            <g key={idx}>
              <line x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="#f1f5f9" strokeWidth="1" strokeDasharray="3 3" />
              <text x={paddingX - 6} y={y + 3} textAnchor="end" className="text-[9px] fill-gray-400">
                {valuePrefix}
                {Math.round(minVal + pct * range)}
                {valueSuffix}
              </text>
            </g>
          );
        })}

        {/* Shaded Area */}
        <path d={areaD} fill={`url(#areaGrad-${color.replace('#', '')})`} />

        {/* Solid Line */}
        <path d={lineD} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

        {/* Interactive Data Points */}
        {points.map((p, i) => {
          const isHovered = hoverIndex === i;
          return (
            <g key={i} className="cursor-pointer" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
              {/* Invisible touch target */}
              <circle cx={p.x} cy={p.y} r="14" fill="transparent" />

              {/* Visible Point */}
              <circle
                cx={p.x}
                cy={p.y}
                r={isHovered ? 5 : 3}
                fill="#ffffff"
                stroke={color}
                strokeWidth={isHovered ? 3 : 2}
                className="transition-all duration-200"
              />

              {/* Bottom Label */}
              <text x={p.x} y={height - 6} textAnchor="middle" className="text-[9px] fill-gray-400 font-medium">
                {p.label}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Floating Hover Tooltip */}
      {hoverIndex !== null && points[hoverIndex] && (
        <div
          className="absolute z-10 px-2.5 py-1 bg-gray-900 text-white text-[11px] font-semibold rounded-lg shadow-lg pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all animate-fade-in"
          style={{
            left: `${(points[hoverIndex].x / width) * 100}%`,
            top: `${(points[hoverIndex].y / height) * 100 - 8}%`,
          }}
        >
          <div className="text-[9px] text-gray-400 leading-none mb-0.5">{points[hoverIndex].label}</div>
          <div className="text-xs font-bold leading-none">
            {valuePrefix}
            {points[hoverIndex].value.toLocaleString()}
            {valueSuffix}
          </div>
        </div>
      )}
    </div>
  );
};

/**
 * Donut / Distribution Ring Chart
 */
export const DonutDistributionChart: React.FC<{
  segments: Array<{ label: string; count: number; color: string }>;
  size?: number;
  thickness?: number;
  centerLabel?: string;
  centerSublabel?: string;
}> = ({ segments, size = 160, thickness = 20, centerLabel, centerSublabel }) => {
  const total = segments.reduce((sum, s) => sum + s.count, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;

  return (
    <div className="relative inline-flex items-center justify-center select-none" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
        {segments.map((seg, idx) => {
          const pct = seg.count / total;
          const strokeDasharray = `${pct * circumference} ${circumference}`;
          const strokeDashoffset = -currentOffset * circumference;
          currentOffset += pct;

          return (
            <circle
              key={idx}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={seg.color}
              strokeWidth={thickness}
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-out hover:opacity-85"
            />
          );
        })}
      </svg>
      {(centerLabel || centerSublabel) && (
        <div className="absolute text-center flex flex-col items-center justify-center pointer-events-none">
          {centerLabel && <span className="text-lg font-black text-gray-900 leading-none">{centerLabel}</span>}
          {centerSublabel && <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mt-0.5">{centerSublabel}</span>}
        </div>
      )}
    </div>
  );
};

/**
 * Clean Horizontal Comparison Bar
 */
export const HorizontalComparisonBar: React.FC<{
  label: string;
  value: number;
  total: number;
  color?: string;
  icon?: React.ReactNode;
}> = ({ label, value, total, color = '#10b981', icon }) => {
  const pct = Math.min(100, Math.round(((value || 0) / Math.max(1, total)) * 100));

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center space-x-1.5 font-medium text-gray-700">
          {icon}
          <span>{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-gray-900">{value.toLocaleString()}</span>
          <span className="text-[10px] text-gray-400 font-mono">({pct}%)</span>
        </div>
      </div>
      <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
};
