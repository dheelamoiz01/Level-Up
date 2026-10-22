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
  Sliders,
  LogOut,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
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
    setTimeout(() => setRefreshing(false), 500);
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
        <Icon size={18} strokeWidth={active ? 2.4 : 1.8} />
      </Link>
    );
  });

  return (
    <div className="shell">
      <PwaRegister />
      <NotificationListener />

      {/* Minimal, Elegant Navigation Rail */}
      <aside className="sidebar">
        <div style={{ padding: "4px 0 12px", borderBottom: "1px solid var(--border-subtle)", display: "flex", justifyContent: "center", width: "100%" }}>
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
            gap: 10,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
            width: "100%",
          }}
        >
          <Link
            href="/settings"
            className="nav-item"
            data-tip="Settings"
            aria-current={path === "/settings" ? "page" : undefined}
          >
            <Settings size={18} strokeWidth={path === "/settings" ? 2.4 : 1.8} />
          </Link>

          <div
            className="nav-item"
            data-tip="5 Tables Active"
            style={{ width: 36, height: 36, cursor: "default" }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--accent-primary)",
                display: "inline-block",
              }}
            />
          </div>
        </div>
      </aside>

      <div className="main">
        {/* Simplified Top Toolbar */}
        <header className="topbar">
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <label className="search">
              <Search size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search tables, players, products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setTimeout(() => setSearchFocused(false), 200)}
              />
              <span className="search-kbd">⌘K</span>
            </label>

            {searchFocused && (
              <div
                className="dropdown-menu"
                style={{
                  position: "absolute",
                  top: "calc(100% + 6px)",
                  left: 0,
                  right: 0,
                  padding: "8px",
                  zIndex: 60,
                }}
              >
                <div style={{ padding: "4px 8px 6px", fontSize: 10, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--text-muted)" }}>
                  Quick Jump
                </div>
                <Link
                  href="/tables"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleDot size={13} style={{ color: "var(--accent-primary)" }} />
                    <span>Royal Table 1</span>
                  </div>
                  <span className="badge" data-s="available" style={{ fontSize: 10 }}>VIP · ₹500/hr</span>
                </Link>
                <Link
                  href="/tables"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleDot size={13} style={{ color: "var(--accent-primary)" }} />
                    <span>Snooker Table 1</span>
                  </div>
                  <span className="badge" data-s="available" style={{ fontSize: 10 }}>12ft · ₹350/hr</span>
                </Link>
                <Link
                  href="/products"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Package size={13} style={{ color: "var(--text-secondary)" }} />
                    <span>Red Bull Energy Drink</span>
                  </div>
                  <span style={{ fontSize: 11, color: "var(--accent-primary)", fontWeight: 600 }}>₹160</span>
                </Link>
              </div>
            )}
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {/* Understated Status Tag */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "4px 10px",
                borderRadius: "var(--r-xs)",
                background: "var(--bg-surface-inset)",
                border: "1px solid var(--border-subtle)",
                fontSize: 11.5,
                fontWeight: 600,
                color: "var(--text-secondary)",
              }}
            >
              <span
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: "50%",
                  background: "var(--accent-primary)",
                  display: "inline-block",
                }}
              />
              <span>5 Tables Live</span>
            </div>

            {/* Quick sync telemetry */}
            <button
              onClick={handleRefresh}
              className="btn"
              style={{ width: 34, height: 34, padding: 0 }}
              title="Sync Floor Telemetry"
              aria-label="Refresh"
            >
              <RefreshCw
                size={14}
                style={{
                  animation: refreshing ? "spin 0.6s linear infinite" : "none",
                  color: "var(--text-muted)",
                }}
              />
            </button>

            {/* Notification Control & Dropdown */}
            <div style={{ position: "relative" }}>
              <button
                onClick={() => {
                  setNotifOpen(!notifOpen);
                  setProfileOpen(false);
                }}
                className="btn"
                style={{ width: 34, height: 34, padding: 0, position: "relative" }}
                aria-label="Notifications"
              >
                <Bell size={15} style={{ color: "var(--text-secondary)" }} />
                <span
                  style={{
                    position: "absolute",
                    top: 6,
                    right: 6,
                    width: 5,
                    height: 5,
                    borderRadius: "50%",
                    background: "var(--accent-primary)",
                  }}
                />
              </button>

              {notifOpen && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 300,
                    padding: "14px",
                    zIndex: 60,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 10,
                      paddingBottom: 6,
                      borderBottom: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                      System Status
                    </span>
                    <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>
                      Live
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)", marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Supabase Realtime</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Postgres stream connected</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)", marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Audio & Push Alerts</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Cue chime engine ready</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--accent-primary)", marginTop: 6, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Fleet Ready</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>5 tables available for play</div>
                      </div>
                    </div>
                  </div>

                  <div
                    style={{
                      marginTop: 10,
                      paddingTop: 8,
                      borderTop: "1px solid var(--border-subtle)",
                      textAlign: "center",
                    }}
                  >
                    <button
                      style={{ all: "unset", fontSize: 11, color: "var(--accent-primary)", fontWeight: 600, cursor: "pointer" }}
                      onClick={() => setNotifOpen(false)}
                    >
                      Dismiss alerts
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Pill */}
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
                <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.1, textAlign: "left" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                    Admin
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)" }}>
                    Owner
                  </span>
                </div>
                <ChevronDown size={12} style={{ color: "var(--text-muted)", marginLeft: 2 }} />
              </div>

              {profileOpen && (
                <div
                  className="dropdown-menu"
                  style={{
                    position: "absolute",
                    top: "calc(100% + 8px)",
                    right: 0,
                    width: 200,
                    padding: "10px",
                    zIndex: 60,
                  }}
                >
                  <div style={{ paddingBottom: 6, borderBottom: "1px solid var(--border-subtle)", marginBottom: 6 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>Admin Master</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>manager@levelup.club</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <Link href="/settings" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <Sliders size={13} />
                      <span>Rate Settings</span>
                    </Link>
                    <Link href="/reports" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                      <BarChart3 size={13} />
                      <span>Daily Shift Report</span>
                    </Link>
                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                    <button
                      className="dropdown-item"
                      style={{ color: "var(--amber)", width: "100%", textAlign: "left" }}
                      onClick={() => setProfileOpen(false)}
                    >
                      <LogOut size={13} />
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

      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {navButtons}
      </nav>
    </div>
  );
}
