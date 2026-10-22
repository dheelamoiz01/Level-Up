"use client";

import { useState, useEffect } from "react";
import type { ClubTable, Product } from "@/lib/types";
import { mockProducts } from "@/lib/mock/products";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import {
  Play,
  CheckCircle2,
  Sliders,
  User,
  Phone,
  Plus,
  Minus,
  Trash2,
  X,
  Search,
  Coffee,
  Utensils,
  Package,
  Clock,
  Tag,
  ShoppingBag,
  Receipt,
  Layers,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLiveProducts } from "@/lib/supabase/service";

export interface BillLine {
  product: Product;
  qty: number;
}

interface PlayerEntry {
  id: string;
  name: string;
  phone: string;
}

interface Props {
  table: ClubTable | null;
  onClose: () => void;
  onSessionUpdated?: () => void;
}

const CATEGORIES = ["All", "Drinks", "Snacks", "Accessories"] as const;

export function SessionDrawer({ table, onClose, onSessionUpdated }: Props) {
  // Multi-player session creation fields
  const [players, setPlayers] = useState<PlayerEntry[]>([
    { id: "p1", name: "", phone: "" },
  ]);
  const [editableRate, setEditableRate] = useState<number>(table?.hourly_rate ?? 350);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [liveProducts, setLiveProducts] = useState<Product[]>(mockProducts);

  // Center column: category & search
  const [activeCategory, setActiveCategory] = useState<(typeof CATEGORIES)[number]>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Right column: ledger lines & discounts
  const [lines, setLines] = useState<BillLine[]>([]);
  const [discount, setDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cash" | "card" | "udhar">("upi");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Responsive mobile tab
  const [mobileTab, setMobileTab] = useState<"table" | "products" | "ledger">("table");

  // Live timer & accrued bill for active games
  const [liveElapsed, setLiveElapsed] = useState<string>(table?.elapsed ?? "00:00:00");
  const [liveAccruedBill, setLiveAccruedBill] = useState<number>(table?.bill ?? 0);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Sync state on table change
  useEffect(() => {
    if (table) {
      if (table.player) {
        setPlayers([{ id: "p1", name: table.player, phone: table.phone || "" }]);
      } else {
        setPlayers([{ id: "p1", name: "", phone: "" }]);
      }
      setEditableRate(table.hourly_rate);
      setDiscount(0);
      setDiscountReason("");
      setLines([]);
      setMobileTab("table");
    }
    // Fetch live products from DB
    getLiveProducts().then((prods) => setLiveProducts(prods));
  }, [table]);

  // Real-time ticking timer for active sessions
  useEffect(() => {
    if (!table || table.status !== "playing" || !table.session_started_at) {
      setLiveElapsed(table?.elapsed ?? "00:00:00");
      setLiveAccruedBill(table?.bill ?? 0);
      return;
    }

    const startMs = new Date(table.session_started_at).getTime();
    const updateTick = () => {
      const nowMs = Date.now();
      const elapsedSec = Math.max(0, Math.floor((nowMs - startMs) / 1000));
      const hrs = String(Math.floor(elapsedSec / 3600)).padStart(2, "0");
      const mins = String(Math.floor((elapsedSec % 3600) / 60)).padStart(2, "0");
      const secs = String(elapsedSec % 60).padStart(2, "0");
      const durationStr = `${hrs}:${mins}:${secs}`;
      setLiveElapsed(durationStr);
      table.elapsed = durationStr;

      const hours = elapsedSec / 3600;
      const rate = table.hourly_rate || 350;
      const calculated = Math.max(table.min_fee || 50, Math.round(hours * rate));
      setLiveAccruedBill(calculated);
      table.bill = calculated;
    };

    updateTick();
    const timer = setInterval(updateTick, 1000);
    return () => clearInterval(timer);
  }, [table]);

  if (!table) return null;

  const isPlaying = table.status === "playing";

  // Player roster helpers
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

  // Product ledger helpers
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

  // Category Icon helper
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "Drinks":
        return <Coffee size={13} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      case "Snacks":
        return <Utensils size={13} strokeWidth={2} style={{ color: "var(--accent-primary)" }} />;
      default:
        return <Package size={13} strokeWidth={2} style={{ color: "var(--text-secondary)" }} />;
    }
  };

  // Filtered products list
  const filteredProducts = liveProducts.filter((p) => {
    if (!p.active) return false;
    const matchesCat =
      activeCategory === "All" ||
      (activeCategory === "Drinks" && p.category === "Drinks") ||
      (activeCategory === "Snacks" && p.category === "Snacks") ||
      (activeCategory === "Accessories" && p.category === "Other");
    if (!matchesCat) return false;
    if (searchQuery.trim().length > 0) {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
    }
    return true;
  });

  // Calculate bill totals
  const playCharge = isPlaying ? liveAccruedBill : 0;
  const itemsTotal = lines.reduce((s, l) => s + l.product.price * l.qty, 0);
  const subtotal = playCharge + itemsTotal;
  const finalTotal = Math.max(0, subtotal - discount);

  // Dynamic match description
  const filledNames = players
    .map((p) => p.name.trim())
    .filter((n) => n.length > 0);

  let matchRosterPreview = "Walk-in Match";
  if (filledNames.length === 1) {
    matchRosterPreview = filledNames[0];
  } else if (filledNames.length === 2) {
    matchRosterPreview = `${filledNames[0]} vs ${filledNames[1]}`;
  } else if (filledNames.length > 2) {
    matchRosterPreview = filledNames.join(", ");
  }

  // 1. Handle Start Arena Session
  const handleStartSession = async () => {
    setIsSubmitting(true);
    const now = new Date();

    const finalPlayer = matchRosterPreview;
    const primaryPhone =
      players.find((p) => p.phone.trim().length > 0)?.phone.trim() || null;

    // Trigger local push & chime
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
          items_amount: itemsTotal,
          discount_amount: discount,
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
    const nowIso = new Date().toISOString();

    // Trigger local push & settlement chime
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
      const startMs = table.session_started_at
        ? new Date(table.session_started_at).getTime()
        : Date.now();
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

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="session-workspace-overlay"
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="session-workspace-modal"
        onClick={(e) => e.stopPropagation()}
      >
        {/* ===================================================================
            WORKSPACE TOP HEADER BAR
            =================================================================== */}
        <header className="workspace-header">
          {/* Table Identity & Status */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h2
                  style={{
                    fontSize: 16,
                    fontWeight: 800,
                    color: "var(--text-primary)",
                    margin: 0,
                    letterSpacing: "-0.01em",
                  }}
                >
                  {table.name}
                </h2>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: "var(--accent-primary)",
                    background: "rgba(0, 199, 138, 0.1)",
                    border: "1px solid rgba(0, 199, 138, 0.25)",
                    padding: "2px 7px",
                    borderRadius: "var(--r-xs)",
                  }}
                >
                  {table.kind}
                </span>
                <StatusBadge status={table.status} />
              </div>
            </div>

            {isPlaying && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "3px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(0, 199, 138, 0.08)",
                  border: "1px solid rgba(0, 199, 138, 0.2)",
                  fontSize: 12,
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                }}
              >
                <Clock size={12} />
                <span>{liveElapsed}</span>
              </div>
            )}
          </div>

          {/* Hourly Rate & Close Action */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Inline Hourly Rate Control */}
            {isEditingRate ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-active)",
                  borderRadius: "var(--r-xs)",
                  padding: "2px 6px",
                }}
              >
                <span style={{ fontSize: 11.5, color: "var(--accent-primary)", fontWeight: 700 }}>₹</span>
                <input
                  type="number"
                  value={editableRate}
                  onChange={(e) => setEditableRate(Number(e.target.value))}
                  style={{
                    width: 55,
                    background: "transparent",
                    border: "none",
                    color: "var(--accent-primary)",
                    fontSize: 12,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    outline: "none",
                  }}
                />
                <button
                  type="button"
                  onClick={() => setIsEditingRate(false)}
                  className="btn btn-primary"
                  style={{ height: 22, padding: "0 6px", fontSize: 10, fontWeight: 700 }}
                >
                  Set
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditingRate(true)}
                title="Change session hourly rate"
                style={{
                  all: "unset",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "4px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(0, 199, 138, 0.08)",
                  border: "1px solid rgba(0, 199, 138, 0.2)",
                  transition: "all 0.15s ease",
                }}
              >
                <span style={{ fontFamily: "var(--font-mono)" }}>₹{editableRate}/hr</span>
                <Sliders size={11} style={{ opacity: 0.8 }} />
              </button>
            )}

            {/* Close Button with Esc Hint */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="btn"
              style={{
                width: 32,
                height: 32,
                padding: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "var(--r-xs)",
                color: "var(--text-secondary)",
              }}
            >
              <X size={16} />
            </button>
          </div>
        </header>

        {/* Mobile Tab Switcher (< 860px) */}
        <div className="workspace-mobile-tabs">
          <button
            type="button"
            className={`btn ${mobileTab === "table" ? "btn-primary" : ""}`}
            style={{ flex: 1, height: 28, fontSize: 11 }}
            onClick={() => setMobileTab("table")}
          >
            1. Table &amp; Players
          </button>
          <button
            type="button"
            className={`btn ${mobileTab === "products" ? "btn-primary" : ""}`}
            style={{ flex: 1, height: 28, fontSize: 11 }}
            onClick={() => setMobileTab("products")}
          >
            2. Menu ({lines.reduce((s, l) => s + l.qty, 0)})
          </button>
          <button
            type="button"
            className={`btn ${mobileTab === "ledger" ? "btn-primary" : ""}`}
            style={{ flex: 1, height: 28, fontSize: 11 }}
            onClick={() => setMobileTab("ledger")}
          >
            3. Ledger (₹{finalTotal})
          </button>
        </div>

        {/* ===================================================================
            WORKSPACE THREE-SECTION COORDINATED BODY
            =================================================================== */}
        <div className="workspace-grid">
          {/* =================================================================
              COLUMN 1 (LEFT): TABLE & PLAYERS
              ================================================================= */}
          <section
            className={`workspace-col workspace-col-left ${
              mobileTab === "table" ? "mobile-active" : ""
            }`}
          >
            <div className="workspace-scroll-area" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Section Header */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <User size={13} style={{ color: "var(--accent-primary)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                  }}
                >
                  Table &amp; Players
                </span>
              </div>

              {/* Table Specifications Card */}
              <div
                className="glass-card-inset"
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--r-sm)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Surface &amp; Cloth</span>
                  <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)" }}>
                    {table.kind === "Pool"
                      ? "8ft Slate · Simonis 860"
                      : table.kind === "Snooker"
                      ? "12ft Slate · Strachan 6811"
                      : "12ft Heated Slate Snooker"}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Session Rate</span>
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      color: "var(--accent-primary)",
                    }}
                  >
                    ₹{editableRate}/hr
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>Minimum Billing</span>
                  <span style={{ fontSize: 11.5, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                    ₹{table.min_fee ?? 50}
                  </span>
                </div>
              </div>

              {/* Active Session Info (If Playing) */}
              {isPlaying && (
                <div
                  className="glass-card-inset"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--r-sm)",
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      color: "var(--accent-primary)",
                    }}
                  >
                    Active Session Playing
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Match / Players</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                      {table.player || "Walk-in Match"}
                    </span>
                  </div>

                  {table.phone && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Contact Phone</span>
                      <span style={{ fontSize: 12, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                        {table.phone}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      paddingTop: 8,
                      borderTop: "1px solid var(--border-subtle)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Duration Elapsed</div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          fontFamily: "var(--font-mono)",
                          color: "var(--accent-primary)",
                        }}
                      >
                        {liveElapsed}
                      </div>
                    </div>

                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>Play Accrued</div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          fontFamily: "var(--font-mono)",
                          color: "var(--text-primary)",
                        }}
                      >
                        ₹{liveAccruedBill}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Multi-Player Match Roster (When Available) */}
              {!isPlaying && (
                <div
                  className="glass-card-inset"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--r-sm)",
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
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                        }}
                      >
                        Match Roster
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 1 }}>
                        All player fields optional
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={addPlayer}
                      className="btn"
                      style={{ height: 24, padding: "0 7px", fontSize: 10.5, gap: 4 }}
                    >
                      <Plus size={11} strokeWidth={2.5} />
                      <span>Add Player</span>
                    </button>
                  </div>

                  {/* Players list */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
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
                              fontSize: 10.5,
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
                                fontSize: 10.5,
                                display: "flex",
                                alignItems: "center",
                                gap: 3,
                              }}
                              title="Remove Player"
                            >
                              <Trash2 size={10.5} />
                              <span>Remove</span>
                            </button>
                          )}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                          <div>
                            <input
                              placeholder={`Name (Optional)`}
                              value={p.name}
                              onChange={(e) => updatePlayer(p.id, "name", e.target.value)}
                              style={{
                                width: "100%",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-default)",
                                borderRadius: "var(--r-xs)",
                                padding: "5px 7px",
                                color: "var(--text-primary)",
                                fontSize: 11.5,
                              }}
                            />
                          </div>

                          <div>
                            <input
                              placeholder="Phone (Optional)"
                              value={p.phone}
                              onChange={(e) => updatePlayer(p.id, "phone", e.target.value)}
                              style={{
                                width: "100%",
                                background: "var(--bg-surface)",
                                border: "1px solid var(--border-default)",
                                borderRadius: "var(--r-xs)",
                                padding: "5px 7px",
                                color: "var(--text-primary)",
                                fontSize: 11.5,
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Match Format Preview */}
                  <div
                    style={{
                      background: "var(--bg-surface)",
                      border: "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-xs)",
                      padding: "6px 8px",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <span style={{ fontSize: 10, color: "var(--text-muted)" }}>Format:</span>
                    <span
                      style={{
                        fontSize: 11,
                        fontWeight: 600,
                        color: "var(--accent-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {matchRosterPreview}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* =================================================================
              COLUMN 2 (CENTER): F&B & SNACK PRODUCTS GRID
              ================================================================= */}
          <section
            className={`workspace-col workspace-col-center ${
              mobileTab === "products" ? "mobile-active" : ""
            }`}
          >
            {/* Pinned Category Chips & Search Bar */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                background: "var(--bg-surface-raised)",
                flexShrink: 0,
              }}
            >
              {/* Category Pills */}
              <div
                className="chips"
                style={{
                  display: "inline-flex",
                  padding: "2px",
                  borderRadius: "var(--r-sm)",
                  gap: 2,
                }}
              >
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`btn ${activeCategory === c ? "btn-primary" : ""}`}
                    style={{
                      height: 26,
                      padding: "0 10px",
                      fontSize: 11,
                      fontWeight: activeCategory === c ? 700 : 500,
                    }}
                    onClick={() => setActiveCategory(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* Compact Search Input */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--r-xs)",
                  padding: "3px 8px",
                  minWidth: 160,
                  flex: "1 1 auto",
                  maxWidth: 240,
                }}
              >
                <Search size={12} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
                <input
                  type="text"
                  placeholder="Search snacks, drinks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: "var(--text-primary)",
                    fontSize: 11.5,
                    outline: "none",
                    width: "100%",
                  }}
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    style={{ all: "unset", cursor: "pointer", color: "var(--text-muted)", display: "flex" }}
                  >
                    <X size={11} />
                  </button>
                )}
              </div>
            </div>

            {/* Scrollable Compact Product Grid */}
            <div className="workspace-scroll-area">
              {filteredProducts.length === 0 ? (
                <div
                  style={{
                    padding: 30,
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 12,
                    fontStyle: "italic",
                  }}
                >
                  No items found matching &quot;{searchQuery}&quot; in {activeCategory}.
                </div>
              ) : (
                <div className="workspace-product-grid">
                  {filteredProducts.map((p) => {
                    const inCartLine = lines.find((l) => l.product.id === p.id);
                    const inCartQty = inCartLine?.qty || 0;

                    return (
                      <div
                        key={p.id}
                        className="workspace-product-card"
                        onClick={() => addProduct(p)}
                        title={`Add ${p.name}`}
                      >
                        {/* Top: Category Icon & In-Cart Badge */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            width: "100%",
                          }}
                        >
                          <div
                            style={{
                              width: 24,
                              height: 24,
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

                          {inCartQty > 0 && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: "var(--accent-primary)",
                                background: "rgba(0, 199, 138, 0.14)",
                                border: "1px solid rgba(0, 199, 138, 0.3)",
                                padding: "1px 5px",
                                borderRadius: "var(--r-full)",
                                fontFamily: "var(--font-mono)",
                              }}
                            >
                              {inCartQty}×
                            </span>
                          )}
                        </div>

                        {/* Title (Clean 2-line clamp) */}
                        <div
                          style={{
                            fontSize: 11.5,
                            fontWeight: 600,
                            color: "var(--text-primary)",
                            lineHeight: 1.25,
                            margin: "6px 0 4px 0",
                            overflow: "hidden",
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                          }}
                        >
                          {p.name}
                        </div>

                        {/* Bottom: Monospace Price & Compact Add Button */}
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginTop: "auto",
                          }}
                        >
                          <span
                            style={{
                              fontSize: 12.5,
                              fontWeight: 700,
                              fontFamily: "var(--font-mono)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            ₹{p.price}
                          </span>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              addProduct(p);
                            }}
                            className="btn btn-primary"
                            style={{
                              width: 22,
                              height: 22,
                              padding: 0,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: "var(--r-xs)",
                            }}
                            title="Add one"
                          >
                            <Plus size={12} strokeWidth={2.5} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* =================================================================
              COLUMN 3 (RIGHT): LIVE SESSION LEDGER & SETTLEMENT
              ================================================================= */}
          <section
            className={`workspace-col workspace-col-right ${
              mobileTab === "ledger" ? "mobile-active" : ""
            }`}
          >
            {/* Header: Ledger Title & Items Count */}
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexShrink: 0,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Receipt size={13} style={{ color: "var(--accent-primary)" }} />
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "var(--text-secondary)",
                  }}
                >
                  Session Ledger
                </span>
              </div>

              <span
                style={{
                  fontSize: 10.5,
                  color: "var(--text-muted)",
                  background: "var(--bg-surface)",
                  padding: "2px 6px",
                  borderRadius: "var(--r-xs)",
                }}
              >
                {lines.reduce((s, l) => s + l.qty, 0) + (isPlaying ? 1 : 0)} items
              </span>
            </div>

            {/* Scrollable Selected Items List */}
            <div
              className="workspace-scroll-area"
              style={{
                flex: "1 1 auto",
                padding: "12px 14px",
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {/* Table Arena Booking Line Item */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "6px 8px",
                  borderRadius: "var(--r-xs)",
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Clock size={12} style={{ color: "var(--accent-primary)" }} />
                  <div style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 11.5, fontWeight: 600, color: "var(--text-primary)" }}>
                      {isPlaying ? "Table Play Time" : "Table Arena Booking"}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      {isPlaying ? liveElapsed : `₹${editableRate}/hr (starts on play)`}
                    </span>
                  </div>
                </div>

                <span
                  style={{
                    fontSize: 12.5,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: "var(--text-primary)",
                  }}
                >
                  ₹{playCharge}
                </span>
              </div>

              {/* F&B Selected Lines */}
              {lines.map((l) => (
                <div
                  key={l.product.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 8px",
                    borderRadius: "var(--r-xs)",
                    background: "var(--bg-surface)",
                    border: "1px solid var(--border-subtle)",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, minWidth: 0, paddingRight: 6 }}>
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {l.product.name}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                      ₹{l.product.price} each
                    </span>
                  </div>

                  {/* Quantity Stepper & Price */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        background: "var(--bg-surface-inset)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--r-xs)",
                        padding: "1px",
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => updateQty(l.product.id, -1)}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: "2px 4px",
                          display: "flex",
                        }}
                        title="Decrease"
                      >
                        <Minus size={10} />
                      </button>
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          color: "var(--accent-primary)",
                          minWidth: 16,
                          textAlign: "center",
                          fontFamily: "var(--font-mono)",
                        }}
                      >
                        {l.qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQty(l.product.id, 1)}
                        style={{
                          all: "unset",
                          cursor: "pointer",
                          color: "var(--text-muted)",
                          padding: "2px 4px",
                          display: "flex",
                        }}
                        title="Increase"
                      >
                        <Plus size={10} />
                      </button>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-primary)",
                        minWidth: 42,
                        textAlign: "right",
                      }}
                    >
                      ₹{l.product.price * l.qty}
                    </span>

                    <button
                      type="button"
                      onClick={() => removeLine(l.product.id)}
                      style={{
                        all: "unset",
                        cursor: "pointer",
                        color: "var(--text-muted)",
                        padding: "2px",
                        display: "flex",
                      }}
                      title="Remove"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}

              {lines.length === 0 && (
                <div
                  style={{
                    padding: "16px 8px",
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    fontStyle: "italic",
                  }}
                >
                  No drinks, snacks or gear added yet.
                  <div style={{ fontSize: 10, marginTop: 3, color: "var(--text-dim)" }}>
                    Tap items in the center menu to add
                  </div>
                </div>
              )}
            </div>

            {/* Pinned Settlement & Action Summary Box */}
            <div
              style={{
                padding: "12px 14px",
                borderTop: "1px solid var(--border-subtle)",
                background: "var(--bg-surface)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
                flexShrink: 0,
              }}
            >
              {/* Subtotal */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 11.5, color: "var(--text-muted)" }}>Subtotal</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
                  ₹{subtotal}
                </span>
              </div>

              {/* Discount Row (Clean, no brackets) */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--text-secondary)" }}>
                  <Tag size={11} style={{ color: "var(--accent-primary)" }} />
                  <span>Discount</span>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>-₹</span>
                  <input
                    type="number"
                    min={0}
                    value={discount || ""}
                    placeholder="0"
                    onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                    style={{
                      width: 55,
                      background: "var(--bg-surface-inset)",
                      border: "1px solid var(--border-default)",
                      borderRadius: "var(--r-xs)",
                      padding: "2px 5px",
                      color: "var(--accent-primary)",
                      fontSize: 11.5,
                      fontWeight: 700,
                      fontFamily: "var(--font-mono)",
                      textAlign: "right",
                    }}
                  />
                </div>
              </div>

              {/* Optional Discount Note */}
              {discount > 0 && (
                <input
                  type="text"
                  placeholder="Discount reason (e.g. Member / Promo)"
                  value={discountReason}
                  onChange={(e) => setDiscountReason(e.target.value)}
                  style={{
                    width: "100%",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-subtle)",
                    borderRadius: "var(--r-xs)",
                    padding: "3px 6px",
                    color: "var(--text-primary)",
                    fontSize: 10.5,
                  }}
                />
              )}

              {/* Net Total Due */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  paddingTop: 6,
                  borderTop: "1px solid var(--border-subtle)",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                  Total Due
                </span>
                <span
                  style={{
                    fontSize: 20,
                    fontWeight: 800,
                    fontFamily: "var(--font-mono)",
                    color: "var(--accent-primary)",
                  }}
                >
                  ₹{finalTotal}
                </span>
              </div>

              {/* Payment Collection Modes (If Playing / Settling) */}
              {isPlaying && (
                <div>
                  <div style={{ fontSize: 10, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 5 }}>
                    Payment Mode
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 4 }}>
                    {(["upi", "cash", "card", "udhar"] as const).map((m) => {
                      const active = paymentMethod === m;
                      return (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`btn ${active ? "btn-primary" : ""}`}
                          style={{
                            height: 26,
                            fontSize: 10,
                            fontWeight: active ? 700 : 500,
                            textTransform: "uppercase",
                            padding: 0,
                          }}
                        >
                          {m}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Primary Action Buttons (Always Visible!) */}
              <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                <Button
                  onClick={onClose}
                  style={{ flex: 1, height: 36, fontSize: 12 }}
                >
                  {isPlaying ? "Close" : "Cancel"}
                </Button>

                {isPlaying ? (
                  <Button
                    variant="primary"
                    style={{ flex: 2, height: 36, fontSize: 12, fontWeight: 700, gap: 6 }}
                    onClick={handleSettleSession}
                    disabled={isSubmitting}
                  >
                    <CheckCircle2 size={14} strokeWidth={2.5} />
                    <span>{isSubmitting ? "Settling..." : "Settle & Free Table"}</span>
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    style={{ flex: 2, height: 36, fontSize: 12, fontWeight: 700, gap: 6 }}
                    onClick={handleStartSession}
                    disabled={isSubmitting}
                  >
                    <Play size={14} strokeWidth={2.5} />
                    <span>{isSubmitting ? "Starting..." : "Start Arena Session"}</span>
                  </Button>
                )}
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
