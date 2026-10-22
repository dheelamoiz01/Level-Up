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

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "var(--s-4)" }}>
        <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-sm)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--mint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sliders size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-hero)" }}>Hourly Table Rates</h3>
              <span className="muted" style={{ fontSize: 12 }}>Default pricing per cuesport category</span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>Royal Table Rate (VIP)</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--mint)",
                  background: "var(--glass-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                ₹500 / hr
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>Snooker Table Rate</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--mint)",
                  background: "var(--glass-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                ₹350 / hr
              </span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 14 }}>Pool Table Rate</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontWeight: 700,
                  color: "var(--mint)",
                  background: "var(--glass-surface-inset)",
                  padding: "4px 10px",
                  borderRadius: "var(--r-sm)",
                  border: "1px solid var(--glass-border)",
                }}
              >
                ₹250 / hr
              </span>
            </div>
          </div>
        </div>

        <div className="glass" style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "var(--r-sm)",
                background: "rgba(16, 185, 129, 0.12)",
                color: "var(--mint)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Shield size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--text-hero)" }}>Staff &amp; Clearance PIN</h3>
              <span className="muted" style={{ fontSize: 12 }}>Restricted access for discounts and voids</span>
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>Manager Master PIN</span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontWeight: 700,
                color: "var(--text-hero)",
                background: "var(--glass-surface-inset)",
                padding: "4px 12px",
                borderRadius: "var(--r-sm)",
                border: "1px solid var(--glass-border)",
                letterSpacing: 3,
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
