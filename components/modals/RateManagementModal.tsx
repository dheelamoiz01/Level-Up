"use client";

import { useState } from "react";
import { Sliders, Check, X, ShieldAlert, Sparkles, CircleDot } from "lucide-react";
import type { ClubTable } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  tables: ClubTable[];
  onUpdateTableRate: (tableId: string, newRate: number) => void;
  onBulkUpdateRate: (kind: "Royal" | "Snooker" | "Pool", newRate: number) => void;
}

export function RateManagementModal({
  open,
  onClose,
  tables,
  onUpdateTableRate,
  onBulkUpdateRate,
}: Props) {
  const [rates, setRates] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    tables.forEach((t) => {
      map[t.id] = t.hourly_rate;
    });
    return map;
  });

  const [bulkKind, setBulkKind] = useState<"Royal" | "Snooker" | "Pool">("Royal");
  const [bulkRate, setBulkRate] = useState<number>(500);
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!open) return null;

  const handleRateChange = (id: string, val: number) => {
    setRates((prev) => ({ ...prev, [id]: val }));
  };

  const handleSaveIndividual = async (id: string) => {
    const rate = rates[id];
    if (rate && rate > 0) {
      onUpdateTableRate(id, rate);

      // Sync to Supabase
      try {
        const supabase = createClient();
        await supabase
          .from("club_tables")
          .update({ hourly_rate: rate, updated_at: new Date().toISOString() })
          .eq("id", id);
      } catch (e) {
        console.debug("Supabase rate update info:", e);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  const handleApplyBulk = async () => {
    if (bulkRate > 0) {
      onBulkUpdateRate(bulkKind, bulkRate);

      // Update local inputs
      setRates((prev) => {
        const next = { ...prev };
        tables
          .filter((t) => t.kind === bulkKind)
          .forEach((t) => {
            next[t.id] = bulkRate;
          });
        return next;
      });

      // Sync to Supabase
      try {
        const supabase = createClient();
        await supabase
          .from("club_tables")
          .update({ hourly_rate: bulkRate, updated_at: new Date().toISOString() })
          .eq("kind", bulkKind);
      } catch (e) {
        console.debug("Supabase bulk rate update info:", e);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 2000);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.75)",
        backdropFilter: "blur(12px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{
          width: "100%",
          maxWidth: 520,
          background: "#0D140F",
          border: "1px solid rgba(0, 230, 118, 0.3)",
          borderRadius: 20,
          boxShadow: "0 20px 50px rgba(0, 0, 0, 0.8), 0 0 25px rgba(0, 230, 118, 0.15)",
          padding: 24,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(0, 230, 118, 0.12)",
                border: "1px solid rgba(0, 230, 118, 0.3)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--mint)",
              }}
            >
              <Sliders size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hero)" }}>
                Table Hourly Rates
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Manager pricing controls &amp; floor overrides
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ all: "unset", color: "var(--muted)", cursor: "pointer", padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        {savedSuccess && (
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 10,
              background: "rgba(0, 230, 118, 0.1)",
              border: "1px solid rgba(0, 230, 118, 0.4)",
              color: "var(--mint)",
              fontSize: 12.5,
              fontWeight: 600,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Check size={15} strokeWidth={2.5} />
            <span>Rates updated and synchronized to floor telemetry</span>
          </div>
        )}

        {/* Bulk Category Rate Preset */}
        <div
          className="glass-card-inset"
          style={{
            padding: 14,
            borderRadius: 14,
            marginBottom: 20,
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-hero)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
            <CircleDot size={13} style={{ color: "var(--mint)" }} />
            <span>Category Bulk Rate Setter</span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={bulkKind}
              onChange={(e) => setBulkKind(e.target.value as "Royal" | "Snooker" | "Pool")}
              style={{
                background: "rgba(0, 0, 0, 0.4)",
                border: "1px solid rgba(255, 255, 255, 0.12)",
                borderRadius: 8,
                padding: "6px 12px",
                color: "var(--text)",
                fontSize: 12.5,
                fontWeight: 600,
              }}
            >
              <option value="Royal">All Royal Tables (VIP)</option>
              <option value="Snooker">All Snooker Tables (12ft)</option>
              <option value="Pool">Pool Table (9ft)</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>₹</span>
              <input
                type="number"
                value={bulkRate}
                onChange={(e) => setBulkRate(Number(e.target.value))}
                style={{
                  width: 90,
                  background: "rgba(0, 0, 0, 0.4)",
                  border: "1px solid rgba(255, 255, 255, 0.12)",
                  borderRadius: 8,
                  padding: "6px 10px",
                  color: "var(--mint)",
                  fontSize: 13,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--muted)" }}>/hr</span>
            </div>

            <button
              onClick={handleApplyBulk}
              className="btn btn-primary"
              style={{ height: 32, padding: "0 14px", fontSize: 12, fontWeight: 700, marginLeft: "auto" }}
            >
              Apply to Category
            </button>
          </div>
        </div>

        {/* 5 Specific Tables List */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Individual Table Overrides (5 Tables)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {tables.map((t) => {
            const currentVal = rates[t.id] ?? t.hourly_rate;
            const isModified = currentVal !== t.hourly_rate;

            return (
              <div
                key={t.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-hero)" }}>
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10.5,
                        fontWeight: 600,
                        padding: "2px 7px",
                        borderRadius: 6,
                        background: t.kind === "Royal" ? "rgba(0, 230, 118, 0.15)" : "rgba(255, 255, 255, 0.06)",
                        color: t.kind === "Royal" ? "var(--mint)" : "var(--text-secondary)",
                        border: "1px solid rgba(255, 255, 255, 0.08)",
                      }}
                    >
                      {t.kind}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    Status: <span style={{ color: t.status === "playing" ? "var(--mint)" : "var(--text-secondary)" }}>{t.status}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 700 }}>₹</span>
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) => handleRateChange(t.id, Number(e.target.value))}
                      style={{
                        width: 80,
                        background: "rgba(0, 0, 0, 0.5)",
                        border: isModified ? "1px solid var(--mint)" : "1px solid rgba(255, 255, 255, 0.14)",
                        borderRadius: 8,
                        padding: "6px 8px",
                        color: "var(--mint)",
                        fontSize: 13,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: 11, color: "var(--muted)" }}>/hr</span>
                  </div>

                  <button
                    onClick={() => handleSaveIndividual(t.id)}
                    className="btn"
                    style={{
                      height: 30,
                      padding: "0 10px",
                      fontSize: 11.5,
                      fontWeight: 600,
                      background: isModified ? "var(--mint)" : "rgba(255, 255, 255, 0.06)",
                      color: isModified ? "#02160D" : "var(--text-secondary)",
                    }}
                    title="Save table rate"
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 20, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn btn-primary" onClick={onClose} style={{ height: 36, padding: "0 18px", fontSize: 13, fontWeight: 700 }}>
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
