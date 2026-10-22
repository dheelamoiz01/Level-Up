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
        return <Coffee size={18} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
      case "Snacks":
        return <Utensils size={18} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
      default:
        return <Package size={18} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
    }
  };

  return (
    <section>
      <div
        className="chips glass-card-inset"
        style={{
          display: "inline-flex",
          padding: "3px",
          borderRadius: "var(--r-full)",
          gap: 4,
          marginBottom: 14,
        }}
      >
        {cats.map((c) => (
          <button
            key={c}
            className={`btn ${cat === c ? "btn-primary" : ""}`}
            style={{
              height: 30,
              padding: "0 13px",
              fontSize: 12,
              fontWeight: cat === c ? 700 : 500,
              boxShadow: cat === c ? "var(--shadow-emerald-pill)" : "none",
            }}
            onClick={() => setCat(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="muted" style={{ fontStyle: "italic", fontSize: 13 }}>
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
                padding: "14px 10px",
                borderRadius: 14,
                background: "rgba(255, 255, 255, 0.03)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(0, 230, 118, 0.08)",
                  border: "1px solid rgba(0, 230, 118, 0.2)",
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
                  color: "var(--text-hero)",
                  textAlign: "center",
                  fontSize: 12.5,
                  lineHeight: 1.2,
                  marginTop: 2,
                }}
              >
                {p.name}
              </span>

              <div style={{ display: "flex", alignItems: "center", gap: 3, marginTop: 2 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--mint)", fontFamily: "var(--font-mono)" }}>
                  ₹{p.price}
                </span>
                <Plus size={11} strokeWidth={3} style={{ color: "var(--mint)", opacity: 0.8 }} />
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
