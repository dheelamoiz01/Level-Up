"use client";

import { useState, useEffect, useCallback } from "react";
import { Save, CheckCircle2, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTablePricing, saveAllTablePricing } from "@/lib/turso/service";
import type { TableKind } from "@/lib/types";

interface PricingRowState {
  rate_30m: number;
  rate_60m: number;
}

const CATEGORY_CONFIG: {
  kind: TableKind;
  name: string;
  countLabel: string;
}[] = [
  {
    kind: "Royal",
    name: "Royal Table",
    countLabel: "2 Tables",
  },
  {
    kind: "Snooker",
    name: "Snooker Table",
    countLabel: "2 Tables",
  },
  {
    kind: "Pool",
    name: "Pool Table",
    countLabel: "1 Table",
  },
];

export default function TablePricingSettingsPage() {
  const { user, isOwner } = useAuth();

  // 6 prices state
  const [rates, setRates] = useState<Record<TableKind, PricingRowState>>({
    Royal: { rate_30m: 300, rate_60m: 500 },
    Snooker: { rate_30m: 200, rate_60m: 350 },
    Pool: { rate_30m: 150, rate_60m: 250 },
  });

  const [initialRates, setInitialRates] = useState<Record<TableKind, PricingRowState>>({
    Royal: { rate_30m: 300, rate_60m: 500 },
    Snooker: { rate_30m: 200, rate_60m: 350 },
    Pool: { rate_30m: 150, rate_60m: 250 },
  });

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  // Load persisted rates from database
  const loadRates = useCallback(async () => {
    setLoading(true);
    try {
      const pricingList = await getTablePricing();
      const loaded: Record<TableKind, PricingRowState> = {
        Royal: { rate_30m: 300, rate_60m: 500 },
        Snooker: { rate_30m: 200, rate_60m: 350 },
        Pool: { rate_30m: 150, rate_60m: 250 },
      };

      pricingList.forEach((p) => {
        if (loaded[p.category]) {
          loaded[p.category] = {
            rate_30m: p.rate_30m,
            rate_60m: p.rate_60m,
          };
        }
      });

      setRates(loaded);
      setInitialRates(loaded);
      setIsDirty(false);
    } catch (err) {
      console.error("Failed to load table pricing:", err);
      setFeedback({
        type: "error",
        message: "Failed to load current prices from database.",
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRates();
  }, [loadRates]);

  // Unsaved changes warning before leaving window
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  const handlePriceChange = (category: TableKind, field: "rate_30m" | "rate_60m", val: string) => {
    const cleanNum = val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0);

    setRates((prev) => {
      const next = {
        ...prev,
        [category]: {
          ...prev[category],
          [field]: cleanNum,
        },
      };

      // Check if dirty compared to initial
      const hasChanges = Object.keys(next).some((cat) => {
        const k = cat as TableKind;
        return (
          next[k].rate_30m !== initialRates[k].rate_30m ||
          next[k].rate_60m !== initialRates[k].rate_60m
        );
      });
      setIsDirty(hasChanges);

      return next;
    });

    if (feedback) setFeedback(null);
  };

  const handleSavePrices = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    // Validate prices
    for (const item of CATEGORY_CONFIG) {
      const row = rates[item.kind];
      if (row.rate_30m < 0 || row.rate_60m < 0 || isNaN(row.rate_30m) || isNaN(row.rate_60m)) {
        setFeedback({
          type: "error",
          message: `Please enter valid non-negative amounts for ${item.name}.`,
        });
        setIsSaving(false);
        return;
      }
    }

    const payload = CATEGORY_CONFIG.map((c) => ({
      category: c.kind,
      rate_30m: rates[c.kind].rate_30m,
      rate_60m: rates[c.kind].rate_60m,
    }));

    const result = await saveAllTablePricing(
      payload,
      user?.username || (isOwner ? "owner" : "manager"),
      user?.role || (isOwner ? "owner" : "staff")
    );

    if (result.success) {
      setInitialRates(rates);
      setIsDirty(false);
      setFeedback({
        type: "success",
        message: "Table prices saved successfully and updated live on the floor.",
      });
      setTimeout(() => {
        setFeedback((prev) => (prev?.type === "success" ? null : prev));
      }, 4000);
    } else {
      setFeedback({
        type: "error",
        message: result.error || "Failed to save table prices.",
      });
    }

    setIsSaving(false);
  };

  return (
    <>
      {/* Header */}
      <div className="page-head" style={{ marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)" }}>
            Table Pricing
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
            Set standard rates for each table category.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {isDirty && (
            <span
              style={{
                fontSize: 12,
                color: "var(--amber)",
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              Unsaved changes
            </span>
          )}

          <button
            onClick={() => handleSavePrices()}
            disabled={isSaving || loading}
            className="btn btn-primary"
            style={{
              height: 36,
              padding: "0 18px",
              fontSize: 13,
              fontWeight: 700,
              gap: 8,
              minWidth: 125,
            }}
          >
            {isSaving ? (
              <>
                <RefreshCw size={14} style={{ animation: "spin 0.6s linear infinite" }} />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Save Prices</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Feedback Alerts */}
      {feedback && (
        <div
          style={{
            marginBottom: 20,
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            background:
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.12)"
                : "rgba(239, 68, 68, 0.12)",
            border: `1px solid ${
              feedback.type === "success"
                ? "rgba(16, 185, 129, 0.3)"
                : "rgba(239, 68, 68, 0.3)"
            }`,
            color: feedback.type === "success" ? "var(--accent-primary)" : "var(--danger)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {feedback.type === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* 3 Clean Table Pricing Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 16,
          marginBottom: 28,
        }}
      >
        {CATEGORY_CONFIG.map(({ kind, name, countLabel }) => {
          const row = rates[kind];

          return (
            <div
              key={kind}
              className="glass-card"
              style={{
                padding: 20,
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-md)",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {/* Card Title */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingBottom: 12,
                  borderBottom: "1px solid var(--border-subtle)",
                }}
              >
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  {name}
                </h3>
                <span style={{ fontSize: 12, color: "var(--text-muted)", fontWeight: 500 }}>
                  {countLabel}
                </span>
              </div>

              {/* 30 Minutes Rate */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  30 Minutes
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
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
                    min="0"
                    step="10"
                    value={row.rate_30m || ""}
                    onChange={(e) => handlePriceChange(kind, "rate_30m", e.target.value)}
                    placeholder="0"
                    style={{
                      width: "100%",
                      height: 40,
                      paddingLeft: 28,
                      paddingRight: 12,
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
              </div>

              {/* 1 Hour Rate */}
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    marginBottom: 6,
                  }}
                >
                  1 Hour
                </label>
                <div style={{ position: "relative" }}>
                  <span
                    style={{
                      position: "absolute",
                      left: 12,
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
                    min="0"
                    step="10"
                    value={row.rate_60m || ""}
                    onChange={(e) => handlePriceChange(kind, "rate_60m", e.target.value)}
                    placeholder="0"
                    style={{
                      width: "100%",
                      height: 40,
                      paddingLeft: 28,
                      paddingRight: 12,
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
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
