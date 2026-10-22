import { BarChart3, Download, Calendar, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Page() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Auditing & Analytics</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--muted)" }}>Financial Ledger</span>
          </div>
          <h1>Club Reports</h1>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="ghost" style={{ gap: 6 }}>
            <Calendar size={15} />
            <span>This Month</span>
          </Button>
          <Button variant="primary" style={{ gap: 6 }}>
            <Download size={15} />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      <div
        className="glass-card"
        style={{
          padding: "48px 24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          gap: 16,
          minHeight: 380,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: "var(--r-sm)",
            background: "var(--bg-surface-inset)",
            border: "1px solid var(--border-default)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--accent-primary)",
          }}
        >
          <BarChart3 size={24} strokeWidth={2} />
        </div>
        <div style={{ maxWidth: 440 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Daily Ledger &amp; Shift Breakdown
          </h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Revenue reconciliations, table utilization percentages, peak hourly occupancy, and cashier settlement logs.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Button variant="primary">Generate Shift Report</Button>
          <Button variant="ghost">Audit Logs</Button>
        </div>
      </div>
    </>
  );
}
