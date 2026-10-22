"use client";

import { useState } from "react";
import { initialProducts } from "@/lib/mock/products";
import type { Product } from "@/lib/types";
import { Package, Plus, Coffee, Utensils, Sliders, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProductManagementModal } from "@/components/modals/ProductManagementModal";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  const categories = ["All", "Drinks", "Snacks", "Other"];
  const filtered = products.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Drinks":
        return <Coffee size={20} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
      case "Snacks":
        return <Utensils size={20} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
      default:
        return <Package size={20} strokeWidth={2.2} style={{ color: "var(--mint)" }} />;
    }
  };

  const handleAddProduct = (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
  };

  const handleUpdateProduct = (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleDeleteProduct = (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>F&amp;B Menu &amp; Inventory</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--muted)" }}>{products.length} Products Configured</span>
          </div>
          <h1>Club Products &amp; Pricing</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <Button variant="primary" onClick={() => setModalOpen(true)} style={{ gap: 6, fontWeight: 700 }}>
            <Sliders size={15} strokeWidth={2.5} />
            <span>Manage Menu &amp; Prices</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        className="glass-card-inset"
        style={{
          display: "inline-flex",
          padding: "4px",
          borderRadius: "var(--r-full)",
          gap: 4,
          marginBottom: 20,
        }}
      >
        {categories.map((c) => {
          const count = c === "All" ? products.length : products.filter((p) => p.category === c).length;
          const active = activeCategory === c;
          return (
            <button
              key={c}
              className={`btn ${active ? "btn-primary" : ""}`}
              style={{
                height: 32,
                padding: "0 14px",
                fontSize: 12,
                fontWeight: active ? 700 : 500,
                boxShadow: active ? "var(--shadow-emerald-pill)" : "none",
              }}
              onClick={() => setActiveCategory(c)}
            >
              <span>{c}</span>
              <span
                style={{
                  fontSize: 10.5,
                  opacity: active ? 0.9 : 0.6,
                  fontFamily: "var(--font-mono)",
                  background: active ? "rgba(0, 0, 0, 0.2)" : "rgba(255, 255, 255, 0.08)",
                  padding: "1px 6px",
                  borderRadius: "var(--r-full)",
                }}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))",
          gap: "var(--s-4)",
        }}
      >
        {filtered.map((p) => {
          const cost = p.cost_price || Math.round(p.price * 0.6);
          const margin = Math.round((1 - cost / p.price) * 100);

          return (
            <div
              key={p.id}
              className="glass"
              style={{
                padding: "20px",
                display: "flex",
                flexDirection: "column",
                gap: "14px",
                borderRadius: "var(--r-md)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                background: "rgba(13, 20, 15, 0.7)",
                position: "relative",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(0, 230, 118, 0.08)",
                    border: "1px solid rgba(0, 230, 118, 0.22)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {getCategoryIcon(p.category)}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 600,
                      color: "var(--mint)",
                      background: "rgba(0, 230, 118, 0.08)",
                      padding: "2px 8px",
                      borderRadius: "var(--r-full)",
                      border: "1px solid rgba(0, 230, 118, 0.2)",
                    }}
                  >
                    {p.category}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: p.active ? "var(--mint)" : "var(--muted)",
                      padding: "2px 6px",
                      borderRadius: 4,
                      background: p.active ? "rgba(0, 230, 118, 0.1)" : "rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    {p.active ? "In Stock" : "Out"}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 16, fontWeight: 700, color: "var(--text-hero)", display: "block" }}>
                  {p.name}
                </span>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
                  <span style={{ fontSize: 22, fontWeight: 800, color: "var(--mint)", fontFamily: "var(--font-mono)" }}>
                    ₹{p.price}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--muted)" }}>
                    cost: ₹{cost}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 10,
                  borderTop: "1px solid var(--glass-border-subtle)",
                  fontSize: 11.5,
                  color: "var(--muted)",
                }}
              >
                <span>Stock: {p.stock_count || 50} units</span>
                <span style={{ color: "var(--mint)", fontWeight: 600 }}>{margin}% margin</span>
              </div>
            </div>
          );
        })}
      </div>

      <ProductManagementModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        products={products}
        onAddProduct={handleAddProduct}
        onUpdateProduct={handleUpdateProduct}
        onDeleteProduct={handleDeleteProduct}
      />
    </>
  );
}
