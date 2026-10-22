"use client";

import type { Product } from "@/lib/types";
import { Trash2, Plus, Minus, Tag } from "lucide-react";

export interface BillLine {
  product: Product;
  qty: number;
}

interface Props {
  playTime: string;
  playCharge: number;
  lines: BillLine[];
  paid: number;
  discount: number;
  discountReason: string;
  onUpdateQty?: (productId: string, delta: number) => void;
  onRemoveLine?: (productId: string) => void;
  onUpdateDiscount?: (amount: number, reason: string) => void;
}

export function BillSummary({
  playTime,
  playCharge,
  lines,
  paid,
  discount,
  discountReason,
  onUpdateQty,
  onRemoveLine,
  onUpdateDiscount,
}: Props) {
  const itemsTotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const subtotal = playCharge + itemsTotal;
  const total = Math.max(0, subtotal - discount);
  const due = Math.max(0, total - paid);

  return (
    <section
      className="bill glass-card-inset"
      style={{
        borderRadius: "var(--r-md)",
        padding: "16px",
      }}
    >
      <div className="bill-row">
        <span>
          Table Play Time <span className="muted" style={{ fontSize: 12 }}>({playTime})</span>
        </span>
        <span style={{ fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }}>
          ₹{playCharge}
        </span>
      </div>

      {lines.map((l) => (
        <div className="bill-row" key={l.product.id} style={{ alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span>{l.product.name}</span>
            <div style={{ display: "flex", alignItems: "center", gap: 4, background: "rgba(0,0,0,0.3)", borderRadius: 6, padding: "2px 4px" }}>
              <button
                onClick={() => onUpdateQty?.(l.product.id, -1)}
                style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 2 }}
                title="Decrease"
              >
                <Minus size={11} />
              </button>
              <span style={{ fontSize: 11, fontWeight: 700, color: "var(--mint)", minWidth: 16, textAlign: "center" }}>
                {l.qty}
              </span>
              <button
                onClick={() => onUpdateQty?.(l.product.id, 1)}
                style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 2 }}
                title="Increase"
              >
                <Plus size={11} />
              </button>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--text)", fontFamily: "var(--font-mono)" }}>
              ₹{l.product.price * l.qty}
            </span>
            {onRemoveLine && (
              <button
                onClick={() => onRemoveLine(l.product.id)}
                style={{ all: "unset", cursor: "pointer", color: "var(--muted)", padding: 2 }}
                title="Remove item"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
      ))}

      {lines.length === 0 && (
        <div className="bill-row muted" style={{ fontStyle: "italic", fontSize: 12.5 }}>
          No food or drinks added
        </div>
      )}

      {/* Editable Discount Section */}
      <div
        style={{
          padding: "8px 0",
          borderTop: "1px solid var(--glass-border-subtle)",
          borderBottom: "1px solid var(--glass-border-subtle)",
          margin: "8px 0",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12 }}>
          <Tag size={13} style={{ color: "var(--mint)" }} />
          <span>Discount (Editable)</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>-₹</span>
          <input
            type="number"
            min={0}
            value={discount || ""}
            placeholder="0"
            onChange={(e) => onUpdateDiscount?.(Number(e.target.value) || 0, discountReason)}
            style={{
              width: 60,
              background: "rgba(0,0,0,0.4)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 6,
              padding: "3px 6px",
              color: "var(--mint)",
              fontSize: 12,
              fontWeight: 700,
              fontFamily: "var(--font-mono)",
              textAlign: "right",
            }}
          />
        </div>
      </div>

      <div className="bill-row total" style={{ marginTop: 4 }}>
        <span>Total Due</span>
        <span style={{ color: "var(--mint)", fontSize: 20, fontFamily: "var(--font-mono)" }}>
          ₹{total}
        </span>
      </div>

      {paid > 0 && (
        <div className="bill-row" style={{ borderBottom: 0, paddingTop: 4 }}>
          <span className="muted">Advance Paid</span>
          <span style={{ color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>₹{paid}</span>
        </div>
      )}

      <div
        className="bill-row"
        style={{
          borderTop: "1px dashed var(--glass-border-hi)",
          borderBottom: 0,
          paddingTop: 10,
          marginTop: 6,
        }}
      >
        <span style={{ fontWeight: 600 }}>Balance to Settle</span>
        <span
          className="badge"
          style={{
            color: due > 0 ? "var(--amber)" : "var(--mint)",
            fontSize: 13,
            padding: "4px 12px",
            fontFamily: "var(--font-mono)",
          }}
        >
          ₹{due}
        </span>
      </div>
    </section>
  );
}
