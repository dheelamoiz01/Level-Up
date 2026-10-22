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
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  table: ClubTable | null;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

export function SessionDrawer({ table, onClose, onSessionUpdated }: Props) {
  // Session creation fields
  const [playerName, setPlayerName] = useState("");
  const [phone, setPhone] = useState("");
  const [editableRate, setEditableRate] = useState<number>(table?.hourly_rate ?? 350);
  const [isEditingRate, setIsEditingRate] = useState(false);

  // Active session lines & discounts
  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "card" | "udhar">("upi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (table) {
      setPlayerName(table.player || "");
      setPhone(table.phone || "");
      setEditableRate(table.hourly_rate);
      setDiscount(0);
      setLines([]);
    }
  }, [table]);

  if (!table) return null;

  const isPlaying = table.status === "playing";

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
    const finalPlayer = playerName.trim() || "Walk-in Player";

    // Trigger local push & chime via window event
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("levelup_trigger_notif", {
          detail: {
            id: `session-start-${table.id}-${Date.now()}`,
            title: `${table.name} Active`,
            body: `Player: ${finalPlayer} · Rate: ₹${editableRate}/hr`,
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
          current_phone: phone.trim() || null,
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
          customer_phone: phone.trim() || null,
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
    table.phone = phone;
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
      await supabase
        .from("club_tables")
        .update({
          status: "available",
          current_player: null,
          current_phone: null,
          session_started_at: null,
          updated_at: new Date().toISOString(),
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
          borderRadius: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <StatusBadge status={table.status} />
          <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 600 }}>
            {table.player ?? "Available Table"}
          </span>
        </div>

        {/* Editable Rate Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {isEditingRate ? (
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <span style={{ fontSize: 12, color: "var(--mint)", fontWeight: 700 }}>₹</span>
              <input
                type="number"
                value={editableRate}
                onChange={(e) => setEditableRate(Number(e.target.value))}
                style={{
                  width: 65,
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid var(--mint)",
                  borderRadius: 6,
                  padding: "3px 6px",
                  color: "var(--mint)",
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
                fontSize: 13,
                fontWeight: 700,
                color: "var(--mint)",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "3px 8px",
                borderRadius: 6,
                background: "rgba(0, 230, 118, 0.08)",
                border: "1px solid rgba(0, 230, 118, 0.2)",
              }}
              title="Click to edit session hourly rate"
            >
              <span>₹{editableRate}/hr</span>
              <Sliders size={11} style={{ opacity: 0.7 }} />
            </button>
          )}
        </div>
      </div>

      {/* When Table is Available: Player & Phone Inputs */}
      {!isPlaying && (
        <div
          className="glass-card-inset"
          style={{
            padding: 16,
            borderRadius: 14,
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)" }}>
            Player Information (Editable)
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <User size={12} />
                <span>Customer / Player Name</span>
              </label>
              <input
                placeholder="e.g. Rahul S."
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, color: "var(--muted)", display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}>
                <Phone size={12} />
                <span>Contact Phone</span>
              </label>
              <input
                placeholder="+91 98..."
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={{
                  width: "100%",
                  background: "rgba(0,0,0,0.4)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 8,
                  padding: "7px 10px",
                  color: "var(--text)",
                  fontSize: 13,
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* F&B Food and Drink Picker */}
      <div style={{ marginBottom: 20 }}>
        <h3 className="eyebrow" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <ShoppingBag size={13} style={{ color: "var(--mint)" }} />
          <span>F&amp;B Menu &amp; Snack Additions</span>
        </h3>
        <ProductPicker products={mockProducts} onAdd={addProduct} />
      </div>

      {/* Bill & Payment Settlement */}
      <div>
        <h3 className="eyebrow" style={{ marginBottom: 12, display: "flex", alignItems: "center", gap: 6 }}>
          <Receipt size={13} style={{ color: "var(--mint)" }} />
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
            <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 6 }}>
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
