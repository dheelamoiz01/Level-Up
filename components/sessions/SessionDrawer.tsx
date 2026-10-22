"use client";

import { useState, useEffect } from "react";
import type { ClubTable, Product } from "@/lib/types";
import { mockProducts } from "@/lib/mock/products";
import { Drawer } from "@/components/ui/Drawer";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ProductPicker } from "./ProductPicker";
import { BillSummary, type BillLine } from "./BillSummary";
import {
  Play,
  Square,
  CreditCard,
  ShoppingBag,
  Receipt,
  User,
  Phone,
  Tag,
  CheckCircle2,
  Sliders,
  DollarSign,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLiveProducts } from "@/lib/supabase/service";

interface Props {
  table: ClubTable | null;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

interface PlayerEntry {
  id: string;
  name: string;
  phone: string;
}

export function SessionDrawer({ table, onClose, onSessionUpdated }: Props) {
  // Multi-player session creation fields
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: "p1", name: "", phone: "" },
  ]);
  const [editableRate, setEditableRate] = useState<number>(table?.hourly_rate ?? 350);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [liveProducts, setLiveProducts] = useState<Product[]>(mockProducts);

  // Active session lines & discounts
  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "card" | "udhar">("upi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (table) {
      if (table.player) {
        setPlayers([{ id: "p1", name: table.player, phone: table.phone || "" }]);
      } else {
        setPlayers([{ id: "p1", name: "", phone: "" }]);
      }
      setEditableRate(table.hourly_rate);
      setDiscount(0);
      setLines([]);
    }
    // Fetch live products
    getLiveProducts().then((prods) => setLiveProducts(prods));
  }, [table]);

  if (!table) return null;

  const isPlaying = table.status === "playing";

  const addPlayer = () => {
    setPlayers((prev) => [
      ...prev,
      { id: `p_${Date.now()}_${prev.length + 1}`, name: "", phone: "" },
    ]);
  };

  const updatePlayer = (id: string, field: "name" | "phone", val: string) => {
    setPlayers((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: val } : p))
    );
  };

  const removePlayer = (id: string) => {
    setPlayers((prev) => prev.filter((p) => p.id !== id));
  };

  const addProduct = (product: Product) => {
    setLines((ls) =>
      ls.some((l) => l.product.id === product.id)
        ? ls.map((l) =>
            l.product.id === product.id ? { ...l, qty: l.qty + 1 } : l
          )
        : [...ls, { product, qty: 1 }]
    );
  };

  const updateQty = (productId: string, delta: number) => {
    setLines((ls) =>
      ls
        .map((l) => (l.product.id === productId ? { ...l, qty: l.qty + delta } : l))
        .filter((l) => l.qty > 0)
    );
  };

  const removeLine = (productId: string) => {
    setLines((ls) => ls.filter((l) => l.product.id !== productId));
  };

  // 1. Handle Start Session
  const handleStartSession = async () => {
    setIsSubmitting(true);
    const now = new Date();

    const filledNames = players
      .map((p) => p.name.trim())
      .filter((n) => n.length > 0);

    let finalPlayer = "Walk-in Match";
    if (filledNames.length === 1) {
      finalPlayer = filledNames[0];
    } else if (filledNames.length === 2) {
      finalPlayer = `${filledNames[0]} vs ${filledNames[1]}`;
    } else if (filledNames.length > 2) {
      finalPlayer = filledNames.join(", ");
    }

    const primaryPhone =
      players.find((p) => p.phone.trim().length > 0)?.phone.trim() || null;

    // Trigger local push & chime via window event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("levelup_trigger_notif", {
          detail: {
            id: `session-start-${table.id}-${Date.now()}`,
            title: `${table.name} Active`,
            body: `Players: ${finalPlayer} · Rate: ₹${editableRate}/hr`,
            table_id: table.id,
            table_name: table.name,
            type: "session_start",
            timestamp: Date.now(),
            read: false,
          },
        })
      );
    }

    // Sync to Supabase
    try {
      const supabase = createClient();
      await supabase
        .from("club_tables")
        .update({
          status: "playing",
          current_player: finalPlayer,
          current_phone: primaryPhone,
          hourly_rate: editableRate,
          session_started_at: now.toISOString(),
          updated_at: now.toISOString(),
        })
        .eq("id", table.id);

      await supabase.from("sessions").insert([
        {
          table_id: table.id,
          table_name: table.name,
          customer_name: finalPlayer,
          customer_phone: primaryPhone,
          hourly_rate: editableRate,
          started_at: now.toISOString(),
          status: "active",
        },
      ]);
    } catch (err) {
      console.debug("Supabase session start sync info:", err);
    }

    // Mutate table in-memory
    table.status = "playing";
    table.player = finalPlayer;
    table.phone = primaryPhone || undefined;
    table.hourly_rate = editableRate;
    table.session_started_at = now.toISOString();
    table.elapsed = "00:00:01";
    table.bill = 0;

    setIsSubmitting(false);
    onSessionUpdated?.();
    onClose();
  };

  // 2. Handle Settle & Complete Session
  const handleSettleSession = async () => {
    setIsSubmitting(true);
    const itemsTotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
    const playCharge = table.bill ?? 0;
    const finalTotal = Math.max(0, playCharge + itemsTotal - discount);
    const nowIso = new Date().toISOString();

    // Trigger local push & transaction chime
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("levelup_trigger_notif", {
          detail: {
            id: `session-end-${table.id}-${Date.now()}`,
            title: `${table.name} Settled`,
            body: `₹${finalTotal} collected via ${paymentMethod.toUpperCase()} · Player: ${table.player || "Walk-in"}`,
            table_id: table.id,
            table_name: table.name,
            type: "session_end",
            timestamp: Date.now(),
            read: false,
          },
        })
      );
    }

    // Sync to Supabase
    try {
      const supabase = createClient();
      const startMs = table.session_started_at ? new Date(table.session_started_at).getTime() : Date.now();
      const durationMins = Math.max(1, Math.round((Date.now() - startMs) / 60000));

      // 1. Complete session record
      await supabase
        .from("sessions")
        .update({
          ended_at: nowIso,
          duration_minutes: durationMins,
          table_amount: playCharge,
          items_amount: itemsTotal,
          discount_amount: discount,
          discount_reason: discountReason || null,
          final_total: finalTotal,
          status: "completed",
          paid: paymentMethod !== "udhar",
          payment_method: paymentMethod,
          updated_at: nowIso,
        })
        .eq("table_id", table.id)
        .eq("status", "active");

      // 2. Free the table
      await supabase
        .from("club_tables")
        .update({
          status: "available",
          current_player: null,
          current_phone: null,
          session_started_at: null,
          updated_at: nowIso,
        })
        .eq("id", table.id);
    } catch (err) {
      console.debug("Supabase settle sync info:", err);
    }

    // Reset table in-memory
    table.status = "available";
    table.player = undefined;
    table.phone = undefined;
    table.session_started_at = undefined;
    table.elapsed = undefined;
    table.bill = undefined;

    setIsSubmitting(false);
    onSessionUpdated?.();
    onClose();
  };

  return (
    <Drawer
      open={!!table}
      onClose={onClose}
      title={`${table.name} (${table.kind})`}
      footer={
        isPlaying ? (
          <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose} style={{ flex: 1 }}>
              Close
            </Button>
            <Button
              variant="primary"
              style={{ flex: 2, gap: 6, fontWeight: 700 }}
              onClick={handleSettleSession}
              disabled={isSubmitting}
            >
              <CheckCircle2 size={16} strokeWidth={2.5} />
              <span>Settle &amp; Free Table</span>
            </Button>
          </div>
        ) : (
          <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "flex-end" }}>
            <Button onClick={onClose} style={{ flex: 1 }}>
              Cancel
            </Button>
            <Button
              variant="primary"
              style={{ flex: 2, gap: 6, fontWeight: 700 }}
              onClick={handleStartSession}
              disabled={isSubmitting}
            >
              <Play size={16} strokeWidth={2.5} />
              <span>Start Arena Session</span>
            </Button>
          </div>
        )
      }
    >
      {/* Table Status Bar with Editable Hourly Rate */}
      <div
        className="drawer-meta glass-card-inset"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "10px 14px",
          borderRadius: "var(--r-sm)",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={table.status} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
            {table.player ?? "Available Table"}
          </span>
        </div>

        {/* Hourly Rate Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isEditingRate ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 700 }}>₹</span>
              <input
                type="number"
                value={editableRate}
                onChange={(e) => setEditableRate(Number(e.target.value))}
                style={{
                  width: 65,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-active)",
                  borderRadius: "var(--r-xs)",
                  padding: "3px 6px",
                  color: "var(--accent-primary)",
                  fontSize: 12,
                  fontWeight: 700,
                  fontFamily: "var(--font-mono)",
                }}
              />
              <button
                onClick={() => setIsEditingRate(false)}
                className="btn btn-primary"
                style={{ height: 26, padding: "0 6px", fontSize: 10 }}
              >
                Set
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingRate(true)}
              style={{
                all: "unset",
                cursor: "pointer",
                fontSize: 12.5,
                fontWeight: 700,
                color: "var(--accent-primary)",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                padding: "3px 8px",
                borderRadius: "var(--r-xs)",
                background: "rgba(0, 199, 138, 0.08)",
                border: "1px solid rgba(0, 199, 138, 0.2)",
              }}
              title="Change session hourly rate"
            >
              <span>₹{editableRate}/hr</span>
              <Sliders size={11} style={{ opacity: 0.7 }} />
            </button>
          )}
        </div>
      </div>

      {/* When Table is Available: Multi-Player Match Roster */}
      {!isPlaying && (
        <div
          className="glass-card-inset"
          style={{
            padding: 14,
            borderRadius: "var(--r-sm)",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                Players &amp; Match Roster
              </div>
              <div style={{ fontSize: 10.5, color: "var(--text-muted)", marginTop: 1 }}>
                Single or multiple players · all fields optional
              </div>
            </div>

            <button
              type="button"
              onClick={addPlayer}
              className="btn"
              style={{ height: 26, padding: "0 8px", fontSize: 11, gap: 4 }}
            >
              <Plus size={11} strokeWidth={2.5} />
              <span>Add Player</span>
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {players.map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  paddingBottom: idx < players.length - 1 ? 10 : 0,
                  borderBottom:
                    idx < players.length - 1
                      ? "1px solid var(--border-subtle)"
                      : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    Player {idx + 1} {idx === 0 ? "· Primary" : ""}
                  </span>
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => removePlayer(p.id)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        fontSize: 11,
                        display: "flex",
                        alignItems: "center",
                        gap: 3,
                      }}
                      title="Remove Player"
                    >
                      <Trash2 size={11} />
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                  }}
                >
                  <div>
                    <label
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <User size={11} />
                      <span>Name (Optional)</span>
                    </label>
                    <input
                      placeholder={`e.g. Player ${idx + 1}`}
                      value={p.name}
                      onChange={(e) => updatePlayer(p.id, "name", e.target.value)}
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
                    <label
                      style={{
                        fontSize: 10.5,
                        color: "var(--text-muted)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                        marginBottom: 4,
                      }}
                    >
                      <Phone size={11} />
                      <span>Phone (Optional)</span>
                    </label>
                    <input
                      placeholder="+91..."
                      value={p.phone}
                      onChange={(e) => updatePlayer(p.id, "phone", e.target.value)}
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F&B Food and Drink Picker */}
      <div style={{ marginBottom: 20 }}>
        <h3 className="eyebrow" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <ShoppingBag size={13} style={{ color: "var(--accent-primary)" }} />
          <span>F&amp;B Menu &amp; Snack Additions</span>
        </h3>
        <ProductPicker products={liveProducts} onAdd={addProduct} />
      </div>

      {/* Bill & Payment Settlement */}
      <div>
        <h3 className="eyebrow" style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 6 }}>
          <Receipt size={13} style={{ color: "var(--accent-primary)" }} />
          <span>Session Ledger &amp; Settlement</span>
        </h3>

        <BillSummary
          playTime={table.elapsed ?? "00:00:00"}
          playCharge={table.bill ?? 0}
          lines={lines}
          paid={0}
          discount={discount}
          discountReason={discountReason}
          onUpdateQty={updateQty}
          onRemoveLine={removeLine}
          onUpdateDiscount={(amt, rsn) => {
            setDiscount(amt);
            setDiscountReason(rsn);
          }}
        />

        {isPlaying && (
          <div style={{ marginTop: 14 }}>
            <label style={{ fontSize: 11, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
              Payment Collection Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
              {(["upi", "cash", "card", "udhar"] as const).map((m) => {
                const active = paymentMethod === m;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setPaymentMethod(m)}
                    className={`btn ${active ? "btn-primary" : ""}`}
                    style={{
                      height: 32,
                      fontSize: 11.5,
                      fontWeight: active ? 700 : 500,
                      textTransform: "uppercase",
                    }}
                  >
                    {m}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </Drawer>
  );
}
