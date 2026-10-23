"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CircleDot,
  DollarSign,
  Receipt,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Plus,
  ArrowUpRight,
  ShieldCheck,
  Package,
  Sliders,
  X,
  CreditCard,
  Banknote,
  FileText,
  User,
  Phone,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getBusinessKPIs,
  getCategoryTableUsageToday,
  getLiveSessions,
  getLiveTables,
  getLiveProducts,
  formatDurationFromStart,
  calculateAccruedBill,
} from "@/lib/turso/service";
import type {
  BusinessKPIs,
  CategoryTableUsage,
  ClubTable,
  Product,
  SessionRow,
  TableKind,
} from "@/lib/types";
import { SessionDrawer } from "@/components/sessions/SessionDrawer";
import { ProductManagementModal } from "@/components/modals/ProductManagementModal";
import { RateManagementModal } from "@/components/modals/RateManagementModal";

export default function OwnerDashboard() {
  const { user, isOwner } = useAuth();

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
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Recent Customer Entries Filter States
  const [entrySearch, setEntrySearch] = useState("");
  const [kindFilter, setKindFilter] = useState<string>("All");
  const [paymentFilter, setPaymentFilter] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [managerFilter, setManagerFilter] = useState<string>("All");

  // Analytics Time Range
  const [analyticsRange, setAnalyticsRange] = useState<"Today" | "7 Days">("Today");

  // Modal & Drawer States
  const [selectedTableForDrawer, setSelectedTableForDrawer] = useState<ClubTable | null>(null);
  const [detailModalSession, setDetailModalSession] = useState<SessionRow | null>(null);
  const [productsModalOpen, setProductsModalOpen] = useState(false);
  const [ratesModalOpen, setRatesModalOpen] = useState(false);

  // Load Real Data from Turso
  const loadDashboardData = async () => {
    try {
      const [liveKPIs, liveCatUsage, liveTables, liveSessions, liveProducts] = await Promise.all([
        getBusinessKPIs(),
        getCategoryTableUsageToday(),
        getLiveTables(),
        getLiveSessions(100),
        getLiveProducts(),
      ]);

      setKpis(liveKPIs);
      setCategoryUsage(liveCatUsage);
      setTables(liveTables);
      setSessions(liveSessions);
      setProducts(liveProducts);
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

    // Auto-polling interval every 8 seconds for multi-manager sync
    const pollTimer = setInterval(() => {
      loadDashboardData();
    }, 8000);

    // Live 1-second elapsed timer tick for playing tables
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

  // Filtered Recent Customer Entries
  const filteredCustomerEntries = useMemo(() => {
    return sessions.filter((s) => {
      // Kind Filter
      if (kindFilter !== "All" && s.table_kind !== kindFilter) return false;

      // Payment Filter
      if (paymentFilter === "Paid" && !s.paid && s.payment_status !== "Paid") return false;
      if (paymentFilter === "Unpaid" && (s.paid || s.payment_status === "Paid")) return false;

      // Status Filter
      if (statusFilter === "Active" && s.status !== "active") return false;
      if (statusFilter === "Completed" && s.status !== "completed") return false;

      // Manager Filter
      if (managerFilter !== "All" && s.created_by !== managerFilter) return false;

      // Search Query (Customer Name, Phone, Table)
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

  // Delta Helpers
  const formatDelta = (current: number, past: number, isCurrency = false) => {
    const diff = current - past;
    if (diff === 0) return "Same as yesterday";
    const sign = diff > 0 ? "+" : "";
    if (isCurrency) {
      return `${sign}₹${diff.toLocaleString("en-IN")} vs yesterday`;
    }
    return `${sign}${diff} vs yesterday`;
  };

  // Occupied table counts
  const activeTablesCount = tables.filter((t) => t.status === "playing").length;

  return (
    <>
      {/* 1. OPERATIONS HEADER */}
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Live Floor Matrix</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--accent-primary)" }}>Turso Cloud Connected</span>
          </div>
          <h1>Club Operations</h1>
        </div>

        {/* Action Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Real-time pulse tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "4px 10px",
              borderRadius: "var(--r-xs)",
              background: "rgba(0, 199, 138, 0.08)",
              border: "1px solid rgba(0, 199, 138, 0.2)",
              fontSize: 11.5,
              fontWeight: 600,
              color: "var(--accent-primary)",
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent-primary)",
                boxShadow: "0 0 8px var(--accent-primary)",
              }}
            />
            <span>{activeTablesCount} of 5 Tables in Play</span>
          </div>

          <Link href="/pricing">
            <button className="btn" style={{ height: 32, fontSize: 11.5, gap: 5 }}>
              <Sliders size={13} />
              <span>Table Rates</span>
            </button>
          </Link>

          <Link href="/expenses">
            <button className="btn" style={{ height: 32, fontSize: 11.5, gap: 5 }}>
              <Receipt size={13} />
              <span>Expenses</span>
            </button>
          </Link>

          <button
            onClick={() => setProductsModalOpen(true)}
            className="btn"
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Package size={13} />
            <span>F&amp;B Menu</span>
          </button>

          <button
            onClick={() => {
              const available = tables.find((t) => t.status === "available");
              setSelectedTableForDrawer(available || tables[0]);
            }}
            className="btn btn-primary"
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* 2. TODAY'S BUSINESS OVERVIEW — 4 PROMINENT KPI CARDS */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        {/* KPI 1: Today's Customers */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow" style={{ color: "var(--text-muted)" }}>Today's Customers</span>
            <Users size={16} style={{ color: "var(--accent-primary)", opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            {kpis.todayCustomers}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--accent-primary)", fontWeight: 600, marginTop: 4 }}>
            {formatDelta(kpis.todayCustomers, kpis.yesterdayCustomers)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Unique players recorded today
          </div>
        </div>

        {/* KPI 2: Today's Collection */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow" style={{ color: "var(--text-muted)" }}>Today's Collection</span>
            <DollarSign size={16} style={{ color: "var(--accent-primary)", opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            ₹{kpis.todayCollection.toLocaleString("en-IN")}
          </div>

          {/* Cash vs Digital Splits */}
          <div
            style={{
              display: "flex",
              gap: 8,
              marginTop: 6,
              fontSize: 10.5,
              fontWeight: 600,
              fontFamily: "var(--font-mono)",
            }}
          >
            <span style={{ color: "var(--text-secondary)", background: "var(--bg-surface-inset)", padding: "2px 6px", borderRadius: "var(--r-xs)", border: "1px solid var(--border-subtle)" }}>
              Cash: ₹{kpis.cashCollection.toLocaleString("en-IN")}
            </span>
            <span style={{ color: "var(--accent-primary)", background: "rgba(0, 199, 138, 0.08)", padding: "2px 6px", borderRadius: "var(--r-xs)", border: "1px solid rgba(0, 199, 138, 0.2)" }}>
              Digital: ₹{kpis.digitalCollection.toLocaleString("en-IN")}
            </span>
          </div>

          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            {formatDelta(kpis.todayCollection, kpis.yesterdayCollection, true)}
          </div>
        </div>

        {/* KPI 3: Today's Expenses */}
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow" style={{ color: "var(--text-muted)" }}>Today's Expenses</span>
            <Receipt size={16} style={{ color: "var(--amber)", opacity: 0.8 }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            ₹{kpis.todayExpenses.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11.5, color: kpis.todayExpenses > 0 ? "var(--amber)" : "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>
            {formatDelta(kpis.todayExpenses, kpis.yesterdayExpenses, true)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Operating costs recorded today
          </div>
        </div>

        {/* KPI 4: Today's Net Collection */}
        <div className="glass-card" style={{ padding: "18px 20px", border: "1px solid rgba(0, 199, 138, 0.3)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Today's Net Collection</span>
            <TrendingUp size={16} style={{ color: "var(--accent-primary)" }} />
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 4 }}>
            ₹{kpis.netCollection.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-secondary)", fontWeight: 600, marginTop: 4 }}>
            {formatDelta(kpis.netCollection, kpis.yesterdayNetCollection, true)}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Collected payments minus expenses
          </div>
        </div>
      </div>

      {/* 3. RECENT CUSTOMER ENTRIES — MOST IMPORTANT SECTION */}
      <div className="glass-card" style={{ padding: 0, marginBottom: 28, overflow: "hidden" }}>
        {/* Section Header with Search & Filter Bar */}
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
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                Recent Customer Entries
              </h2>
              <span
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: "50%",
                  background: "var(--accent-primary)",
                  boxShadow: "0 0 8px var(--accent-primary)",
                }}
                title="Auto-refreshes when managers add entries"
              />
            </div>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Live customer matches and entries created by floor managers across all tables.
            </p>
          </div>

          {/* Search & Filter Controls */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {/* Search Input */}
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
                  height: 30,
                  paddingLeft: 28,
                  paddingRight: 8,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 11.5,
                }}
              />
            </div>

            {/* Table Kind Filter */}
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value)}
              style={{
                height: 30,
                padding: "0 8px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 11.5,
              }}
            >
              <option value="All">All Tables</option>
              <option value="Royal">Royal Tables</option>
              <option value="Snooker">Snooker Tables</option>
              <option value="Pool">Pool Tables</option>
            </select>

            {/* Session Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                height: 30,
                padding: "0 8px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 11.5,
              }}
            >
              <option value="All">All Statuses</option>
              <option value="Active">Active Sessions</option>
              <option value="Completed">Completed Matches</option>
            </select>

            {/* Payment Status Filter */}
            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              style={{
                height: 30,
                padding: "0 8px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 11.5,
              }}
            >
              <option value="All">All Payments</option>
              <option value="Paid">Paid</option>
              <option value="Unpaid">Unpaid / Udhar</option>
            </select>

            {/* Manager Filter */}
            {distinctManagers.length > 1 && (
              <select
                value={managerFilter}
                onChange={(e) => setManagerFilter(e.target.value)}
                style={{
                  height: 30,
                  padding: "0 8px",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-xs)",
                  color: "var(--text-primary)",
                  fontSize: 11.5,
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

        {/* Entries Table */}
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Customer / Player</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Table</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Start Time</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Duration</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Rate</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Total Billed</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Payment</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Manager</th>
                <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomerEntries.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                    <Clock size={24} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 13 }}>No matching customer entries</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>
                      Entries created by floor managers will stream into this table in real-time.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCustomerEntries.map((s) => {
                  const isActive = s.status === "active";
                  const kindColor =
                    s.table_kind === "Royal"
                      ? "rgba(168, 85, 247, 0.15)"
                      : s.table_kind === "Pool"
                      ? "rgba(59, 130, 246, 0.15)"
                      : "rgba(0, 199, 138, 0.12)";
                  const kindBorder =
                    s.table_kind === "Royal"
                      ? "rgba(168, 85, 247, 0.3)"
                      : s.table_kind === "Pool"
                      ? "rgba(59, 130, 246, 0.3)"
                      : "rgba(0, 199, 138, 0.25)";
                  const kindText =
                    s.table_kind === "Royal"
                      ? "#C084FC"
                      : s.table_kind === "Pool"
                      ? "#60A5FA"
                      : "var(--accent-primary)";

                  return (
                    <tr
                      key={s.id}
                      onClick={() => setDetailModalSession(s)}
                      style={{
                        borderBottom: "1px solid var(--border-subtle)",
                        cursor: "pointer",
                        transition: "background-color 0.15s ease",
                      }}
                      className="table-row-hover"
                    >
                      {/* Customer / Player */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                          {s.player}
                        </div>
                        {s.phone ? (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 1 }}>
                            {s.phone}
                          </div>
                        ) : (
                          <div style={{ fontSize: 10.5, color: "var(--text-dim)" }}>Walk-in</div>
                        )}
                      </td>

                      {/* Table Badge */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <span
                            style={{
                              fontSize: 10.5,
                              fontWeight: 600,
                              padding: "2px 7px",
                              borderRadius: "var(--r-xs)",
                              background: kindColor,
                              border: `1px solid ${kindBorder}`,
                              color: kindText,
                            }}
                          >
                            {s.table_kind || "Snooker"}
                          </span>
                          <span style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 500 }}>
                            {s.table}
                          </span>
                        </div>
                      </td>

                      {/* Start Time */}
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>

                      {/* Duration */}
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, fontFamily: "var(--font-mono)", color: isActive ? "var(--accent-primary)" : "var(--text-secondary)" }}>
                          {isActive && (
                            <span
                              style={{
                                width: 5,
                                height: 5,
                                borderRadius: "50%",
                                background: "var(--accent-primary)",
                                display: "inline-block",
                              }}
                            />
                          )}
                          <span>{s.duration}</span>
                        </div>
                      </td>

                      {/* Rate Applied */}
                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                        ₹{s.rate_snapshot || s.hourly_rate}/hr
                      </td>

                      {/* Total Billed */}
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          ₹{s.amount}
                        </span>
                      </td>

                      {/* Payment Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          className="badge"
                          style={{
                            fontSize: 10,
                            padding: "2px 7px",
                            color: s.paid ? "var(--accent-primary)" : "var(--amber)",
                            background: s.paid ? "rgba(0, 199, 138, 0.08)" : "rgba(245, 158, 11, 0.08)",
                            borderColor: s.paid ? "rgba(0, 199, 138, 0.2)" : "rgba(245, 158, 11, 0.2)",
                          }}
                        >
                          {s.paid ? `Paid (${s.payment_method?.toUpperCase() || "CASH"})` : "Unpaid / Udhar"}
                        </span>
                      </td>

                      {/* Created By Manager */}
                      <td style={{ padding: "12px 16px", fontSize: 11.5, color: "var(--text-secondary)" }}>
                        {s.created_by || "manager"}
                      </td>

                      {/* Session Status */}
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {isActive ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                              fontSize: 10.5,
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                              background: "rgba(0, 199, 138, 0.12)",
                              border: "1px solid rgba(0, 199, 138, 0.3)",
                              padding: "2px 8px",
                              borderRadius: "var(--r-xs)",
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)" }} />
                            ACTIVE
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 10.5,
                              color: "var(--text-muted)",
                              padding: "2px 8px",
                            }}
                          >
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

        {/* Footer info banner */}
        <div
          style={{
            padding: "8px 20px",
            borderTop: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: "var(--text-muted)",
          }}
        >
          <span>Showing {filteredCustomerEntries.length} entries · Click any row for match ledger breakdown</span>
          <span>Last live sync: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
        </div>
      </div>

      {/* 4. TODAY'S TABLE ACTIVITY — 3 CATEGORY CARDS + COMPACT FLEET BREAKDOWN */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Today's Table Activity
          </h2>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            Aggregate player volume, occupied time, and business collected across all cuesport categories today.
          </p>
        </div>

        {/* 3 Prominent Cards: Royal, Snooker, Pool */}
        <div className="grid-3" style={{ marginBottom: 16 }}>
          {/* Card A: Royal Tables */}
          <div
            className="glass-card"
            style={{
              padding: 20,
              border: "1px solid rgba(168, 85, 247, 0.3)",
              background: "linear-gradient(180deg, rgba(168, 85, 247, 0.04) 0%, var(--bg-surface) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "#C084FC" }}>VIP Salon</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Royal Tables (2)
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "var(--r-xs)",
                  background: categoryUsage.Royal.tablesOccupied > 0 ? "rgba(0, 199, 138, 0.15)" : "var(--bg-surface-inset)",
                  color: categoryUsage.Royal.tablesOccupied > 0 ? "var(--accent-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {categoryUsage.Royal.tablesOccupied} of 2 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Sessions Today</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Royal.sessionsToday}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Unique Players</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Royal.uniqueCustomers}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Billed</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Royal.totalBilled.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Collected</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Royal.amountCollected.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
              Occupied time: <strong style={{ color: "var(--text-primary)" }}>{Math.floor(categoryUsage.Royal.totalOccupiedMinutes / 60)}h {categoryUsage.Royal.totalOccupiedMinutes % 60}m</strong>
            </div>
          </div>

          {/* Card B: Snooker Tables */}
          <div
            className="glass-card"
            style={{
              padding: 20,
              border: "1px solid rgba(0, 199, 138, 0.3)",
              background: "linear-gradient(180deg, rgba(0, 199, 138, 0.04) 0%, var(--bg-surface) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Championship 12ft</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Snooker Tables (2)
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "var(--r-xs)",
                  background: categoryUsage.Snooker.tablesOccupied > 0 ? "rgba(0, 199, 138, 0.15)" : "var(--bg-surface-inset)",
                  color: categoryUsage.Snooker.tablesOccupied > 0 ? "var(--accent-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {categoryUsage.Snooker.tablesOccupied} of 2 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Sessions Today</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Snooker.sessionsToday}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Unique Players</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Snooker.uniqueCustomers}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Billed</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Snooker.totalBilled.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Collected</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Snooker.amountCollected.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
              Occupied time: <strong style={{ color: "var(--text-primary)" }}>{Math.floor(categoryUsage.Snooker.totalOccupiedMinutes / 60)}h {categoryUsage.Snooker.totalOccupiedMinutes % 60}m</strong>
            </div>
          </div>

          {/* Card C: Pool Tables */}
          <div
            className="glass-card"
            style={{
              padding: 20,
              border: "1px solid rgba(59, 130, 246, 0.3)",
              background: "linear-gradient(180deg, rgba(59, 130, 246, 0.04) 0%, var(--bg-surface) 100%)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
              <div>
                <span className="eyebrow" style={{ color: "#60A5FA" }}>Fast Play 9ft</span>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Pool Tables (1)
                </h3>
              </div>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  padding: "2px 8px",
                  borderRadius: "var(--r-xs)",
                  background: categoryUsage.Pool.tablesOccupied > 0 ? "rgba(0, 199, 138, 0.15)" : "var(--bg-surface-inset)",
                  color: categoryUsage.Pool.tablesOccupied > 0 ? "var(--accent-primary)" : "var(--text-muted)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {categoryUsage.Pool.tablesOccupied} of 1 Occupied
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Sessions Today</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Pool.sessionsToday}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Unique Players</div>
                <div style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  {categoryUsage.Pool.uniqueCustomers}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Total Billed</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Pool.totalBilled.toLocaleString("en-IN")}
                </div>
              </div>
              <div>
                <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Collected</div>
                <div style={{ fontSize: 17, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{categoryUsage.Pool.amountCollected.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 11.5, color: "var(--text-secondary)", paddingTop: 8, borderTop: "1px solid var(--border-subtle)" }}>
              Occupied time: <strong style={{ color: "var(--text-primary)" }}>{Math.floor(categoryUsage.Pool.totalOccupiedMinutes / 60)}h {categoryUsage.Pool.totalOccupiedMinutes % 60}m</strong>
            </div>
          </div>
        </div>

        {/* Compact Physical Table-Wise Breakdown (5 Tables) */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Fleet Live Status &amp; Real-Time Turnaround
            </h3>
            <Link href="/tables" style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span>View Full Fleet Grid</span>
              <ArrowUpRight size={12} />
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Status</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Active Player</th>
                  <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Elapsed Time</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Rate Applied</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Accrued Bill</th>
                  <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {tables.map((t) => {
                  const isPlaying = t.status === "playing";
                  return (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "var(--text-primary)" }}>{t.name}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.kind}</div>
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        {isPlaying ? (
                          <span
                            style={{
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 5,
                              fontSize: 11,
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                              background: "rgba(0, 199, 138, 0.1)",
                              padding: "2px 8px",
                              borderRadius: "var(--r-xs)",
                            }}
                          >
                            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)" }} />
                            Playing
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              background: "var(--bg-surface-raised)",
                              padding: "2px 8px",
                              borderRadius: "var(--r-xs)",
                            }}
                          >
                            Available
                          </span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px" }}>
                        {t.player ? (
                          <div>
                            <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12.5 }}>{t.player}</div>
                            {t.phone && <div style={{ fontSize: 10.5, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{t.phone}</div>}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: "var(--text-dim)" }}>—</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 16px", fontSize: 12, fontFamily: "var(--font-mono)", color: isPlaying ? "var(--accent-primary)" : "var(--text-muted)" }}>
                        {isPlaying ? t.elapsed || "00:00:01" : "—"}
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right", fontSize: 12.5, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                        ₹{t.hourly_rate}/hr
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 700, color: isPlaying ? "var(--text-primary)" : "var(--text-dim)", fontFamily: "var(--font-mono)" }}>
                          {isPlaying ? `₹${t.bill || 0}` : "—"}
                        </span>
                      </td>

                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <button
                          onClick={() => setSelectedTableForDrawer(t)}
                          className={isPlaying ? "btn btn-primary" : "btn"}
                          style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                        >
                          {isPlaying ? "Manage / Bill" : "Start Session"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 5. REVENUE & COLLECTION ANALYTICS */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Collection Distribution by Category & Payment Mode */}
        <div className="glass-card" style={{ padding: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div>
              <span className="eyebrow">Financial Split</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Collection Channels &amp; Mix
              </h3>
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
              Total: ₹{kpis.todayCollection.toLocaleString("en-IN")}
            </span>
          </div>

          {/* Payment Method Split */}
          <div style={{ marginBottom: 18 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)" }}>Cash Drawer vs Digital (UPI/Card)</span>
              <span style={{ color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                {kpis.todayCollection > 0
                  ? `${Math.round((kpis.digitalCollection / kpis.todayCollection) * 100)}% Digital`
                  : "0%"}
              </span>
            </div>
            <div
              style={{
                height: 10,
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                overflow: "hidden",
                display: "flex",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: `${kpis.todayCollection > 0 ? (kpis.cashCollection / kpis.todayCollection) * 100 : 0}%`,
                  background: "#F59E0B",
                  transition: "width 0.3s ease",
                }}
                title={`Cash: ₹${kpis.cashCollection}`}
              />
              <div
                style={{
                  width: `${kpis.todayCollection > 0 ? (kpis.digitalCollection / kpis.todayCollection) * 100 : 0}%`,
                  background: "var(--accent-primary)",
                  transition: "width 0.3s ease",
                }}
                title={`Digital: ₹${kpis.digitalCollection}`}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 11, color: "var(--text-muted)" }}>
              <span style={{ color: "#F59E0B" }}>● Cash: ₹{kpis.cashCollection.toLocaleString("en-IN")}</span>
              <span style={{ color: "var(--accent-primary)" }}>● Digital: ₹{kpis.digitalCollection.toLocaleString("en-IN")}</span>
            </div>
          </div>

          {/* Category Yield Split */}
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)" }}>Category Revenue Contribution</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {/* Royal */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                  <span>Royal Tables (VIP)</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{categoryUsage.Royal.amountCollected}</span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--r-xs)", background: "var(--bg-surface-inset)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${kpis.todayCollection > 0 ? Math.min(100, (categoryUsage.Royal.amountCollected / kpis.todayCollection) * 100) : 0}%`,
                      height: "100%",
                      background: "#C084FC",
                    }}
                  />
                </div>
              </div>

              {/* Snooker */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                  <span>Snooker Tables (12ft)</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{categoryUsage.Snooker.amountCollected}</span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--r-xs)", background: "var(--bg-surface-inset)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${kpis.todayCollection > 0 ? Math.min(100, (categoryUsage.Snooker.amountCollected / kpis.todayCollection) * 100) : 0}%`,
                      height: "100%",
                      background: "var(--accent-primary)",
                    }}
                  />
                </div>
              </div>

              {/* Pool */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>
                  <span>Pool Tables (9ft)</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{categoryUsage.Pool.amountCollected}</span>
                </div>
                <div style={{ height: 6, borderRadius: "var(--r-xs)", background: "var(--bg-surface-inset)", overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${kpis.todayCollection > 0 ? Math.min(100, (categoryUsage.Pool.amountCollected / kpis.todayCollection) * 100) : 0}%`,
                      height: "100%",
                      background: "#60A5FA",
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions Feed */}
        <div className="glass-card" style={{ padding: 20, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span className="eyebrow">Settled Stream</span>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                  Recent Transactions
                </h3>
              </div>
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Real Turso Stream</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {sessions.filter((s) => s.paid || s.amount > 0).slice(0, 5).length === 0 ? (
                <div style={{ padding: "32px 12px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                  No settled transactions recorded yet today.
                </div>
              ) : (
                sessions
                  .filter((s) => s.paid || s.amount > 0)
                  .slice(0, 5)
                  .map((tr) => (
                    <div
                      key={tr.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        background: "var(--bg-surface-inset)",
                        borderRadius: "var(--r-xs)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 12.5, color: "var(--text-primary)" }}>
                          {tr.player}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                          {tr.table} · By {tr.created_by || "manager"}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                          ₹{tr.amount}
                        </div>
                        <div style={{ fontSize: 10, color: "var(--text-secondary)", textTransform: "uppercase" }}>
                          {tr.payment_method}
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          <div style={{ paddingTop: 12, borderTop: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text-muted)" }}>
            <span>Shift payment reconciliation active</span>
            <Link href="/staff" style={{ color: "var(--accent-primary)", fontWeight: 600 }}>
              Staff Ledger →
            </Link>
          </div>
        </div>
      </div>

      {/* 6. MODALS & DRAWERS */}

      {/* Slide-out Session Workspace */}
      <SessionDrawer
        table={selectedTableForDrawer}
        onClose={() => setSelectedTableForDrawer(null)}
        onSessionUpdated={() => loadDashboardData()}
      />

      {/* F&B Management Modal */}
      <ProductManagementModal
        open={productsModalOpen}
        onClose={() => setProductsModalOpen(false)}
        products={products}
        onAddProduct={(newP) => setProducts((p) => [newP, ...p])}
        onUpdateProduct={(up) => setProducts((p) => p.map((x) => (x.id === up.id ? up : x)))}
        onDeleteProduct={(id) => setProducts((p) => p.filter((x) => x.id !== id))}
      />

      {/* Table Rates Modal */}
      <RateManagementModal
        open={ratesModalOpen}
        onClose={() => setRatesModalOpen(false)}
        tables={tables}
        onUpdateTableRate={(id, rate) => {
          setTables((prev) => prev.map((t) => (t.id === id ? { ...t, hourly_rate: rate } : t)));
        }}
        onBulkUpdateRate={(kind, rate) => {
          setTables((prev) => prev.map((t) => (t.kind === kind ? { ...t, hourly_rate: rate } : t)));
        }}
      />

      {/* Customer & Match Details Modal (Triggered by Clicking Recent Customer Entry) */}
      {detailModalSession && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.78)",
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
              maxWidth: 440,
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Session Ledger Breakdown</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  {detailModalSession.player}
                </h3>
                {detailModalSession.phone && (
                  <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    Phone: {detailModalSession.phone}
                  </div>
                )}
              </div>
              <button
                onClick={() => setDetailModalSession(null)}
                style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13, marginBottom: 18 }}>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 10px", background: "var(--bg-surface-inset)", borderRadius: "var(--r-xs)" }}>
                <span style={{ color: "var(--text-secondary)" }}>Table &amp; Category:</span>
                <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>
                  {detailModalSession.table} ({detailModalSession.table_kind || "Snooker"})
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Session Start Time:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  {new Date(detailModalSession.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Duration Played:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--accent-primary)", fontWeight: 600 }}>
                  {detailModalSession.duration}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Applied Hourly Tariff:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  ₹{detailModalSession.rate_snapshot || detailModalSession.hourly_rate}/hr
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>Table Play Fee:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  ₹{detailModalSession.table_amount}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-muted)" }}>F&amp;B Snack Items:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                  ₹{detailModalSession.items_amount}
                </span>
              </div>

              {detailModalSession.discount_amount > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--amber)" }}>Discount Applied:</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)", fontWeight: 600 }}>
                    -₹{detailModalSession.discount_amount}
                  </span>
                </div>
              )}

              <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
                <span>Total Amount:</span>
                <span style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{detailModalSession.amount}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>Settlement Status:</span>
                <span style={{ fontWeight: 600, color: detailModalSession.paid ? "var(--accent-primary)" : "var(--amber)" }}>
                  {detailModalSession.paid ? `Paid via ${detailModalSession.payment_method?.toUpperCase() || "CASH"}` : "Unpaid / Udhar"}
                </span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                <span style={{ color: "var(--text-muted)" }}>Recorded By:</span>
                <span style={{ fontWeight: 600, color: "var(--text-secondary)" }}>
                  {detailModalSession.created_by || "manager"}
                </span>
              </div>
            </div>

            {detailModalSession.status === "active" ? (
              <button
                onClick={() => {
                  const targetTable = tables.find((t) => t.id === detailModalSession.table_id || t.name === detailModalSession.table);
                  if (targetTable) {
                    setDetailModalSession(null);
                    setSelectedTableForDrawer(targetTable);
                  }
                }}
                className="btn btn-primary"
                style={{ width: "100%", height: 38, fontWeight: 700 }}
              >
                Open Live Table Drawer &amp; Bill
              </button>
            ) : (
              <button
                onClick={() => setDetailModalSession(null)}
                className="btn"
                style={{ width: "100%", height: 38 }}
              >
                Close Details
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
