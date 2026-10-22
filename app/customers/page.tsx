import { Users, UserPlus, Search, ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Page() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Directory & Accounts</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--muted)" }}>Player Roster</span>
          </div>
          <h1>Club Customers</h1>
        </div>
        <Button variant="primary">
          <UserPlus size={16} strokeWidth={2.5} />
          <span>Add Customer</span>
        </Button>
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
          <Users size={24} strokeWidth={2} />
        </div>
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
            Player Accounts &amp; Membership
          </h2>
          <p className="muted" style={{ fontSize: 13, lineHeight: 1.6 }}>
            Track regular cuesports members, credit balances (udhar), contact numbers, and game histories.
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
          <Button variant="primary">Register First Member</Button>
          <Button variant="ghost">Import Contacts</Button>
        </div>
      </div>
    </>
  );
}
