"use client";

import { useState, useEffect, useMemo } from "react";
import {
  Users,
  Search,
  Phone,
  DollarSign,
  Clock,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  UserCheck,
  Banknote,
  X,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLiveSessions, settleCustomerUdhar } from "@/lib/turso/service";
import type { SessionRow } from "@/lib/types";

interface CustomerAggregate {
  name: string;
  phone: string;
  matchCount: number;
  totalSpent: number;
  pendingUdhar: number;
  lastVisited: string;
  recentSessions: SessionRow[];
}

export default function CustomersPage() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUdharOnly, setFilterUdharOnly] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerAggregate | null>(null);

  // Collect Udhar modal state
  const [collectUdharCustomer, setCollectUdharCustomer] = useState<CustomerAggregate | null>(null);
  const [collectAmount, setCollectAmount] = useState<string>("");
  const [collectMethod, setCollectMethod] = useState<"cash" | "upi">("cash");
  const [collectUpiRef, setCollectUpiRef] = useState<string>("");
  const [isSubmittingUdhar, setIsSubmittingUdhar] = useState(false);
  const [udharSuccessFeedback, setUdharSuccessFeedback] = useState<string | null>(null);
  const [udharErrorMsg, setUdharErrorMsg] = useState<string | null>(null);

  const handleConfirmCollectUdhar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!collectUdharCustomer) return;

    const amt = parseFloat(collectAmount);
    if (isNaN(amt) || amt <= 0) {
      setUdharErrorMsg("Please enter a valid collection amount greater than ₹0.");
      return;
    }
    if (amt > collectUdharCustomer.pendingUdhar) {
      setUdharErrorMsg(`Collection amount cannot exceed outstanding balance of ₹${collectUdharCustomer.pendingUdhar}.`);
      return;
    }

    setIsSubmittingUdhar(true);
    setUdharErrorMsg(null);

    const res = await settleCustomerUdhar({
      customerName: collectUdharCustomer.name,
      customerPhone: collectUdharCustomer.phone || undefined,
      amountCollected: amt,
      paymentMethod: collectMethod,
      upiReference: collectMethod === "upi" ? collectUpiRef.trim() : undefined,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      setUdharSuccessFeedback(`Successfully collected ₹${amt} from ${collectUdharCustomer.name}!`);
      setCollectUdharCustomer(null);
      await loadData();
      setTimeout(() => setUdharSuccessFeedback(null), 4000);
    } else {
      setUdharErrorMsg(res.error || "Failed to collect payment.");
    }
    setIsSubmittingUdhar(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getLiveSessions(200);
      setSessions(data);
    } catch (err) {
      console.error("Failed to load customer records:", err);
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

  // Aggregate players from sessions
  const customerList = useMemo(() => {
    const map = new Map<string, CustomerAggregate>();

    sessions.forEach((s) => {
      const key = (s.player || "Walk-in").trim();
      const existing = map.get(key) || {
        name: key,
        phone: s.phone || "",
        matchCount: 0,
        totalSpent: 0,
        pendingUdhar: 0,
        lastVisited: s.started_at,
        recentSessions: [],
      };

      existing.matchCount += 1;
      existing.totalSpent += s.amount || 0;
      if (!s.paid && s.amount > 0) {
        existing.pendingUdhar += s.udhar_amount || s.amount;
      }
      if (!existing.phone && s.phone) {
        existing.phone = s.phone;
      }
      if (new Date(s.started_at) > new Date(existing.lastVisited)) {
        existing.lastVisited = s.started_at;
      }
      existing.recentSessions.push(s);
      map.set(key, existing);
    });

    return Array.from(map.values()).sort((a, b) => b.totalSpent - a.totalSpent);
  }, [sessions]);

  const filteredCustomers = useMemo(() => {
    return customerList.filter((c) => {
      if (filterUdharOnly && c.pendingUdhar <= 0) return false;
      if (search.trim()) {
        const q = search.toLowerCase().trim();
        const matchesName = c.name.toLowerCase().includes(q);
        const matchesPhone = c.phone.toLowerCase().includes(q);
        if (!matchesName && !matchesPhone) return false;
      }
      return true;
    });
  }, [customerList, search, filterUdharOnly]);

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Directory &amp; Accounts</span>
          </div>
          <h1>Club Customers &amp; Players</h1>
        </div>

        <Link href="/">
          <button className="btn" style={{ height: 34, fontSize: 12, gap: 6 }}>
            <ArrowLeft size={14} />
            <span>Return to Live Floor</span>
          </button>
        </Link>
      </div>

      {/* KPI Overview */}
      <div className="grid-3" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginBottom: 20 }}>
        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Total Registered Players</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            {customerList.length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Distinct player profiles in database</div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Active Matches Today</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
            {sessions.filter((s) => s.status === "active").length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Players currently on table</div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ color: "var(--amber)", marginBottom: 4 }}>Total Players with Udhar</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
            {customerList.filter((c) => c.pendingUdhar > 0).length}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Accounts with pending balance</div>
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div
        className="glass-card"
        style={{
          padding: "12px 16px",
          marginBottom: 20,
          display: "flex",
          gap: 12,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ position: "relative", minWidth: 240, flex: 1 }}>
          <Search
            size={13}
            style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}
          />
          <input
            placeholder="Search by player name or phone number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              height: 32,
              paddingLeft: 30,
              paddingRight: 10,
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-xs)",
              color: "var(--text-primary)",
              fontSize: 12,
            }}
          />
        </div>

        <button
          onClick={() => setFilterUdharOnly(!filterUdharOnly)}
          className="btn"
          style={{
            height: 32,
            fontSize: 12,
            background: filterUdharOnly ? "rgba(245, 158, 11, 0.15)" : "var(--bg-surface-inset)",
            borderColor: filterUdharOnly ? "rgba(245, 158, 11, 0.4)" : "var(--border-default)",
            color: filterUdharOnly ? "var(--amber)" : "var(--text-secondary)",
          }}
        >
          <span>Pending Udhar Only</span>
        </button>
      </div>

      {/* Customers Table */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Player Name</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Phone</th>
                <th style={{ textAlign: "center", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Matches Played</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Total Billed</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Outstanding Udhar</th>
                <th style={{ textAlign: "left", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Last Visited</th>
                <th style={{ textAlign: "right", padding: "10px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ padding: "36px 16px", textAlign: "center", color: "var(--text-muted)", fontSize: 12 }}>
                    No customer records found matching your search.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.name} style={{ borderBottom: "1px solid var(--border-subtle)" }} className="table-row-hover">
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{c.name}</div>
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                      {c.phone || "—"}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center", fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                      {c.matchCount}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                        ₹{c.totalSpent.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      {c.pendingUdhar > 0 ? (
                        <span style={{ fontSize: 13, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                          ₹{c.pendingUdhar.toLocaleString("en-IN")}
                        </span>
                      ) : (
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Clear</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {new Date(c.lastVisited).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                        {c.pendingUdhar > 0 && (
                          <button
                            onClick={() => {
                              setCollectUdharCustomer(c);
                              setCollectAmount(String(c.pendingUdhar));
                              setCollectMethod("cash");
                              setCollectUpiRef("");
                              setUdharErrorMsg(null);
                            }}
                            className="btn btn-primary"
                            style={{
                              height: 28,
                              fontSize: 11.5,
                              fontWeight: 700,
                              padding: "0 10px",
                              background: "rgba(245, 158, 11, 0.16)",
                              borderColor: "rgba(245, 158, 11, 0.55)",
                              color: "var(--amber)",
                              gap: 4,
                            }}
                          >
                            <Banknote size={12} />
                            <span>Collect Udhar</span>
                          </button>
                        )}
                        <button
                          onClick={() => setSelectedCustomer(c)}
                          className="btn"
                          style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                        >
                          History
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Success Notification Banner */}
      {udharSuccessFeedback && (
        <div
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            background: "rgba(0, 199, 138, 0.15)",
            border: "1px solid rgba(0, 199, 138, 0.4)",
            color: "var(--accent-primary)",
            padding: "12px 18px",
            borderRadius: "var(--r-sm)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 8px 30px rgba(0, 0, 0, 0.8)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={16} />
          <span>{udharSuccessFeedback}</span>
        </div>
      )}

      {/* Customer History Modal */}
      {selectedCustomer && (
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
          onClick={() => setSelectedCustomer(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 480,
              maxHeight: "calc(100dvh - 32px)",
              overflowY: "auto",
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 24,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginBottom: 2 }}>
              {selectedCustomer.name}
            </h3>
            {selectedCustomer.phone && (
              <div style={{ fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)", marginBottom: 16 }}>
                Phone: {selectedCustomer.phone}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }}>
              <div style={{ padding: "10px 12px", background: "var(--bg-surface-inset)", borderRadius: "var(--r-xs)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Lifetime Spend</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  ₹{selectedCustomer.totalSpent.toLocaleString("en-IN")}
                </div>
              </div>

              <div style={{ padding: "10px 12px", background: "var(--bg-surface-inset)", borderRadius: "var(--r-xs)" }}>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Outstanding Udhar</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: selectedCustomer.pendingUdhar > 0 ? "var(--amber)" : "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 2 }}>
                  ₹{selectedCustomer.pendingUdhar.toLocaleString("en-IN")}
                </div>
              </div>
            </div>

            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--text-primary)", marginBottom: 8 }}>
              Recent Matches ({selectedCustomer.recentSessions.length})
            </div>

            <div style={{ maxHeight: 200, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, marginBottom: 18 }}>
              {selectedCustomer.recentSessions.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  style={{
                    padding: "8px 10px",
                    background: "var(--bg-surface-inset)",
                    borderRadius: "var(--r-xs)",
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>{s.table}</span>
                    <span style={{ color: "var(--text-muted)", marginLeft: 6 }}>{s.duration}</span>
                  </div>
                  <div style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: s.paid ? "var(--accent-primary)" : "var(--amber)" }}>
                    ₹{s.amount} ({s.paid ? "Paid" : "Udhar"})
                  </div>
                </div>
              ))}
            </div>

            {selectedCustomer.pendingUdhar > 0 && (
              <button
                onClick={() => {
                  const target = selectedCustomer;
                  setSelectedCustomer(null);
                  setCollectUdharCustomer(target);
                  setCollectAmount(String(target.pendingUdhar));
                  setCollectMethod("cash");
                  setCollectUpiRef("");
                  setUdharErrorMsg(null);
                }}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  height: 38,
                  marginBottom: 10,
                  background: "var(--amber)",
                  borderColor: "var(--amber)",
                  color: "#000",
                  fontWeight: 700,
                  gap: 6,
                }}
              >
                <Banknote size={14} />
                <span>Collect Udhar (₹{selectedCustomer.pendingUdhar.toLocaleString("en-IN")})</span>
              </button>
            )}

            <button
              onClick={() => setSelectedCustomer(null)}
              className="btn"
              style={{ width: "100%", height: 36 }}
            >
              Close History
            </button>
          </div>
        </div>
      )}

      {/* Collect Udhar Modal */}
      {collectUdharCustomer && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => {
            if (!isSubmittingUdhar) setCollectUdharCustomer(null);
          }}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 440,
              background: "var(--bg-surface-raised)",
              border: "1px solid rgba(245, 158, 11, 0.4)",
              borderRadius: "var(--r-md)",
              padding: 22,
              boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
              <div>
                <span className="eyebrow" style={{ color: "var(--amber)" }}>Outstanding Credit Collection</span>
                <h3 style={{ fontSize: 17, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
                  Collect Udhar: {collectUdharCustomer.name}
                </h3>
              </div>
              <button
                disabled={isSubmittingUdhar}
                onClick={() => setCollectUdharCustomer(null)}
                style={{ all: "unset", cursor: "pointer", color: "var(--text-muted)" }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Balance Overview Card */}
            <div
              style={{
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                padding: "12px 14px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 11, color: "var(--text-muted)" }}>Total Pending Balance:</div>
                <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "var(--font-mono)", color: "var(--amber)" }}>
                  ₹{collectUdharCustomer.pendingUdhar.toLocaleString("en-IN")}
                </div>
              </div>

              {collectUdharCustomer.phone && (
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Phone Number:</div>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)", color: "var(--text-secondary)" }}>
                    {collectUdharCustomer.phone}
                  </div>
                </div>
              )}
            </div>

            {udharErrorMsg && (
              <div
                style={{
                  marginBottom: 14,
                  padding: "8px 12px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(239, 68, 68, 0.12)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "var(--danger)",
                  fontSize: 12,
                }}
              >
                {udharErrorMsg}
              </div>
            )}

            <form onSubmit={handleConfirmCollectUdhar} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Payment Mode Selector */}
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
                  Payment Method
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setCollectMethod("cash")}
                    style={{
                      all: "unset",
                      padding: "10px",
                      borderRadius: "var(--r-xs)",
                      background: collectMethod === "cash" ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                      border: collectMethod === "cash" ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-default)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: collectMethod === "cash" ? "var(--accent-primary)" : "var(--text-secondary)",
                    }}
                  >
                    <Banknote size={15} />
                    <span>Cash Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCollectMethod("upi")}
                    style={{
                      all: "unset",
                      padding: "10px",
                      borderRadius: "var(--r-xs)",
                      background: collectMethod === "upi" ? "rgba(0, 199, 138, 0.12)" : "var(--bg-surface-inset)",
                      border: collectMethod === "upi" ? "1.5px solid var(--accent-primary)" : "1px solid var(--border-default)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: collectMethod === "upi" ? "var(--accent-primary)" : "var(--text-secondary)",
                    }}
                  >
                    <CreditCard size={15} />
                    <span>UPI / QR Scan</span>
                  </button>
                </div>
              </div>

              {/* Amount to Collect */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)" }}>
                    Amount Collected (₹)
                  </label>
                  <button
                    type="button"
                    onClick={() => setCollectAmount(String(collectUdharCustomer.pendingUdhar))}
                    style={{ all: "unset", cursor: "pointer", fontSize: 11, color: "var(--accent-primary)", fontWeight: 600 }}
                  >
                    Full Balance (₹{collectUdharCustomer.pendingUdhar})
                  </button>
                </div>
                <input
                  type="number"
                  min="1"
                  max={collectUdharCustomer.pendingUdhar}
                  required
                  placeholder="₹ 0"
                  value={collectAmount}
                  onChange={(e) => setCollectAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 38,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 15,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              {/* UPI Reference if applicable */}
              {collectMethod === "upi" && (
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    UPI / UTR Transaction ID (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI 42819..."
                    value={collectUpiRef}
                    onChange={(e) => setCollectUpiRef(e.target.value)}
                    style={{
                      width: "100%",
                      height: 34,
                      padding: "0 10px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>
              )}

              {/* Real-time Remaining Balance preview */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "8px 10px",
                  background: "var(--bg-surface-inset)",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12,
                }}
              >
                <span style={{ color: "var(--text-muted)" }}>Remaining Udhar after collection:</span>
                <span
                  style={{
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color:
                      collectUdharCustomer.pendingUdhar - (parseFloat(collectAmount) || 0) <= 0
                        ? "var(--accent-primary)"
                        : "var(--amber)",
                  }}
                >
                  ₹{Math.max(0, collectUdharCustomer.pendingUdhar - (parseFloat(collectAmount) || 0))}
                </span>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                <button
                  type="button"
                  disabled={isSubmittingUdhar}
                  onClick={() => setCollectUdharCustomer(null)}
                  className="btn"
                  style={{ flex: 1, height: 38, fontSize: 12.5 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingUdhar || !collectAmount || parseFloat(collectAmount) <= 0}
                  className="btn btn-primary"
                  style={{
                    flex: 1.5,
                    height: 38,
                    fontSize: 12.5,
                    fontWeight: 700,
                    background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
                    gap: 6,
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>{isSubmittingUdhar ? "Recording..." : `Confirm Collection (₹${collectAmount || 0})`}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
