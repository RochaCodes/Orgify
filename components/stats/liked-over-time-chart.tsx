"use client";

import { useId, useState } from "react";

interface Point {
  month: string;
  count: number;
}

const WIDTH = 480;
const HEIGHT = 140;
const PADDING_LEFT = 4;
const PADDING_RIGHT = 4;
const PADDING_BOTTOM = 18;
const PADDING_TOP = 8;

function formatMonth(month: string) {
  const [year, m] = month.split("-");
  return new Date(Number(year), Number(m) - 1, 1).toLocaleDateString("en-GB", {
    month: "short",
    year: "2-digit",
  });
}

/** Compact monthly bar chart for liked-songs-added-over-time. Single series, so a single
 * primary hue is used throughout rather than a categorical palette. */
export function LikedOverTimeChart({ data }: { data: Point[] }) {
  const gradientId = useId();
  // Keyed by month rather than by index: a refetch can shrink the series while the pointer
  // is still down on a bar, and a stale index would then read past the end of the array.
  const [hovered, setHovered] = useState<string | null>(null);

  if (data.length === 0) {
    return <p className="py-8 text-center text-xs text-muted-foreground">No liked-song history yet.</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);
  const plotWidth = WIDTH - PADDING_LEFT - PADDING_RIGHT;
  const plotHeight = HEIGHT - PADDING_TOP - PADDING_BOTTOM;
  const barGap = 2;
  const barWidth = Math.max(2, plotWidth / data.length - barGap);
  const labelEvery = Math.max(1, Math.ceil(data.length / 6));

  const hoveredIndex = hovered === null ? -1 : data.findIndex((d) => d.month === hovered);
  const hoveredPoint = hoveredIndex === -1 ? undefined : data[hoveredIndex];
  // The SVG scales to the card, so the tooltip is placed as a fraction of the chart width.
  const hoveredCentre =
    ((PADDING_LEFT + hoveredIndex * (barWidth + barGap) + barWidth / 2) / WIDTH) * 100;
  // Anchoring by the near edge at the extremes keeps the tooltip inside the card.
  const tooltipAnchor = hoveredCentre < 15 ? 0 : hoveredCentre > 85 ? 100 : 50;

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full"
        role="img"
        aria-label="Liked songs added per month"
        onMouseLeave={() => setHovered(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.9" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        <line
          x1={PADDING_LEFT}
          y1={HEIGHT - PADDING_BOTTOM}
          x2={WIDTH - PADDING_RIGHT}
          y2={HEIGHT - PADDING_BOTTOM}
          stroke="var(--border)"
          strokeWidth="1"
        />
        {data.map((d, i) => {
          const barHeight = (d.count / max) * plotHeight;
          const x = PADDING_LEFT + i * (barWidth + barGap);
          const y = HEIGHT - PADDING_BOTTOM - barHeight;
          const isHovered = hovered === d.month;
          return (
            <g key={d.month}>
              <rect
                x={x}
                y={Math.min(y, HEIGHT - PADDING_BOTTOM - 2)}
                width={barWidth}
                height={Math.max(2, barHeight)}
                rx={2}
                fill={`url(#${gradientId})`}
                opacity={isHovered ? 1 : 0.85}
                className="transition-opacity"
              />
              {i % labelEvery === 0 && (
                <text
                  x={x + barWidth / 2}
                  y={HEIGHT - 4}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="8"
                  fontFamily="var(--font-mono, monospace)"
                >
                  {formatMonth(d.month)}
                </text>
              )}
              {/* Full-height hit area over the whole slot, so the gaps between thin bars are
                  not dead zones. Last in the group so it sits above the bar and its label. */}
              <rect
                x={x}
                y={0}
                width={barWidth + barGap}
                height={HEIGHT}
                fill="transparent"
                onMouseEnter={() => setHovered(d.month)}
              />
            </g>
          );
        })}
      </svg>
      {hoveredPoint && (
        <div
          className="pointer-events-none absolute top-0 whitespace-nowrap rounded-md border border-border bg-popover px-2 py-1 text-xs text-popover-foreground shadow-md"
          style={{ left: `${hoveredCentre}%`, transform: `translateX(-${tooltipAnchor}%)` }}
        >
          {formatMonth(hoveredPoint.month)} · {hoveredPoint.count} liked
        </div>
      )}
    </div>
  );
}
