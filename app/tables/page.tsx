"use client";

import { useState, useEffect } from "react";
import { PoolTableCard } from "@/components/tables/PoolTableCard";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import { RateManagementModal } from "@/components/modals/RateManagementModal";
import { initialTables } from "@/lib/mock/tables";
import type { ClubTable, TableStatus } from "@/lib/types";
import { Sliders } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLiveTables, formatDurationFromStart, calculateAccruedBill } from "@/lib/supabase/service";

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

  // Load real tables from Supabase on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const live = await getLiveTables();
      if (mounted) setTables(live);
    };

    loadData();

    // Subscribe to realtime updates from Supabase
    const supabase = createClient();
    const channel = supabase
      .channel("tables_page_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_tables" },
        () => {
          loadData();
        }
      )
      .subscribe();

    const handleLocalUpdate = () => loadData();
    window.addEventListener("levelup_floor_update", handleLocalUpdate);

    // Live timer tick every second for playing tables
    const interval = setInterval(() => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.status === "playing" && t.session_started_at) {
            return {
              ...t,
              elapsed: formatDurationFromStart(t.session_started_at),
              bill: calculateAccruedBill(t.session_started_at, t.hourly_rate, t.min_fee || 50),
            };
          }
          return t;
        })
      );
    }, 1000);

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
      window.removeEventListener("levelup_floor_update", handleLocalUpdate);
      clearInterval(interval);
    };
  }, [refreshKey]);

  const list = tables.filter((t) => f === "all" || t.status === f);

  // Quick stats
  const activeCount = tables.filter((t) => t.status === "playing").length;

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
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Arena Floor</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{activeCount} Active Sessions</span>
          </div>
          <h1>Live Arena Tables</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Manager Rate Config Button */}
          <button
            onClick={() => setRatesModalOpen(true)}
            className="btn"
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Sliders size={12} />
            <span>Table Rates</span>
          </button>

          {/* Clean Segmented Filter Group */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              borderRadius: "var(--r-sm)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-subtle)",
              gap: 2,
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
                  style={{
                    all: "unset",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    height: 28,
                    padding: "0 10px",
                    borderRadius: "var(--r-xs)",
                    fontSize: 11.5,
                    fontWeight: active ? 600 : 500,
                    color: active ? "var(--text-primary)" : "var(--text-muted)",
                    background: active ? "var(--bg-surface-raised)" : "transparent",
                    border: active ? "1px solid var(--border-default)" : "1px solid transparent",
                    cursor: "pointer",
                  }}
                  onClick={() => setF(x)}
                >
                  <span>{labels[x]}</span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      color: active ? "var(--accent-primary)" : "var(--text-dim)",
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
