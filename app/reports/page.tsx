"use client";

import { useState, useEffect, useMemo } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  DollarSign,
  Receipt,
  Users,
  ShieldAlert,
  ArrowLeft,
  CheckCircle2,
  FileSpreadsheet,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getLiveSessions,
  getExpenses,
  getStaffAccountability,
} from "@/lib/turso/service";
import type { SessionRow, Expense, StaffStats } from "@/lib/types";

export default function ReportsPage() {
  const { user, isOwner } = useAuth();
  const [sessions, setSessions] = useState<SessionRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<"today" | "week" | "month" | "all">("today");

  const loadData = async () => {
    setLoading(true);
    try {
      const [sess, exp, stf] = await Promise.all([
        getLiveSessions(200),
        getExpenses(),
        getStaffAccountability(),
      ]);
      setSessions(sess);
      setExpenses(exp);
      setStaffStats(stf);
    } catch (err) {
      console.error("Failed to load reports:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Strict Owner Access Guard
  if (!isOwner) {
    return (
      <div
        className="glass-card"
        style={{
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 16,
          maxWidth: 500,
          margin: "60px auto",
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "50%",
            background: "rgba(239, 68, 68, 0.12)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ShieldAlert size={24} />
        </div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)" }}>
          Owner Access Required
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
          Financial auditing, revenue reports, and club expenditure analysis are restricted to the Club Owner.
        </p>
        <Link href="/">
          <button className="btn btn-primary" style={{ marginTop: 8 }}>
            Return to Live Floor
          </button>
        </Link>
      </div>
    );
  }

  // Filter records by time range
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const currentMonthStr = todayStr.slice(0, 7);
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      const sessDate = new Date(s.started_at);
      if (timeRange === "today") return s.started_at.startsWith(todayStr);
      if (timeRange === "week") return sessDate >= oneWeekAgo;
      if (timeRange === "month") return s.started_at.startsWith(currentMonthStr);
      return true;
    });
  }, [sessions, timeRange, todayStr, currentMonthStr]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = new Date(e.expense_date);
      if (timeRange === "today") return e.expense_date === todayStr;
      if (timeRange === "week") return expDate >= oneWeekAgo;
      if (timeRange === "month") return e.expense_date.startsWith(currentMonthStr);
      return true;
    });
  }, [expenses, timeRange, todayStr, currentMonthStr]);

  // Aggregate Metrics
  const totalBilled = filteredSessions.reduce((sum, s) => sum + (s.amount || 0), 0);
  const totalCollected = filteredSessions
    .filter((s) => s.paid)
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const cashCollected = filteredSessions
    .filter((s) => s.paid && (!s.payment_method || s.payment_method === "cash"))
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const digitalCollected = filteredSessions
    .filter((s) => s.paid && s.payment_method === "upi")
    .reduce((sum, s) => sum + (s.amount || 0), 0);

  const totalExpenseAmount = filteredExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const netCollection = totalCollected - totalExpenseAmount;
  const pendingUdhar = filteredSessions
    .filter((s) => !s.paid && s.amount > 0)
    .reduce((sum, s) => sum + (s.udhar_amount || s.amount), 0);

  // Category yield breakdown
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; billed: number; collected: number }> = {
      Royal: { count: 0, billed: 0, collected: 0 },
      Snooker: { count: 0, billed: 0, collected: 0 },
      Pool: { count: 0, billed: 0, collected: 0 },
    };

    filteredSessions.forEach((s) => {
      const k = s.table_kind || "Snooker";
      if (!stats[k]) stats[k] = { count: 0, billed: 0, collected: 0 };
      stats[k].count += 1;
      stats[k].billed += s.amount || 0;
      if (s.paid) stats[k].collected += s.amount || 0;
    });

    return stats;
  }, [filteredSessions]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ["Session ID", "Player", "Phone", "Table", "Category", "Started At", "Duration", "Amount", "Payment Status", "Payment Method", "Manager"];
    const rows = filteredSessions.map((s) => [
      s.id,
      `"${s.player.replace(/"/g, '""')}"`,
      `"${s.phone || ""}"`,
      `"${s.table}"`,
      `"${s.table_kind || "Snooker"}"`,
      `"${s.started_at}"`,
      `"${s.duration}"`,
      s.amount,
      s.paid ? "Paid" : "Unpaid",
      s.payment_method || "cash",
      s.created_by || "manager",
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `LevelUp_Report_${timeRange}_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Financial Oversight</span>
          </div>
          <h1>Club Financial Reports</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Time range selector */}
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
            {(["today", "week", "month", "all"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                style={{
                  all: "unset",
                  padding: "4px 10px",
                  borderRadius: "var(--r-xs)",
                  fontSize: 11.5,
                  fontWeight: timeRange === r ? 600 : 500,
                  color: timeRange === r ? "#FFFFFF" : "var(--text-secondary)",
                  background: timeRange === r ? "var(--bg-surface-raised)" : "transparent",
                  border: timeRange === r ? "1px solid var(--border-active)" : "1px solid transparent",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {r === "all" ? "All Time" : r === "week" ? "This Week" : r === "month" ? "This Month" : "Today"}
              </button>
            ))}
          </div>

          <button
            onClick={handleExportCSV}
            className="btn btn-primary"
            style={{ height: 32, fontSize: 12, gap: 6 }}
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid-4" style={{ marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Total Collected</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{totalCollected.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Billed: ₹{totalBilled.toLocaleString("en-IN")}
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Total Expenses</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
            ₹{totalExpenseAmount.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Operating costs
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ color: "var(--accent-primary)", marginBottom: 4 }}>Net Collection</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{netCollection.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Collected minus expenses
          </div>
        </div>

        <div className="glass-card" style={{ padding: "16px 18px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Outstanding Udhar</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{pendingUdhar.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
            Unsettled balances
          </div>
        </div>
      </div>

      {/* Category Performance & Payment Modes */}
      <div className="grid-2" style={{ marginBottom: 24 }}>
        {/* Category Yields */}
        <div className="glass-card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
            Category Yield &amp; Volume
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {Object.entries(categoryStats).map(([cat, val]) => (
              <div
                key={cat}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  background: "var(--bg-surface-inset)",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13, color: "var(--text-primary)" }}>{cat} Tables</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{val.count} sessions completed</div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 14, fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                    ₹{val.collected.toLocaleString("en-IN")}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Billed: ₹{val.billed}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Channels Split */}
        <div className="glass-card" style={{ padding: 18 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 14 }}>
            Collection Mode Channels
          </h3>

          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 6 }}>
              <span style={{ color: "var(--text-secondary)" }}>Cash vs Digital (UPI)</span>
              <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>
                {totalCollected > 0 ? `${Math.round((digitalCollected / totalCollected) * 100)}% Digital` : "0%"}
              </span>
            </div>
            <div
              style={{
                height: 8,
                borderRadius: 4,
                background: "var(--bg-surface-inset)",
                overflow: "hidden",
                display: "flex",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div
                style={{
                  width: `${totalCollected > 0 ? (cashCollected / totalCollected) * 100 : 0}%`,
                  background: "#F59E0B",
                }}
              />
              <div
                style={{
                  width: `${totalCollected > 0 ? (digitalCollected / totalCollected) * 100 : 0}%`,
                  background: "var(--accent-primary)",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 11.5 }}>
              <span style={{ color: "#F59E0B" }}>Cash: ₹{cashCollected.toLocaleString("en-IN")}</span>
              <span style={{ color: "var(--accent-primary)" }}>UPI / QR: ₹{digitalCollected.toLocaleString("en-IN")}</span>
            </div>
          </div>

          <div style={{ paddingTop: 12, borderTop: "1px solid var(--border-subtle)", fontSize: 11.5, color: "var(--text-muted)" }}>
            Total unique matches analyzed: <strong style={{ color: "var(--text-primary)" }}>{filteredSessions.length}</strong>
          </div>
        </div>
      </div>
    </>
  );
}
