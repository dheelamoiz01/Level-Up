"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CircleDot,
  DollarSign,
  Receipt,
  TrendingUp,
  Clock,
  Search,
  Filter,
  Plus,
  Sliders,
  X,
  CreditCard,
  Banknote,
  User,
  Phone,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getBusinessKPIs,
  getCategoryTableUsageToday,
  getLiveSessions,
  getLiveTables,
  formatDurationFromStart,
  calculateAccruedBill,
} from "@/lib/turso/service";
import type {
  BusinessKPIs,
  CategoryTableUsage,
  ClubTable,
  SessionRow,
  TableKind,
} from "@/lib/types";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import { ManagerFloorDashboard } from "@/components/floor/ManagerFloorDashboard";

export default function DashboardPage() {
  const { user, isOwner } = useAuth();
  const isManager = user?.role === "staff";
  const [viewMode, setViewMode] = useState<"floor" | "overview">(isManager ? "floor" : "overview");

  useEffect(() => {
    if (user?.role === "staff") {
      setViewMode("floor");
    }
  }, [user?.role]);

  // Core Data States
  const [kpis, setKpis] = useState<BusinessKPIs>({
    todayCustomers: 0,
    yesterdayCustomers: 0,
    todayCollection: 0,
    yesterdayCollection: 0,
    cashCollection: 0,
    digitalCollection: 0,
    todayExpenses: 0,
    yesterdayExpenses: 0,
    netCollection: 0,
    yesterdayNetCollection: 0,
    totalRevenueBilled: 0,
  });

  const [categoryUsage, setCategoryUsage] = useState<Record<TableKind, CategoryTableUsage>>({
    Royal: { kind: "Royal", sessionsToday: 0, uniqueCustomers: 0, totalBilled: 0, amountCollected: 0, totalOccupiedMinutes: 0, tablesOccupied: 0, totalTables: 2 },
    Snooker: { kind: "Snooker", sessionsToday: 0, uniqueCustomers: 0, totalBilled: 0, amountCollected: 0, totalOccupiedMinutes: 0, tablesOccupied: 0, totalTables: 2 },
    Pool: { kind: "Pool", sessionsToday: 0, uniqueCustomers: 0, totalBilled: 0, amountCollected: 0, totalOccupiedMinutes: 0, tablesOccupied: 0, totalTables: 1 },
  });

  const [tables, setTables] = useState<ClubTable[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Recent Customer Entries Filter States
  const [entrySearch, setEntrySearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("All");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [managerFilter, setManagerFilter] = useState<string>("All");

  // Modal & Drawer States
  const [selectedTableForDrawer, setSelectedTableForDrawer] = useState<ClubTable | null>(null);
  const [detailModalSession, setDetailModalSession] = useState<SessionRow | null>(null);

  // Load Real Data from Turso
  const loadDashboardData = async () => {
    try {
      const [liveKPIs, liveCatUsage, liveTables, liveSessions] = await Promise.all([
        getBusinessKPIs(),
        getCategoryTableUsageToday(),
        getLiveTables(),
        getLiveSessions(100),
      ]);

      setKpis(liveKPIs);
      setCategoryUsage(liveCatUsage);
      setTables(liveTables);
      setSessions(liveSessions);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Event listener for floor updates
    const handleUpdate = () => loadDashboardData();
    window.addEventListener("levelup_floor_update", handleUpdate);

    // Cross-tab broadcast channel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("levelup_floor_sync");
      bc.onmessage = () => loadDashboardData();
    } catch (e) {}

    // Polling interval every 8 seconds
    const pollTimer = setInterval(() => {
      loadDashboardData();
    }, 8000);

    // Live 1-second elapsed timer tick
    const tickTimer = setInterval(() => {
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
      window.removeEventListener("levelup_floor_update", handleUpdate);
      if (bc) bc.close();
      clearInterval(pollTimer);
      clearInterval(tickTimer);
    };
  }, []);

  // Filtered Customer Entries
  const filteredCustomerEntries = useMemo(() => {
    return sessions.filter((s) => {
      if (kindFilter !== "All" && s.table_kind !== kindFilter) return false;
      if (paymentFilter === "Paid" && !s.paid && s.payment_status !== "Paid") return false;
      if (paymentFilter === "Unpaid" && (s.paid || s.payment_status === "Paid")) return false;
      if (statusFilter === "Active" && s.status !== "active") return false;
      if (statusFilter === "Completed" && s.status !== "completed") return false;
      if (managerFilter !== "All" && s.created_by !== managerFilter) return false;

      if (entrySearch.trim().length > 0) {
        const q = entrySearch.toLowerCase().trim();
        const matchesPlayer = s.player.toLowerCase().includes(q);
        const matchesPhone = s.phone ? s.phone.toLowerCase().includes(q) : false;
        const matchesTable = s.table.toLowerCase().includes(q);
        const matchesManager = s.created_by ? s.created_by.toLowerCase().includes(q) : false;
        if (!matchesPlayer && !matchesPhone && !matchesTable && !matchesManager) {
          return false;
        }
      }

      return true;
    });
  }, [sessions, kindFilter, paymentFilter, statusFilter, managerFilter, entrySearch]);

  // Distinct managers for filter dropdown
  const distinctManagers = useMemo(() => {
    const set = new Set<string>();
    sessions.forEach((s) => {
      if (s.created_by) set.add(s.created_by);
    });
    return Array.from(set);
  }, [sessions]);

  // Delta trend indicator (returns null if no historical comparison exists or if diff === 0)
  const renderTrend = (current: number, past: number, isCurrency = false) => {
    if (past === 0) return null;
    const diff = current - past;
    if (diff === 0) return null;
    const isPositive = diff > 0;

    return (
      <span style={{ fontSize: 11.5, color: isPositive ? "var(--accent-primary)" : "var(--amber)", fontWeight: 600 }}>
        {isPositive ? "+" : "-"}
        {isCurrency ? `₹${Math.abs(diff).toLocaleString("en-IN")}` : Math.abs(diff)} vs yesterday
      </span>
    );
  };

  const activeTablesCount = tables.filter((t) => t.status === "playing").length;

  // Manager Role — Render strictly floor operations console
  if (user?.role === "staff" || viewMode === "floor") {
    return (
      <>
        {isOwner && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <div
              style={{
                display: "inline-flex",
                padding: "2px",
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                gap: 2,
              }}
            >
              <button
                onClick={() => setViewMode("overview")}
                style={{
                  all: "unset",
                  padding: "4px 12px",
                  borderRadius: "var(--r-xs)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Executive Overview
              </button>
              <button
                onClick={() => setViewMode("floor")}
                style={{
                  all: "unset",
                  padding: "4px 12px",
                  borderRadius: "var(--r-xs)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: "var(--bg-surface-raised)",
                  border: "1px solid var(--border-active)",
                  cursor: "pointer",
                }}
              >
                Live Floor
              </button>
            </div>
          </div>
        )}
        <ManagerFloorDashboard />
      </>
    );
  }

  return (
    <>
      {/* 1. Page Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Club Overview</span>
          </div>
          <h1>Executive Dashboard</h1>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {isOwner && (
            <div
              style={{
                display: "inline-flex",
                padding: "2px",
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                gap: 2,
              }}
            >
              <button
                onClick={() => setViewMode("overview")}
                style={{
                  all: "unset",
                  padding: "4px 12px",
                  borderRadius: "var(--r-xs)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#FFFFFF",
                  background: "var(--bg-surface-raised)",
                  border: "1px solid var(--border-active)",
                  cursor: "pointer",
                }}
              >
                Overview
              </button>
              <button
                onClick={() => setViewMode("floor")}
                style={{
                  all: "unset",
                  padding: "4px 12px",
                  borderRadius: "var(--r-xs)",
                  fontSize: 12,
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                }}
              >
                Live Floor
              </button>
            </div>
          )}

          {/* Table Capacity Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--r-xs)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-default)",
              fontSize: 12,
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: activeTablesCount > 0 ? "var(--accent-primary)" : "var(--text-muted)" }} />
            <span>{activeTablesCount} of 5 Tables Active</span>
          </div>

          <Link href="/pricing">
            <button className="btn" style={{ height: 32, fontSize: 12, gap: 5 }}>
              <Sliders size={13} />
              <span>Table Rates</span>
            </button>
          </Link>

          <Link href="/expenses">
            <button className="btn" style={{ height: 32, fontSize: 12, gap: 5 }}>
              <Receipt size={13} />
              <span>Expenses</span>
            </button>
          </Link>

          <button
            onClick={() => {
              const available = tables.find((t) => t.status === "available");
              setSelectedTableForDrawer(available || tables[0]);
            }}
            className="btn btn-primary"
            style={{ height: 32, fontSize: 12, gap: 5 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* 2. Today's Business Overview — 4 Clean KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {/* KPI 1: Today's Collection */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow">Today's Collection</span>
            <DollarSign size={16} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
            ₹{kpis.todayCollection.toLocaleString("en-IN")}
          </div>

          {/* Cash vs Digital Breakdown */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 8,
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ color: "var(--text-secondary)", background: "var(--bg-surface-inset)", padding: "2px 6px", borderRadius: "var(--r-xs)", border: "1px solid var(--border-subtle)" }}>
              Cash: ₹{kpis.cashCollection.toLocaleString("en-IN")}
            </span>
            <span style={{ color: "var(--accent-primary)", background: "rgba(16, 185, 129, 0.08)", padding: "2px 6px", borderRadius: "var(--r-xs)", border: "1px solid rgba(16, 185, 129, 0.2)" }}>
              Digital: ₹{kpis.digitalCollection.toLocaleString("en-IN")}
            </span>
          </div>

          <div style={{ marginTop: 6, minHeight: 18 }}>
            {renderTrend(kpis.todayCollection, kpis.yesterdayCollection, true)}
          </div>
        </div>

        {/* KPI 2: Today's Customers */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow">Today's Customers</span>
            <Users size={16} style={{ color: "var(--text-secondary)" }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
            {kpis.todayCustomers}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Unique players recorded today
          </div>
          <div style={{ marginTop: 8, minHeight: 18 }}>
            {renderTrend(kpis.todayCustomers, kpis.yesterdayCustomers)}
          </div>
        </div>

        {/* KPI 3: Today's Expenses */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow">Today's Expenses</span>
            <Receipt size={16} style={{ color: "var(--amber)" }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
            ₹{kpis.todayExpenses.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Recorded club expenditures
          </div>
          <div style={{ marginTop: 8, minHeight: 18 }}>
            {renderTrend(kpis.todayExpenses, kpis.yesterdayExpenses, true)}
          </div>
        </div>

        {/* KPI 4: Today's Net Collection */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow">Net Collection</span>
            <TrendingUp size={16} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 6 }}>
            ₹{kpis.netCollection.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Collected receipts minus expenses
          </div>
          <div style={{ marginTop: 8, minHeight: 18 }}>
            {renderTrend(kpis.netCollection, kpis.yesterdayNetCollection, true)}
          </div>
        </div>
      </div>

      {/* 3. RECENT CUSTOMER ENTRIES — Professional Data Table */}
      <div className="glass-card" style={{ padding: 0, marginBottom: 28, overflow: "hidden" }}>
        {/* Table Header with Search & Filters */}
        <div
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div>
            <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Recent Customer Entries
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Live customer matches created by floor managers across all tables.
            </p>
          </div>

          {/* Filter Controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: 200 }}>
              <Search
                size={13}
                style={{
                  position: "absolute",
                  left: 9,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--text-muted)",
                }}
              />
              <input
                placeholder="Search player, phone, table..."
                value={entrySearch}
                onChange={(e) => setEntrySearch(e.target.value)}
                style={{
                  width: "100%",
                  height: 32,
                  paddingLeft: 28,
                  paddingRight: 8,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              />
            </div>

            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              style={{
                height: 32,
                padding: "0 8px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            >
              <option value="All">All Tables</option>
              <option value="Royal">Royal Tables</option>
              <option value="Snooker">Snooker Tables</option>
              <option value="Pool">Pool Tables</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                height: 32,
                padding: "0 8px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            >
              <option value="All">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid / Udhar</option>
            </select>

            {distinctManagers.length > 1 && (
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                style={{
                  height: 32,
                  padding: "0 8px",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 12,
                }}
              >
                <option value="All">All Managers</option>
                {distinctManagers.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Clean Data Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Start Time</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Duration</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Rate</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Total Billed</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Payment</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Manager</th>
                <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomerEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 13 }}>No matching customer entries</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>
                      Entries created by floor managers will appear here automatically.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomerEntries.map((s) => {
                  const isActive = s.status === "active";
                  return (
                    <tr
                      key={s.id}
                      onClick={() => setDetailModalSession(s)}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                      }}
                      className="table-row-hover"
                    >
                      {/* Customer / Player */}
                      <td style={{ padding: "11px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                          {s.player}
                        </div>
                        {s.phone && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                            {s.phone}
                          </div>
                        )}
                      </td>

                      {/* Table Badge */}
                      <td style={{ padding: "11px 16px" }}>
                        <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                          {s.table}
                        </span>
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {s.duration}
                      </td>

                      {/* Rate Applied */}
                      <td style={{ padding: "11px 16px", textAlign: "right", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        ₹{s.rate_snapshot || s.hourly_rate}/hr
                      </td>

                      {/* Total Billed */}
                      <td style={{ padding: "11px 16px", textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          ₹{s.amount}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: "11px 16px" }}>
                        <span
                          style={{
                            fontSize: 11,
                            fontWeight: 500,
                            padding: "2px 7px",
                            borderRadius: "var(--r-xs)",
                            color: s.paid ? "var(--accent-primary)" : "var(--amber)",
                            background: s.paid ? "rgba(16, 185, 129, 0.1)" : "rgba(245, 158, 11, 0.1)",
                            border: `1px solid ${s.paid ? "rgba(16, 185, 129, 0.25)" : "rgba(245, 158, 11, 0.25)"}`,
                          }}
                        >
                          {s.paid ? `Paid (${s.payment_method?.toUpperCase() || "CASH"})` : "Unpaid / Udhar"}
                        </span>
                      </td>

                      {/* Manager */}
                      <td style={{ padding: "11px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.created_by || "manager"}
                      </td>

                      {/* Session Status */}
                      <td style={{ padding: "11px 16px", textAlign: "center" }}>
                        {isActive ? (
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 600,
                              color: "var(--accent-primary)",
                              padding: "2px 6px",
                              borderRadius: "var(--r-xs)",
                              background: "rgba(16, 185, 129, 0.1)",
                            }}
                          >
                            Active
                          </span>
                        ) : (
                          <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                            Completed
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Category Table Usage (Royal, Snooker, Pool) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Today's Table Category Performance
          </h2>
        </div>

        <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
          {/* Royal */}
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "#C084FC" }}>VIP Salon</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Royal Tables (2)
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {categoryUsage.Royal.tablesOccupied} of 2 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Sessions</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{categoryUsage.Royal.sessionsToday}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>
                  ₹{categoryUsage.Royal.amountCollected}
                </div>
              </div>
            </div>
          </div>

          {/* Snooker */}
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Tournament 12ft</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Snooker Tables (2)
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {categoryUsage.Snooker.tablesOccupied} of 2 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Sessions</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{categoryUsage.Snooker.sessionsToday}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>
                  ₹{categoryUsage.Snooker.amountCollected}
                </div>
              </div>
            </div>
          </div>

          {/* Pool */}
          <div className="glass-card" style={{ padding: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "#60A5FA" }}>American 9ft</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Pool Tables (1)
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                {categoryUsage.Pool.tablesOccupied} of 1 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Sessions</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)" }}>{categoryUsage.Pool.sessionsToday}</div>
              </div>
              <div>
                <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Collected</div>
                <div style={{ fontSize: 18, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-primary)" }}>
                  ₹{categoryUsage.Pool.amountCollected}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Slide-out Session Workspace */}
      <SessionDrawer
        table={selectedTableForDrawer}
        onClose={() => setSelectedTableForDrawer(null)}
        onSessionUpdated={() => loadDashboardData()}
      />

      {/* Match Details Modal */}
      {detailModalSession && (
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
          onClick={() => setDetailModalSession(null)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span className="eyebrow">Match Details</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  {detailModalSession.player}
                </h3>
              </div>
              <button
                onClick={() => setDetailModalSession(null)}
                style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 12.5, marginBottom: 16 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Table:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {detailModalSession.table} ({detailModalSession.table_kind || "Snooker"})
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Duration:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {detailModalSession.duration}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Total Billed:</span>
                <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--text-primary)" }}>
                  ₹{detailModalSession.amount}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Payment Status:</span>
                <span style={{ fontWeight: 600, color: detailModalSession.paid ? "var(--accent-primary)" : "var(--amber)" }}>
                  {detailModalSession.paid ? `Paid (${detailModalSession.payment_method?.toUpperCase() || "CASH"})` : "Unpaid / Udhar"}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Recorded By:</span>
                <span style={{ color: "var(--text-muted)" }}>
                  {detailModalSession.created_by || "manager"}
                </span>
              </div>
            </div>

            <button
              onClick={() => setDetailModalSession(null)}
              className="btn"
              style={{ width: "100%", height: 36 }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
