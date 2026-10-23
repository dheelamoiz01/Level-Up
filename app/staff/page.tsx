"use client";

import { useState, useEffect } from "react";
import {
  UserCheck,
  ShieldCheck,
  CircleDot,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  TrendingUp,
  Receipt,
  User,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getStaffAccountability, getLiveSessions } from "@/lib/turso/service";
import type { StaffStats, SessionRow } from "@/lib/types";

export default function StaffPage() {
  const { user, isOwner } = useAuth();
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [stats, liveSess] = await Promise.all([
        getStaffAccountability(),
        getLiveSessions(50),
      ]);
      setStaffStats(stats);
      setSessions(liveSess);
    } catch (err) {
      console.error("Failed to load staff stats:", err);
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

  return (
    <>
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Club Operations</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Floor Oversight</span>
          </div>
          <h1>Staff &amp; Manager Accountability</h1>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span
            className="badge"
            style={{
              fontSize: 11.5,
              padding: "4px 10px",
              background: "rgba(0, 199, 138, 0.08)",
              color: "var(--accent-primary)",
              borderColor: "rgba(0, 199, 138, 0.2)",
            }}
          >
            <ShieldCheck size={13} />
            <span>Audit Trail Active</span>
          </span>
        </div>
      </div>

      {/* Manager Performance Cards */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Today's Manager Ledger Summary
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            Accountability breakdown per authorized floor manager for customer entries, session lifecycle, and collections recorded today.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          {staffStats.map((st) => (
            <div
              key={st.managerName}
              className="glass-card"
              style={{
                padding: 20,
                border: "1px solid var(--border-default)",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
              }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "var(--r-sm)",
                        background: "var(--bg-surface-inset)",
                        border: "1px solid var(--border-subtle)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "var(--accent-primary)",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 700,
                        fontSize: 14,
                      }}
                    >
                      {st.managerName.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", textTransform: "capitalize" }}>
                        {st.managerName}
                      </h3>
                      <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                        Floor Manager · Shift Active
                      </div>
                    </div>
                  </div>

                  <span className="badge" style={{ fontSize: 10.5 }}>
                    {st.entriesToday} Entries Today
                  </span>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    background: "var(--bg-surface-inset)",
                    padding: 12,
                    borderRadius: "var(--r-sm)",
                    border: "1px solid var(--border-subtle)",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Collections Recorded</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      ₹{st.collectionsRecorded.toLocaleString("en-IN")}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>Outstanding (Udhar)</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                      ₹{st.outstandingPayments.toLocaleString("en-IN")}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>Active Sessions Started:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{st.sessionsStarted}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)" }}>
                    <span>Completed / Settled Sessions:</span>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{st.sessionsCompleted}</span>
                  </div>
                </div>
              </div>

              <div
                style={{
                  marginTop: 16,
                  paddingTop: 10,
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span>Synced via Turso ledger</span>
                <span style={{ color: "var(--accent-primary)" }}>● Online</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Manager Session Log Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
              Detailed Manager Operation Ledger
            </h3>
            <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>
              Every customer entry, session start, settlement, and discount linked to the responsible manager.
            </p>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>
            {sessions.length} matches logged
          </span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Time &amp; Manager</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Customer / Player</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Table</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Duration</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Discount</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Final Billed</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Payment</th>
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 13 }}>
                    No sessions logged yet. When managers start arena games, their actions appear here in real time.
                  </td>
                </tr>
              ) : (
                sessions.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)" }}>
                          {s.created_by || "manager"}
                        </span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                        {new Date(s.started_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>
                        {s.player}
                      </div>
                      {s.phone && (
                        <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                          {s.phone}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <span className="badge" style={{ fontSize: 10.5, padding: "2px 7px" }}>
                        {s.table}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {s.duration}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {s.discount_amount > 0 ? (
                        <span style={{ fontSize: 12, color: "var(--amber)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                          -₹{s.discount_amount}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: "var(--text-muted)" }}>₹0</span>
                      )}
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        ₹{s.amount}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
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
                        {s.paid ? `Paid (${s.payment_method?.toUpperCase() || "CASH"})` : "Udhar / Unpaid"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
