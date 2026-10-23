"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  Receipt,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  Calendar,
  CreditCard,
  Building,
  UserCheck,
  TrendingDown,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  getExpenses,
  insertExpense,
  updateExpense,
  deleteExpense,
} from "@/lib/turso/service";
import type { Expense, ExpenseCategory } from "@/lib/types";

const CATEGORIES: ExpenseCategory[] = [
  "Staff Salaries",
  "Table Maintenance & Repairs",
  "Electricity Bill",
  "Wi-Fi & Internet",
  "Rent",
  "Cleaning & Housekeeping",
  "Equipment & Accessories",
  "Water & Refreshments",
  "Marketing",
  "Other",
];

const PAYMENT_METHODS = [
  { id: "cash", label: "Cash Drawer" },
  { id: "upi", label: "UPI (GooglePay/PhonePe)" },
  { id: "bank_transfer", label: "Bank IMPS / NEFT" },
  { id: "card", label: "Credit / Debit Card" },
] as const;

export default function ExpensesPage() {
  const { user, isOwner } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [activeTab, setActiveTab] = useState<"all" | "salaries">("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "month">("month");

  // Modal States
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editExpenseData, setEditExpenseData] = useState<Expense | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Form State
  const [formTitle, setFormTitle] = useState("");
  const [formCategory, setFormCategory] = useState<ExpenseCategory>("Other");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [formMethod, setFormMethod] = useState<Expense["payment_method"]>("cash");
  const [formPaidTo, setFormPaidTo] = useState("");
  const [formNotes, setFormNotes] = useState("");
  const [formSalaryStaff, setFormSalaryStaff] = useState("");
  const [formSalaryMonth, setFormSalaryMonth] = useState(
    new Date().toLocaleString("en-US", { month: "long", year: "numeric" })
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const loadExpensesData = async () => {
    setLoading(true);
    try {
      const data = await getExpenses();
      setExpenses(data);
    } catch (err) {
      console.error("Failed to load expenses:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadExpensesData();
    const handleSync = () => loadExpensesData();
    window.addEventListener("levelup_floor_update", handleSync);
    return () => window.removeEventListener("levelup_floor_update", handleSync);
  }, []);

  // Filtered Expense Records
  const filteredExpenses = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const monthStr = todayStr.slice(0, 7);

    return expenses.filter((e) => {
      // Tab filter
      if (activeTab === "salaries" && e.category !== "Staff Salaries") return false;

      // Category filter
      if (categoryFilter !== "All" && e.category !== categoryFilter) return false;

      // Date filter
      if (dateFilter === "today" && e.expense_date !== todayStr) return false;
      if (dateFilter === "month" && !e.expense_date.startsWith(monthStr)) return false;

      // Search
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchesTitle = e.title.toLowerCase().includes(q);
        const matchesVendor = e.paid_to.toLowerCase().includes(q);
        const matchesCategory = e.category.toLowerCase().includes(q);
        const matchesNotes = e.notes ? e.notes.toLowerCase().includes(q) : false;
        if (!matchesTitle && !matchesVendor && !matchesCategory && !matchesNotes) {
          return false;
        }
      }

      return true;
    });
  }, [expenses, activeTab, categoryFilter, dateFilter, searchQuery]);

  // Aggregate Calculations
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentMonthPrefix = todayStr.slice(0, 7);

  const todayTotal = useMemo(() => {
    return expenses
      .filter((e) => e.expense_date === todayStr)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses, todayStr]);

  const monthTotal = useMemo(() => {
    return expenses
      .filter((e) => e.expense_date.startsWith(currentMonthPrefix))
      .reduce((sum, e) => sum + (e.amount || 0), 0);
  }, [expenses, currentMonthPrefix]);

  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    expenses
      .filter((e) => e.expense_date.startsWith(currentMonthPrefix))
      .forEach((e) => {
        map[e.category] = (map[e.category] || 0) + e.amount;
      });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [expenses, currentMonthPrefix]);

  const topCategory = categoryBreakdown[0] ? categoryBreakdown[0][0] : "None";

  // Reset Form
  const resetForm = () => {
    setFormTitle("");
    setFormCategory("Other");
    setFormAmount("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormMethod("cash");
    setFormPaidTo("");
    setFormNotes("");
    setFormSalaryStaff("");
    setEditExpenseData(null);
  };

  const handleOpenAddModal = (isSalary = false) => {
    resetForm();
    if (isSalary) {
      setFormCategory("Staff Salaries");
      setFormTitle("Staff Salary Payment");
    }
    setAddModalOpen(true);
  };

  const handleOpenEditModal = (expense: Expense) => {
    setEditExpenseData(expense);
    setFormTitle(expense.title);
    setFormCategory(expense.category);
    setFormAmount(String(expense.amount));
    setFormDate(expense.expense_date);
    setFormMethod(expense.payment_method);
    setFormPaidTo(expense.paid_to);
    setFormNotes(expense.notes || "");
    setAddModalOpen(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(formAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      alert("Please enter a valid expense amount in INR.");
      return;
    }
    if (!formTitle.trim() || !formPaidTo.trim()) {
      alert("Please enter the expense title and recipient/vendor.");
      return;
    }

    setIsSubmitting(true);

    let finalTitle = formTitle.trim();
    if (formCategory === "Staff Salaries" && formSalaryStaff) {
      finalTitle = `Salary: ${formSalaryStaff} (${formSalaryMonth})`;
    }

    if (editExpenseData) {
      // Update
      const ok = await updateExpense(editExpenseData.id, {
        title: finalTitle,
        category: formCategory,
        amount: amountNum,
        expense_date: formDate,
        payment_method: formMethod,
        paid_to: formPaidTo.trim(),
        notes: formNotes.trim() || undefined,
      });
      if (ok) {
        setActionFeedback("Expense updated successfully.");
        loadExpensesData();
      }
    } else {
      // Insert
      const res = await insertExpense({
        title: finalTitle,
        category: formCategory,
        amount: amountNum,
        expense_date: formDate,
        payment_method: formMethod,
        paid_to: formPaidTo.trim(),
        notes: formNotes.trim() || undefined,
        created_by: user?.username || "owner",
      });
      if (res.success) {
        setActionFeedback("New expense recorded successfully.");
        loadExpensesData();
      }
    }

    setIsSubmitting(false);
    setAddModalOpen(false);
    resetForm();
    setTimeout(() => setActionFeedback(null), 3500);
  };

  const handleDeleteExpense = async (id: string) => {
    const ok = await deleteExpense(id);
    if (ok) {
      setActionFeedback("Expense record deleted.");
      setDeleteConfirmId(null);
      loadExpensesData();
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

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
          Club operating expenses and staff salary disbursements are restricted to the Club Owner.
        </p>
        <Link href="/">
          <button className="btn btn-primary" style={{ marginTop: 8 }}>
            Return to Live Floor
          </button>
        </Link>
      </div>
    );
  }

  return (
    <>
      {/* Top Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Club Finances</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Operating Expenditures</span>
          </div>
          <h1>Club Expenses</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            onClick={() => handleOpenAddModal(true)}
            className="btn"
            style={{ height: 34, fontSize: 12, gap: 6 }}
          >
            <UserCheck size={14} />
            <span>Pay Salary</span>
          </button>

          <button
            onClick={() => handleOpenAddModal(false)}
            className="btn btn-primary"
            style={{ height: 34, fontSize: 12, gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.4} />
            <span>Record Expense</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionFeedback && (
        <div
          style={{
            marginBottom: 16,
            padding: "10px 16px",
            borderRadius: "var(--r-sm)",
            background: "rgba(0, 199, 138, 0.1)",
            border: "1px solid rgba(0, 199, 138, 0.25)",
            color: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12.5,
            fontWeight: 600,
          }}
        >
          <CheckCircle2 size={15} />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Summary KPI Cards */}
      <div className="grid-3" style={{ marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Today's Expenses</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{todayTotal.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Recorded outlays today
          </div>
        </div>

        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>This Month's Total</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
            ₹{monthTotal.toLocaleString("en-IN")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Club operating expenditure
          </div>
        </div>

        <div className="glass-card" style={{ padding: "18px 20px" }}>
          <div className="eyebrow" style={{ marginBottom: 4 }}>Top Expense Driver</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: "var(--accent-primary)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
            {topCategory}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 4 }}>
            Highest spend category this month
          </div>
        </div>
      </div>

      {/* Tab Navigation: All Expenses vs Staff Salaries */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            padding: "2px",
            borderRadius: "var(--r-sm)",
            background: "var(--bg-surface-inset)",
            border: "1px solid var(--border-subtle)",
            gap: 2,
          }}
        >
          <button
            onClick={() => setActiveTab("all")}
            style={{
              all: "unset",
              padding: "6px 14px",
              borderRadius: "var(--r-xs)",
              fontSize: 12,
              fontWeight: activeTab === "all" ? 600 : 500,
              color: activeTab === "all" ? "var(--text-primary)" : "var(--text-muted)",
              background: activeTab === "all" ? "var(--bg-surface-raised)" : "transparent",
              border: activeTab === "all" ? "1px solid var(--border-default)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            All Club Expenses ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab("salaries")}
            style={{
              all: "unset",
              padding: "6px 14px",
              borderRadius: "var(--r-xs)",
              fontSize: 12,
              fontWeight: activeTab === "salaries" ? 600 : 500,
              color: activeTab === "salaries" ? "var(--accent-primary)" : "var(--text-muted)",
              background: activeTab === "salaries" ? "var(--bg-surface-raised)" : "transparent",
              border: activeTab === "salaries" ? "1px solid var(--border-default)" : "1px solid transparent",
              cursor: "pointer",
            }}
          >
            Staff Salaries View
          </button>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 220 }}>
            <Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              placeholder="Search expenses, vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                height: 32,
                paddingLeft: 30,
                paddingRight: 10,
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 12,
              }}
            />
          </div>

          {/* Date Filter */}
          <div
            style={{
              display: "inline-flex",
              padding: "2px",
              borderRadius: "var(--r-xs)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            {(["today", "month", "all"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setDateFilter(d)}
                style={{
                  all: "unset",
                  padding: "4px 10px",
                  fontSize: 11,
                  fontWeight: dateFilter === d ? 600 : 500,
                  color: dateFilter === d ? "var(--text-primary)" : "var(--text-muted)",
                  background: dateFilter === d ? "var(--bg-surface-raised)" : "transparent",
                  borderRadius: "var(--r-xs)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {d === "month" ? "This Month" : d}
              </button>
            ))}
          </div>

          {/* Category Dropdown */}
          {activeTab === "all" && (
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                height: 32,
                padding: "0 10px",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                borderRadius: "var(--r-xs)",
                color: "var(--text-primary)",
                fontSize: 11.5,
                fontWeight: 500,
              }}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Expense List Table Surface */}
      <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table className="ledger-table" style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--bg-surface-inset)", borderBottom: "1px solid var(--border-subtle)" }}>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Title &amp; Category</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Paid To / Vendor</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Date</th>
                <th style={{ textAlign: "left", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Method</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Amount</th>
                <th style={{ textAlign: "right", padding: "12px 16px", fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", letterSpacing: "0.06em" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "var(--text-muted)" }}>
                    <Receipt size={28} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
                    <div style={{ fontWeight: 600, color: "var(--text-secondary)", fontSize: 13 }}>No expense records found</div>
                    <div style={{ fontSize: 11.5, marginTop: 4 }}>
                      Record club operational expenditures, salaries, bills, or repairs to maintain the daily net ledger.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr
                    key={exp.id}
                    style={{
                      borderBottom: "1px solid var(--border-subtle)",
                      transition: "background-color 0.15s ease",
                    }}
                  >
                    <td style={{ padding: "12px 16px" }}>
                      <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 13 }}>{exp.title}</div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginTop: 2 }}>
                        <span className="badge" style={{ fontSize: 10, padding: "1px 6px" }}>
                          {exp.category}
                        </span>
                        {exp.notes && (
                          <span style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic" }}>
                            · {exp.notes}
                          </span>
                        )}
                      </div>
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: 12.5, color: "var(--text-secondary)" }}>
                      {exp.paid_to}
                    </td>

                    <td style={{ padding: "12px 16px", fontSize: 12, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {exp.expense_date}
                    </td>

                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: 10.5,
                          padding: "2px 7px",
                          borderRadius: "var(--r-xs)",
                          background: "var(--bg-surface-raised)",
                          border: "1px solid var(--border-subtle)",
                          color: "var(--text-secondary)",
                          textTransform: "uppercase",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {exp.payment_method}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                        ₹{exp.amount.toLocaleString("en-IN")}
                      </span>
                    </td>

                    <td style={{ padding: "12px 16px", textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          onClick={() => handleOpenEditModal(exp)}
                          className="btn"
                          style={{ width: 28, height: 28, padding: 0 }}
                          title="Edit expense"
                        >
                          <Edit2 size={12} />
                        </button>
                        <button
                          onClick={() => setDeleteConfirmId(exp.id)}
                          className="btn"
                          style={{ width: 28, height: 28, padding: 0, color: "var(--danger)" }}
                          title="Delete expense"
                        >
                          <Trash2 size={12} />
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

      {/* Add / Edit Expense Modal */}
      {addModalOpen && (
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
          onClick={() => setAddModalOpen(false)}
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
                {editExpenseData ? "Edit Expense" : "Record Club Outlay"}
              </div>
              <button onClick={() => setAddModalOpen(false)} style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmitExpense} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Category */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Expense Category
                </label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {/* Title / Description */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Expense Title / Memo
                </label>
                <input
                  required
                  placeholder="e.g. Electricity Bill August, Table 1 Cloth Re-bedding"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                  }}
                />
              </div>

              {/* Amount & Date Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Amount (₹ INR)
                  </label>
                  <input
                    required
                    type="number"
                    min="1"
                    placeholder="₹ 0"
                    value={formAmount}
                    onChange={(e) => setFormAmount(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 14,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Date Incurred
                  </label>
                  <input
                    required
                    type="date"
                    value={formDate}
                    onChange={(e) => setFormDate(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
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
              </div>

              {/* Paid To & Payment Method */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Paid To / Vendor
                  </label>
                  <input
                    required
                    placeholder="e.g. Electric Dept, Ramesh Staff"
                    value={formPaidTo}
                    onChange={(e) => setFormPaidTo(e.target.value)}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 10px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 13,
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                    Payment Mode
                  </label>
                  <select
                    value={formMethod}
                    onChange={(e) => setFormMethod(e.target.value as Expense["payment_method"])}
                    style={{
                      width: "100%",
                      height: 36,
                      padding: "0 8px",
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      color: "var(--text-primary)",
                      fontSize: 12.5,
                    }}
                  >
                    {PAYMENT_METHODS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Notes &amp; Particulars (Optional)
                </label>
                <input
                  placeholder="Invoice or voucher reference..."
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 12.5,
                  }}
                />
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="btn"
                  style={{ flex: 1, height: 38 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary"
                  style={{ flex: 1, height: 38, fontWeight: 700 }}
                >
                  {isSubmitting ? "Saving..." : editExpenseData ? "Update Expense" : "Save Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmId && (
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
          onClick={() => setDeleteConfirmId(null)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 380,
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: 22,
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                background: "rgba(239, 68, 68, 0.12)",
                color: "var(--danger)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 12px",
              }}
            >
              <Trash2 size={20} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)", marginBottom: 6 }}>
              Delete Expense Record?
            </h3>
            <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginBottom: 18 }}>
              This expense will be permanently deleted from the Turso database and daily net collection totals will update accordingly.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="btn"
                style={{ flex: 1, height: 36 }}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="btn"
                style={{
                  flex: 1,
                  height: 36,
                  background: "var(--danger)",
                  borderColor: "var(--danger)",
                  color: "#fff",
                  fontWeight: 700,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
