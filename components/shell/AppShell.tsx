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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
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

// Owner Navigation (Clean 7 items)
const ownerNav = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/tables", label: "Live Tables", icon: CircleDot },
  { href: "/pricing", label: "Table Pricing", icon: DollarSign },
  { href: "/expenses", label: "Expenses", icon: Receipt },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/staff", label: "Staff", icon: UserCheck },
  { href: "/customers", label: "Customers", icon: Users },
];

// Manager Navigation (Floor Operations & Table Pricing)
const managerNav = [
  { href: "/", label: "Live Tables", icon: CircleDot },
  { href: "/sessions", label: "Sessions", icon: Clock },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/pricing", label: "Table Pricing", icon: DollarSign },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isAuthenticated, isLoading, logout, isOwner } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
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

  // Close dropdowns on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest(".user-profile-wrapper") && !target.closest(".notif-wrapper")) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setProfileOpen(false);
        setNotifOpen(false);
        setMobileDrawerOpen(false);
      }
    };

    if (profileOpen || notifOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [profileOpen, notifOpen]);

  // Lock body scroll when mobile navigation drawer is open
  useEffect(() => {
    if (mobileDrawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileDrawerOpen]);

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
          {/* Sign Out Button */}
          <button
            onClick={logout}
            className="nav-item"
            data-tip="Sign Out"
            style={{ color: "var(--amber)", width: collapsed ? 46 : "100%" }}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
            {!collapsed && <span className="nav-item-label">Sign Out</span>}
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
                <span className="nav-item-label">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Workspace */}
      <div className="main">
        {/* Simplified Top Toolbar */}
        <header className="topbar">
          {/* Left area: Hamburger on mobile, Mobile Brand, Page title */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="btn mobile-only-btn"
              aria-label="Open Navigation"
              style={{ width: 34, height: 34, padding: 0 }}
            >
              <Menu size={16} />
            </button>

            {/* Mobile Brand when sidebar is hidden */}
            <div className="mobile-only-brand">
              <Logo compact />
            </div>

            {/* Current Section Title */}
            <div className="topbar-context-title">
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {currentNav.find((n) => n.href === path)?.label || (path === "/tables" ? "Live Tables" : "Level Up")}
              </span>
            </div>
          </div>

          {/* Right Topbar Controls */}
          <div style={{ marginLeft: "auto", display: "flex", gap: 8, alignItems: "center" }}>
            {/* Owner-only Refresh live floor data & Notifications */}
            {isOwner && (
              <>
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
                <div className="notif-wrapper" style={{ position: "relative" }}>
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
              </>
            )}

            {/* Profile Pill & Simplified Dropdown */}
            <div className="user-profile-wrapper" style={{ position: "relative" }}>
              <div
                className="user-profile-badge"
                aria-label="User profile"
                onClick={() => {
                  setProfileOpen(!profileOpen);
                  setNotifOpen(false);
                }}
              >
                <div className="avatar-circle">{isOwner ? "OW" : "MG"}</div>
                <div className="user-profile-info" style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
                    {isOwner ? "Owner" : "Manager"}
                  </span>
                  <span style={{ fontSize: 10, color: "var(--text-muted)", lineHeight: 1 }}>
                    {isOwner ? "Proprietor" : "Floor Ops"}
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
                    width: 220,
                    padding: "10px",
                    zIndex: 60,
                  }}
                >
                  {/* Logged-in user identity */}
                  <div style={{ padding: "6px 8px 10px", display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="avatar-circle" style={{ width: 34, height: 34, fontSize: 12, flexShrink: 0 }}>
                      {isOwner ? "OW" : "MG"}
                    </div>
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {user?.title || (isOwner ? "Club Owner" : "Floor Manager")}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>
                        {isOwner ? "Owner & Admin" : "Floor Manager"}
                      </div>
                    </div>
                  </div>

                  {/* Subtle divider */}
                  <div style={{ height: 1, background: "var(--border-subtle)", margin: "4px 0 6px" }} />

                  {/* Sign Out Button */}
                  <button
                    className="dropdown-item"
                    style={{
                      color: "var(--danger)",
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 10px",
                      borderRadius: "var(--r-xs)",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                    onClick={() => {
                      setProfileOpen(false);
                      logout();
                    }}
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
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
