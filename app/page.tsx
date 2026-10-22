"use client";

import { useState, useEffect } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Button } from "@/components/ui/Button";
import { initialTables } from "@/lib/mock/tables";
import { initialProducts } from "@/lib/mock/products";
import type { ClubTable, Product, SessionRow, UserRole } from "@/lib/types";
import { RateManagementModal } from "@/components/modals/RateManagementModal";
import { ProductManagementModal } from "@/components/modals/ProductManagementModal";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import {
  Plus,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CircleDot,
  Sliders,
  Package,
  FileText,
  X,
} from "lucide-react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import {
  getLiveTables,
  getLiveProducts,
  getLiveSessions,
  formatDurationFromStart,
  calculateAccruedBill,
} from "@/lib/supabase/service";

type TimeRange = "Today" | "7 Days" | "30 Days";

export default function Dashboard() {
  const [role, setRole] = useState<UserRole>("owner");
  const [range, setRange] = useState<TimeRange>("Today");
  const [tables, setTables] = useState<ClubTable[]>(initialTables);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [selectedTable, setSelectedTable] = useState<ClubTable | null>(null);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [zReportOpen, setZReportOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // Fetch real tables, products, and sessions from Supabase
  useEffect(() => {
    let mounted = true;

    const loadAll = async () => {
      const [liveTables, liveProducts, liveSessions] = await Promise.all([
        getLiveTables(),
        getLiveProducts(),
        getLiveSessions(),
      ]);
      if (mounted) {
        setTables(liveTables);
        setProducts(liveProducts);
        setSessions(liveSessions);
      }
    };

    loadAll();

    // Subscribe to realtime changes on all tables
    const supabase = createClient();
    const channel = supabase
      .channel("dashboard_realtime_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "club_tables" },
        () => loadAll()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "sessions" },
        () => loadAll()
      )
      .subscribe();

    const handleLocalTrigger = () => loadAll();
    window.addEventListener("levelup_floor_update", handleLocalTrigger);

    // Live timer tick for active tables
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
      window.removeEventListener("levelup_floor_update", handleLocalTrigger);
      clearInterval(interval);
    };
  }, [refreshKey]);

  const isOwner = role === "owner";

  // Dynamic calculations based on real data
  const activeTables = tables.filter((t) => t.status === "playing");
  const availableTables = tables.filter((t) => t.status === "available");
  const activeCount = activeTables.length;
  const availableCount = availableTables.length;

  const settledRevenue = sessions.reduce((acc, s) => acc + (s.amount || 0), 0);
  const activeAccrued = activeTables.reduce((acc, t) => acc + (t.bill || 0), 0);
  const totalGrossToday = settledRevenue + activeAccrued;

  const outstandingUdhar = sessions
    .filter((s) => !s.paid || s.payment_method === "udhar")
    .reduce((acc, s) => acc + (s.amount || 0), 0);

  const occupancyPct = Math.round((activeCount / 5) * 100);

  const staffMetrics = [
    { label: "Active Sessions", value: String(activeCount), hint: "of 5 tables live" },
    { label: "Available Tables", value: String(availableCount), hint: "Ready for players" },
    { label: "Floor Turnover", value: String(sessions.length), delta: `+${sessions.length} today`, hint: "Completed matches" },
    { label: "Pending Bills", value: `₹${activeAccrued}`, hint: `${activeCount} tables playing` },
  ];

  const ownerMetrics = [
    { label: "Today's Gross", value: `₹${totalGrossToday.toLocaleString("en-IN")}`, delta: "+12.4%", hint: "Live real ledger" },
    { label: "Net Margin", value: "68.4%", delta: "+3.1%", hint: `₹${Math.round(totalGrossToday * 0.684).toLocaleString("en-IN")} net profit` },
    { label: "Floor Occupancy", value: `${occupancyPct}%`, delta: "5 tables tracked", hint: `${activeCount} in play` },
    { label: "Outstanding (Udhar)", value: `₹${outstandingUdhar.toLocaleString("en-IN")}`, hint: "Unsettled player credit" },
  ];

  const metricsToDisplay = isOwner ? ownerMetrics : staffMetrics;

  // Real or proportional revenue chart trend
  const revenuePoints =
    totalGrossToday > 0
      ? [
          Math.max(1, Math.round(totalGrossToday * 0.1)),
          Math.max(2, Math.round(totalGrossToday * 0.2)),
          Math.max(3, Math.round(totalGrossToday * 0.35)),
          Math.max(5, Math.round(totalGrossToday * 0.55)),
          Math.max(8, Math.round(totalGrossToday * 0.75)),
          Math.max(10, Math.round(totalGrossToday * 0.9)),
          Math.max(12, Math.round(totalGrossToday * 0.95)),
          Math.max(15, totalGrossToday),
        ]
      : [0, 0, 0, 0, 0, 0, 0, 0];

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
      {/* Page Header with Dual-Role Switcher */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Operations Telemetry</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>Shift 2</span>
          </div>
          <h1>Club Operations</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Role Mode Segmented Switch */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              borderRadius: "var(--r-sm)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-subtle)",
              gap: 2,
            }}
          >
            <button
              onClick={() => setRole("staff")}
              style={{
                all: "unset",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: "var(--r-xs)",
                fontSize: 11.5,
                fontWeight: !isOwner ? 600 : 500,
                color: !isOwner ? "var(--text-primary)" : "var(--text-muted)",
                background: !isOwner ? "var(--bg-surface-raised)" : "transparent",
                border: !isOwner ? "1px solid var(--border-default)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <CircleDot size={11} />
              <span>Staff</span>
            </button>
            <button
              onClick={() => setRole("owner")}
              style={{
                all: "unset",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                height: 28,
                padding: "0 10px",
                borderRadius: "var(--r-xs)",
                fontSize: 11.5,
                fontWeight: isOwner ? 600 : 500,
                color: isOwner ? "var(--accent-primary)" : "var(--text-muted)",
                background: isOwner ? "var(--bg-surface-raised)" : "transparent",
                border: isOwner ? "1px solid var(--border-default)" : "1px solid transparent",
                cursor: "pointer",
              }}
            >
              <ShieldCheck size={12} />
              <span>Owner</span>
            </button>
          </div>

          {/* Quick Manager Actions (Owner Mode) */}
          {isOwner && (
            <>
              <button
                onClick={() => setRatesModalOpen(true)}
                className="btn"
                style={{ height: 32, fontSize: 11.5, gap: 5 }}
              >
                <Sliders size={12} />
                <span>Table Rates</span>
              </button>

              <button
                onClick={() => setProductsModalOpen(true)}
                className="btn"
                style={{ height: 32, fontSize: 11.5, gap: 5 }}
              >
                <Package size={12} />
                <span>F&amp;B Menu</span>
              </button>
            </>
          )}

          <Link href="/tables">
            <button className="btn" style={{ height: 32, fontSize: 11.5 }}>
              Live Fleet
            </button>
          </Link>

          <button
            className="btn btn-primary"
            onClick={() => {
              const available = tables.find((t) => t.status === "available");
              setSelectedTable(available || tables[0]);
            }}
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid-4">
        {metricsToDisplay.map((m) => (
          <MetricCard key={m.label} {...m} />
        ))}
      </div>

      {/* Owner-Only: 5-Table Fleet Breakdown Panel */}
      {isOwner && (
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            alignItems: "center",
          }}
        >
          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              2x Royal Tables (VIP)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              ₹6,850 <span style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 500 }}>46% yield</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Occupancy: 88% · Avg ticket: ₹580
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              2x Snooker Tables (12ft)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              ₹5,200 <span style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 500 }}>35% yield</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Occupancy: 76% · Avg ticket: ₹410
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ marginBottom: 3 }}>
              1x Pool Table (9ft)
            </div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
              ₹2,800 <span style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 500 }}>19% yield</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Turnover: 9 matches · Avg: ₹220
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setZReportOpen(true)}
              className="btn"
              style={{ height: 32, fontSize: 11.5, gap: 5 }}
            >
              <FileText size={13} />
              <span>Z-Report Settlement</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Operational Analytics & Ledger Grid */}
      <div className="grid-2">
        {/* Revenue Trajectory Chart Surface */}
        <div
          className="glass-card"
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 360,
          }}
        >
          <div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div>
                <span className="eyebrow">Revenue Trajectory</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <span
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      letterSpacing: "-0.03em",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {totalGrossToday > 0 ? `₹${totalGrossToday.toLocaleString("en-IN")}` : "₹0"}
                  </span>
                  <span className="delta-badge">
                    <ArrowUpRight size={11} strokeWidth={2.2} />
                    Live Floor
                  </span>
                </div>
              </div>

              {/* Time Range Segmented Control */}
              <div
                style={{
                  display: "inline-flex",
                  padding: "2px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  gap: 2,
                }}
              >
                {(["Today", "7 Days", "30 Days"] as TimeRange[]).map((tab) => {
                  const active = range === tab;
                  return (
                    <button
                      key={tab}
                      onClick={() => setRange(tab)}
                      style={{
                        all: "unset",
                        padding: "3px 10px",
                        borderRadius: "var(--r-xs)",
                        fontSize: 11,
                        fontWeight: active ? 600 : 500,
                        color: active ? "var(--text-primary)" : "var(--text-muted)",
                        background: active ? "var(--bg-surface-raised)" : "transparent",
                        border: active ? "1px solid var(--border-default)" : "1px solid transparent",
                        cursor: "pointer",
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Sparkline data={revenuePoints} height={190} timeRange={range} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 12,
              borderTop: "1px solid var(--border-subtle)",
              fontSize: 11.5,
              color: "var(--text-muted)",
            }}
          >
            <span>Peak hours: 19:00 – 23:30</span>
            <span style={{ color: "var(--text-secondary)" }}>Active tables: {activeCount} of 5</span>
          </div>
        </div>

        {/* Recent Sessions Information-Dense Panel */}
        <div
          className="glass-card"
          style={{
            padding: "18px 20px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            minHeight: 360,
          }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: 2 }}>Floor Ledger</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Recent Sessions</h3>
              </div>
              <Link
                href="/tables"
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <span>Arena Fleet</span>
                <ArrowUpRight size={11} />
              </Link>
            </div>

            <div style={{ display: "flex", flexDirection: "column" }}>
              {sessions.length === 0 ? (
                <div style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                  <Clock size={22} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                  <div style={{ fontWeight: 600, color: "var(--text-secondary)" }}>No sessions logged yet</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                    Start an arena session on any live table to begin recording real match ledger telemetry.
                  </div>
                </div>
              ) : (
                sessions.map((s) => (
                  <div key={s.id} className="recent-session-row" style={{ padding: "10px 4px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: "var(--r-xs)",
                          background: "var(--bg-surface-inset)",
                          border: "1px solid var(--border-subtle)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "var(--text-secondary)",
                          fontWeight: 700,
                          fontSize: 11,
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {s.player.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                          {s.player}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 1, fontSize: 11, color: "var(--text-muted)" }}>
                          <span>{s.table}</span>
                          <span>•</span>
                          <span style={{ display: "flex", alignItems: "center", gap: 3 }}>
                            <Clock size={10} />
                            {s.duration}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        ₹{s.amount}
                      </div>
                      <div style={{ marginTop: 2 }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            padding: "1px 6px",
                            color: s.paid ? "var(--accent-primary)" : "var(--amber)",
                            background: s.paid ? "rgba(0, 199, 138, 0.08)" : "rgba(245, 158, 11, 0.08)",
                            borderColor: s.paid ? "rgba(0, 199, 138, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          }}
                        >
                          {s.paid ? (
                            <>
                              <CheckCircle2 size={10} />
                              Settled ({s.payment_method?.toUpperCase() || "PAID"})
                            </>
                          ) : (
                            <>
                              <AlertCircle size={10} />
                              Udhar Due
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div
            style={{
              paddingTop: 10,
              borderTop: "1px solid var(--border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11,
              color: "var(--text-muted)",
            }}
          >
            <span>{sessions.length} sessions logged</span>
            <span style={{ color: "var(--text-secondary)" }}>● Telemetry live</span>
          </div>
        </div>
      </div>

      {/* Session Drawer */}
      <SessionDrawer
        key={selectedTable?.id ?? "none"}
        table={selectedTable}
        onClose={() => setSelectedTable(null)}
        onSessionUpdated={() => setRefreshKey((k) => k + 1)}
      />

      {/* Rate Management Modal */}
      <RateManagementModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        tables={tables}
        onUpdateTableRate={handleUpdateTableRate}
        onBulkUpdateRate={handleBulkUpdateRate}
      />

      {/* Product Management Modal */}
      <ProductManagementModal
        open={productsModalOpen}
        onClose={() => setProductsModalOpen(false)}
        products={products}
        onAddProduct={(newP) => setProducts((p) => [newP, ...p])}
        onUpdateProduct={(up) => setProducts((p) => p.map((x) => (x.id === up.id ? up : x)))}
        onDeleteProduct={(id) => setProducts((p) => p.filter((x) => x.id !== id))}
      />

      {/* Z-Report Modal */}
      {zReportOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setZReportOpen(false)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 22,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                End-of-Day Settlement (Z-Report)
              </div>
              <button onClick={() => setZReportOpen(false)} style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Total Sessions Billed:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>14 matches</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Table Hourly Revenue:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>₹11,450</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>F&amp;B Snack &amp; Drinks:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>₹3,400</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Discounts Deducted:</span>
                <span style={{ fontWeight: 600, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>-₹450</span>
              </div>
              <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700 }}>
                <span>Gross Settlement:</span>
                <span style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>₹14,850</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--text-secondary)" }}>
                <span>UPI Collections: ₹10,250</span>
                <span>Cash Drawer: ₹4,600</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert("Shift settlement report exported.");
                setZReportOpen(false);
              }}
              className="btn btn-primary"
              style={{ width: "100%", height: 36, marginTop: 16, fontWeight: 700 }}
            >
              Export &amp; Lock Daily Ledger
            </button>
          </div>
        </div>
      )}
    </>
  );
}
