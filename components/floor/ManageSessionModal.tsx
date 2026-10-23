"use client";

import { useState, useEffect, useMemo } from "react";
import type { ClubTable, Product, SessionItem, TablePricing } from "@/lib/types";
import {
  formatCountdown,
  extendFloorSession,
  addSessionItems,
  getSessionItems,
  collectFloorPayment,
} from "@/lib/turso/service";
import { useAuth } from "@/lib/auth/AuthContext";
import {
  Clock,
  User,
  Phone,
  AlertTriangle,
  Plus,
  Minus,
  CheckCircle2,
  DollarSign,
  CreditCard,
  Banknote,
  Receipt,
  ShoppingBag,
  ArrowRight,
  X,
  Sliders,
  Utensils,
  Coffee,
  AlertCircle,
  FileText,
} from "lucide-react";

interface ManageSessionModalProps {
  table: ClubTable | null;
  products: Product[];
  pricingList: TablePricing[];
  onClose: () => void;
  onSessionUpdated: () => void;
}

export function ManageSessionModal({
  table,
  products,
  pricingList,
  onClose,
  onSessionUpdated,
}: ManageSessionModalProps) {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"items" | "extend" | "payment">("items");

  // Add-on items state
  const [existingItems, setExistingItems] = useState<SessionItem[]>([]);
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});
  const [activeCategory, setActiveCategory] = useState<string>("All");
  const [isAddingItems, setIsAddingItems] = useState(false);

  // Extend state
  const [isExtending, setIsExtending] = useState(false);

  // Payment state
  const [cashAmount, setCashAmount] = useState<string>("");
  const [upiAmount, setUpiAmount] = useState<string>("");
  const [upiRef, setUpiRef] = useState<string>("");
  const [discountAmount, setDiscountAmount] = useState<string>("");
  const [discountReason, setDiscountReason] = useState<string>("");
  const [isCollecting, setIsCollecting] = useState(false);
  const [confirmEarlyEnd, setConfirmEarlyEnd] = useState(false);
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // Load existing session items
  useEffect(() => {
    if (table?.current_session_id) {
      getSessionItems(table.current_session_id).then(setExistingItems);
    }
  }, [table?.current_session_id]);

  if (!table) return null;

  const isPlaying = table.status === "playing";
  const remainingSec = table.remaining_seconds ?? 0;
  const isTimeUp = isPlaying && Boolean(table.scheduled_end_at) && remainingSec <= 0;
  const isEndingSoon = isPlaying && Boolean(table.scheduled_end_at) && remainingSec > 0 && remainingSec <= 300;

  // Active pricing for extensions
  const pricing = pricingList.find((p) => p.category === table.kind) || {
    rate_30m: table.kind === "Royal" ? 300 : table.kind === "Snooker" ? 200 : 150,
    rate_60m: table.kind === "Royal" ? 500 : table.kind === "Snooker" ? 350 : 250,
  };

  // Calculate bill components
  const baseTableFee = table.bill || (table.duration_choice === "1h" ? pricing.rate_60m : pricing.rate_30m);
  const itemsTotal = existingItems.reduce((acc, it) => acc + (it.total_price || 0), 0);
  const discountVal = Math.max(0, parseFloat(discountAmount) || 0);
  const totalBill = Math.max(0, baseTableFee + itemsTotal - discountVal);

  // Payment amounts
  const cashVal = Math.max(0, parseFloat(cashAmount) || 0);
  const upiVal = Math.max(0, parseFloat(upiAmount) || 0);
  const totalReceived = cashVal + upiVal;
  const remainingUdhar = Math.max(0, totalBill - totalReceived);

  // Filtered add-on products
  const addOnProducts = useMemo(() => {
    return products.filter((p) => {
      if (!p.active) return false;
      if (activeCategory === "All") return true;
      if (activeCategory === "Snacks" && p.category === "Snacks") return true;
      if (activeCategory === "Drinks" && p.category === "Drinks") return true;
      if (activeCategory === "Cigarettes" && (p.category === "Other" || p.name.toLowerCase().includes("mild") || p.name.toLowerCase().includes("gold"))) return true;
      return true;
    });
  }, [products, activeCategory]);

  // Handle pending item quantities
  const handleQuantityChange = (productId: string, delta: number) => {
    setPendingQuantities((prev) => {
      const current = prev[productId] || 0;
      const next = Math.max(0, current + delta);
      return { ...prev, [productId]: next };
    });
  };

  // Add items to session
  const handleConfirmAddItems = async () => {
    if (!table.current_session_id) {
      setErrorMsg("Session ID missing on this table.");
      return;
    }

    const itemsToAdd = Object.entries(pendingQuantities)
      .filter(([_, qty]) => qty > 0)
      .map(([prodId, qty]) => {
        const prod = products.find((p) => p.id === prodId)!;
        return {
          productId: prodId,
          productName: prod.name,
          quantity: qty,
          unitPrice: prod.price,
        };
      });

    if (itemsToAdd.length === 0) {
      setErrorMsg("Please select at least 1 item to add.");
      return;
    }

    setIsAddingItems(true);
    setErrorMsg(null);

    const res = await addSessionItems({
      sessionId: table.current_session_id,
      tableId: table.id,
      items: itemsToAdd,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      setActionFeedback("Refreshments added to match bill.");
      setPendingQuantities({});
      const updated = await getSessionItems(table.current_session_id);
      setExistingItems(updated);
      onSessionUpdated();
      setTimeout(() => setActionFeedback(null), 3000);
    } else {
      setErrorMsg(res.error || "Failed to add items.");
    }
    setIsAddingItems(false);
  };

  // Extend session
  const handleExtend = async (choice: "30m" | "1h") => {
    setIsExtending(true);
    setErrorMsg(null);

    const extPrice = choice === "30m" ? pricing.rate_30m : pricing.rate_60m;

    const res = await extendFloorSession({
      tableId: table.id,
      sessionId: table.current_session_id,
      extensionChoice: choice,
      extensionPrice: extPrice,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      setActionFeedback(`Match extended by ${choice === "30m" ? "30 minutes" : "1 hour"}.`);
      onSessionUpdated();
      setTimeout(() => setActionFeedback(null), 3000);
    } else {
      setErrorMsg(res.error || "Failed to extend session.");
    }
    setIsExtending(false);
  };

  // Collect payment & close session
  const handleCollectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!table.current_session_id) {
      setErrorMsg("No active session ID found.");
      return;
    }

    // If time remains and not confirmed, prompt
    if (remainingSec > 60 && !confirmEarlyEnd) {
      setConfirmEarlyEnd(true);
      return;
    }

    setIsCollecting(true);
    setErrorMsg(null);

    const res = await collectFloorPayment({
      tableId: table.id,
      sessionId: table.current_session_id,
      finalTotal: totalBill,
      cashReceived: cashVal,
      upiReceived: upiVal,
      udharAmount: remainingUdhar,
      upiReference: upiRef.trim() || undefined,
      discountAmount: discountVal,
      discountReason: discountReason.trim() || undefined,
      managerName: user?.username || "manager",
    });

    if (res.success) {
      onSessionUpdated();
      onClose();
    } else {
      setErrorMsg(res.error || "Failed to complete payment.");
    }
    setIsCollecting(false);
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.82)",
        backdropFilter: "blur(8px)",
        zIndex: 99999,
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
          maxHeight: "92vh",
          overflowY: "auto",
          background: "var(--bg-surface-raised)",
          border: isTimeUp
            ? "1px solid rgba(239, 68, 68, 0.6)"
            : "1px solid var(--border-default)",
          borderRadius: "var(--r-md)",
          padding: 24,
          boxShadow: "0 24px 60px rgba(0, 0, 0, 0.9)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="eyebrow eyebrow-accent">Match Operations</span>
              <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>
                {table.kind}
              </span>
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
              {table.name}
            </h2>
          </div>

          <button onClick={onClose} style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}>
            <X size={18} />
          </button>
        </div>

        {/* Live Status & Countdown Banner */}
        <div
          style={{
            padding: "12px 16px",
            borderRadius: "var(--r-sm)",
            background: isTimeUp
              ? "rgba(239, 68, 68, 0.12)"
              : isEndingSoon
              ? "rgba(245, 158, 11, 0.12)"
              : "var(--bg-surface-inset)",
            border: isTimeUp
              ? "1px solid rgba(239, 68, 68, 0.35)"
              : isEndingSoon
              ? "1px solid rgba(245, 158, 11, 0.35)"
              : "1px solid var(--border-subtle)",
            marginBottom: 16,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
              <User size={13} style={{ color: "var(--accent-primary)" }} />
              <span>{table.player || "Walk-in Match"}</span>
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
              Booked: {table.duration_choice || "30m"} · Bill: ₹{totalBill}
            </div>
          </div>

          <div style={{ textAlign: "right" }}>
            <div
              style={{
                fontSize: 18,
                fontWeight: 800,
                fontFamily: "var(--font-mono)",
                color: isTimeUp ? "var(--danger)" : isEndingSoon ? "var(--amber)" : "var(--accent-primary)",
              }}
            >
              {isTimeUp ? "TIME UP" : formatCountdown(remainingSec)}
            </div>
            <div style={{ fontSize: 10.5, color: "var(--text-muted)", textTransform: "uppercase" }}>
              {isTimeUp ? "Action Required" : "Remaining"}
            </div>
          </div>
        </div>

        {/* Feedback / Alert Banners */}
        {actionFeedback && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 12px",
              borderRadius: "var(--r-xs)",
              background: "rgba(0, 199, 138, 0.12)",
              border: "1px solid rgba(0, 199, 138, 0.3)",
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <CheckCircle2 size={14} />
            <span>{actionFeedback}</span>
          </div>
        )}

        {errorMsg && (
          <div
            style={{
              marginBottom: 14,
              padding: "8px 12px",
              borderRadius: "var(--r-xs)",
              background: "rgba(239, 68, 68, 0.12)",
              border: "1px solid rgba(239, 68, 68, 0.3)",
              color: "var(--danger)",
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 12,
              fontWeight: 600,
            }}
          >
            <AlertCircle size={14} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: 6,
            background: "var(--bg-surface-inset)",
            padding: 3,
            borderRadius: "var(--r-sm)",
            border: "1px solid var(--border-subtle)",
            marginBottom: 18,
          }}
        >
          <button
            onClick={() => setActiveTab("items")}
            style={{
              all: "unset",
              textAlign: "center",
              padding: "7px 0",
              fontSize: 11.5,
              fontWeight: activeTab === "items" ? 700 : 500,
              color: activeTab === "items" ? "var(--text-primary)" : "var(--text-muted)",
              background: activeTab === "items" ? "var(--bg-surface-raised)" : "transparent",
              borderRadius: "var(--r-xs)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <ShoppingBag size={12} />
            <span>Add Items</span>
          </button>

          <button
            onClick={() => setActiveTab("extend")}
            style={{
              all: "unset",
              textAlign: "center",
              padding: "7px 0",
              fontSize: 11.5,
              fontWeight: activeTab === "extend" ? 700 : 500,
              color: activeTab === "extend" ? "var(--accent-primary)" : "var(--text-muted)",
              background: activeTab === "extend" ? "var(--bg-surface-raised)" : "transparent",
              borderRadius: "var(--r-xs)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Clock size={12} />
            <span>Extend</span>
          </button>

          <button
            onClick={() => setActiveTab("payment")}
            style={{
              all: "unset",
              textAlign: "center",
              padding: "7px 0",
              fontSize: 11.5,
              fontWeight: activeTab === "payment" ? 700 : 500,
              color: activeTab === "payment" ? "var(--accent-primary)" : "var(--text-muted)",
              background: activeTab === "payment" ? "var(--bg-surface-raised)" : "transparent",
              borderRadius: "var(--r-xs)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 5,
            }}
          >
            <Receipt size={12} />
            <span>Collect Bill</span>
          </button>
        </div>

        {/* ===================================================================
            TAB 1: ADD-ON ITEMS (SNACKS, CIGARETTES, JUICE, DRINKS)
            =================================================================== */}
        {activeTab === "items" && (
          <div>
            {/* Category Filter Pills */}
            <div style={{ display: "flex", gap: 6, marginBottom: 12, overflowX: "auto" }}>
              {["All", "Snacks", "Drinks", "Cigarettes"].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  style={{
                    all: "unset",
                    fontSize: 11,
                    fontWeight: activeCategory === cat ? 700 : 500,
                    padding: "3px 10px",
                    borderRadius: "var(--r-full)",
                    background: activeCategory === cat ? "var(--accent-primary)" : "var(--bg-surface-inset)",
                    color: activeCategory === cat ? "#030806" : "var(--text-secondary)",
                    border: "1px solid var(--border-subtle)",
                    cursor: "pointer",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Products Selector Grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
                maxHeight: 220,
                overflowY: "auto",
                marginBottom: 14,
                paddingRight: 4,
              }}
            >
              {addOnProducts.map((p) => {
                const qty = pendingQuantities[p.id] || 0;
                return (
                  <div
                    key={p.id}
                    style={{
                      background: "var(--bg-surface-inset)",
                      border: qty > 0 ? "1px solid var(--accent-primary)" : "1px solid var(--border-subtle)",
                      borderRadius: "var(--r-xs)",
                      padding: "8px 10px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--text-primary)" }}>{p.name}</div>
                      <div style={{ fontSize: 11, color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>
                        ₹{p.price}
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(p.id, -1)}
                        className="btn"
                        style={{ width: 22, height: 22, padding: 0, opacity: qty > 0 ? 1 : 0.4 }}
                      >
                        <Minus size={10} />
                      </button>
                      <span style={{ fontSize: 12, fontWeight: 700, fontFamily: "var(--font-mono)", minWidth: 16, textAlign: "center" }}>
                        {qty}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(p.id, 1)}
                        className="btn"
                        style={{ width: 22, height: 22, padding: 0 }}
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Attached Items Ledger */}
            {existingItems.length > 0 && (
              <div
                style={{
                  background: "var(--bg-surface-inset)",
                  padding: 10,
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                  marginBottom: 14,
                }}
              >
                <div style={{ fontSize: 11, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 4 }}>
                  Items Attached to Match ({existingItems.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 90, overflowY: "auto" }}>
                  {existingItems.map((it) => (
                    <div key={it.id} style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span>{it.quantity}x {it.product_name}</span>
                      <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{it.total_price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={handleConfirmAddItems}
              disabled={isAddingItems || Object.values(pendingQuantities).every((q) => q === 0)}
              className="btn btn-primary"
              style={{ width: "100%", height: 38, fontSize: 13, fontWeight: 700, gap: 6 }}
            >
              <ShoppingBag size={14} />
              <span>{isAddingItems ? "Adding Items..." : "Confirm & Add Items to Bill"}</span>
            </button>
          </div>
        )}

        {/* ===================================================================
            TAB 2: EXTEND SESSION (CONTINUE PLAYING)
            =================================================================== */}
        {activeTab === "extend" && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>
                Extend Active Session Duration
              </h3>
              <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
                Customer wants to continue playing? Select an extension duration. The tariff is automatically snapshotted and added to the bill.
              </p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
              {/* +30 Minutes */}
              <button
                type="button"
                disabled={isExtending}
                onClick={() => handleExtend("30m")}
                style={{
                  all: "unset",
                  padding: 16,
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.15s ease",
                }}
                className="table-card-hover"
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>+30 Minutes</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Add half hour frame</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 12 }}>
                  ₹{pricing.rate_30m}
                </div>
              </button>

              {/* +1 Hour */}
              <button
                type="button"
                disabled={isExtending}
                onClick={() => handleExtend("1h")}
                style={{
                  all: "unset",
                  padding: 16,
                  borderRadius: "var(--r-sm)",
                  background: "var(--bg-surface-inset)",
                  border: "1px solid var(--border-default)",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "border-color 0.15s ease",
                }}
                className="table-card-hover"
              >
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>+1 Hour (60m)</div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>Add full 1-hour session</div>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--accent-primary)", fontFamily: "var(--font-mono)", marginTop: 12 }}>
                  ₹{pricing.rate_60m}
                </div>
              </button>
            </div>

            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-muted)",
                background: "var(--bg-surface-inset)",
                padding: "10px 12px",
                borderRadius: "var(--r-xs)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Extending preserves original match start time and links a duration extension record into the owner telemetry ledger.
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: COLLECT PAYMENT & CLOSE (CASH, UPI, UDHAR)
            =================================================================== */}
        {activeTab === "payment" && (
          <form onSubmit={handleCollectPayment} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Early End Warning Dialog */}
            {confirmEarlyEnd && remainingSec > 60 && (
              <div
                style={{
                  padding: "10px 14px",
                  borderRadius: "var(--r-xs)",
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1px solid rgba(245, 158, 11, 0.4)",
                  color: "var(--amber)",
                  fontSize: 12,
                }}
              >
                <div style={{ fontWeight: 700, marginBottom: 2 }}>⚠️ Session Time Still Remaining ({formatCountdown(remainingSec)})</div>
                <span>Customer is finishing early. Click &quot;Confirm &amp; Settle Match&quot; below to proceed.</span>
              </div>
            )}

            {/* Bill Summary Ledger */}
            <div
              style={{
                background: "var(--bg-surface-inset)",
                padding: 14,
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--border-subtle)",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                fontSize: 12.5,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "var(--text-secondary)" }}>Table Play Tariff:</span>
                <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{baseTableFee}</span>
              </div>

              {itemsTotal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-secondary)" }}>Snacks &amp; Drinks ({existingItems.length} items):</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--text-primary)" }}>₹{itemsTotal}</span>
                </div>
              )}

              {discountVal > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--amber)" }}>Manual Discount:</span>
                  <span style={{ fontFamily: "var(--font-mono)", color: "var(--amber)", fontWeight: 700 }}>-₹{discountVal}</span>
                </div>
              )}

              <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 800 }}>
                <span>Final Total Bill:</span>
                <span style={{ color: "var(--accent-primary)", fontFamily: "var(--font-mono)" }}>₹{totalBill}</span>
              </div>
            </div>

            {/* Quick Settle Shortcuts */}
            <div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 4 }}>Quick Auto-Fill:</div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  onClick={() => {
                    setCashAmount(String(totalBill));
                    setUpiAmount("");
                  }}
                  className="btn"
                  style={{ flex: 1, height: 28, fontSize: 11 }}
                >
                  Full Cash (₹{totalBill})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setUpiAmount(String(totalBill));
                    setCashAmount("");
                  }}
                  className="btn"
                  style={{ flex: 1, height: 28, fontSize: 11 }}
                >
                  Full UPI (₹{totalBill})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCashAmount("");
                    setUpiAmount("");
                  }}
                  className="btn"
                  style={{ flex: 1, height: 28, fontSize: 11, color: "var(--amber)" }}
                >
                  Full Udhar
                </button>
              </div>
            </div>

            {/* Payment Method Inputs (Cash & UPI Split) */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Cash Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="₹ 0"
                  value={cashAmount}
                  onChange={(e) => setCashAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  UPI / Digital Received (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="₹ 0"
                  value={upiAmount}
                  onChange={(e) => setUpiAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 14,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>

            {/* UPI Reference & Discount */}
            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  UPI Transaction Ref (Optional)
                </label>
                <input
                  placeholder="e.g. UPI / UTR 42819..."
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--text-primary)",
                    fontSize: 12,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 4 }}>
                  Discount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="₹ 0"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(e.target.value)}
                  style={{
                    width: "100%",
                    height: 34,
                    padding: "0 10px",
                    background: "var(--bg-surface-inset)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--r-xs)",
                    color: "var(--amber)",
                    fontSize: 13,
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                  }}
                />
              </div>
            </div>

            {/* Remaining Balance / Udhar Notification */}
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "var(--r-xs)",
                background: remainingUdhar > 0 ? "rgba(245, 158, 11, 0.1)" : "rgba(0, 199, 138, 0.08)",
                border: remainingUdhar > 0 ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid rgba(0, 199, 138, 0.2)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12.5,
              }}
            >
              <span style={{ color: remainingUdhar > 0 ? "var(--amber)" : "var(--accent-primary)", fontWeight: 600 }}>
                {remainingUdhar > 0 ? "Outstanding Balance (Udhar):" : "Status: Full Settlement"}
              </span>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: remainingUdhar > 0 ? "var(--amber)" : "var(--accent-primary)" }}>
                ₹{remainingUdhar}
              </span>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isCollecting}
              className="btn btn-primary"
              style={{
                width: "100%",
                height: 42,
                fontSize: 13.5,
                fontWeight: 700,
                background: "linear-gradient(180deg, #00C78A 0%, #009E6D 100%)",
              }}
            >
              <CheckCircle2 size={16} />
              <span>{isCollecting ? "Settling Ledger..." : "Confirm Payment & Free Table"}</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
