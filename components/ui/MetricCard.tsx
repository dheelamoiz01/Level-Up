import type { Metric } from "@/lib/types";
import { TrendingUp, AlertCircle, ArrowUpRight } from "lucide-react";
import { GlassCard } from "./GlassCard";

interface MetricCardProps extends Metric {
  asymmetry?: "1" | "2" | "3" | "4";
  variant?: "default" | "raised" | "inset" | "floating" | "highlight";
}

export function MetricCard({
  label,
  value,
  delta,
  hint,
  asymmetry,
  variant = "default",
}: MetricCardProps) {
  const isUdhar = label.toLowerCase().includes("outstanding") || label.toLowerCase().includes("udhar");

  return (
    <GlassCard
      variant={variant}
      asymmetry={asymmetry}
      interactive
      className="metric"
      style={{
        justifyContent: "space-between",
        minHeight: 148,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span className="eyebrow" style={{ color: isUdhar ? "var(--amber)" : "var(--muted)" }}>
            {isUdhar && <AlertCircle size={11} />}
            {label}
          </span>
          {delta && (
            <span
              className="delta-badge"
              style={{
                background: isUdhar ? "rgba(245, 158, 11, 0.12)" : "rgba(92, 242, 176, 0.12)",
                color: isUdhar ? "var(--amber)" : "var(--mint)",
                borderColor: isUdhar ? "rgba(245, 158, 11, 0.28)" : "rgba(92, 242, 176, 0.28)",
              }}
            >
              <ArrowUpRight size={11} strokeWidth={2.5} />
              {delta}
            </span>
          )}
        </div>
        <span
          className="value"
          style={{
            display: "block",
            marginTop: 8,
            color: isUdhar ? "#fef3c7" : "var(--text-hero)",
            textShadow: variant === "highlight" ? "0 0 20px rgba(92, 242, 176, 0.3)" : "none",
          }}
        >
          {value}
        </span>
      </div>

      {hint && (
        <span
          className="muted"
          style={{
            fontSize: 12.5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: isUdhar ? "rgba(245, 158, 11, 0.75)" : "var(--muted)",
          }}
        >
          <span
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              backgroundColor: isUdhar ? "var(--amber)" : "rgba(167, 243, 208, 0.4)",
              display: "inline-block",
              boxShadow: isUdhar ? "0 0 6px var(--amber)" : "none",
            }}
          />
          {hint}
        </span>
      )}
    </GlassCard>
  );
}
