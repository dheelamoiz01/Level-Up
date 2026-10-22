import type { Metric } from "@/lib/types";
import { ArrowUpRight, AlertCircle } from "lucide-react";

interface MetricCardProps extends Metric {
  asymmetry?: string;
  variant?: string;
}

export function MetricCard({
  label,
  value,
  delta,
  hint,
}: MetricCardProps) {
  const isUdhar = label.toLowerCase().includes("outstanding") || label.toLowerCase().includes("udhar");

  return (
    <div
      className="glass-card metric"
      style={{
        border: isUdhar ? "1px solid rgba(245, 158, 11, 0.25)" : "1px solid var(--border-default)",
        minHeight: 124,
      }}
    >
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
          <span
            style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: isUdhar ? "var(--amber)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            {isUdhar && <AlertCircle size={12} strokeWidth={2.2} />}
            {label}
          </span>

          {delta && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 3,
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--font-mono)",
                padding: "2px 6px",
                borderRadius: "var(--r-xs)",
                color: isUdhar ? "var(--amber)" : "var(--accent-primary)",
                background: isUdhar ? "rgba(245, 158, 11, 0.08)" : "rgba(0, 199, 138, 0.08)",
                border: isUdhar ? "1px solid rgba(245, 158, 11, 0.2)" : "1px solid rgba(0, 199, 138, 0.2)",
              }}
            >
              <ArrowUpRight size={11} strokeWidth={2.2} />
              {delta}
            </span>
          )}
        </div>

        <div
          className="value"
          style={{
            marginTop: 8,
            color: isUdhar ? "#FCD34D" : "var(--text-primary)",
          }}
        >
          {value}
        </div>
      </div>

      {hint && (
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-muted)",
            marginTop: 6,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}
