"use client";
import { useState, useId } from "react";

interface Props {
  data: number[];
  height?: number;
  timeRange?: "Today" | "7 Days" | "30 Days";
}

const timelineLabels: Record<"Today" | "7 Days" | "30 Days", string[]> = {
  Today: ["09:00 AM", "12:00 PM", "03:00 PM", "06:00 PM", "09:30 PM", "11:30 PM"],
  "7 Days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30 Days": ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5"],
};

export function Sparkline({ data, height = 210, timeRange = "Today" }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradId = useId();

  if (!data.length) return <div className="muted">No revenue telemetry recorded.</div>;

  const w = 620;
  const paddingLeft = 16;
  const paddingRight = 56; // Room for readable Y-axis labels on the right
  const paddingTop = 44; // Room for floating tooltip above peak
  const paddingBottom = 32; // Room for X-axis timeline labels
  const chartW = w - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // Find peak point index
  const peakIdx = data.reduce((maxI, v, i, arr) => (v > arr[maxI] ? i : maxI), 0);
  const activeIdx = hoveredIdx !== null ? hoveredIdx : peakIdx;

  const step = chartW / (data.length - 1);
  const points = data.map((v, i) => ({
    x: paddingLeft + i * step,
    y: paddingTop + chartH - ((v - min) / range) * chartH,
    val: v,
  }));

  // Build smooth bezier curve
  let pathD = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const current = points[i];
    const next = points[i + 1];
    const cpX = (current.x + next.x) / 2;
    pathD += ` C ${cpX} ${current.y}, ${cpX} ${next.y}, ${next.x} ${next.y}`;
  }

  const fillD = `${pathD} L ${points[points.length - 1].x} ${paddingTop + chartH} L ${points[0].x} ${paddingTop + chartH} Z`;

  // Y-axis tick values
  const yTicks = [
    { label: timeRange === "30 Days" ? "₹80k" : timeRange === "7 Days" ? "₹20k" : "₹15k", ratio: 0 },
    { label: timeRange === "30 Days" ? "₹50k" : timeRange === "7 Days" ? "₹14k" : "₹10k", ratio: 0.33 },
    { label: timeRange === "30 Days" ? "₹25k" : timeRange === "7 Days" ? "₹7k" : "₹5k", ratio: 0.66 },
    { label: "₹0", ratio: 1 },
  ];

  const currentPoint = points[activeIdx] || points[peakIdx];
  const xLabels = timelineLabels[timeRange] || timelineLabels.Today;

  // Formatted tooltip amount
  const activeAmount =
    timeRange === "30 Days"
      ? `₹${(currentPoint.val * 1000).toLocaleString("en-IN")}`
      : timeRange === "7 Days"
      ? `₹${(currentPoint.val * 1000).toLocaleString("en-IN")}`
      : `₹${(currentPoint.val * 100 + 150).toLocaleString("en-IN")}/hr`;

  const tooltipLabel =
    hoveredIdx !== null
      ? `Slot #${activeIdx + 1} ↗`
      : timeRange === "Today"
      ? "Peak 09:30 PM ↗"
      : timeRange === "7 Days"
      ? "Saturday Peak ↗"
      : "Week 5 Peak ↗";

  return (
    <div
      style={{ position: "relative", width: "100%", marginTop: 4, userSelect: "none" }}
      onMouseLeave={() => setHoveredIdx(null)}
    >
      <svg
        viewBox={`0 0 ${w} ${height}`}
        width="100%"
        height={height}
        preserveAspectRatio="none"
        role="img"
        aria-label="Revenue trajectory trend chart"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`area-grad-${gradId}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#5cf2b0" stopOpacity="0.4" />
            <stop offset="50%" stopColor="#10b981" stopOpacity="0.14" />
            <stop offset="100%" stopColor="#04120a" stopOpacity="0.0" />
          </linearGradient>
          <filter id={`line-glow-${gradId}`} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="3" stdDeviation="5" floodColor="#10b981" floodOpacity="0.55" />
          </filter>
        </defs>

        {/* Ambient background guide lines & Y-Axis Labels */}
        {yTicks.map((tick, i) => {
          const yPos = paddingTop + tick.ratio * chartH;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + chartW}
                y2={yPos}
                stroke="rgba(167, 243, 208, 0.06)"
                strokeDasharray={i === yTicks.length - 1 ? undefined : "4 4"}
              />
              <text
                x={paddingLeft + chartW + 12}
                y={yPos + 4}
                fill="var(--muted)"
                fontSize="11"
                fontFamily="var(--font-mono)"
                fontWeight="500"
              >
                {tick.label}
              </text>
            </g>
          );
        })}

        {/* Subtle area fill underneath the curve */}
        <path d={fillD} fill={`url(#area-grad-${gradId})`} />

        {/* Dotted vertical anchor line down from active peak point */}
        <line
          x1={currentPoint.x}
          y1={currentPoint.y}
          x2={currentPoint.x}
          y2={paddingTop + chartH}
          stroke="rgba(92, 242, 176, 0.35)"
          strokeWidth="1.5"
          strokeDasharray="3 3"
        />

        {/* Crisp neon emerald spline stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="#5cf2b0"
          strokeWidth="2.5"
          filter={`url(#line-glow-${gradId})`}
          strokeLinecap="round"
        />

        {/* Interactive hover hit targets along data points */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="16"
            fill="transparent"
            style={{ cursor: "pointer" }}
            onMouseEnter={() => setHoveredIdx(i)}
          />
        ))}

        {/* Coordinate beacon on active point */}
        <circle cx={currentPoint.x} cy={currentPoint.y} r="9" fill="#5cf2b0" fillOpacity="0.22" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="4.5" fill="#5cf2b0" stroke="#04120a" strokeWidth="2" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="1.5" fill="#ffffff" />

        {/* X-Axis Timeline Labels */}
        {xLabels.map((lbl, idx) => {
          const xPos = paddingLeft + (idx / (xLabels.length - 1)) * chartW;
          return (
            <text
              key={idx}
              x={xPos}
              y={paddingTop + chartH + 20}
              textAnchor={idx === 0 ? "start" : idx === xLabels.length - 1 ? "end" : "middle"}
              fill="var(--muted)"
              fontSize="11"
              fontWeight="600"
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      {/* Floating Refined Liquid Glass Tooltip Pill (Mimics Reference Target) */}
      <div
        style={{
          position: "absolute",
          left: `${(currentPoint.x / w) * 100}%`,
          top: Math.max(currentPoint.y - 42, 2),
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
          padding: "5px 12px",
          borderRadius: "var(--r-full)",
          background: "linear-gradient(135deg, rgba(20, 52, 38, 0.92) 0%, rgba(6, 20, 13, 0.96) 100%)",
          border: "1px solid rgba(167, 243, 208, 0.32)",
          boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.8), 0 0 16px -2px rgba(16, 185, 129, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.4)",
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          display: "flex",
          alignItems: "center",
          gap: 6,
          transition: "left 0.15s ease, top 0.15s ease",
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)" }}>{tooltipLabel}</span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--mint)", fontFamily: "var(--font-mono)" }}>
          {activeAmount}
        </span>
      </div>
    </div>
  );
}

