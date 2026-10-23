"use client";

import { useState, useEffect } from "react";
import { PoolTableCard } from "@/components/tables/PoolTableCard";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import { RateManagementModal } from "@/components/modals/RateManagementModal";
import { initialTables } from "@/lib/mock/tables";
import type { ClubTable, TableStatus } from "@/lib/types";
import { Sliders } from "lucide-react";
import { getLiveTables, formatDurationFromStart, calculateAccruedBill } from "@/lib/turso/service";

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

  // Load real tables from Turso on mount
  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      const live = await getLiveTables();
      if (mounted) setTables(live);
    };

    loadData();

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

    // Periodic poll every 10s for multi-device sync
    const pollInterval = setInterval(() => {
      loadData();
    }, 10000);

    return () => {
      mounted = false;
      window.removeEventListener("levelup_floor_update", handleLocalUpdate);
      clearInterval(interval);
      clearInterval(pollInterval);
    };
  }, [refreshKey]);

  const list = tables.filter((t) => f === "all" || t.status === f);

  // Quick stats
  const activeCount = tables.filter((t) => t.status === "playing").length;
  const availableCount = tables.filter((t) => t.status === "available").length;

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Fleet Status</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--accent-primary)" }}>{activeCount} Tables In Play</span>
          </div>
          <h1>Live Arena Floor</h1>
        </div>

        <div style={{ display: "flex", gap: "var(--s-2)" }}>
          <button
            onClick={() => setRatesModalOpen(true)}
            className="btn"
            style={{ gap: 6 }}
          >
            <Sliders size={14} />
            <span>Table Rates</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="filter-bar">
        {filters.map((k) => (
          <button
            key={k}
            className={`filter-tab ${f === k ? "active" : ""}`}
            onClick={() => setF(k)}
          >
            {labels[k]}
          </button>
        ))}
      </div>

      {/* Table Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {list.map((table) => (
          <PoolTableCard
            key={table.id}
            table={table}
            onSelect={(t) => setSel(t)}
          />
        ))}
      </div>

      {/* Slide-out Session Drawer */}
      <SessionDrawer
        table={sel}
        onClose={() => setSel(null)}
        onSessionUpdated={() => {
          setRefreshKey((k) => k + 1);
          setSel(null);
        }}
      />

      {/* Rate Management Modal */}
      <RateManagementModal
        open={ratesModalOpen}
        tables={tables}
        onClose={() => setRatesModalOpen(false)}
        onUpdateTableRate={(id: string, rate: number) => {
          setTables((prev) =>
            prev.map((t) => (t.id === id ? { ...t, hourly_rate: rate } : t))
          );
        }}
        onBulkUpdateRate={(kind, rate) => {
          setTables((prev) =>
            prev.map((t) => (t.kind === kind ? { ...t, hourly_rate: rate } : t))
          );
        }}
      />
    </>
  );
}
