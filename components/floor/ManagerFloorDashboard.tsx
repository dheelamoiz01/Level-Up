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

      // Sort tables logically: Royal 1, Royal 2, Snooker 1, Snooker 2, Pool 1
      const sorted = [...liveTables].sort((a, b) => {
        const orderKind: Record<string, number> = { Royal: 1, Snooker: 2, Pool: 3 };
        const kDiff = (orderKind[a.kind] || 9) - (orderKind[b.kind] || 9);
        if (kDiff !== 0) return kDiff;
        return a.name.localeCompare(b.name);
      });

      setTables(sorted);
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

    // 1-second live countdown ticker
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
      {/* 1. Page Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Floor Operations</span>
          </div>
          <h1>Live Table Floor</h1>
        </div>

        {/* Header Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Quick Filter Search */}
          <div style={{ position: "relative", minWidth: 160, flex: 1 }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search table or player..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 34,
                paddingLeft: 30,
                paddingRight: 10,
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-sm)",
                color: "var(--text-primary)",
                fontSize: 12.5,
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
            style={{ height: 34, fontSize: 12.5 }}
          >
            <Play size={13} fill="currentColor" />
            <span>Start Session</span>
          </button>
        </div>
      </div>

      {/* 2. Operational KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 12, marginBottom: 20 }}>
        {/* Available Tables */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Available Tables</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {availableTables.length} of 5
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Ready for players
          </div>
        </div>

        {/* Occupied Tables */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ color: "var(--accent-primary)", marginBottom: 4 }}>Active Matches</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
            {occupiedTables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
            Tables currently in play
          </div>
        </div>

        {/* Ending Soon / Time Expired */}
        <div
          className="glass-card"
          style={{
            padding: "14px 16px",
            border: endingSoonTables.length > 0 ? "1px solid rgba(245, 158, 11, 0.4)" : undefined,
          }}
        >
          <div className="eyebrow" style={{ color: endingSoonTables.length > 0 ? "var(--amber)" : "var(--text-muted)", marginBottom: 4 }}>
            Ending Soon / Time Up
          </div>
          <div
            style={{
              fontSize: 24,
              fontWeight: 700,
              color: endingSoonTables.length > 0 ? "var(--amber)" : "var(--text-primary)",
              fontFamily: "var(--font-mono)",
            }}
          >
            {endingSoonTables.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            &lt; 5m left or expired
          </div>
        </div>

        {/* Today's Udhar Credit */}
        <div className="glass-card" style={{ padding: "14px 16px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Pending Udhar</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{todayPendingUdhar.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
            Unsettled player credit
          </div>
        </div>
      </div>

      {/* 3. Time Expired Alert Banner (Only when needed) */}
      {endingSoonTables.some((t) => t.is_time_up) && (
        <div
          className="glass-card"
          style={{
            padding: "12px 16px",
            marginBottom: 20,
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px solid rgba(239, 68, 68, 0.35)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} style={{ color: "var(--danger)", flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--danger)" }}>
                Match duration expired on: {endingSoonTables.filter((t) => t.is_time_up).map((t) => t.name).join(", ")}
              </div>
              <div style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
                Collect payment or extend match time.
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
                  className="btn"
                  style={{
                    height: 32,
                    fontSize: 11.5,
                    fontWeight: 600,
                    borderColor: "rgba(239, 68, 68, 0.4)",
                    color: "var(--danger)",
                  }}
                >
                  Manage {t.name}
                </button>
              ))}
          </div>
        </div>
      )}

      {/* 4. MAIN LIVE TABLE GRID (Responsive 3-Column on Desktop, 2 on Tablet, 1 on Mobile) */}
      <div style={{ marginBottom: 28 }}>
        <div className="floor-table-grid">
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
              />
            );
          })}
        </div>
      </div>

      {/* 5. ACTIVE SESSIONS OVERVIEW */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden", marginBottom: 28 }}>
        <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
              Active Sessions ({occupiedTables.length})
            </h3>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
            Floor operations
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Countdown</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Accrued Bill</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {occupiedTables.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: "32px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No active sessions right now. Click &quot;Start Session&quot; on any available table above.
                  </td>
                </tr>
              ) : (
                occupiedTables.map((t) => (
                  <tr key={t.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "10px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{t.player}</div>
                      {t.phone && <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{t.phone}</div>}
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{t.name} ({t.kind})</span>
                    </td>
                    <td style={{ padding: "10px 16px" }}>
                      <span
                        style={{
                          fontSize: 12,
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          color: t.is_time_up ? "var(--danger)" : "var(--accent-primary)",
                        }}
                      >
                        {t.is_time_up ? "Expired" : formatCountdown(t.remaining_seconds ?? 0)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        ₹{t.bill || 0}
                      </span>
                    </td>
                    <td style={{ padding: "10px 16px", textAlign: "right" }}>
                      <button
                        onClick={() => setManageModalTable(t)}
                        className="btn"
                        style={{ height: 28, fontSize: 11.5, padding: "0 10px" }}
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

      {/* Modals */}
      {startModalTable && (
        <StartSessionModal
          table={startModalTable}
          pricingList={pricingList}
          onClose={() => setStartModalTable(null)}
          onSessionStarted={() => {
            setStartModalTable(null);
            loadFloorData();
          }}
        />
      )}

      {manageModalTable && (
        <ManageSessionModal
          table={manageModalTable}
          products={products}
          pricingList={pricingList}
          onClose={() => setManageModalTable(null)}
          onSessionUpdated={() => {
            setManageModalTable(null);
            loadFloorData();
          }}
        />
      )}
    </>
  );
}
