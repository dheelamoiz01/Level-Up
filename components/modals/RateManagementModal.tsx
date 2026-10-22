"use client";

import { useState } from "react";
import { Sliders, Check, X, CircleDot } from "lucide-react";
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

      setRates((prev) => {
        const next = { ...prev };
        tables
          .filter((t) => t.kind === bulkKind)
          .forEach((t) => {
            next[t.id] = bulkRate;
          });
        return next;
      });

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
        backdropFilter: "blur(6px)",
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
          maxWidth: 480,
          background: "var(--bg-surface-raised)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--r-md)",
          boxShadow: "var(--shadow-lg)",
          padding: 22,
          maxHeight: "90vh",
          overflowY: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "var(--r-xs)",
                background: "rgba(0, 199, 138, 0.08)",
                border: "1px solid rgba(0, 199, 138, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--accent-primary)",
              }}
            >
              <Sliders size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Table Hourly Rates
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Manage base pricing per cuesport category
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer", padding: 2 }}
          >
            <X size={16} />
          </button>
        </div>

        {savedSuccess && (
          <div
            style={{
              padding: "8px 12px",
              borderRadius: "var(--r-xs)",
              background: "rgba(0, 199, 138, 0.08)",
              border: "1px solid rgba(0, 199, 138, 0.25)",
              color: "var(--accent-primary)",
              fontSize: 12,
              fontWeight: 600,
              marginBottom: 14,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Rates updated and synchronized</span>
          </div>
        )}

        {/* Bulk Category Rate Preset */}
        <div
          style={{
            padding: 12,
            borderRadius: "var(--r-xs)",
            marginBottom: 16,
            background: "var(--bg-surface-inset)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8, display: "flex", alignItems: "center", gap: 5 }}>
            <CircleDot size={12} style={{ color: "var(--accent-primary)" }} />
            <span>Category Bulk Setter</span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <select
              value={bulkKind}
              onChange={(e) => setBulkKind(e.target.value as "Royal" | "Snooker" | "Pool")}
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                borderRadius: "var(--r-xs)",
                padding: "5px 10px",
                color: "var(--text-primary)",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              <option value="Royal">Royal Tables (VIP)</option>
              <option value="Snooker">Snooker Tables (12ft)</option>
              <option value="Pool">Pool Table (9ft)</option>
            </select>

            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>₹</span>
              <input
                type="number"
                value={bulkRate}
                onChange={(e) => setBulkRate(Number(e.target.value))}
                style={{
                  width: 75,
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-default)",
                  borderRadius: "var(--r-xs)",
                  padding: "5px 8px",
                  color: "var(--accent-primary)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <span style={{ fontSize: 11, color: "var(--text-muted)" }}>/hr</span>
            </div>

            <button
              onClick={handleApplyBulk}
              className="btn btn-primary"
              style={{ height: 28, padding: "0 10px", fontSize: 11.5, marginLeft: "auto" }}
            >
              Apply
            </button>
          </div>
        </div>

        {/* Individual Tables List */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Individual Table Overrides
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
                  padding: "8px 12px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                      {t.name}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        padding: "1px 5px",
                        borderRadius: "var(--r-xs)",
                        background: "var(--bg-surface-inset)",
                        color: "var(--text-muted)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      {t.kind}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 1 }}>
                    Status: <span style={{ color: t.status === "playing" ? "var(--accent-primary)" : "var(--text-muted)" }}>{t.status}</span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>₹</span>
                    <input
                      type="number"
                      value={currentVal}
                      onChange={(e) => handleRateChange(t.id, Number(e.target.value))}
                      style={{
                        width: 70,
                        background: "var(--bg-surface-inset)",
                        border: isModified ? "1px solid var(--accent-primary)" : "1px solid var(--border-default)",
                        borderRadius: "var(--r-xs)",
                        padding: "4px 6px",
                        color: "var(--accent-primary)",
                        fontSize: 12,
                        fontWeight: 600,
                        fontFamily: "var(--font-mono)",
                        textAlign: "right",
                      }}
                    />
                    <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>/hr</span>
                  </div>

                  <button
                    onClick={() => handleSaveIndividual(t.id)}
                    className="btn"
                    style={{
                      height: 26,
                      padding: "0 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      background: isModified ? "var(--accent-primary)" : "transparent",
                      color: isModified ? "#03140C" : "var(--text-secondary)",
                    }}
                  >
                    Save
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button className="btn" onClick={onClose} style={{ height: 32, padding: "0 14px", fontSize: 12 }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
