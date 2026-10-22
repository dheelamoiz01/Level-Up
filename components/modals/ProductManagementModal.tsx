"use client";

import { useState } from "react";
import { Package, Plus, Trash2, Check, X, Coffee, Utensils, Tag } from "lucide-react";
import type { Product } from "@/lib/types";
import { createClient } from "@/lib/supabase/client";

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAddProduct: (p: Product) => void;
  onUpdateProduct: (p: Product) => void;
  onDeleteProduct: (id: string) => void;
}

export function ProductManagementModal({
  open,
  onClose,
  products,
  onAddProduct,
  onUpdateProduct,
  onDeleteProduct,
}: Props) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // New product form fields
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState<"Drinks" | "Snacks" | "Other">("Drinks");
  const [newPrice, setNewPrice] = useState<number>(100);
  const [newCost, setNewCost] = useState<number>(60);
  const [newStock, setNewStock] = useState<number>(50);

  // Editing state
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editName, setEditName] = useState<string>("");

  if (!open) return null;

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newPrice <= 0) return;

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      name: newName.trim(),
      category: newCategory,
      price: newPrice,
      cost_price: newCost,
      active: true,
      stock_count: newStock,
    };

    onAddProduct(newProd);

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase.from("products").insert([
        {
          id: newProd.id,
          name: newProd.name,
          category: newProd.category,
          price: newProd.price,
          cost_price: newProd.cost_price,
          active: true,
          stock_count: newProd.stock_count,
        },
      ]);
    } catch (err) {
      console.debug("Supabase product insert info:", err);
    }

    // Reset form
    setNewName("");
    setNewPrice(100);
    setNewCost(60);
    setShowAddForm(false);
  };

  const startEdit = (p: Product) => {
    setEditingId(p.id);
    setEditName(p.name);
    setEditPrice(p.price);
  };

  const saveEdit = async (p: Product) => {
    if (editPrice <= 0) return;

    const updated: Product = {
      ...p,
      name: editName.trim() || p.name,
      price: editPrice,
    };

    onUpdateProduct(updated);
    setEditingId(null);

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase
        .from("products")
        .update({
          name: updated.name,
          price: updated.price,
          updated_at: new Date().toISOString(),
        })
        .eq("id", p.id);
    } catch (err) {
      console.debug("Supabase product update info:", err);
    }
  };

  const toggleStock = async (p: Product) => {
    const updated = { ...p, active: !p.active };
    onUpdateProduct(updated);

    try {
      const supabase = createClient();
      await supabase
        .from("products")
        .update({ active: updated.active, updated_at: new Date().toISOString() })
        .eq("id", p.id);
    } catch (err) {
      console.debug("Supabase product toggle info:", err);
    }
  };

  const handleDelete = async (id: string) => {
    onDeleteProduct(id);

    try {
      const supabase = createClient();
      await supabase.from("products").delete().eq("id", id);
    } catch (err) {
      console.debug("Supabase product delete info:", err);
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
          maxWidth: 580,
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
              <Package size={18} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hero)" }}>
                F&amp;B Menu &amp; Product Pricing
              </div>
              <div style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                Edit food and drink selling prices, cost &amp; inventory
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

        {/* Add Product Toggle */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
            style={{ width: "100%", height: 38, marginBottom: 18, fontSize: 13, fontWeight: 700, gap: 6 }}
          >
            <Plus size={15} strokeWidth={2.5} />
            <span>Add New Food / Drink Item</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateProduct}
            className="glass-card-inset"
            style={{
              padding: 16,
              borderRadius: 14,
              marginBottom: 18,
              border: "1px solid rgba(0, 230, 118, 0.25)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)" }}>
              New Item Details
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Item Name
                </label>
                <input
                  required
                  placeholder="e.g. Energy Drink"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as "Drinks" | "Snacks" | "Other")}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "var(--text)",
                    fontSize: 13,
                  }}
                >
                  <option value="Drinks">Drinks</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Other">Other / Cue Supplies</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Selling Price (₹)
                </label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(0, 230, 118, 0.3)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "var(--mint)",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Cost Price (₹)
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>
                  Stock Qty
                </label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "rgba(0, 0, 0, 0.4)",
                    border: "1px solid rgba(255, 255, 255, 0.12)",
                    borderRadius: 8,
                    padding: "7px 10px",
                    color: "var(--text-secondary)",
                    fontSize: 13,
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn"
                style={{ height: 32, padding: "0 14px", fontSize: 12 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: 32, padding: "0 16px", fontSize: 12, fontWeight: 700 }}
              >
                Save Product
              </button>
            </div>
          </form>
        )}

        {/* Existing Products List */}
        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>
          Current Products ({products.length} Items)
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {products.map((p) => {
            const isEditing = editingId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(255, 255, 255, 0.06)",
                  opacity: p.active ? 1 : 0.6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        background: "rgba(0, 0, 0, 0.5)",
                        border: "1px solid var(--mint)",
                        borderRadius: 6,
                        padding: "4px 8px",
                        color: "var(--text-hero)",
                        fontSize: 13,
                        fontWeight: 700,
                        width: "100%",
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: "var(--text-hero)" }}>
                        {p.name}
                      </span>
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: 4,
                          background: "rgba(255, 255, 255, 0.06)",
                          color: "var(--muted)",
                        }}
                      >
                        {p.category}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                    Cost: ₹{p.cost_price || Math.round(p.price * 0.6)} · Margin:{" "}
                    <span style={{ color: "var(--mint)" }}>
                      {Math.round((1 - (p.cost_price || p.price * 0.6) / p.price) * 100)}%
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 700 }}>₹</span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        style={{
                          width: 70,
                          background: "rgba(0, 0, 0, 0.5)",
                          border: "1px solid var(--mint)",
                          borderRadius: 6,
                          padding: "4px 6px",
                          color: "var(--mint)",
                          fontSize: 13,
                          fontWeight: 700,
                          textAlign: "right",
                        }}
                      />
                      <button
                        onClick={() => saveEdit(p)}
                        className="btn btn-primary"
                        style={{ height: 28, padding: "0 8px", fontSize: 11 }}
                      >
                        <Check size={12} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        fontSize: 14,
                        fontWeight: 700,
                        color: "var(--mint)",
                        fontFamily: "var(--font-mono)",
                        padding: "4px 8px",
                        borderRadius: 6,
                        background: "rgba(0, 230, 118, 0.08)",
                        border: "1px solid rgba(0, 230, 118, 0.2)",
                      }}
                      title="Click to edit selling price"
                    >
                      ₹{p.price}
                    </button>
                  )}

                  <button
                    onClick={() => toggleStock(p)}
                    className="btn"
                    style={{
                      height: 28,
                      padding: "0 8px",
                      fontSize: 10.5,
                      fontWeight: 600,
                      background: p.active ? "rgba(0, 230, 118, 0.12)" : "rgba(255, 255, 255, 0.06)",
                      color: p.active ? "var(--mint)" : "var(--muted)",
                    }}
                  >
                    {p.active ? "In Stock" : "Out"}
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      color: "var(--muted)",
                      padding: 4,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Delete product"
                  >
                    <Trash2 size={14} />
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
