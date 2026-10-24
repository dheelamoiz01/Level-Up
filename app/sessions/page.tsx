"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Clock,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  CircleDot,
  DollarSign,
  User,
  Phone,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLiveSessions, getLiveTables, voidOrDeleteSession } from "@/lib/turso/service";
import type { SessionRow, ClubTable } from "@/lib/types";
import { ManageSessionModal } from "@/components/floor/ManageSessionModal";
import { Trash2 } from "lucide-react";

export default function SessionsPage() {
  const { user, isOwner } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");

  // Selected session to manage
  const [selectedTableToManage, setSelectedTableToManage] = useState<ClubTable | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDeleteSession = async (s: SessionRow) => {
    if (!confirm(`Are you sure you want to permanently delete session for "${s.player}" on ${s.table}? This will remove it from all ledgers.`)) return;
    setDeletingId(s.id);
    await voidOrDeleteSession({
      sessionId: s.id,
      tableId: s.table_id,
      tableName: s.table,
      playerName: s.player,
      managerName: user?.username || "manager",
      reason: "Deleted from Shift Sessions log by manager",
    });
    setDeletingId(null);
    loadData();
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [liveSessions, liveTables] = await Promise.all([
        getLiveSessions(100),
        getLiveTables(),
      ]);
      setSessions(liveSessions);
      setTables(liveTables);
    } catch (err) {
      console.error("Failed to load sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const handleSync = () => loadData();
    window.addEventListener("levelup_floor_update", handleSync);
    return () => window.removeEventListener("levelup_floor_update", handleSync);
  }, []);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (kindFilter !== "All" && s.table_kind !== kindFilter) return false;
      if (statusFilter === "Active" && s.status !== "active") return false;
      if (statusFilter === "Completed" && s.status !== "completed") return false;
      if (paymentFilter === "Paid" && !s.paid && s.payment_status !== "Paid") return false;
      if (paymentFilter === "Unpaid" && (s.paid || s.payment_status === "Paid")) return false;

      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesPlayer = s.player.toLowerCase().includes(q);
        const matchesPhone = s.phone ? s.phone.toLowerCase().includes(q) : false;
        const matchesTable = s.table.toLowerCase().includes(q);
        if (!matchesPlayer && !matchesPhone && !matchesTable) return false;
      }
      return true;
    });
  }, [sessions, search, kindFilter, statusFilter, paymentFilter]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Operations Log</span>
          </div>
          <h1>Shift Sessions &amp; Matches</h1>
        </div>

        <Link href="/">
          <button className="btn" style={{ height: 34, fontSize: 12, gap: 6 }}>
            <ArrowLeft size={14} />
            <span>Return to Live Floor</span>
          </button>
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          gap: 10,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", minWidth: 160, flex: 1 }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            placeholder="Search by player, phone, table..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 32,
              paddingLeft: 30,
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
            padding: "0 10px",
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
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            height: 32,
            padding: "0 10px",
            background: "var(--bg-surface-inset)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--r-xs)",
            color: "var(--text-primary)",
            fontSize: 12,
          }}
        >
          <option value="All">All Statuses</option>
          <option value="Active">Active Only</option>
          <option value="Completed">Completed</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          style={{
            height: 32,
            padding: "0 10px",
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
      </div>

      {/* Sessions Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Start Time</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Duration</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Total Billed</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Payment</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Manager</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No sessions match the selected filters.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((s) => {
                  const isActive = s.status === "active";
                  return (
                    <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="table-row-hover">
                      <td style={{ padding: "12px 16px" }}>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{s.player}</div>
                        {s.phone && s.phone !== "null" && (
                          <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.phone}</div>
                        )}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.table} ({s.table_kind || "Snooker"})
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                        {s.duration}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                          ₹{s.amount}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
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
                      <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                        {s.created_by || "manager"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, justifyContent: "flex-end" }}>
                          {isActive && (
                            <button
                              onClick={() => {
                                const tbl = tables.find((t) => t.id === s.table_id || t.name === s.table);
                                if (tbl) setSelectedTableToManage(tbl);
                              }}
                              className="btn btn-primary"
                              style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                            >
                              Manage
                            </button>
                          )}
                          <button
                            type="button"
                            disabled={deletingId === s.id}
                            onClick={() => handleDeleteSession(s)}
                            className="btn"
                            title="Delete Session"
                            style={{
                              height: 28,
                              fontSize: 11,
                              padding: "0 8px",
                              color: "var(--danger)",
                              borderColor: "rgba(239, 68, 68, 0.35)",
                              background: "rgba(239, 68, 68, 0.08)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            <Trash2 size={12} />
                            <span>{deletingId === s.id ? "..." : "Delete"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedTableToManage && (
        <ManageSessionModal
          table={selectedTableToManage}
          onClose={() => setSelectedTableToManage(null)}
          onSessionUpdated={() => {
            setSelectedTableToManage(null);
            loadData();
          }}
        />
      )}
    </>
  );
}
