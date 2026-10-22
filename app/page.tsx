"use client";

import { useState } from "react";
import { MetricCard } from "@/components/ui/MetricCard";
import { Sparkline } from "@/components/ui/Sparkline";
import { Button } from "@/components/ui/Button";
import { GlassCard } from "@/components/ui/GlassCard";
import { staffMetrics, ownerMetrics, mockRevenue, mockSessions } from "@/lib/mock/dashboard";
import { initialTables } from "@/lib/mock/tables";
import { initialProducts } from "@/lib/mock/products";
import type { ClubTable, Product, UserRole } from "@/lib/types";
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
  DollarSign,
  TrendingUp,
  Receipt,
  FileText,
  Lock,
} from "lucide-react";
import Link from "next/link";

type TimeRange = "Today" | "7 Days" | "30 Days";

const revenueDataByRange: Record<TimeRange, number[]> = {
  Today: mockRevenue,
  "7 Days": [8, 11, 9, 14, 12, 16, 15, 18, 16, 22],
  "30 Days": [30, 42, 38, 55, 48, 62, 58, 70, 65, 88],
};

const revenueStatsByRange: Record<TimeRange, { amount: string; delta: string; peak: string; avg: string }> = {
  Today: { amount: "₹14,850", delta: "+12.4% today", peak: "07:00 PM – 11:30 PM", avg: "₹420/hr" },
  "7 Days": { amount: "₹98,400", delta: "+16.2% vs last wk", peak: "Fri & Sat 06:00 PM – 01:00 AM", avg: "₹440/hr" },
  "30 Days": { amount: "₹385,000", delta: "+21.5% monthly", peak: "Weekend Prime Nights", avg: "₹450/hr" },
};

export default function Dashboard() {
  const [role, setRole] = useState<UserRole>("owner");
  const [range, setRange] = useState<TimeRange>("Today");
  const [tables, setTables] = useState<ClubTable[]>(initialTables);
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [selectedTable, setSelectedTable] = useState<ClubTable | null>(null);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [zReportOpen, setZReportOpen] = useState(false);

  const currentStats = revenueStatsByRange[range];
  const currentData = revenueDataByRange[range];

  const isOwner = role === "owner";
  const metricsToDisplay = isOwner ? ownerMetrics : staffMetrics;

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
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 6 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--mint)",
                boxShadow: "0 0 8px var(--mint)",
                display: "inline-block",
              }}
            />
            <span>Floor Operations</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span style={{ color: "var(--muted)" }}>5 Arena Tables Live</span>
          </div>
          <h1>Club Dashboard</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Role Mode Switcher Capsule */}
          <div
            className="glass-card-inset"
            style={{
              display: "inline-flex",
              padding: "3px",
              borderRadius: "var(--r-full)",
              gap: 3,
            }}
          >
            <button
              onClick={() => setRole("staff")}
              className={`btn ${!isOwner ? "btn-primary" : ""}`}
              style={{
                height: 32,
                padding: "0 12px",
                fontSize: 11.5,
                fontWeight: !isOwner ? 700 : 500,
                boxShadow: !isOwner ? "var(--shadow-emerald-pill)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <CircleDot size={12} />
              <span>Staff Mode</span>
            </button>
            <button
              onClick={() => setRole("owner")}
              className={`btn ${isOwner ? "btn-primary" : ""}`}
              style={{
                height: 32,
                padding: "0 12px",
                fontSize: 11.5,
                fontWeight: isOwner ? 700 : 500,
                boxShadow: isOwner ? "var(--shadow-emerald-pill)" : "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <ShieldCheck size={13} />
              <span>Owner Mode</span>
            </button>
          </div>

          {/* Quick Manager Actions (Visible on Owner Mode) */}
          {isOwner && (
            <>
              <button
                onClick={() => setRatesModalOpen(true)}
                className="btn"
                style={{
                  height: 34,
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  gap: 5,
                  background: "rgba(0, 230, 118, 0.08)",
                  border: "1px solid rgba(0, 230, 118, 0.25)",
                  color: "var(--mint)",
                }}
              >
                <Sliders size={13} strokeWidth={2.2} />
                <span>Rates</span>
              </button>

              <button
                onClick={() => setProductsModalOpen(true)}
                className="btn"
                style={{
                  height: 34,
                  padding: "0 12px",
                  fontSize: 12,
                  fontWeight: 600,
                  gap: 5,
                  background: "rgba(0, 230, 118, 0.08)",
                  border: "1px solid rgba(0, 230, 118, 0.25)",
                  color: "var(--mint)",
                }}
              >
                <span>F&amp;B Menu</span>
              </button>
            </>
          )}

          <Link href="/tables">
            <Button variant="ghost" style={{ height: 34, fontSize: 12 }}>
              Arena Tables
            </Button>
          </Link>

          <Button
            variant="primary"
            onClick={() => {
              const available = tables.find((t) => t.status === "available");
              setSelectedTable(available || tables[0]);
            }}
            style={{ height: 34, fontSize: 12, gap: 5, fontWeight: 700 }}
          >
            <Plus size={15} strokeWidth={3} />
            <span>Start Session</span>
          </Button>
        </div>
      </div>

      {/* Primary KPI Grid (Differentiated by Role) */}
      <div className="grid-4">
        {metricsToDisplay.map((m, index) => {
          const variants = ["highlight", "raised", "default", "raised"] as const;
          const asyms = ["1", "2", "3", "4"] as const;
          return (
            <MetricCard
              key={m.label}
              {...m}
              asymmetry={asyms[index] || "1"}
              variant={variants[index] || "default"}
            />
          );
        })}
      </div>

      {/* Owner-Only: 5-Table Fleet Yield Analytics */}
      {isOwner && (
        <div
          className="glass-card glass-card-inset"
          style={{
            padding: "16px 20px",
            borderRadius: "var(--r-md)",
            marginBottom: "var(--s-4)",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 16,
            border: "1px solid rgba(0, 230, 118, 0.18)",
          }}
        >
          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              2x Royal Tables (VIP)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-hero)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              ₹6,850 <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 600 }}>46% share</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              Occupancy: 88% · Avg ticket: ₹580
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              2x Snooker Tables (12ft)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-hero)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              ₹5,200 <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 600 }}>35% share</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              Occupancy: 76% · Avg ticket: ₹410
            </div>
          </div>

          <div>
            <div style={{ fontSize: 11, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              1x Pool Table (9ft)
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--text-hero)", marginTop: 2, fontFamily: "var(--font-mono)" }}>
              ₹2,800 <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 600 }}>19% share</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
              Turnover: 9 matches · Avg ticket: ₹220
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end" }}>
            <button
              onClick={() => setZReportOpen(true)}
              className="btn btn-primary"
              style={{ height: 34, padding: "0 14px", fontSize: 12, fontWeight: 700, gap: 6 }}
            >
              <FileText size={14} />
              <span>Z-Report Settlement</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Operational Analytics & Ledger Grid */}
      <div className="grid-2">
        {/* Revenue Trajectory Chart Surface */}
        <GlassCard
          variant="raised"
          className="metric"
          style={{ minHeight: 410, justifyContent: "space-between" }}
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
                <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 4 }}>
                  <span
                    style={{
                      fontSize: 32,
                      fontWeight: 800,
                      color: "var(--text-hero)",
                      letterSpacing: "-0.03em",
                      textShadow: "0 0 25px rgba(92, 242, 176, 0.22)",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    {currentStats.amount}
                  </span>
                  <span className="delta-badge">
                    <ArrowUpRight size={12} strokeWidth={2.5} />
                    {currentStats.delta}
                  </span>
                </div>
              </div>

              {/* Time Range Filter Capsule */}
              <div
                className="glass-card-inset"
                style={{
                  display: "inline-flex",
                  padding: "4px",
                  borderRadius: "var(--r-full)",
                  gap: 3,
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
                        padding: "5px 14px",
                        borderRadius: "var(--r-full)",
                        fontSize: 12,
                        fontWeight: active ? 700 : 500,
                        color: active ? "#02160d" : "var(--muted)",
                        background: active ? "linear-gradient(135deg, var(--mint), var(--emerald))" : "transparent",
                        boxShadow: active ? "var(--shadow-emerald-pill)" : "none",
                        cursor: "pointer",
                        transition: "all 0.2s var(--ease)",
                      }}
                    >
                      {tab}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <Sparkline data={currentData} height={220} timeRange={range} />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 14,
              borderTop: "1px solid var(--glass-border-subtle)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span>Peak slot: {currentStats.peak}</span>
            <span style={{ color: "var(--text-secondary)" }}>Average ticket: {currentStats.avg}</span>
          </div>
        </GlassCard>

        {/* Recent Sessions Information-Dense Panel */}
        <GlassCard variant="default" asymmetry="2" className="metric" style={{ minHeight: 410, justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <div>
                <span className="eyebrow" style={{ marginBottom: 2 }}>Floor Ledger</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-hero)" }}>Recent Sessions</h3>
              </div>
              <Link
                href="/tables"
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--mint)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  padding: "4px 10px",
                  borderRadius: "var(--r-full)",
                  background: "rgba(92, 242, 176, 0.08)",
                  border: "1px solid rgba(92, 242, 176, 0.2)",
                  transition: "all 0.2s var(--ease)",
                }}
              >
                <span>Arena Fleet</span>
                <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="rows">
              {mockSessions.map((s) => (
                <div key={s.id} className="recent-session-row" style={{ padding: "12px 8px", borderRadius: "var(--r-sm)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--r-md)",
                        background: s.paid ? "rgba(16, 185, 129, 0.12)" : "rgba(245, 158, 11, 0.12)",
                        border: s.paid ? "1px solid rgba(16, 185, 129, 0.35)" : "1px solid rgba(245, 158, 11, 0.35)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: s.paid ? "var(--mint)" : "var(--amber)",
                        fontWeight: 800,
                        fontSize: 13,
                        boxShadow: s.paid ? "0 0 14px rgba(16, 185, 129, 0.2)" : "0 0 14px rgba(245, 158, 11, 0.2)",
                      }}
                    >
                      {s.player.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <span style={{ fontWeight: 700, color: "var(--text-hero)", fontSize: 14 }}>
                        {s.player}
                      </span>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2, fontSize: 12, color: "var(--muted)" }}>
                        <span
                          style={{
                            color: "var(--text-secondary)",
                            fontWeight: 600,
                            background: "rgba(255, 255, 255, 0.04)",
                            padding: "1px 6px",
                            borderRadius: "var(--r-xs)",
                            border: "1px solid var(--glass-border-subtle)",
                          }}
                        >
                          {s.table}
                        </span>
                        <span>•</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Clock size={11} />
                          {s.duration}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: "var(--text-hero)", fontFamily: "var(--font-mono)" }}>
                      ₹{s.amount}
                    </span>
                    <div style={{ marginTop: 3 }}>
                      <span
                        className="badge"
                        style={{
                          fontSize: 11,
                          padding: "2px 8px",
                          color: s.paid ? "var(--mint)" : "var(--amber)",
                          background: s.paid ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                          borderColor: s.paid ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)",
                        }}
                      >
                        {s.paid ? (
                          <>
                            <CheckCircle2 size={11} />
                            Settled ({s.payment_method?.toUpperCase() || "PAID"})
                          </>
                        ) : (
                          <>
                            <AlertCircle size={11} />
                            Udhar Due
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              paddingTop: 12,
              borderTop: "1px solid var(--glass-border-subtle)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              fontSize: 11.5,
              color: "var(--muted)",
            }}
          >
            <span>{mockSessions.length} active entries in ledger</span>
            <span style={{ color: "var(--mint)" }}>● Telemetry synchronized</span>
          </div>
        </GlassCard>
      </div>

      {/* Session Drawer */}
      <SessionDrawer
        key={selectedTable?.id ?? "none"}
        table={selectedTable}
        onClose={() => setSelectedTable(null)}
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
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(14px)",
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
              maxWidth: 440,
              background: "#0D140F",
              border: "1px solid rgba(0, 230, 118, 0.35)",
              borderRadius: 20,
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hero)" }}>
                End-of-Day Settlement (Z-Report)
              </div>
              <button onClick={() => setZReportOpen(false)} style={{ all: "unset", color: "var(--muted)", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Total Sessions Billed:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>14 matches</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Table Hourly Revenue:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>₹11,450</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>F&amp;B Snack &amp; Drinks:</span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>₹3,400</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--muted)" }}>Discounts Deducted:</span>
                <span style={{ fontWeight: 700, color: "var(--amber)" }}>-₹450</span>
              </div>
              <div style={{ height: 1, background: "rgba(255,255,255,0.08)", margin: "4px 0" }} />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
                <span>Gross Settlement:</span>
                <span style={{ color: "var(--mint)", fontFamily: "var(--font-mono)" }}>₹14,850</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: "var(--text-secondary)" }}>
                <span>UPI Collections: ₹10,250</span>
                <span>Cash Drawer: ₹4,600</span>
              </div>
            </div>

            <button
              onClick={() => {
                alert("Shift settlement report downloaded & ledger locked.");
                setZReportOpen(false);
              }}
              className="btn btn-primary"
              style={{ width: "100%", height: 38, marginTop: 18, fontWeight: 700 }}
            >
              Export &amp; Lock Daily Ledger
            </button>
          </div>
        </div>
      )}
    </>
  );
}
