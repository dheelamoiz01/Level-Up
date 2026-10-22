"use client";

import { useState } from "react";
import { Package, Plus, Trash2, Check, X } from "lucide-react";
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
          maxWidth: 520,
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
              <Package size={15} strokeWidth={2.2} />
            </div>
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                F&amp;B Menu &amp; Product Pricing
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                Edit food and drink selling prices, cost &amp; inventory
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

        {/* Add Product Toggle */}
        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="btn btn-primary"
            style={{ width: "100%", height: 32, marginBottom: 16, fontSize: 12, gap: 5 }}
          >
            <Plus size={13} strokeWidth={2.2} />
            <span>Add New Item</span>
          </button>
        ) : (
          <form
            onSubmit={handleCreateProduct}
            style={{
              padding: 14,
              borderRadius: "var(--r-xs)",
              marginBottom: 16,
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-default)",
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
              New Item
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                  Item Name
                </label>
                <input
                  required
                  placeholder="e.g. Cold Brew"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    padding: "6px 8px",
                    color: "var(--text-primary)",
                    fontSize: 12,
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as "Drinks" | "Snacks" | "Other")}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    padding: "6px 8px",
                    color: "var(--text-primary)",
                    fontSize: 12,
                  }}
                >
                  <option value="Drinks">Drinks</option>
                  <option value="Snacks">Snacks</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
              <div>
                <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                  Price (₹)
                </label>
                <input
                  type="number"
                  required
                  value={newPrice}
                  onChange={(e) => setNewPrice(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    padding: "6px 8px",
                    color: "var(--accent-primary)",
                    fontSize: 12,
                    fontWeight: 600,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                  Cost (₹)
                </label>
                <input
                  type="number"
                  value={newCost}
                  onChange={(e) => setNewCost(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    padding: "6px 8px",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: 10.5, color: "var(--text-muted)", display: "block", marginBottom: 3 }}>
                  Stock Qty
                </label>
                <input
                  type="number"
                  value={newStock}
                  onChange={(e) => setNewStock(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    padding: "6px 8px",
                    color: "var(--text-secondary)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>

            <div style={{ display: "flex", gap: 6, justifyContent: "flex-end", marginTop: 2 }}>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn"
                style={{ height: 28, padding: "0 10px", fontSize: 11 }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ height: 28, padding: "0 12px", fontSize: 11 }}
              >
                Save Item
              </button>
            </div>
          </form>
        )}

        {/* Existing Products List */}
        <div style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 8 }}>
          Current Products ({products.length})
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {products.map((p) => {
            const isEditing = editingId === p.id;

            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  opacity: p.active ? 1 : 0.6,
                }}
              >
                <div style={{ flex: 1, minWidth: 0, marginRight: 10 }}>
                  {isEditing ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      style={{
                        background: "var(--bg-surface-inset)",
                        border: "1px solid var(--accent-primary)",
                        borderRadius: "var(--r-xs)",
                        padding: "4px 6px",
                        color: "var(--text-primary)",
                        fontSize: 12,
                        fontWeight: 600,
                        width: "100%",
                      }}
                    />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>
                        {p.name}
                      </span>
                      <span
                        style={{
                          fontSize: 9.5,
                          fontWeight: 500,
                          padding: "1px 5px",
                          borderRadius: "var(--r-xs)",
                          background: "var(--bg-surface-inset)",
                          color: "var(--text-muted)",
                          border: "1px solid var(--border-subtle)",
                        }}
                      >
                        {p.category}
                      </span>
                    </div>
                  )}

                  <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
                    Cost: ₹{p.cost_price || Math.round(p.price * 0.6)} · Margin:{" "}
                    <span style={{ color: "var(--accent-primary)" }}>
                      {Math.round((1 - (p.cost_price || p.price * 0.6) / p.price) * 100)}%
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                  {isEditing ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <span style={{ fontSize: 11, color: "var(--accent-primary)" }}>₹</span>
                      <input
                        type="number"
                        value={editPrice}
                        onChange={(e) => setEditPrice(Number(e.target.value))}
                        style={{
                          width: 55,
                          background: "var(--bg-surface-inset)",
                          border: "1px solid var(--accent-primary)",
                          borderRadius: "var(--r-xs)",
                          padding: "3px 4px",
                          color: "var(--accent-primary)",
                          fontSize: 12,
                          fontWeight: 600,
                          fontFamily: "var(--font-mono)",
                          textAlign: "right",
                        }}
                      />
                      <button
                        onClick={() => saveEdit(p)}
                        className="btn btn-primary"
                        style={{ height: 24, padding: "0 6px", fontSize: 10 }}
                      >
                        <Check size={11} />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(p)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        fontSize: 12.5,
                        fontWeight: 600,
                        color: "var(--accent-primary)",
                        fontFamily: "var(--font-mono)",
                        padding: "3px 6px",
                        borderRadius: "var(--r-xs)",
                        background: "var(--bg-surface-inset)",
                        border: "1px solid var(--border-subtle)",
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
                      height: 24,
                      padding: "0 6px",
                      fontSize: 10,
                      fontWeight: 500,
                      color: p.active ? "var(--accent-primary)" : "var(--text-muted)",
                    }}
                  >
                    {p.active ? "In Stock" : "Out"}
                  </button>

                  <button
                    onClick={() => handleDelete(p.id)}
                    style={{
                      all: "unset",
                      cursor: "pointer",
                      color: "var(--text-dim)",
                      padding: 2,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Delete product"
                  >
                    <Trash2 size={13} />
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
