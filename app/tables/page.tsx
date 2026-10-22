"use client";

import { useState } from "react";
import { PoolTableCard } from "@/components/tables/PoolTableCard";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import { RateManagementModal } from "@/components/modals/RateManagementModal";
import { initialTables } from "@/lib/mock/tables";
import type { ClubTable, TableStatus } from "@/lib/types";
import { Sliders, RefreshCw, CircleDot } from "lucide-react";

const filters: ("all" | TableStatus)[] = [
  "all",
  "playing",
  "available",
  "paused",
  "maintenance",
];

const labels: Record<"all" | TableStatus, string> = {
  all: "All 5 Tables",
  playing: "Playing",
  available: "Available",
  paused: "Paused",
  maintenance: "Maintenance",
};

export default function LiveTables() {
  const [tables, setTables] = useState<ClubTable[]>(initialTables);
  const [f, setF] = useState<"all" | TableStatus>("all");
  const [sel, setSel] = useState<ClubTable | null>(null);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const list = tables.filter((t) => f === "all" || t.status === f);

  // Quick stats
  const activeCount = tables.filter((t) => t.status === "playing").length;
  const availableCount = tables.filter((t) => t.status === "available").length;

  const handleUpdateTableRate = (tableId: string, newRate: number) => {
    setTables((prev) =>
      prev.map((t) => (t.id === tableId ? { ...t, hourly_rate: newRate } : t))
    );
  };

  const handleBulkUpdateRate = (kind: "Royal" | "Snooker" | "Pool", newRate: number) => {
    setTables((prev) =>
      prev.map((t) => (t.kind === kind ? { ...t, hourly_rate: newRate } : t))
    );
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Floor Status</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--muted)" }}>{activeCount} Active / 5 Tables</span>
          </div>
          <h1>Live Arena Tables</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Manager Rate Config Button */}
          <button
            onClick={() => setRatesModalOpen(true)}
            className="btn"
            style={{
              height: 34,
              padding: "0 14px",
              fontSize: 12,
              fontWeight: 700,
              gap: 6,
              background: "rgba(0, 230, 118, 0.08)",
              border: "1px solid rgba(0, 230, 118, 0.25)",
              color: "var(--mint)",
            }}
          >
            <Sliders size={13} strokeWidth={2.2} />
            <span>Edit Rates</span>
          </button>

          {/* Filter Capsule Group */}
          <div
            className="glass-card-inset"
            style={{
              display: "inline-flex",
              padding: "4px",
              borderRadius: "var(--r-full)",
              gap: 4,
              flexWrap: "wrap",
            }}
          >
            {filters.map((x) => {
              const count =
                x === "all" ? tables.length : tables.filter((t) => t.status === x).length;
              const active = f === x;
              return (
                <button
                  key={x}
                  className={`btn ${active ? "btn-primary" : ""}`}
                  style={{
                    height: 34,
                    padding: "0 13px",
                    fontSize: 12,
                    fontWeight: active ? 700 : 500,
                    boxShadow: active ? "var(--shadow-emerald-pill)" : "none",
                  }}
                  onClick={() => setF(x)}
                >
                  <span>{labels[x]}</span>
                  <span
                    style={{
                      fontSize: 11,
                      opacity: active ? 0.9 : 0.6,
                      fontFamily: "var(--font-mono)",
                      background: active ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.08)",
                      padding: "1px 6px",
                      borderRadius: "var(--r-full)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Grid of 5 table cards */}
      <div className="tables-grid" key={refreshKey}>
        {list.map((t) => (
          <PoolTableCard key={t.id} table={t} onSelect={setSel} />
        ))}
      </div>

      <SessionDrawer
        key={sel?.id ?? "none"}
        table={sel}
        onClose={() => setSel(null)}
        onSessionUpdated={() => setRefreshKey((k) => k + 1)}
      />

      <RateManagementModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        tables={tables}
        onUpdateTableRate={handleUpdateTableRate}
        onBulkUpdateRate={handleBulkUpdateRate}
      />
    </>
  );
}
