import type { ClubTable } from "@/lib/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Clock, User, Banknote } from "lucide-react";

const felt: Record<ClubTable["status"], [string, string]> = {
  available: ["#155e3b", "#0a3822"],
  playing: ["#10b981", "#064e3b"],
  paused: ["#b45309", "#78350f"],
  maintenance: ["#334155", "#1e293b"],
};

/** Presentational only. Wire `onSelect` and real session data later. */
export function PoolTableCard({
  table,
  onSelect,
}: {
  table: ClubTable;
  onSelect?: (t: ClubTable) => void;
}) {
  const [a, b] = felt[table.status];
  const id = `felt-grad-${table.id}`;
  const pockets = [
    [16, 16],
    [100, 12],
    [184, 16],
    [16, 94],
    [100, 98],
    [184, 94],
  ];

  return (
    <button
      className="glass-card glass-card-raised table-card"
      data-s={table.status}
      onClick={() => onSelect?.(table)}
      aria-label={`Table ${table.number}, ${table.status}`}
    >
      <div className="row">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 800,
              color: "var(--text-hero)",
              letterSpacing: "-0.01em",
            }}
          >
            {table.name || `${table.kind} #${table.number}`}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: "var(--muted)",
              background: "rgba(255, 255, 255, 0.04)",
              padding: "2px 7px",
              borderRadius: "var(--r-xs)",
              border: "1px solid var(--glass-border-subtle)",
              fontFamily: "var(--font-mono)",
            }}
          >
            ₹{table.hourly_rate ?? (table as any).rate}/hr
          </span>
        </div>
        <StatusBadge status={table.status} />
      </div>

      <div style={{ padding: "4px 0", width: "100%" }}>
        <svg viewBox="0 0 200 110" width="100%" aria-hidden style={{ borderRadius: 12, overflow: "hidden" }}>
          <defs>
            <radialGradient id={id} cx=".5" cy=".4" r=".85">
              <stop offset="0%" stopColor={a} />
              <stop offset="100%" stopColor={b} />
            </radialGradient>
            <linearGradient id="cushion-gloss" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="rgba(255, 255, 255, 0.15)" />
              <stop offset="100%" stopColor="rgba(0, 0, 0, 0.4)" />
            </linearGradient>
          </defs>

          {/* Deep slate & wood table rail */}
          <rect x="2" y="2" width="196" height="106" rx="14" fill="#0d1410" stroke="#1d2d24" strokeWidth="1.5" />
          <rect x="2" y="2" width="196" height="106" rx="14" fill="url(#cushion-gloss)" />

          {/* Emerald playing surface */}
          <rect
            x="12"
            y="12"
            width="176"
            height="86"
            rx="8"
            fill={`url(#${id})`}
            className={table.status === "playing" ? "felt-pulse" : ""}
          />

          {/* Baulk line */}
          <line x1="60" y1="14" x2="60" y2="96" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" strokeDasharray="3 2" />

          {/* Table pockets */}
          {pockets.map(([x, y], i) => (
            <circle key={i} cx={x} cy={y} r="6.5" fill="#020604" stroke="#14241b" strokeWidth="1" />
          ))}

          {/* Active balls on table if playing */}
          {table.status === "playing" && (
            <>
              {/* Cue ball with subtle drop shadow */}
              <circle cx="50" cy="55" r="3.75" fill="#f8fafc" />
              {/* Object balls */}
              <circle cx="120" cy="55" r="3.75" fill="#ef4444" />
              <circle cx="128" cy="50.5" r="3.75" fill="#f59e0b" />
              <circle cx="128" cy="59.5" r="3.75" fill="#3b82f6" />
              <circle cx="136" cy="46" r="3.75" fill="#10b981" />
              <circle cx="136" cy="55" r="3.75" fill="#1e293b" />
              <circle cx="136" cy="64" r="3.75" fill="#a855f7" />
            </>
          )}

          {table.status === "available" && (
            <circle cx="128" cy="55" r="14" fill="rgba(92, 242, 176, 0.08)" stroke="rgba(92, 242, 176, 0.2)" strokeDasharray="3 3" />
          )}
        </svg>
      </div>

      <div className="stats">
        <div>
          <div className="eyebrow" style={{ gap: 4 }}>
            <User size={10} />
            Player
          </div>
          <span style={{ fontWeight: 600, color: table.player ? "var(--text-hero)" : "var(--muted)" }}>
            {table.player ?? "None"}
          </span>
        </div>

        <div>
          <div className="eyebrow" style={{ gap: 4 }}>
            <Clock size={10} />
            Duration
          </div>
          <span style={{ fontWeight: 600, color: "var(--text)" }}>
            {table.elapsed ?? "00:00"}
          </span>
        </div>

        <div>
          <div className="eyebrow" style={{ gap: 4 }}>
            <Banknote size={10} />
            Current Bill
          </div>
          <span style={{ fontWeight: 700, color: table.bill != null ? "var(--mint)" : "var(--text-secondary)" }}>
            {table.bill != null ? `₹${table.bill}` : `₹0`}
          </span>
        </div>
      </div>
    </button>
  );
}
