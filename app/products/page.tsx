"use client";

import { useState, useEffect } from "react";
import { initialProducts } from "@/lib/mock/products";
import type { Product } from "@/lib/types";
import { Package, Coffee, Utensils, Sliders } from "lucide-react";
import { ProductManagementModal } from "@/components/modals/ProductManagementModal";
import { createClient } from "@/lib/supabase/client";
import { getLiveProducts } from "@/lib/supabase/service";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [modalOpen, setModalOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>("All");

  useEffect(() => {
    let mounted = true;
    const loadProducts = async () => {
      const live = await getLiveProducts();
      if (mounted) setProducts(live);
    };
    loadProducts();

    const supabase = createClient();
    const channel = supabase
      .channel("products_page_sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => {
          loadProducts();
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const categories = ["All", "Drinks", "Snacks", "Other"];
  const filtered = products.filter(
    (p) => activeCategory === "All" || p.category === activeCategory
  );

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Drinks":
        return <Coffee size={18} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      case "Snacks":
        return <Utensils size={18} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      default:
        return <Package size={18} strokeWidth={2} style={{ color: "var(--text-secondary)" }} />;
    }
  };

  const handleAddProduct = async (newProd: Product) => {
    setProducts((prev) => [newProd, ...prev]);
    try {
      const supabase = createClient();
      await supabase.from("products").insert([
        {
          id: newProd.id,
          name: newProd.name,
          category: newProd.category,
          price: newProd.price,
          cost_price: newProd.cost_price || Math.round(newProd.price * 0.6),
          active: newProd.active,
          stock_count: newProd.stock_count || 50,
        },
      ]);
    } catch (e) {
      console.debug("Supabase insert product info:", e);
    }
  };

  const handleUpdateProduct = async (updated: Product) => {
    setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      const supabase = createClient();
      await supabase
        .from("products")
        .update({
          name: updated.name,
          category: updated.category,
          price: updated.price,
          cost_price: updated.cost_price,
          active: updated.active,
          stock_count: updated.stock_count,
          updated_at: new Date().toISOString(),
        })
        .eq("id", updated.id);
    } catch (e) {
      console.debug("Supabase update product info:", e);
    }
  };

  const handleDeleteProduct = async (id: string) => {
    setProducts((prev) => prev.filter((p) => p.id !== id));
    try {
      const supabase = createClient();
      await supabase.from("products").delete().eq("id", id);
    } catch (e) {
      console.debug("Supabase delete product info:", e);
    }
  };

  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow" style={{ marginBottom: 4 }}>
            <span>Inventory &amp; F&amp;B</span>
            <span style={{ opacity: 0.4 }}>•</span>
            <span>{products.length} Products Configured</span>
          </div>
          <h1>Club Products &amp; Rates</h1>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            className="btn btn-primary"
            onClick={() => setModalOpen(true)}
            style={{ height: 32, fontSize: 11.5, gap: 5 }}
          >
            <Sliders size={13} strokeWidth={2.2} />
            <span>Manage Menu &amp; Rates</span>
          </button>
        </div>
      </div>

      {/* Segmented Filter Control */}
      <div
        style={{
          display: "inline-flex",
          padding: "2px",
          borderRadius: "var(--r-sm)",
          background: "var(--bg-surface-inset)",
          border: "1px solid var(--border-subtle)",
          gap: 2,
          marginBottom: 16,
        }}
      >
        {categories.map((c) => {
          const count = c === "All" ? products.length : products.filter((p) => p.category === c).length;
          const active = activeCategory === c;
          return (
            <button
              key={c}
              style={{
                all: "unset",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                height: 28,
                padding: "0 10px",
                borderRadius: "var(--r-xs)",
                fontSize: 11.5,
                fontWeight: active ? 600 : 500,
                color: active ? "var(--text-primary)" : "var(--text-muted)",
                background: active ? "var(--bg-surface-raised)" : "transparent",
                border: active ? "1px solid var(--border-default)" : "1px solid transparent",
                cursor: "pointer",
              }}
              onClick={() => setActiveCategory(c)}
            >
              <span>{c}</span>
              <span
                style={{
                  fontSize: 10,
                  fontFamily: "var(--font-mono)",
                  color: active ? "var(--accent-primary)" : "var(--text-dim)",
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
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 14,
        }}
      >
        {filtered.map((p) => {
          const cost = p.cost_price || Math.round(p.price * 0.6);
          const margin = Math.round((1 - cost / p.price) * 100);

          return (
            <div
              key={p.id}
              className="glass-card"
              style={{
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                opacity: p.active ? 1 : 0.6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: "var(--r-xs)",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-subtle)",
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
                      color: "var(--text-muted)",
                      background: "var(--bg-surface-inset)",
                      padding: "2px 6px",
                      borderRadius: "var(--r-xs)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    {p.category}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: p.active ? "var(--accent-primary)" : "var(--text-muted)",
                      padding: "2px 6px",
                      borderRadius: "var(--r-xs)",
                      background: p.active ? "rgba(0, 199, 138, 0.08)" : "var(--bg-surface-inset)",
                      border: p.active ? "1px solid rgba(0, 199, 138, 0.2)" : "1px solid var(--border-subtle)",
                    }}
                  >
                    {p.active ? "In Stock" : "Out of Stock"}
                  </span>
                </div>
              </div>

              <div>
                <span style={{ fontSize: 14.5, fontWeight: 700, color: "var(--text-primary)", display: "block" }}>
                  {p.name}
                </span>

                <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                  <span style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", fontFamily: "var(--font-mono)" }}>
                    ₹{p.price}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    cost: ₹{cost}
                  </span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 8,
                  borderTop: "1px solid var(--border-subtle)",
                  fontSize: 11,
                  color: "var(--text-muted)",
                }}
              >
                <span>Stock: {p.stock_count || 50} units</span>
                <span style={{ color: "var(--accent-primary)", fontWeight: 600 }}>{margin}% margin</span>
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
