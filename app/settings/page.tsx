import { Settings, Shield, Sliders, BellRing, Save } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function Page() {
  return (
    <>
      <div className="page-head">
        <div>
          <div className="eyebrow eyebrow-accent" style={{ marginBottom: 4 }}>
            <span>Preferences &amp; Rules</span>
            <span style={{ opacity: 0.5 }}>•</span>
            <span style={{ color: "var(--muted)" }}>Configuration</span>
          </div>
          <h1>System Settings</h1>
        </div>
        <Button variant="primary" style={{ gap: 6 }}>
          <Save size={15} />
          <span>Save Changes</span>
        </Button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(270px, 1fr))", gap: "var(--s-4)" }}>
        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                color: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sliders size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Hourly Table Rates</h3>
              <span className="muted" style={{ fontSize: 11.5 }}>Default pricing per cuesport category</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Royal Table Rate (VIP)</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  background: "var(--bg-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12.5,
                }}
              >
                ₹500 / hr
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Snooker Table Rate</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  background: "var(--bg-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12.5,
                }}
              >
                ₹350 / hr
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Pool Table Rate</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--accent-primary)",
                  background: "var(--bg-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-xs)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 12.5,
                }}
              >
                ₹250 / hr
              </span>
            </div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 34,
                height: 34,
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                color: "var(--accent-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={16} />
            </div>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>Staff &amp; Clearance PIN</h3>
              <span className="muted" style={{ fontSize: 11.5 }}>Restricted access for discounts and voids</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Manager Master PIN</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--text-primary)",
                background: "var(--bg-surface-inset)",
                padding: "4px 12px",
                borderRadius: "var(--r-xs)",
                border: "1px solid var(--border-subtle)",
                letterSpacing: 3,
                fontSize: 12.5,
              }}
            >
              ••••
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
