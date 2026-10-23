"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Users,
  CircleDot,
  Clock,
  Play,
  Sliders,
  AlertTriangle,
  Receipt,
  Plus,
  ShoppingBag,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  User,
  Phone,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getLiveTables,
  getLiveSessions,
  getLiveProducts,
  getTablePricing,
  formatDurationFromStart,
  calculateAccruedBill,
  formatCountdown,
} from "@/lib/turso/service";
import type { ClubTable, Product, SessionRow, TablePricing } from "@/lib/types";
import { FloorTableCard } from "./FloorTableCard";
import { StartSessionModal } from "./StartSessionModal";
import { ManageSessionModal } from "./ManageSessionModal";

export function ManagerFloorDashboard() {
  const { user } = useAuth();

  const [tables, setTables] = useState<ClubTable[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [pricingList, setPricingList] = useState<TablePricing[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Search query for tables & active players
  const [searchQuery, setSearchQuery] = useState("");

  // Modals state
  const [startModalTable, setStartModalTable] = useState<ClubTable | null>(null);
  const [manageModalTable, setManageModalTable] = useState<ClubTable | null>(null);

  // Load real data from Turso
  const loadFloorData = async () => {
    try {
      const [liveTables, liveSessions, liveProducts, livePricing] = await Promise.all([
        getLiveTables(),
        getLiveSessions(50),
        getLiveProducts(),
        getTablePricing(),
      ]);

      setTables(liveTables);
      setSessions(liveSessions);
      setProducts(liveProducts);
      setPricingList(livePricing);
      setLastRefreshed(new Date());
    } catch (err) {
      console.error("Floor data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFloorData();

    // Event listener for floor updates
    const handleUpdate = () => loadFloorData();
    window.addEventListener("levelup_floor_update", handleUpdate);

    // Cross-tab broadcast channel
    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel("levelup_floor_sync");
      bc.onmessage = () => loadFloorData();
    } catch (e) {}

    // 8-second polling fallback
    const pollTimer = setInterval(() => {
      loadFloorData();
    }, 8000);

    // 1-second live countdown and elapsed ticker
    const tickTimer = setInterval(() => {
      setTables((prev) =>
        prev.map((t) => {
          if (t.status === "playing") {
            const startIso = t.session_started_at;
            const scheduledEndIso = t.scheduled_end_at;
            let remainingSec = 0;
            let isTimeUp = false;

            if (scheduledEndIso) {
              remainingSec = Math.floor((new Date(scheduledEndIso).getTime() - Date.now()) / 1000);
              isTimeUp = remainingSec <= 0;
            }

            return {
              ...t,
              elapsed: startIso ? formatDurationFromStart(startIso) : t.elapsed,
              remaining_seconds: remainingSec,
              is_time_up: isTimeUp,
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

  // Quick summary counts
  const totalTables = tables.length || 5;
  const occupiedTables = tables.filter((t) => t.status === "playing");
  const availableTables = tables.filter((t) => t.status === "available");
  const endingSoonTables = occupiedTables.filter(
    (t) => (t.remaining_seconds ?? 0) <= 300 // <= 5 mins or time up
  );

  // Today's pending Udhar credit
  const todayPendingUdhar = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return sessions
      .filter((s) => s.started_at.startsWith(todayStr) && (s.udhar_amount || (!s.paid && s.amount)))
      .reduce((sum, s) => sum + (s.udhar_amount || (!s.paid ? s.amount : 0)), 0);
  }, [sessions]);

  // Filtered tables based on search
  const filteredTables = useMemo(() => {
    if (!searchQuery.trim()) return tables;
    const q = searchQuery.toLowerCase().trim();
    return tables.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.kind.toLowerCase().includes(q) ||
        (t.player && t.player.toLowerCase().includes(q)) ||
        (t.phone && t.phone.toLowerCase().includes(q))
    );
  }, [tables, searchQuery]);

  return (
    <>
      {/* 1. FLOOR OPERATIONS HEADER */}
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Floor Operations Console</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--accent-primary)" }}>Manager Shift Active</span>
          </div>
          <h1>Live Table Operations</h1>
        </div>

        {/* Quick controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Manager Badge */}
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
            <span>{occupiedTables.length} Tables In Play · {availableTables.length} Ready</span>
          </div>

          {/* Quick search input */}
          <div style={{ position: "relative", minWidth: 200 }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search table or player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 32,
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

          <button
            onClick={() => {
              const available = tables.find((t) => t.status === "available");
              if (available) setStartModalTable(available);
              else alert("All tables are currently occupied.");
            }}
            className="btn btn-primary"
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Play size={13} fill="currentColor" />
            <span>Quick Start Match</span>
          </button>
        </div>
      </div>

      {/* 2. QUICK FLOOR SUMMARY CARDS */}
      <div className="grid-5" style={{ marginBottom: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        {/* Total Tables */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Fleet Capacity</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            5 Tables
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            2 Royal · 2 Snooker · 1 Pool
          </div>
        </div>

        {/* Available Tables */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 2 }}>Available Now</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {availableTables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Ready for incoming players
          </div>
        </div>

        {/* Occupied Tables */}
        <div className="glass-card" style={{ padding: "14px 16px", border: "1px solid rgba(0, 199, 138, 0.3)" }}>
          <div className="eyebrow" style={{ color: "var(--accent-primary)", marginBottom: 2 }}>In Play (Active)</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
            {occupiedTables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            Live games running
          </div>
        </div>

        {/* Ending Soon / Time Up */}
        <div
          className="glass-card"
          style={{
            padding: "14px 16px",
            border: endingSoonTables.length > 0 ? "1px solid rgba(239, 68, 68, 0.4)" : undefined,
            background: endingSoonTables.length > 0 ? "rgba(239, 68, 68, 0.05)" : undefined,
          }}
        >
          <div className="eyebrow" style={{ color: endingSoonTables.length > 0 ? "var(--danger)" : "var(--text-muted)", marginBottom: 2 }}>
            Ending Soon / Time Up
          </div>
          <div
            style={{
              fontSize: 22,
              fontWeight: 800,
              color: endingSoonTables.length > 0 ? "var(--danger)" : "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {endingSoonTables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            &lt; 5m left or expired
          </div>
        </div>

        {/* Pending Udhar Credit */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: 2 }}>Today's Udhar Balance</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
            ₹{todayPendingUdhar.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Unsettled player credit
          </div>
        </div>
      </div>

      {/* 3. URGENT TIME-UP ALERT PANEL (IF ANY TABLE IS TIME UP) */}
      {endingSoonTables.some((t) => t.is_time_up) && (
        <div
          className="glass-card"
          style={{
            padding: "14px 18px",
            marginBottom: 20,
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.4)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.2)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <AlertTriangle size={18} />
            </div>
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--danger)" }}>
                Match Duration Expired on {endingSoonTables.filter((t) => t.is_time_up).map((t) => t.name).join(", ")}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Ask player if they wish to extend by 30m / 1h, or proceed to bill collection.
              </div>
            </div>
          </div>

          <div style={{ display: "flex", gap: 8 }}>
            {endingSoonTables
              .filter((t) => t.is_time_up)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => setManageModalTable(t)}
                  className="btn btn-primary"
                  style={{
                    height: 32,
                    fontSize: 12,
                    fontWeight: 700,
                    background: "var(--danger)",
                    borderColor: "var(--danger)",
                  }}
                >
                  Manage {t.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 4. MAIN SECTION — ANIMATED LIVE TABLE FLOOR (5 TABLES) */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>
              Live Arena Floor (5 Tables)
            </h2>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              One-click match start, live countdown timers, and in-game order management.
            </p>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            Auto-refreshes · Last sync: {lastRefreshed.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>

        {/* 5 Physical Table Cards Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(330px, 1fr))",
            gap: 16,
          }}
        >
          {filteredTables.map((table) => {
            const pricing = pricingList.find((p) => p.category === table.kind);
            return (
              <FloorTableCard
                key={table.id}
                table={table}
                rate30m={pricing?.rate_30m ?? (table.kind === "Royal" ? 300 : table.kind === "Snooker" ? 200 : 150)}
                rate60m={pricing?.rate_60m ?? (table.kind === "Royal" ? 500 : table.kind === "Snooker" ? 350 : 250)}
                onStartSession={(t) => setStartModalTable(t)}
                onManageSession={(t) => setManageModalTable(t)}
                onQuickAddItems={(t) => setManageModalTable(t)}
              />
            );
          })}
        </div>
      </div>

      {/* 5. ACTIVE SESSIONS ROSTER & RECENT CUSTOMER LEDGER */}
      <div className="grid-2" style={{ marginBottom: 28 }}>
        {/* Active Sessions Quick Table */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="eyebrow" style={{ color: "var(--accent-primary)" }}>Live Matches</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Active Sessions ({occupiedTables.length})
              </h3>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Floor operations</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player &amp; Table</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Countdown</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Bill</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {occupiedTables.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: "32px 14px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                      No active matches right now. Click &quot;Start Session&quot; on any available table above.
                    </td>
                  </tr>
                ) : (
                  occupiedTables.map((t) => (
                    <tr key={t.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                      <td style={{ padding: "10px 14px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{t.player}</div>
                        <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{t.name} ({t.kind})</div>
                      </td>
                      <td style={{ padding: "10px 14px" }}>
                        <div
                          style={{
                            fontSize: 12.5,
                            fontFamily: "var(--font-mono)",
                            fontWeight: 700,
                            color: t.is_time_up ? "var(--danger)" : (t.remaining_seconds ?? 0) <= 300 ? "var(--amber)" : "var(--accent-primary)",
                          }}
                        >
                          {t.is_time_up ? "TIME UP" : formatCountdown(t.remaining_seconds ?? 0)}
                        </div>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                          ₹{t.bill || 0}
                        </span>
                      </td>
                      <td style={{ padding: "10px 14px", textAlign: "right" }}>
                        <button
                          onClick={() => setManageModalTable(t)}
                          className="btn"
                          style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                        >
                          Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Customer Entries Ledger */}
        <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <span className="eyebrow">Floor Turnaround</span>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Recent Entries &amp; Settlements
              </h3>
            </div>
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Today&apos;s shift</span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player</th>
                  <th style={{ textAlign: "left", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Amount</th>
                  <th style={{ textAlign: "right", padding: "10px 14px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 5).map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 14px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 12.5 }}>{s.player}</div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>
                    <td style={{ padding: "10px 14px", fontSize: 11.5, color: "var(--text-secondary)" }}>
                      {s.table}
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
                      <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        ₹{s.amount}
                      </span>
                    </td>
                    <td style={{ padding: "10px 14px", textAlign: "right" }}>
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
                        {s.paid ? `Paid (${s.payment_method?.toUpperCase() || "CASH"})` : "Udhar / Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODALS */}

      {/* Start Session Modal */}
      <StartSessionModal
        table={startModalTable}
        pricingList={pricingList}
        onClose={() => setStartModalTable(null)}
        onSessionStarted={() => loadFloorData()}
      />

      {/* Manage Session / Collect Payment / Extend Modal */}
      <ManageSessionModal
        table={manageModalTable}
        products={products}
        pricingList={pricingList}
        onClose={() => setManageModalTable(null)}
        onSessionUpdated={() => loadFloorData()}
      />
    </>
  );
}
