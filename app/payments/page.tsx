"use client";

import { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  DollarSign,
  Banknote,
  Search,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowUpRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLiveSessions, collectFloorPayment } from "@/lib/turso/service";
import type { SessionRow } from "@/lib/types";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [settlingSession, setSettlingSession] = useState<SessionRow | null>(null);
  const [settleMethod, setSettleMethod] = useState<"cash" | "upi">("cash");
  const [settleAmount, setSettleAmount] = useState<string>("");
  const [settleReference, setSettleReference] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLiveSessions(100);
      setSessions(data);
    } catch (err) {
      console.error("Failed to load payments:", err);
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

  // Summary Metrics
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySessions = sessions.filter((s) => s.started_at.startsWith(todayStr));

  const totalCollected = useMemo(() => {
    return todaySessions
      .filter((s) => s.paid)
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [todaySessions]);

  const cashCollected = useMemo(() => {
    return todaySessions
      .filter((s) => s.paid && (!s.payment_method || s.payment_method === "cash"))
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [todaySessions]);

  const digitalCollected = useMemo(() => {
    return todaySessions
      .filter((s) => s.paid && s.payment_method === "upi")
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [todaySessions]);

  const pendingUdhar = useMemo(() => {
    return sessions
      .filter((s) => !s.paid && s.amount > 0)
      .reduce((sum, s) => sum + (s.udhar_amount || s.amount), 0);
  }, [sessions]);

  // Filtered Payments / Udhar list
  const filteredList = useMemo(() => {
    return sessions.filter((s) => {
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesPlayer = s.player.toLowerCase().includes(q);
        const matchesPhone = s.phone ? s.phone.toLowerCase().includes(q) : false;
        const matchesTable = s.table.toLowerCase().includes(q);
        if (!matchesPlayer && !matchesPhone && !matchesTable) return false;
      }
      return true;
    });
  }, [sessions, search]);

  const handleSettleSubmit = async () => {
    if (!settlingSession) return;
    setIsSubmitting(true);
    const amountNum = parseFloat(settleAmount) || settlingSession.amount;

    await collectFloorPayment({
      tableId: settlingSession.table_id || settlingSession.table,
      sessionId: settlingSession.id,
      finalTotal: amountNum,
      cashReceived: settleMethod === "cash" ? amountNum : 0,
      upiReceived: settleMethod === "upi" ? amountNum : 0,
      upiReference: settleMethod === "upi" ? settleReference : undefined,
      udharAmount: 0,
      managerName: user?.username || "manager",
    });

    setIsSubmitting(false);
    setSettlingSession(null);
    loadData();
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Cashier &amp; Reconciliation</span>
          </div>
          <h1>Operational Payments &amp; Udhar</h1>
        </div>

        <Link href="/">
          <button className="btn" style={{ height: 34, fontSize: 12, gap: 6 }}>
            <ArrowLeft size={14} />
            <span>Return to Live Floor</span>
          </button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Today's Total Collected</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Actual money in hand today</div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Cash Drawer</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{cashCollected.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Physical cash collected</div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>UPI / Digital (QR)</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{digitalCollected.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Direct bank / UPI transfers</div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: 4 }}>Outstanding Udhar</div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
            ₹{pendingUdhar.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Uncollected player balances</div>
        </div>
      </div>

      {/* Payment Transactions & Settlement Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div
          style={{
            padding: "14px 18px",
            borderBottom: "1px solid var(--border-subtle)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
            Settlement &amp; Collections Stream
          </h2>

          <div style={{ position: "relative", minWidth: 200 }}>
            <Search
              size={13}
              style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
            />
            <input
              placeholder="Search player, table..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                width: "100%",
                height: 30,
                paddingLeft: 28,
                paddingRight: 8,
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 11.5,
              }}
            />
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Table</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Date &amp; Time</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Amount</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Status / Mode</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Cashier</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredList.map((s) => (
                <tr key={s.id} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="table-row-hover">
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{s.player}</div>
                    {s.phone && <div style={{ fontSize: 11, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>{s.phone}</div>}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)" }}>
                    {s.table}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    {new Date(s.started_at).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
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
                      {s.paid ? `Paid (${s.payment_method?.toUpperCase() || "CASH"})` : "Unpaid (Udhar)"}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)" }}>
                    {s.created_by || "manager"}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}>
                    {!s.paid ? (
                      <button
                        onClick={() => {
                          setSettlingSession(s);
                          setSettleAmount(String(s.amount));
                        }}
                        className="btn btn-primary"
                        style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                      >
                        Settle Udhar
                      </button>
                    ) : (
                      <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Settled</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Settle Udhar Modal */}
      {settlingSession && (
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
          onClick={() => setSettlingSession(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 400,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
              Settle Udhar: {settlingSession.player}
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 16 }}>
              {settlingSession.table} · Outstanding Balance: ₹{settlingSession.amount}
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 18 }}>
              <div>
                <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Payment Mode
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setSettleMethod("cash")}
                    className="btn"
                    style={{
                      height: 36,
                      background: settleMethod === "cash" ? "var(--bg-surface-hover)" : "var(--bg-surface-inset)",
                      border: settleMethod === "cash" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                      color: settleMethod === "cash" ? "#FFFFFF" : "var(--text-secondary)",
                    }}
                  >
                    Cash
                  </button>
                  <button
                    type="button"
                    onClick={() => setSettleMethod("upi")}
                    className="btn"
                    style={{
                      height: 36,
                      background: settleMethod === "upi" ? "var(--bg-surface-hover)" : "var(--bg-surface-inset)",
                      border: settleMethod === "upi" ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                      color: settleMethod === "upi" ? "#FFFFFF" : "var(--text-secondary)",
                    }}
                  >
                    UPI / QR
                  </button>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                  Amount Collected (₹)
                </label>
                <input
                  type="number"
                  value={settleAmount}
                  onChange={(e) => setSettleAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              {settleMethod === "upi" && (
                <div>
                  <label style={{ fontSize: 11.5, color: "var(--text-secondary)", display: "block", marginBottom: 4 }}>
                    UPI Reference / UTR (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 423981092831"
                    value={settleReference}
                    onChange={(e) => setSettleReference(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                    }}
                  />
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setSettlingSession(null)}
                className="btn"
                style={{ flex: 1, height: 36 }}
              >
                Cancel
              </button>
              <button
                onClick={handleSettleSubmit}
                disabled={isSubmitting}
                className="btn btn-primary"
                style={{ flex: 1, height: 36 }}
              >
                {isSubmitting ? "Settling..." : "Confirm Collection"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
