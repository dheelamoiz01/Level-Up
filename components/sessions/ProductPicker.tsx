"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { Plus, Coffee, Utensils, Package } from "lucide-react";

const cats = ["All", "Drinks", "Snacks", "Other"] as const;

interface Props {
  products: Product[];
  onAdd: (p: Product) => void;
}

export function ProductPicker({ products, onAdd }: Props) {
  const [cat, setCat] = useState<(typeof cats)[number]>("All");
  const list = products.filter((p) => p.active && (cat === "All" || p.category === cat));

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Drinks":
        return <Coffee size={16} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      case "Snacks":
        return <Utensils size={16} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      default:
        return <Package size={16} strokeWidth={2} style={{ color: "var(--text-secondary)" }} />;
    }
  };

  return (
    <section>
      <div
        className="chips"
        style={{
          display: "inline-flex",
          padding: "2px",
          borderRadius: "var(--r-sm)",
          gap: 2,
          marginBottom: 12,
        }}
      >
        {cats.map((c) => (
          <button
            key={c}
            className={`btn ${cat === c ? "btn-primary" : ""}`}
            style={{
              height: 28,
              padding: "0 11px",
              fontSize: 11.5,
              fontWeight: cat === c ? 700 : 500,
            }}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontStyle: "italic", fontSize: 12.5 }}>
          No products in this category.
        </p>
      ) : (
        <div className="product-grid">
          {list.map((p) => (
            <button
              key={p.id}
              className="product-tile"
              onClick={() => onAdd(p)}
              title={`Add ${p.name}`}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
                padding: "12px 8px",
                borderRadius: "var(--r-sm)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {getCategoryIcon(p.category)}
              </div>

              <span
                style={{
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  textAlign: "center",
                  fontSize: 12,
                  lineHeight: 1.25,
                  marginTop: 2,
                }}
              >
                {p.name}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                  ₹{p.price}
                </span>
                <Plus size={11} strokeWidth={2.5} style={{ color: "var(--accent-primary)", opacity: 0.8 }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
