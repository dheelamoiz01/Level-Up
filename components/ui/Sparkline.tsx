"use client";

import { useState, useId } from "react";

interface Props {
  data: number[];
  height?: number;
  timeRange?: "Today" | "7 Days" | "30 Days";
}

const timelineLabels: Record<"Today" | "7 Days" | "30 Days", string[]> = {
  Today: ["09:00", "12:00", "15:00", "18:00", "21:30", "23:30"],
  "7 Days": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  "30 Days": ["Wk 1", "Wk 2", "Wk 3", "Wk 4", "Wk 5"],
};

export function Sparkline({ data, height = 200, timeRange = "Today" }: Props) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const gradId = useId();

  if (!data.length) return <div className="muted">No telemetry recorded.</div>;

  const w = 620;
  const paddingLeft = 14;
  const paddingRight = 48;
  const paddingTop = 36;
  const paddingBottom = 26;
  const chartW = w - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;

  const max = Math.max(...data, 1);
  const min = Math.min(...data, 0);
  const range = max - min || 1;

  // Peak index
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

  // Clean Y-axis tick values
  const yTicks = [
    { label: timeRange === "30 Days" ? "80k" : timeRange === "7 Days" ? "20k" : "15k", ratio: 0 },
    { label: timeRange === "30 Days" ? "50k" : timeRange === "7 Days" ? "14k" : "10k", ratio: 0.33 },
    { label: timeRange === "30 Days" ? "25k" : timeRange === "7 Days" ? "7k" : "5k", ratio: 0.66 },
    { label: "0", ratio: 1 },
  ];

  const currentPoint = points[activeIdx] || points[peakIdx];
  const xLabels = timelineLabels[timeRange] || timelineLabels.Today;

  const activeAmount =
    timeRange === "30 Days"
      ? `₹${(currentPoint.val * 1000).toLocaleString("en-IN")}`
      : timeRange === "7 Days"
      ? `₹${(currentPoint.val * 1000).toLocaleString("en-IN")}`
      : `₹${(currentPoint.val * 100 + 150).toLocaleString("en-IN")}/hr`;

  const tooltipLabel =
    hoveredIdx !== null
      ? `Interval #${activeIdx + 1}`
      : timeRange === "Today"
      ? "Peak 21:30"
      : timeRange === "7 Days"
      ? "Saturday Peak"
      : "Week 5 Peak";

  return (
    <div
      style={{ position: "relative", width: "100%", userSelect: "none" }}
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
            <stop offset="0%" stopColor="#00C78A" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#00C78A" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Quiet background guide lines & Y-Axis Labels */}
        {yTicks.map((tick, i) => {
          const yPos = paddingTop + tick.ratio * chartH;
          return (
            <g key={i}>
              <line
                x1={paddingLeft}
                y1={yPos}
                x2={paddingLeft + chartW}
                y2={yPos}
                stroke="#15382A"
                strokeWidth="1"
                strokeDasharray={i === yTicks.length - 1 ? undefined : "3 3"}
                strokeOpacity="0.6"
              />
              <text
                x={paddingLeft + chartW + 10}
                y={yPos + 3.5}
                fill="#506B5E"
                fontSize="10"
                fontFamily="var(--font-mono)"
                fontWeight="500"
              >
                ₹{tick.label}
              </text>
            </g>
          );
        })}

        {/* Subtle area fill underneath the curve */}
        <path d={fillD} fill={`url(#area-grad-${gradId})`} />

        {/* Vertical tracking indicator */}
        <line
          x1={currentPoint.x}
          y1={currentPoint.y}
          x2={currentPoint.x}
          y2={paddingTop + chartH}
          stroke="#15382A"
          strokeWidth="1"
          strokeDasharray="2 2"
        />

        {/* Thin, crisp emerald spline stroke */}
        <path
          d={pathD}
          fill="none"
          stroke="#00C78A"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Interactive hover hit targets */}
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

        {/* Coordinate indicator on active point */}
        <circle cx={currentPoint.x} cy={currentPoint.y} r="3.5" fill="#00C78A" />
        <circle cx={currentPoint.x} cy={currentPoint.y} r="6" fill="none" stroke="#00C78A" strokeWidth="1" strokeOpacity="0.4" />

        {/* X-Axis Timeline Labels */}
        {xLabels.map((lbl, idx) => {
          const xPos = paddingLeft + (idx / (xLabels.length - 1)) * chartW;
          return (
            <text
              key={idx}
              x={xPos}
              y={paddingTop + chartH + 18}
              textAnchor={idx === 0 ? "start" : idx === xLabels.length - 1 ? "end" : "middle"}
              fill="#506B5E"
              fontSize="10.5"
              fontWeight="500"
              fontFamily="var(--font-mono)"
            >
              {lbl}
            </text>
          );
        })}
      </svg>

      {/* Understated Tooltip Pill */}
      <div
        style={{
          position: "absolute",
          left: `${(currentPoint.x / w) * 100}%`,
          top: Math.max(currentPoint.y - 32, 0),
          transform: "translateX(-50%)",
          pointerEvents: "none",
          zIndex: 10,
          whiteSpace: "nowrap",
          padding: "3px 8px",
          borderRadius: "var(--r-xs)",
          background: "#0C1D16",
          border: "1px solid #15382A",
          boxShadow: "var(--shadow-md)",
          display: "flex",
          alignItems: "center",
          gap: 6,
        }}
      >
        <span style={{ fontSize: 10.5, fontWeight: 500, color: "#8CA89A" }}>{tooltipLabel}</span>
        <span style={{ fontSize: 11, fontWeight: 600, color: "#00C78A", fontFamily: "var(--font-mono)" }}>
          {activeAmount}
        </span>
      </div>
    </div>
  );
}
