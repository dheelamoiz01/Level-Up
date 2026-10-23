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
  Plus,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Sparkles,
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
  onQuickAddItems,
}: FloorTableCardProps) {
  const isPlaying = table.status === "playing";
  const remainingSec = table.remaining_seconds ?? 0;
  const isTimeUp = isPlaying && Boolean(table.scheduled_end_at) && remainingSec <= 0;
  const isEndingSoon = isPlaying && Boolean(table.scheduled_end_at) && remainingSec > 0 && remainingSec <= 300; // <= 5 mins

  // Baize color and theme based on table kind
  const theme = useMemo(() => {
    switch (table.kind) {
      case "Royal":
        return {
          feltGradient: ["#0E2A1F", "#061A12"],
          railColor: "#120B1C",
          railBorder: "#2E1A47",
          accentColor: "#C084FC",
          badgeBg: "rgba(168, 85, 247, 0.12)",
          badgeBorder: "rgba(168, 85, 247, 0.3)",
          glowColor: "rgba(192, 132, 252, 0.25)",
        };
      case "Pool":
        return {
          feltGradient: ["#0A2624", "#041517"],
          railColor: "#0B151F",
          railBorder: "#1A3247",
          accentColor: "#60A5FA",
          badgeBg: "rgba(59, 130, 246, 0.12)",
          badgeBorder: "rgba(59, 130, 246, 0.3)",
          glowColor: "rgba(96, 165, 250, 0.25)",
        };
      case "Snooker":
      default:
        return {
          feltGradient: ["#0B2B1E", "#051A10"],
          railColor: "#08150F",
          railBorder: "#15382A",
          accentColor: "#00C78A",
          badgeBg: "rgba(0, 199, 138, 0.1)",
          badgeBorder: "rgba(0, 199, 138, 0.25)",
          glowColor: "rgba(0, 199, 138, 0.25)",
        };
    }
  }, [table.kind]);

  // Pockets layout for SVG table
  const pockets = [
    [16, 16],
    [100, 14],
    [184, 16],
    [16, 94],
    [100, 96],
    [184, 94],
  ];

  // Duration in minutes
  const totalDurationMins = table.duration_choice === "1h" ? 60 : 30;
  const totalDurationSec = totalDurationMins * 60;
  const progressPct = isPlaying
    ? Math.min(100, Math.max(0, ((totalDurationSec - remainingSec) / totalDurationSec) * 100))
    : 0;

  return (
    <div
      className={`glass-card table-floor-card ${isPlaying ? "table-occupied" : "table-available"} ${
        isTimeUp ? "table-time-up" : ""
      }`}
      style={{
        padding: "18px 20px",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        border: isTimeUp
          ? "1px solid rgba(239, 68, 68, 0.6)"
          : isEndingSoon
          ? "1px solid rgba(245, 158, 11, 0.6)"
          : isPlaying
          ? "1px solid rgba(0, 199, 138, 0.35)"
          : "1px solid var(--border-default)",
        boxShadow: isTimeUp
          ? "0 0 20px rgba(239, 68, 68, 0.15)"
          : isEndingSoon
          ? "0 0 16px rgba(245, 158, 11, 0.12)"
          : !isPlaying
          ? "0 4px 16px rgba(0, 0, 0, 0.4)"
          : undefined,
        position: "relative",
        transition: "all 0.25s ease",
      }}
    >
      {/* Top Header: Table Number & Name, Badge, Rates */}
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
                  color: theme.accentColor,
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                {table.kind}
              </span>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Standard: ₹{rate30m}/30m · ₹{rate60m}/1h
            </div>
          </div>

          {/* Status Badge */}
          <div>
            {isTimeUp ? (
              <span
                className="badge pulse-danger"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "3px 8px",
                  background: "rgba(239, 68, 68, 0.15)",
                  borderColor: "rgba(239, 68, 68, 0.4)",
                  color: "var(--danger)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <AlertTriangle size={12} />
                TIME UP
              </span>
            ) : isEndingSoon ? (
              <span
                className="badge"
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  padding: "3px 8px",
                  background: "rgba(245, 158, 11, 0.15)",
                  borderColor: "rgba(245, 158, 11, 0.4)",
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
                className="badge"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "3px 8px",
                  background: "rgba(0, 199, 138, 0.1)",
                  borderColor: "rgba(0, 199, 138, 0.3)",
                  color: "var(--accent-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent-primary)",
                    boxShadow: "0 0 6px var(--accent-primary)",
                  }}
                />
                Occupied
              </span>
            ) : (
              <span
                className="badge"
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "3px 8px",
                  background: "var(--bg-surface-inset)",
                  borderColor: "var(--border-subtle)",
                  color: "var(--text-muted)",
                }}
              >
                Available
              </span>
            )}
          </div>
        </div>

        {/* Illustrated Cuesport Table with Canopy Light & Ball Cluster */}
        <div
          style={{
            position: "relative",
            width: "100%",
            borderRadius: "var(--r-sm)",
            overflow: "hidden",
            marginBottom: 14,
            border: isPlaying ? "1px solid rgba(0, 199, 138, 0.2)" : "1px solid var(--border-subtle)",
          }}
        >
          {/* Subtle overhead canopy lamp glow cone */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: "20%",
              right: "20%",
              height: 24,
              background: isPlaying
                ? "radial-gradient(ellipse at top, rgba(0, 199, 138, 0.25) 0%, transparent 80%)"
                : "radial-gradient(ellipse at top, rgba(255, 255, 255, 0.08) 0%, transparent 80%)",
              pointerEvents: "none",
              zIndex: 2,
            }}
          />

          <svg viewBox="0 0 200 110" width="100%" aria-hidden style={{ display: "block" }}>
            <defs>
              <linearGradient id={`felt-grad-${table.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={theme.feltGradient[0]} />
                <stop offset="100%" stopColor={theme.feltGradient[1]} />
              </linearGradient>
            </defs>

            {/* Solid Mahogany/Slate Cushion Outer Rail */}
            <rect
              x="2"
              y="2"
              width="196"
              height="106"
              rx="7"
              fill={theme.railColor}
              stroke={theme.railBorder}
              strokeWidth="1.5"
            />

            {/* Corner Pocket Brass / Chrome Caps */}
            <rect x="3" y="3" width="16" height="16" rx="3" fill="#1C1F1D" stroke="#374151" strokeWidth="0.5" />
            <rect x="181" y="3" width="16" height="16" rx="3" fill="#1C1F1D" stroke="#374151" strokeWidth="0.5" />
            <rect x="3" y="91" width="16" height="16" rx="3" fill="#1C1F1D" stroke="#374151" strokeWidth="0.5" />
            <rect x="181" y="91" width="16" height="16" rx="3" fill="#1C1F1D" stroke="#374151" strokeWidth="0.5" />

            {/* Tournament Baize Felt Bed */}
            <rect
              x="12"
              y="12"
              width="176"
              height="86"
              rx="4"
              fill={`url(#felt-grad-${table.id})`}
              stroke="rgba(0, 0, 0, 0.5)"
              strokeWidth="1"
            />

            {/* Baulk Line and "D" for Snooker & Royal */}
            {table.kind !== "Pool" && (
              <>
                <line
                  x1="54"
                  y1="13"
                  x2="54"
                  y2="97"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="0.75"
                  strokeDasharray="2 2"
                />
                <path
                  d="M 54 40 A 15 15 0 0 0 54 70"
                  fill="none"
                  stroke="rgba(255, 255, 255, 0.12)"
                  strokeWidth="0.75"
                />
              </>
            )}

            {/* 6 Precision Pockets */}
            {pockets.map(([px, py], i) => (
              <circle key={i} cx={px} cy={py} r="5" fill="#010403" stroke="#12251D" strokeWidth="0.75" />
            ))}

            {/* Active Match: Ball Cluster On Felt */}
            {isPlaying && (
              <>
                {table.kind === "Pool" ? (
                  /* American 9-Ball / 8-Ball Triangle Rack */
                  <g>
                    <circle cx="130" cy="55" r="3.2" fill="#EAB308" />
                    <circle cx="136" cy="51.5" r="3.2" fill="#3B82F6" />
                    <circle cx="136" cy="58.5" r="3.2" fill="#EF4444" />
                    <circle cx="142" cy="48" r="3.2" fill="#A855F7" />
                    <circle cx="142" cy="55" r="3.2" fill="#0F172A" />
                    <circle cx="142" cy="62" r="3.2" fill="#F97316" />
                    <circle cx="50" cy="55" r="3.2" fill="#FFFFFF" />
                  </g>
                ) : (
                  /* Championship Snooker Pack */
                  <g>
                    <circle cx="134" cy="55" r="3" fill="#EF4444" />
                    <circle cx="139" cy="52" r="3" fill="#EF4444" />
                    <circle cx="139" cy="58" r="3" fill="#EF4444" />
                    <circle cx="144" cy="49" r="3" fill="#EF4444" />
                    <circle cx="144" cy="55" r="3" fill="#EF4444" />
                    <circle cx="144" cy="61" r="3" fill="#EF4444" />
                    <circle cx="100" cy="55" r="3" fill="#3B82F6" />
                    <circle cx="160" cy="55" r="3.2" fill="#0F172A" />
                    <circle cx="120" cy="55" r="3" fill="#EC4899" />
                    <circle cx="48" cy="55" r="3.2" fill="#FFFFFF" />
                  </g>
                )}
              </>
            )}
          </svg>

          {/* Countdown Overlay Badge while Playing */}
          {isPlaying && (
            <div
              style={{
                position: "absolute",
                bottom: 8,
                left: 10,
                right: 10,
                background: "rgba(3, 8, 6, 0.88)",
                backdropFilter: "blur(4px)",
                border: isTimeUp
                  ? "1px solid rgba(239, 68, 68, 0.4)"
                  : "1px solid rgba(21, 56, 42, 0.7)",
                borderRadius: "var(--r-xs)",
                padding: "4px 8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                zIndex: 3,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11, color: "var(--text-secondary)" }}>
                <Clock size={11} style={{ color: isTimeUp ? "var(--danger)" : "var(--accent-primary)" }} />
                <span>Remaining:</span>
              </div>

              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                  color: isTimeUp ? "var(--danger)" : isEndingSoon ? "var(--amber)" : "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: 4,
                }}
              >
                {isTimeUp ? "00:00 (EXPIRED)" : formatCountdown(remainingSec)}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Match Information or Table Idle Spec */}
        {isPlaying ? (
          <div
            style={{
              background: "var(--bg-surface-inset)",
              padding: "10px 12px",
              borderRadius: "var(--r-xs)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 14,
              fontSize: 12,
            }}
          >
            {/* Player Name & Phone */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <User size={13} style={{ color: "var(--accent-primary)" }} />
                <span style={{ fontWeight: 700, color: "var(--text-primary)" }}>{table.player}</span>
              </div>
              {table.phone && (
                <div style={{ display: "flex", alignItems: "center", gap: 4, color: "var(--text-muted)", fontSize: 11, fontFamily: "var(--font-mono)" }}>
                  <Phone size={10} />
                  <span>{table.phone}</span>
                </div>
              )}
            </div>

            {/* Duration Booked & Accrued Bill */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: "var(--text-secondary)" }}>
              <span>Booked: {table.duration_choice || "30m"}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                Bill: <strong style={{ color: "var(--accent-primary)" }}>₹{table.bill || 0}</strong>
              </span>
            </div>

            {/* Progress Bar of booked time */}
            <div
              style={{
                width: "100%",
                height: 4,
                background: "rgba(255, 255, 255, 0.08)",
                borderRadius: 2,
                marginTop: 8,
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
          <div
            style={{
              background: "var(--bg-surface-inset)",
              padding: "10px 12px",
              borderRadius: "var(--r-xs)",
              border: "1px solid var(--border-subtle)",
              marginBottom: 14,
              fontSize: 11.5,
              color: "var(--text-muted)",
              textAlign: "center",
            }}
          >
            Table is sanitized, brushed, and ready for players.
          </div>
        )}
      </div>

      {/* Prominent Action Buttons */}
      <div>
        {isPlaying ? (
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => onManageSession(table)}
              className="btn btn-primary"
              style={{
                flex: 1,
                height: 38,
                fontSize: 12.5,
                fontWeight: 700,
                gap: 6,
                background: isTimeUp ? "var(--danger)" : undefined,
                borderColor: isTimeUp ? "var(--danger)" : undefined,
              }}
            >
              <Sliders size={14} />
              <span>{isTimeUp ? "Action Required (Bill)" : "Manage / Collect"}</span>
            </button>

            {onQuickAddItems && (
              <button
                onClick={() => onQuickAddItems(table)}
                className="btn"
                style={{ height: 38, padding: "0 10px", gap: 4 }}
                title="Add snacks & drinks"
              >
                <ShoppingBag size={14} />
                <Plus size={10} strokeWidth={3} />
              </button>
            )}
          </div>
        ) : (
          <button
            onClick={() => onStartSession(table)}
            className="btn btn-primary"
            style={{
              width: "100%",
              height: 38,
              fontSize: 13,
              fontWeight: 700,
              gap: 6,
              background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
            }}
          >
            <Play size={14} fill="currentColor" />
            <span>Start Session</span>
          </button>
        )}
      </div>
    </div>
  );
}
