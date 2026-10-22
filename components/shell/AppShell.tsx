"use client";
import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CircleDot,
  Users,
  Package,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  Sparkles,
  Sliders,
  LogOut,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { NotificationListener } from "@/components/realtime/NotificationListener";

const primaryNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Live Tables", icon: CircleDot },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/products", label: "Products", icon: Package },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppShell({ children }: { children: ReactNode }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const path = usePathname();

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const navButtons = primaryNav.map(({ href, label, icon: Icon }) => {
    const active = path === href;
    return (
      <Link
        key={href}
        href={href}
        className="nav-item"
        data-tip={label}
        aria-current={active ? "page" : undefined}
      >
        <Icon size={20} strokeWidth={active ? 2.5 : 2} />
      </Link>
    );
  });

  return (
    <div className="shell">
      <PwaRegister />
      <NotificationListener />
      {/* Compact Elegant Navigation Rail */}
      <aside className="glass-card glass-card-floating sidebar">
        <div style={{ padding: "4px 0 16px", borderBottom: "1px solid var(--glass-border-subtle)", display: "flex", justifyContent: "center", width: "100%" }}>
          <Logo compact />
        </div>

        <nav className="nav-rail-group" aria-label="Main Navigation">
          {navButtons}
        </nav>

        {/* Bottom Rail Utilities */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            paddingTop: 14,
            borderTop: "1px solid var(--glass-border-subtle)",
            width: "100%",
          }}
        >
          <Link
            href="/settings"
            className="nav-item"
            data-tip="Club Settings"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <Settings size={20} strokeWidth={path === "/settings" ? 2.5 : 2} />
          </Link>

          <div
            className="nav-item"
            data-tip="Floor Live: 5 Tables Online"
            style={{ width: 44, height: 44, cursor: "default" }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "var(--mint)",
                boxShadow: "0 0 12px var(--mint)",
                display: "inline-block",
              }}
            />
          </div>
        </div>
      </aside>

      <div className="main">
        <header className="glass-card glass-card-floating topbar">
          <div style={{ position: "relative", flex: 1, maxWidth: 440 }}>
            <label className="search">
              <Search size={16} strokeWidth={2.2} />
              <input
                placeholder="Search tables, players, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              <span className="search-kbd">⌘ Space</span>
            </label>

            {searchFocused && (
              <div
                className="glass-card glass-card-floating dropdown-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 8px)",
                  left: 0,
                  right: 0,
                  padding: "10px",
                  zIndex: 60,
                }}
              >
                <div className="eyebrow" style={{ padding: "4px 8px 6px", fontSize: 10 }}>Quick Floor Navigation</div>
                <Link
                  href="/tables"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleDot size={14} style={{ color: "var(--mint)" }} />
                    <span>Table #2 (Pool)</span>
                  </div>
                  <span className="badge" data-s="playing" style={{ fontSize: 10 }}>Playing · Kabir</span>
                </Link>
                <Link
                  href="/tables"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleDot size={14} style={{ color: "var(--amber)" }} />
                    <span>Table #5 (Snooker)</span>
                  </div>
                  <span className="badge" data-s="playing" style={{ fontSize: 10 }}>Playing · Rohan</span>
                </Link>
                <Link
                  href="/products"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={14} style={{ color: "var(--mint)" }} />
                    <span>Red Bull Energy Drink</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--mint)", fontWeight: 700 }}>₹160</span>
                </Link>
              </div>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            <div
              style={{
                display: "none",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "var(--r-full)",
                background: "rgba(92, 242, 176, 0.08)",
                border: "1px solid rgba(92, 242, 176, 0.2)",
                fontSize: 12,
                fontWeight: 600,
                color: "var(--mint)",
              }}
              className="club-badge-desktop"
            >
              <Sparkles size={13} />
              <span>Emerald Shift</span>
            </div>

            {/* Quick sync / reload telemetry */}
            <Button
              icon
              aria-label="Refresh telemetry"
              onClick={handleRefresh}
              title="Sync Floor Telemetry"
              style={{ color: refreshing ? "var(--mint)" : "var(--text-secondary)" }}
            >
              <RefreshCw
                size={16}
                style={{
                  animation: refreshing ? "spin 0.6s linear infinite" : "none",
                }}
              />
            </Button>

            {/* Notification Control & Liquid Floating Dropdown */}
            <div style={{ position: "relative" }}>
              <Button
                icon
                aria-label="Notifications"
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                style={{ position: "relative" }}
              >
                <Bell size={17} />
                <span
                  style={{
                    position: "absolute",
                    top: 9,
                    right: 9,
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--mint)",
                    boxShadow: "0 0 8px var(--mint)",
                  }}
                />
              </Button>

              {notifOpen && (
                <div
                  className="glass-card glass-card-floating dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 320,
                    padding: "16px",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                      paddingBottom: 8,
                      borderBottom: "1px solid var(--glass-border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)" }}>
                      Live Floor Alerts
                    </span>
                    <span className="badge" style={{ fontSize: 10, padding: "2px 8px", color: "var(--mint)" }}>
                      3 active
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--mint)",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>Table #2 session running &gt; 1h</div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>Kabir · ₹240 accrued</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--amber)",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>Table #5 item order pending</div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>2x Red Bull added to bill</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 12.5 }}>
                      <div
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: "50%",
                          background: "var(--mint)",
                          marginTop: 6,
                          flexShrink: 0,
                        }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text)" }}>Daily revenue target 83% reached</div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>₹12,480 of ₹15,000 goal</div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: "1px solid var(--glass-border-subtle)",
                      textAlign: "center",
                    }}
                  >
                    <button
                      style={{ all: "unset", fontSize: 11.5, color: "var(--mint)", fontWeight: 600, cursor: "pointer" }}
                      onClick={() => setNotifOpen(false)}
                    >
                      Dismiss alerts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Control & Liquid Floating Dropdown */}
            <div style={{ position: "relative" }}>
              <div
                className="user-profile-badge"
                aria-label="User profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
              >
                <div className="avatar-circle">LU</div>
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15, textAlign: "left" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-hero)" }}>
                    Club Master
                  </span>
                  <span style={{ fontSize: 10.5, color: "var(--muted)" }}>
                    Admin
                  </span>
                </div>
                <ChevronDown size={13} style={{ color: "var(--muted)", marginLeft: 2 }} />
              </div>

              {profileOpen && (
                <div
                  className="glass-card glass-card-floating dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 10px)",
                    right: 0,
                    width: 220,
                    padding: "12px",
                    zIndex: 60,
                  }}
                >
                  <div style={{ paddingBottom: 8, borderBottom: "1px solid var(--glass-border-subtle)", marginBottom: 6 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)" }}>Club Master</div>
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>manager@levelup.club</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                    <Link href="/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Sliders size={14} />
                      <span>Rate Settings</span>
                    </Link>
                    <Link href="/reports" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <BarChart3 size={14} />
                      <span>Daily Shift Report</span>
                    </Link>
                    <div style={{ height: 1, background: "var(--glass-border-subtle)", margin: "4px 0" }} />
                    <button
                      className="dropdown-item"
                      style={{ color: "var(--amber)", width: "100%", textAlign: "left" }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <LogOut size={14} />
                      <span>Lock Terminal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="page">{children}</main>
      </div>

      <nav className="glass-card glass-card-floating mobile-nav" aria-label="Mobile Navigation">
        {navButtons}
      </nav>
    </div>
  );
}
