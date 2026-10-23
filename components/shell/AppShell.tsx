"use client";

import { useState, useEffect, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CircleDot,
  Users,
  BarChart3,
  Settings,
  Bell,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  LogOut,
  RefreshCw,
  Receipt,
  DollarSign,
  UserCheck,
  Clock,
  CreditCard,
  Menu,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { PwaRegister } from "@/components/pwa/PwaRegister";
import { NotificationListener } from "@/components/realtime/NotificationListener";
import { useAuth } from "@/lib/auth/AuthContext";
import { TerminalAuth } from "@/components/auth/TerminalAuth";

// Owner Navigation (8 items as specified)
const ownerNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Live Tables", icon: CircleDot },
  { href: "/pricing", label: "Table Pricing", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: UserCheck },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Manager Navigation (Floor Operations only - 5 items as specified)
const managerNav = [
  { href: "/", label: "Live Tables", icon: CircleDot },
  { href: "/sessions", label: "Sessions", icon: Clock },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout, isOwner } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const path = usePathname();

  // Restore sidebar collapsed preference from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem("levelup_sidebar_collapsed");
      if (stored !== null) {
        setCollapsed(stored === "true");
      }
    } catch (e) {}
  }, []);

  const toggleSidebar = () => {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem("levelup_sidebar_collapsed", String(next));
    } catch (e) {}
  };

  const handleRefresh = () => {
    setRefreshing(true);
    // Dispatch floor update event
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update"));
    }
    setTimeout(() => setRefreshing(false), 500);
  };

  // If restoring auth session from localStorage
  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg-app)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            width: 8,
            height: 8,
            borderRadius: "50%",
            background: "var(--accent-primary)",
            boxShadow: "0 0 12px var(--accent-primary)",
            display: "inline-block",
            animation: "pulse 1.5s infinite",
          }}
        />
      </div>
    );
  }

  // Terminal Lock / Auth Protection
  if (!isAuthenticated) {
    return <TerminalAuth />;
  }

  const currentNav = isOwner ? ownerNav : managerNav;

  const renderNavItems = (isDrawer = false) => {
    return currentNav.map(({ href, label, icon: Icon }) => {
      const active = path === href;
      return (
        <Link
          key={href}
          href={href}
          className="nav-item"
          data-tip={label}
          aria-current={active ? "page" : undefined}
          onClick={() => isDrawer && setMobileDrawerOpen(false)}
          title={collapsed && !isDrawer ? label : undefined}
        >
          <Icon size={18} strokeWidth={active ? 2.4 : 1.8} style={{ flexShrink: 0 }} />
          {(!collapsed || isDrawer) && (
            <span className="nav-item-label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {label}
            </span>
          )}
        </Link>
      );
    });
  };

  return (
    <div className={`shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <PwaRegister />
      <NotificationListener />

      {/* Premium Collapsible Navigation Sidebar (Desktop) */}
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`} aria-label="Main Navigation">
        {/* Sidebar Header with Brand & Collapse Toggle */}
        <div className="sidebar-header">
          {collapsed ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "100%", gap: 10 }}>
              <Logo compact />
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title="Expand sidebar"
                aria-label="Expand sidebar"
              >
                <ChevronRight size={15} />
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
              <Logo />
              <button
                onClick={toggleSidebar}
                className="sidebar-toggle-btn"
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
              >
                <ChevronLeft size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Navigation Items */}
        <nav className="nav-rail-group" aria-label="Role Navigation">
          {renderNavItems(false)}
        </nav>

        {/* Bottom Rail Utilities */}
        <div
          style={{
            marginTop: "auto",
            display: "flex",
            flexDirection: "column",
            alignItems: collapsed ? "center" : "stretch",
            gap: 8,
            paddingTop: 12,
            borderTop: "1px solid var(--border-subtle)",
            width: "100%",
          }}
        >
          {/* Quick Lock Button */}
          <button
            onClick={logout}
            className="nav-item"
            data-tip="Lock Terminal"
            style={{ color: "var(--amber)", width: collapsed ? 46 : "100%" }}
            title={collapsed ? "Lock Terminal" : undefined}
          >
            <LogOut size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="nav-item-label">Lock Terminal</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Navigation Drawer */}
      {mobileDrawerOpen && (
        <div
          className="mobile-drawer-overlay"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            className="mobile-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, paddingBottom: 12, borderBottom: "1px solid var(--border-subtle)" }}>
              <Logo />
              <button
                onClick={() => setMobileDrawerOpen(false)}
                className="btn"
                style={{ width: 32, height: 32, padding: 0 }}
                aria-label="Close navigation"
              >
                <X size={16} />
              </button>
            </div>

            <nav style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
              {renderNavItems(true)}
            </nav>

            <div style={{ marginTop: "auto", paddingTop: 14, borderTop: "1px solid var(--border-subtle)" }}>
              <button
                onClick={() => {
                  setMobileDrawerOpen(false);
                  logout();
                }}
                className="nav-item"
                style={{ width: "100%", color: "var(--amber)" }}
              >
                <LogOut size={16} />
                <span className="nav-item-label">Lock Terminal</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="main">
        {/* Simplified Top Toolbar */}
        <header className="topbar">
          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="btn mobile-only-btn"
            style={{ width: 34, height: 34, padding: 0, marginRight: 8, display: "none" }}
            aria-label="Open Navigation"
          >
            <Menu size={16} />
          </button>

          {/* Quick Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 380 }}>
            <label className="search">
              <Search size={14} strokeWidth={2} style={{ color: "var(--text-muted)" }} />
              <input
                placeholder="Search tables, players, sessions..."
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
                    <span>Royal Table 1 &amp; 2</span>
                  </div>
                  <span className="badge" data-s="available" style={{ fontSize: 10 }}>VIP Salon</span>
                </Link>
                <Link
                  href="/tables"
                  className="dropdown-item"
                  style={{ justifyContent: "space-between" }}
                  onMouseDown={(e) => e.preventDefault()}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <CircleDot size={13} style={{ color: "var(--accent-primary)" }} />
                    <span>Snooker 1 &amp; 2</span>
                  </div>
                  <span className="badge" data-s="available" style={{ fontSize: 10 }}>12ft Tournament</span>
                </Link>
                {isOwner && (
                  <Link
                    href="/pricing"
                    className="dropdown-item"
                    style={{ justifyContent: "space-between" }}
                    onMouseDown={(e) => e.preventDefault()}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <DollarSign size={13} style={{ color: "var(--accent-primary)" }} />
                      <span>Table Pricing Matrix</span>
                    </div>
                    <span style={{ fontSize: 10, color: "var(--accent-primary)", fontWeight: 600 }}>Tariffs</span>
                  </Link>
                )}
              </div>
            )}
          </div>

          {/* Right Topbar Controls */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {/* Sync telemetry button */}
            <button
              onClick={handleRefresh}
              className="btn"
              style={{ width: 34, height: 34, padding: 0 }}
              title="Refresh live floor data"
              aria-label="Refresh live data"
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
                aria-label="System notifications"
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
                    width: 280,
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
                      Live Shift Alerts
                    </span>
                    <span className="badge" style={{ fontSize: 10, padding: "2px 6px" }}>
                      Active
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-primary)", marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Real-Time Synchronization</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Active cross-terminal session sync</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 12 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent-primary)", marginTop: 5, flexShrink: 0 }} />
                      <div>
                        <div style={{ fontWeight: 600, color: "var(--text-primary)" }}>Audio Match Chimes</div>
                        <div style={{ color: "var(--text-muted)", fontSize: 11 }}>Time-up sound notification active</div>
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
                      Dismiss
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
                <div className="avatar-circle">{isOwner ? "OW" : "MG"}</div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)" }}>
                  {isOwner ? "Owner" : "Manager"}
                </span>
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
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)" }}>{user?.title}</div>
                    <div style={{ fontSize: 10.5, color: "var(--text-muted)" }}>{user?.username}@levelup.club</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {isOwner ? (
                      <>
                        <Link href="/pricing" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Sliders size={13} />
                          <span>Rate Settings</span>
                        </Link>
                        <Link href="/reports" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                          <BarChart3 size={13} />
                          <span>Daily Shift Report</span>
                        </Link>
                      </>
                    ) : (
                      <>
                        <Link href="/" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                          <CircleDot size={13} />
                          <span>Live Table Floor</span>
                        </Link>
                        <Link href="/sessions" className="dropdown-item" onClick={() => setProfileOpen(false)}>
                          <Clock size={13} />
                          <span>Shift Match Logs</span>
                        </Link>
                      </>
                    )}
                    <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0" }} />
                    <button
                      className="dropdown-item"
                      style={{ color: "var(--amber)", width: "100%", textAlign: "left" }}
                      onClick={() => {
                        setProfileOpen(false);
                        logout();
                      }}
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

      {/* Compact Mobile Bottom Navigation */}
      <nav className="mobile-nav" aria-label="Mobile Navigation">
        {currentNav.slice(0, 5).map(({ href, label, icon: Icon }) => {
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
        })}
      </nav>
    </div>
  );
}
