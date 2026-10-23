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
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import { getLiveSessions, collectFloorPayment } from "@/lib/turso/service";
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
                      <button
                        onClick={() => setSelectedCustomer(c)}
                        className="btn"
                        style={{ height: 28, fontSize: 11, padding: "0 10px" }}
                      >
                        History
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </>
  );
}
