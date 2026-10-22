import type { ClubTable } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Clock, User } from "lucide-react";

const feltSurface: Record<ClubTable["status"], [string, string]> = {
  available: ["#071A12", "#040F0A"],
  playing: ["#0B2B1E", "#061A12"],
  paused: ["#1C1608", "#120E05"],
  maintenance: ["#141E19", "#0C1310"],
};

export function PoolTableCard({
  table,
  onSelect,
}: {
  table: ClubTable;
  onSelect?: (t: ClubTable) => void;
}) {
  const [f1, f2] = feltSurface[table.status];
  const id = `felt-grad-${table.id}`;
  const pockets = [
    [16, 16],
    [100, 13],
    [184, 16],
    [16, 94],
    [100, 97],
    [184, 94],
  ];

  return (
    <button
      className="table-card"
      onClick={() => onSelect?.(table)}
      aria-label={`${table.name}, ${table.status}`}
    >
      <div className="row">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: "var(--text-primary)",
              letterSpacing: "-0.01em",
            }}
          >
            {table.name || `${table.kind} #${table.number}`}
          </span>
          <span
            style={{
              fontSize: 10.5,
              fontWeight: 600,
              color: "var(--text-muted)",
              background: "var(--bg-surface-inset)",
              padding: "1px 6px",
              borderRadius: "var(--r-xs)",
              border: "1px solid var(--border-subtle)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ₹{table.hourly_rate ?? (table as any).rate}/hr
          </span>
        </div>
        <StatusBadge status={table.status} />
      </div>

      {/* Architectural Cue Table Surface */}
      <div style={{ padding: "2px 0", width: "100%" }}>
        <svg viewBox="0 0 200 110" width="100%" aria-hidden style={{ borderRadius: 6, overflow: "hidden" }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={f1} />
              <stop offset="100%" stopColor={f2} />
            </linearGradient>
          </defs>

          {/* Deep slate cushion rail */}
          <rect x="2" y="2" width="196" height="106" rx="6" fill="#050E0A" stroke="#15382A" strokeWidth="1" />

          {/* Tournament Felt Surface */}
          <rect
            x="12"
            y="12"
            width="176"
            height="86"
            rx="4"
            fill={`url(#${id})`}
            stroke="#0C261B"
            strokeWidth="0.75"
          />

          {/* Subtle baulk line */}
          <line x1="56" y1="13" x2="56" y2="97" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.75" strokeDasharray="3 2" />

          {/* Table pockets */}
          {pockets.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="5.5" fill="#020604" stroke="#0E2319" strokeWidth="0.75" />
          ))}

          {/* Active balls when playing */}
          {table.status === "playing" && (
            <>
              <circle cx="48" cy="55" r="3.2" fill="#F8FAFC" />
              <circle cx="118" cy="55" r="3.2" fill="#EF4444" />
              <circle cx="125" cy="51" r="3.2" fill="#F59E0B" />
              <circle cx="125" cy="59" r="3.2" fill="#3B82F6" />
              <circle cx="132" cy="47" r="3.2" fill="#10B981" />
              <circle cx="132" cy="55" r="3.2" fill="#1E293B" />
              <circle cx="132" cy="63" r="3.2" fill="#A855F7" />
            </>
          )}
        </svg>
      </div>

      <div className="stats">
        <div>
          <div className="eyebrow" style={{ gap: 4, marginBottom: 2 }}>
            <User size={10} />
            <span>Player</span>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: table.player ? "var(--text-primary)" : "var(--text-muted)" }}>
            {table.player ?? "None"}
          </span>
        </div>

        <div>
          <div className="eyebrow" style={{ gap: 4, marginBottom: 2 }}>
            <Clock size={10} />
            <span>Duration</span>
          </div>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: table.elapsed ? "var(--text-primary)" : "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
            {table.elapsed ?? "00:00:00"}
          </span>
        </div>
      </div>
    </button>
  );
}
