"use client";

import { useMemo } from "react";
import type { ClubTable } from "@/lib/types";
import { formatCountdown } from "@/lib/turso/service";
import {
  Clock,
  User,
  Phone,
  AlertTriangle,
  Play,
  Sliders,
  CheckCircle2,
} from "lucide-react";

interface FloorTableCardProps {
  table: ClubTable;
  rate30m?: number;
  rate60m?: number;
  onStartSession: (table: ClubTable) => void;
  onManageSession: (table: ClubTable) => void;
  onQuickAddItems?: (table: ClubTable) => void;
}

export function FloorTableCard({
  table,
  rate30m = 200,
  rate60m = 350,
  onStartSession,
  onManageSession,
}: FloorTableCardProps) {
  const isPlaying = table.status === "playing";
  const remainingSec = table.remaining_seconds ?? 0;
  const isTimeUp = isPlaying && Boolean(table.scheduled_end_at) && remainingSec <= 0;
  const isEndingSoon = isPlaying && Boolean(table.scheduled_end_at) && remainingSec > 0 && remainingSec <= 300; // <= 5 mins

  // Theme configuration per cuesport category (calm, authentic, professional)
  const theme = useMemo(() => {
    switch (table.kind) {
      case "Royal":
        return {
          feltGradient: ["#0E261E", "#071711"],
          railColor: "#17151B",
          railBorder: "#2E2A36",
          accentColor: "#C084FC",
          badgeBg: "rgba(168, 85, 247, 0.12)",
          badgeBorder: "rgba(168, 85, 247, 0.28)",
          badgeText: "#C084FC",
        };
      case "Pool":
        return {
          feltGradient: ["#0B222E", "#05131A"],
          railColor: "#14181E",
          railBorder: "#252F3C",
          accentColor: "#60A5FA",
          badgeBg: "rgba(59, 130, 246, 0.12)",
          badgeBorder: "rgba(59, 130, 246, 0.28)",
          badgeText: "#60A5FA",
        };
      case "Snooker":
      default:
        return {
          feltGradient: ["#0C271C", "#061810"],
          railColor: "#151817",
          railBorder: "#27302B",
          accentColor: "#10B981",
          badgeBg: "rgba(16, 185, 129, 0.1)",
          badgeBorder: "rgba(16, 185, 129, 0.25)",
          badgeText: "#10B981",
        };
    }
  }, [table.kind]);

  // Precision 6 pockets
  const pockets = [
    [16, 16],
    [100, 14],
    [184, 16],
    [16, 94],
    [100, 96],
    [184, 94],
  ];

  // Booked duration calculation
  const totalDurationMins = table.duration_choice === "1h" ? 60 : 30;
  const totalDurationSec = totalDurationMins * 60;
  const progressPct = isPlaying
    ? Math.min(100, Math.max(0, ((totalDurationSec - remainingSec) / totalDurationSec) * 100))
    : 0;

  return (
    <div
      className={`table-floor-card ${
        isTimeUp
          ? "table-time-up"
          : isEndingSoon
          ? "table-ending-soon"
          : isPlaying
          ? "table-occupied"
          : "table-available"
      }`}
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        height: "100%",
        minHeight: 390,
      }}
    >
      {/* 1. Header Row: Table Name & Category on Left, Status Badge on Right */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                {table.name}
              </h3>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 7px",
                  borderRadius: "var(--r-xs)",
                  background: theme.badgeBg,
                  border: `1px solid ${theme.badgeBorder}`,
                  color: theme.badgeText,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {table.kind}
              </span>
            </div>

            {/* 2. Rates beneath title */}
            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4, fontFamily: "var(--font-mono)" }}>
              ₹{rate30m}/30m · ₹{rate60m}/1h
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isTimeUp ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(239, 68, 68, 0.15)",
                  border: "1px solid rgba(239, 68, 68, 0.35)",
                  color: "var(--danger)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AlertTriangle size={12} />
                Time Up
              </span>
            ) : isEndingSoon ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(245, 158, 11, 0.12)",
                  border: "1px solid rgba(245, 158, 11, 0.3)",
                  color: "var(--amber)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <Clock size={12} />
                &lt; 5m Left
              </span>
            ) : isPlaying ? (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(16, 185, 129, 0.1)",
                  border: "1px solid rgba(16, 185, 129, 0.25)",
                  color: "var(--accent-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)" }} />
                Occupied
              </span>
            ) : (
              <span
                style={{
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  color: "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--text-muted)" }} />
                Available
              </span>
            )}
          </div>
        </div>

        {/* 3. High-Quality Cuesport Table Illustration with Consistent Aspect Ratio */}
        <div
          style={{
            position: "relative",
            width: "100%",
            aspectRatio: "200 / 110",
            borderRadius: "var(--r-sm)",
            overflow: "hidden",
            marginBottom: 14,
            border: isPlaying ? "1px solid rgba(48, 53, 58, 0.9)" : "1px solid var(--border-default)",
            background: "#0D0F11",
          }}
        >
          {/* Subtle overhead canopy lamp glow cone */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "22%",
              right: "22%",
              height: 22,
              background: isPlaying
                ? "radial-gradient(ellipse at top, rgba(255, 255, 255, 0.12) 0%, transparent 80%)"
                : "radial-gradient(ellipse at top, rgba(255, 255, 255, 0.05) 0%, transparent 80%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          <svg viewBox="0 0 200 110" width="100%" height="100%" aria-hidden style={{ display: "block" }}>
            <defs>
              <linearGradient id={`felt-grad-${table.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.feltGradient[0]} />
                <stop offset="100%" stopColor={theme.feltGradient[1]} />
              </linearGradient>
            </defs>

            {/* Polished Mahogany / Slate Cushion Outer Rail */}
            <rect
              x="2"
              y="2"
              width="196"
              height="106"
              rx="6"
              fill={theme.railColor}
              stroke={theme.railBorder}
              strokeWidth="1.2"
            />

            {/* Corner Pocket Caps */}
            <rect x="3" y="3" width="14" height="14" rx="2.5" fill="#202428" stroke="#3A4048" strokeWidth="0.5" />
            <rect x="183" y="3" width="14" height="14" rx="2.5" fill="#202428" stroke="#3A4048" strokeWidth="0.5" />
            <rect x="3" y="93" width="14" height="14" rx="2.5" fill="#202428" stroke="#3A4048" strokeWidth="0.5" />
            <rect x="183" y="93" width="14" height="14" rx="2.5" fill="#202428" stroke="#3A4048" strokeWidth="0.5" />

            {/* Tournament Baize Felt Bed */}
            <rect
              x="12"
              y="12"
              width="176"
              height="86"
              rx="3.5"
              fill={`url(#felt-grad-${table.id})`}
              stroke="rgba(0, 0, 0, 0.4)"
              strokeWidth="0.75"
            />

            {/* Baulk Line and "D" for Snooker & Royal */}
            {table.kind !== "Pool" && (
              <>
                <line
                  x1="54"
                  y1="13"
                  x2="54"
                  y2="97"
                  stroke="rgba(255, 255, 255, 0.14)"
                  strokeWidth="0.7"
                  strokeDasharray="2 2"
                />
                <path
                  d="M 54 40 A 15 15 0 0 0 54 70"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.14)"
                  strokeWidth="0.7"
                />
              </>
            )}

            {/* 6 Precision Pockets */}
            {pockets.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r="4.8" fill="#0B0D0F" stroke="#1F2327" strokeWidth="0.6" />
            ))}

            {/* Active Match: Ball Cluster On Felt */}
            {isPlaying && (
              <>
                {table.kind === "Pool" ? (
                  /* American 9-Ball Rack */
                  <g>
                    <circle cx="130" cy="55" r="3.2" fill="#EAB308" />
                    <circle cx="136" cy="51.5" r="3.2" fill="#3B82F6" />
                    <circle cx="136" cy="58.5" r="3.2" fill="#EF4444" />
                    <circle cx="142" cy="48" r="3.2" fill="#A855F7" />
                    <circle cx="142" cy="55" r="3.2" fill="#111827" />
                    <circle cx="142" cy="62" r="3.2" fill="#F97316" />
                    <circle cx="50" cy="55" r="3.2" fill="#F3F4F6" />
                  </g>
                ) : (
                  /* Championship Snooker Pack */
                  <g>
                    <circle cx="134" cy="55" r="3" fill="#DC2626" />
                    <circle cx="139" cy="52" r="3" fill="#DC2626" />
                    <circle cx="139" cy="58" r="3" fill="#DC2626" />
                    <circle cx="144" cy="49" r="3" fill="#DC2626" />
                    <circle cx="144" cy="55" r="3" fill="#DC2626" />
                    <circle cx="144" cy="61" r="3" fill="#DC2626" />
                    <circle cx="100" cy="55" r="3" fill="#2563EB" />
                    <circle cx="160" cy="55" r="3" fill="#111827" />
                    <circle cx="120" cy="55" r="3" fill="#DB2777" />
                    <circle cx="48" cy="55" r="3" fill="#F3F4F6" />
                  </g>
                )}
              </>
            )}
          </svg>

          {/* Countdown Pill Overlay while Playing */}
          {isPlaying && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 10,
                right: 10,
                background: "rgba(17, 19, 21, 0.88)",
                backdropFilter: "blur(4px)",
                border: isTimeUp
                  ? "1px solid rgba(239, 68, 68, 0.4)"
                  : "1px solid rgba(48, 53, 58, 0.8)",
                borderRadius: "var(--r-xs)",
                padding: "4px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
                <Clock size={11} style={{ color: isTimeUp ? "var(--danger)" : "var(--text-secondary)" }} />
                <span>Time:</span>
              </div>

              <div
                style={{
                  fontSize: 12.5,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: isTimeUp ? "var(--danger)" : isEndingSoon ? "var(--amber)" : "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isTimeUp ? "00:00 (Expired)" : formatCountdown(remainingSec)}
              </div>
            </div>
          )}
        </div>

        {/* 4. Compact Status & Session Information Area (Exact 74px Equal Height) */}
        <div
          style={{
            background: "var(--bg-surface-inset)",
            padding: "10px 12px",
            borderRadius: "var(--r-xs)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 14,
            height: 74,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
          }}
        >
          {isPlaying ? (
            <div>
              {/* Player Name & Phone */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                  <User size={13} style={{ color: "var(--accent-primary)", flexShrink: 0 }} />
                  <span style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {table.player}
                  </span>
                </div>
                {table.phone && (
                  <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)", flexShrink: 0 }}>
                    <Phone size={10} />
                    <span>{table.phone}</span>
                  </div>
                )}
              </div>

              {/* Duration Booked & Accrued Bill */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 11.5, color: "var(--text-secondary)" }}>
                <span>Booked: {table.duration_choice || "30m"}</span>
                <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  Bill: ₹{table.bill || 0}
                </span>
              </div>

              {/* Progress Line */}
              <div
                style={{
                  width: "100%",
                  height: 3,
                  background: "rgba(255, 255, 255, 0.06)",
                  borderRadius: 2,
                  marginTop: 6,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${progressPct}%`,
                    height: "100%",
                    background: isTimeUp ? "var(--danger)" : isEndingSoon ? "var(--amber)" : "var(--accent-primary)",
                    transition: "width 1s linear",
                  }}
                />
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 3, textAlign: "center" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>
                <CheckCircle2 size={13} style={{ color: "var(--accent-primary)" }} />
                <span>Ready for Play</span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Sanitized &amp; brushed · 30m or 1h slots
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. Full-Width Primary Action Button Pinned to Bottom */}
      <div>
        {isPlaying ? (
          <button
            onClick={() => onManageSession(table)}
            className="btn"
            style={{
              width: "100%",
              height: 38,
              fontSize: 12.5,
              fontWeight: 600,
              gap: 6,
              background: isTimeUp ? "rgba(239, 68, 68, 0.15)" : "var(--bg-surface-raised)",
              borderColor: isTimeUp ? "rgba(239, 68, 68, 0.4)" : "var(--border-default)",
              color: isTimeUp ? "var(--danger)" : "var(--text-primary)",
            }}
          >
            <Sliders size={14} />
            <span>{isTimeUp ? "Collect Payment" : "Manage Session"}</span>
          </button>
        ) : (
          <button
            onClick={() => onStartSession(table)}
            className="btn btn-primary"
            style={{
              width: "100%",
              height: 38,
              fontSize: 12.5,
              fontWeight: 600,
              gap: 6,
            }}
          >
            <Play size={13} fill="currentColor" />
            <span>Start Session</span>
          </button>
        )}
      </div>
    </div>
  );
}
