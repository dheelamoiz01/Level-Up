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
        className="glass"
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
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(16, 185, 129, 0.1)",
            border: "1px solid rgba(92, 242, 176, 0.25)",
            boxShadow: "0 0 24px -4px rgba(16, 185, 129, 0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--mint)",
          }}
        >
          <Users size={28} strokeWidth={2} />
        </div>
        <div style={{ maxWidth: 420 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--text-hero)", marginBottom: 8 }}>
            Player Accounts & Membership
          </h2>
          <p className="muted" style={{ fontSize: 13.5, lineHeight: 1.6 }}>
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
