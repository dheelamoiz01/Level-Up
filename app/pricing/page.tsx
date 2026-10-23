"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Sliders, ShieldCheck, Check, AlertCircle, Save, Clock, ArrowRight, ShieldAlert, History } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTablePricing, updateTablePricing, getLiveTables, updateTableRate } from "@/lib/turso/service";
import type { TableKind, TablePricing, ClubTable } from "@/lib/types";
import { Button } from "@/components/ui/Button";

interface PricingFormState {
  rate_30m: number;
  rate_60m: number;
}

export default function TablePricingPage() {
  const { user, isOwner } = useAuth();
  const [pricing, setPricing] = useState<TablePricing[]>([]);
  const [tables, setTables] = useState<ClubTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states for each category
  const [formState, setFormState] = useState<Record<TableKind, PricingFormState>>({
    Royal: { rate_30m: 300, rate_60m: 500 },
    Snooker: { rate_30m: 200, rate_60m: 350 },
    Pool: { rate_30m: 150, rate_60m: 250 },
  });

  // Table specific overrides
  const [tableRates, setTableRates] = useState<Record<string, number>>({});
  const [savingTableId, setSavingTableId] = useState<string | null>(null);
  const [tableSuccess, setTableSuccess] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pricingData, fleetData] = await Promise.all([
        getTablePricing(),
        getLiveTables(),
      ]);
      setPricing(pricingData);
      setTables(fleetData);

      // Populate form state
      const newForm = { ...formState };
      pricingData.forEach((p) => {
        if (newForm[p.category]) {
          newForm[p.category] = {
            rate_30m: p.rate_30m,
            rate_60m: p.rate_60m,
          };
        }
      });
      setFormState(newForm);

      // Populate table overrides
      const overrides: Record<string, number> = {};
      fleetData.forEach((t) => {
        overrides[t.id] = t.hourly_rate;
      });
      setTableRates(overrides);
    } catch (err) {
      console.error("Failed to load table pricing:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleRateChange = (category: TableKind, field: "rate_30m" | "rate_60m", val: string) => {
    const num = Math.max(0, parseInt(val, 10) || 0);
    setFormState((prev) => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: num,
      },
    }));
  };

  const handleSaveCategory = async (category: TableKind) => {
    if (!isOwner) {
      setErrorMsg("Unauthorized: Only the Club Owner can modify table pricing.");
      return;
    }

    const { rate_30m, rate_60m } = formState[category];
    if (rate_30m <= 0 || rate_60m <= 0) {
      setErrorMsg("Rates must be positive INR amounts.");
      return;
    }

    setSavingCategory(category);
    setErrorMsg(null);

    const success = await updateTablePricing(category, rate_30m, rate_60m, user?.username || "owner");
    if (success) {
      setSaveSuccess(`Successfully updated ${category} pricing matrix.`);
      setTimeout(() => setSaveSuccess(null), 3500);
      loadData();
    } else {
      setErrorMsg(`Failed to save ${category} pricing.`);
    }
    setSavingCategory(null);
  };

  const handleSaveTableRate = async (tableId: string) => {
    if (!isOwner) {
      setErrorMsg("Only the Club Owner can set table rate overrides.");
      return;
    }
    const rate = tableRates[tableId];
    if (!rate || rate <= 0) {
      setErrorMsg("Please enter a valid hourly rate.");
      return;
    }

    setSavingTableId(tableId);
    setErrorMsg(null);
    const success = await updateTableRate(tableId, rate);
    if (success) {
      setTableSuccess(tableId);
      setTimeout(() => setTableSuccess(null), 3000);
      loadData();
    } else {
      setErrorMsg("Failed to update table rate override.");
    }
    setSavingTableId(null);
  };

  const categories: { kind: TableKind; title: string; desc: string; badge: string }[] = [
    {
      kind: "Royal",
      title: "Royal Tables (VIP Salon)",
      desc: "Top-tier premium tables with heated Italian slate, Strachan cloth & luxury seating.",
      badge: "VIP · 2 Tables",
    },
    {
      kind: "Snooker",
      title: "Snooker Tables (12ft Tournament)",
      desc: "Championship full-size 12ft snooker tables with tournament canopy illumination.",
      badge: "Championship · 2 Tables",
    },
    {
      kind: "Pool",
      title: "Pool Tables (9ft American)",
      desc: "9ft American Brunswick-style pool table for fast-paced 8-ball and 9-ball play.",
      badge: "Fast Play · 1 Table",
    },
  ];

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
          Configuring table hourly tariffs and pricing tiers is strictly restricted to the Club Owner.
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
      {/* Header */}
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Club Operations</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span>Tariff Matrix</span>
          </div>
          <h1>Owner Table Pricing</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {!isOwner ? (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--r-xs)",
                background: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.25)",
                color: "var(--amber)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldAlert size={14} />
              <span>Read-Only View (Manager)</span>
            </div>
          ) : (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 12px",
                borderRadius: "var(--r-xs)",
                background: "rgba(0, 199, 138, 0.1)",
                border: "1px solid rgba(0, 199, 138, 0.25)",
                color: "var(--accent-primary)",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              <ShieldCheck size={14} />
              <span>Authorized Owner Access</span>
            </div>
          )}
        </div>
      </div>

      {/* Toast Feedback */}
      {saveSuccess && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            background: "rgba(0, 199, 138, 0.12)",
            border: "1px solid rgba(0, 199, 138, 0.3)",
            color: "var(--accent-primary)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <Check size={16} />
          <span>{saveSuccess}</span>
        </div>
      )}

      {errorMsg && (
        <div
          style={{
            marginBottom: 16,
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            background: "rgba(239, 68, 68, 0.12)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            color: "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          <AlertCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Section 1: Category Pricing Matrix */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
            Standard Category Tariff Matrix
          </h2>
          <p style={{ fontSize: 12.5, color: "var(--text-muted)", marginTop: 2 }}>
            Configurable 30-minute and 1-hour session tariffs. New sessions automatically snapshot these active rates.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: 16 }}>
          {categories.map((cat) => {
            const form = formState[cat.kind];
            const pInfo = pricing.find((p) => p.category === cat.kind);
            const isSaving = savingCategory === cat.kind;

            return (
              <div
                key={cat.kind}
                className="glass-card"
                style={{
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  border: "1px solid var(--border-default)",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{cat.title}</h3>
                      <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>{cat.desc}</p>
                    </div>
                    <span className="badge" style={{ fontSize: 10.5, padding: "2px 8px" }}>
                      {cat.badge}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                      marginTop: 18,
                      marginBottom: 16,
                      background: "var(--bg-surface-inset)",
                      padding: 14,
                      borderRadius: "var(--r-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {/* 30 Minutes Rate */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--text-secondary)",
                          marginBottom: 6,
                        }}
                      >
                        30 Minutes Rate
                      </label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="number"
                          disabled={!isOwner}
                          value={form.rate_30m}
                          onChange={(e) => handleRateChange(cat.kind, "rate_30m", e.target.value)}
                          style={{
                            width: "100%",
                            height: 38,
                            paddingLeft: 24,
                            paddingRight: 10,
                            background: isOwner ? "var(--bg-surface-raised)" : "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--r-xs)",
                            color: "var(--text-primary)",
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                      </div>
                    </div>

                    {/* 1 Hour Rate */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: 11,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: "var(--text-secondary)",
                          marginBottom: 6,
                        }}
                      >
                        1 Hour (60m) Rate
                      </label>
                      <div style={{ position: "relative" }}>
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "var(--text-muted)",
                            fontFamily: "var(--font-mono)",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          ₹
                        </span>
                        <input
                          type="number"
                          disabled={!isOwner}
                          value={form.rate_60m}
                          onChange={(e) => handleRateChange(cat.kind, "rate_60m", e.target.value)}
                          style={{
                            width: "100%",
                            height: 38,
                            paddingLeft: 24,
                            paddingRight: 10,
                            background: isOwner ? "var(--bg-surface-raised)" : "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--r-xs)",
                            color: "var(--text-primary)",
                            fontSize: 15,
                            fontWeight: 700,
                            fontFamily: "var(--font-mono)",
                          }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      fontSize: 11,
                      color: "var(--text-muted)",
                      paddingTop: 10,
                      borderTop: "1px solid var(--border-subtle)",
                      marginBottom: 12,
                    }}
                  >
                    <span>Last updated: {pInfo?.updated_by || "owner"}</span>
                    <span>{pInfo?.updated_at ? new Date(pInfo.updated_at).toLocaleDateString() : "Active"}</span>
                  </div>

                  {isOwner && (
                    <button
                      className="btn btn-primary"
                      disabled={isSaving}
                      onClick={() => handleSaveCategory(cat.kind)}
                      style={{ width: "100%", height: 36, fontSize: 12.5, fontWeight: 700, gap: 6 }}
                    >
                      <Save size={14} />
                      <span>{isSaving ? "Persisting to Turso..." : `Save ${cat.kind} Rates`}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 2: Table-Specific Overrides */}
      <div className="glass-card" style={{ padding: 22, marginBottom: 28 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>
              Physical Table Rate Overrides
            </h3>
            <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
              Specific hourly billing rates per physical table. Overrides apply automatically to new games started on that table.
            </p>
          </div>
          <span style={{ fontSize: 11.5, color: "var(--text-secondary)" }}>5 Arena Tables Configured</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tables.map((t) => {
            const currentVal = tableRates[t.id] ?? t.hourly_rate;
            const isSaving = savingTableId === t.id;
            const wasSuccess = tableSuccess === t.id;

            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 16px",
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "var(--r-xs)",
                      background: "var(--bg-surface-raised)",
                      border: "1px solid var(--border-default)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    #{t.number}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13.5, color: "var(--text-primary)" }}>{t.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--text-muted)" }}>
                      Category: {t.kind} · Status: <span style={{ color: t.status === "playing" ? "var(--accent-primary)" : "var(--text-secondary)" }}>{t.status}</span>
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ position: "relative", width: 130 }}>
                    <span
                      style={{
                        position: "absolute",
                        left: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                      }}
                    >
                      ₹/hr
                    </span>
                    <input
                      type="number"
                      disabled={!isOwner}
                      value={currentVal}
                      onChange={(e) => {
                        const val = Math.max(0, parseInt(e.target.value, 10) || 0);
                        setTableRates((prev) => ({ ...prev, [t.id]: val }));
                      }}
                      style={{
                        width: "100%",
                        height: 34,
                        paddingLeft: 46,
                        paddingRight: 8,
                        background: isOwner ? "var(--bg-surface-raised)" : "var(--bg-surface)",
                        border: "1px solid var(--border-default)",
                        borderRadius: "var(--r-xs)",
                        color: "var(--text-primary)",
                        fontSize: 13.5,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                      }}
                    />
                  </div>

                  {isOwner && (
                    <button
                      className="btn"
                      disabled={isSaving}
                      onClick={() => handleSaveTableRate(t.id)}
                      style={{
                        height: 34,
                        fontSize: 11.5,
                        fontWeight: 600,
                        background: wasSuccess ? "rgba(0, 199, 138, 0.15)" : undefined,
                        borderColor: wasSuccess ? "var(--accent-primary)" : undefined,
                        color: wasSuccess ? "var(--accent-primary)" : undefined,
                      }}
                    >
                      {wasSuccess ? <Check size={13} /> : <Save size={13} />}
                      <span>{wasSuccess ? "Saved" : isSaving ? "Saving..." : "Update"}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Section 3: Pricing Rules & Audit Policy */}
      <div
        className="glass-card"
        style={{
          padding: 20,
          background: "var(--bg-surface-inset)",
          border: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 16,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: "var(--r-xs)",
            background: "rgba(0, 199, 138, 0.1)",
            border: "1px solid rgba(0, 199, 138, 0.25)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-primary)",
            flexShrink: 0,
          }}
        >
          <History size={18} />
        </div>
        <div>
          <h4 style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-primary)", marginBottom: 4 }}>
            Integrity &amp; Rate Snapshot Guarantee
          </h4>
          <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>
            Whenever a manager starts a match, the active tariff is immutably snapshotted onto that session record. Changing rates here will strictly apply to future matches and will never distort historical revenue reports or in-progress match calculations.
          </p>
        </div>
      </div>
    </>
  );
}
