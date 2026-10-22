"use client";

import { useEffect, useState } from "react";
import { Download, X, Bell, Share2, PlusSquare } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PwaRegister() {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          reg.update();

          if ("Notification" in window && Notification.permission === "default") {
            const hasDismissed = sessionStorage.getItem("levelup_notif_dismissed");
            if (!hasDismissed) {
              setTimeout(() => setShowNotifBanner(true), 3000);
            }
          }
        })
        .catch((err) => console.debug("SW registration info:", err));
    }
  }, []);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShowInstallBanner(true), 2000);
      return () => clearTimeout(timer);
    }
  }, [isInstallable, isInstalled]);

  const handleRequestNotifications = async () => {
    setShowNotifBanner(false);
    if (!("Notification" in window)) return;
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted" && "serviceWorker" in navigator) {
        const reg = await navigator.serviceWorker.ready;
        reg.showNotification("Level Up Floor Alerts Active", {
          body: "Real-time alerts for active tables, player check-ins, and bills enabled.",
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: "levelup-welcome",
        });
      }
    } catch (err) {
      console.debug("Notification permission error:", err);
    }
  };

  if (isInstalled) return null;

  return (
    <>
      {/* ── Integrated PWA Install Banner ─────────────────────────────────── */}
      {showInstallBanner && !isInstalled && (
        <div
          style={{
            position: "fixed",
            bottom: 20,
            right: 20,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface-raised)",
            boxShadow: "var(--shadow-lg)",
            maxWidth: 360,
            width: "calc(100vw - 32px)",
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--r-xs)",
              background: "var(--bg-surface-inset)",
              border: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Level Up" style={{ width: 20, height: 20 }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
              Install Level Up
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.2 }}>
              Add to home screen for quick mobile access
            </div>
          </div>

          <button
            onClick={() => {
              if (isIOS) {
                setShowIOSGuide(true);
                setShowInstallBanner(false);
              } else {
                installApp();
              }
            }}
            className="btn btn-primary"
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 11.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Download size={12} strokeWidth={2.2} />
            <span>Install</span>
          </button>

          <button
            onClick={() => setShowInstallBanner(false)}
            style={{
              all: "unset",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Dismiss banner"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── Integrated Notification Permission Request Banner ──────────────── */}
      {showNotifBanner && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: "var(--r-md)",
            border: "1px solid var(--border-default)",
            background: "var(--bg-surface-raised)",
            boxShadow: "var(--shadow-lg)",
            maxWidth: 360,
            width: "calc(100vw - 32px)",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "var(--r-xs)",
              background: "rgba(0, 199, 138, 0.08)",
              border: "1px solid rgba(0, 199, 138, 0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
              flexShrink: 0,
            }}
          >
            <Bell size={14} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
              Enable Table Alerts
            </div>
            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2, lineHeight: 1.2 }}>
              Receive alerts for active tables and check-ins
            </div>
          </div>

          <button
            onClick={handleRequestNotifications}
            className="btn btn-primary"
            style={{
              height: 28,
              padding: "0 10px",
              fontSize: 11.5,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            Allow
          </button>

          <button
            onClick={() => {
              setShowNotifBanner(false);
              sessionStorage.setItem("levelup_notif_dismissed", "1");
            }}
            style={{
              all: "unset",
              color: "var(--text-muted)",
              cursor: "pointer",
              padding: 2,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Dismiss banner"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* ── iOS Safari Guided Instructions Modal ────────────────────────────── */}
      {showIOSGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.75)",
            backdropFilter: "blur(6px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 380,
              background: "var(--bg-surface-raised)",
              border: "1px solid var(--border-default)",
              borderRadius: "var(--r-md)",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>
                Install on iOS
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                style={{ all: "unset", color: "var(--text-muted)", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, fontSize: 12.5 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <Share2 size={16} style={{ color: "var(--accent-primary)" }} />
                <span>1. Tap the <strong>Share</strong> icon in Safari bottom bar.</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <PlusSquare size={16} style={{ color: "var(--accent-primary)" }} />
                <span>2. Select <strong>Add to Home Screen</strong>.</span>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", height: 34, marginTop: 4, fontSize: 12 }}
              onClick={() => setShowIOSGuide(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
