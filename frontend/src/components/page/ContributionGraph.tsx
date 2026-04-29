'use client';

import React, { useMemo, useState, useCallback } from 'react';

interface ContributionGraphProps {
  logDates: string[];
  color?: string;
  weeks?: number;
}

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const DAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
const CELL = 12;
const GAP = 2;
const STEP = CELL + GAP;
const LEFT_OFFSET = 26;
const TOP_OFFSET = 18;

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export default function ContributionGraph({ logDates, color = '#3b82f6', weeks = 26 }: ContributionGraphProps) {
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null);

  const { cells, monthLabels, numCols } = useMemo(() => {
    const countMap: Record<string, number> = {};
    for (const d of logDates) {
      countMap[d] = (countMap[d] ?? 0) + 1;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Align to the Sunday that starts the current week
    const startOfCurrentWeek = new Date(today);
    startOfCurrentWeek.setDate(today.getDate() - today.getDay());

    // Go back (weeks - 1) full weeks
    const startDate = new Date(startOfCurrentWeek);
    startDate.setDate(startDate.getDate() - (weeks - 1) * 7);

    const cells: Array<{ date: string; count: number; col: number; row: number }> = [];
    const monthLabels: Array<{ col: number; label: string }> = [];
    let prevMonth = -1;
    let numCols = 0;

    const cur = new Date(startDate);
    while (cur <= today) {
      const dayOfWeek = cur.getDay(); // 0 = Sunday
      const col = Math.round((cur.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      const dateStr = toDateStr(cur);
      const count = countMap[dateStr] ?? 0;

      if (dayOfWeek === 0) {
        const month = cur.getMonth();
        if (month !== prevMonth) {
          monthLabels.push({ col, label: MONTH_LABELS[month] });
          prevMonth = month;
        }
      }

      cells.push({ date: dateStr, count, col, row: dayOfWeek });
      numCols = Math.max(numCols, col + 1);
      cur.setDate(cur.getDate() + 1);
    }

    return { cells, monthLabels, numCols };
  }, [logDates, weeks]);

  const maxCount = useMemo(() => Math.max(1, ...cells.map(c => c.count)), [cells]);

  const cellOpacity = useCallback((count: number) => {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio < 0.25) return 0.25;
    if (ratio < 0.5) return 0.5;
    if (ratio < 0.75) return 0.75;
    return 1;
  }, [maxCount]);

  const svgWidth = LEFT_OFFSET + numCols * STEP;
  const svgHeight = TOP_OFFSET + 7 * STEP;

  return (
    <div className="relative overflow-x-auto">
      <svg width={svgWidth} height={svgHeight} style={{ display: 'block', overflow: 'visible' }}>
        {/* Day labels */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={LEFT_OFFSET - 4}
              y={TOP_OFFSET + i * STEP + CELL * 0.8}
              fontSize={9}
              textAnchor="end"
              fill="currentColor"
              opacity={0.4}
            >
              {label}
            </text>
          ) : null
        )}

        {/* Month labels */}
        {monthLabels.map(({ col, label }) => (
          <text
            key={`${col}-${label}`}
            x={LEFT_OFFSET + col * STEP}
            y={TOP_OFFSET - 6}
            fontSize={9}
            fill="currentColor"
            opacity={0.5}
          >
            {label}
          </text>
        ))}

        {/* Cells */}
        {cells.map(({ date, count, col, row }) => (
          <rect
            key={date}
            x={LEFT_OFFSET + col * STEP}
            y={TOP_OFFSET + row * STEP}
            width={CELL}
            height={CELL}
            rx={2}
            fill={count === 0 ? 'currentColor' : color}
            opacity={count === 0 ? 0.07 : cellOpacity(count)}
            onMouseEnter={(e) => {
              const svgEl = e.currentTarget.closest('svg');
              const containerEl = svgEl?.parentElement;
              if (!containerEl) return;
              const containerRect = containerEl.getBoundingClientRect();
              const rectEl = e.currentTarget.getBoundingClientRect();
              setTooltip({
                date,
                count,
                x: rectEl.left - containerRect.left + CELL / 2,
                y: rectEl.top - containerRect.top - 4,
              });
            }}
            onMouseLeave={() => setTooltip(null)}
            style={{ cursor: 'default' }}
          />
        ))}
      </svg>

      {tooltip && (
        <div
          className="absolute z-50 px-2 py-1 text-xs bg-popover border border-border rounded shadow-md pointer-events-none -translate-x-1/2 -translate-y-full whitespace-nowrap"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <span className="font-medium">{tooltip.count === 0 ? 'No completions' : `${tooltip.count} ${tooltip.count === 1 ? 'completion' : 'completions'}`}</span>
          <span className="text-muted-foreground ml-1">on {tooltip.date}</span>
        </div>
      )}
    </div>
  );
}
