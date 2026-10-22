"use client";

import { useEffect, useRef, useState } from "react";
import { Download, X, BellRing, Share2, PlusSquare } from "lucide-react";
import { usePWAInstall } from "@/hooks/use-pwa-install";

export function PwaRegister() {
  const { isInstallable, isInstalled, isIOS, installApp } = usePWAInstall();
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showNotifBanner, setShowNotifBanner] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Service Worker Registration
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((reg) => {
          reg.update();

          // 2. Notification Permission Check
          if ("Notification" in window && Notification.permission === "default") {
            const hasDismissed = sessionStorage.getItem("levelup_notif_dismissed");
            if (!hasDismissed) {
              setTimeout(() => setShowNotifBanner(true), 2500);
            }
          }
        })
        .catch((err) => console.debug("SW registration info:", err));
    }
  }, []);

  useEffect(() => {
    if (isInstallable && !isInstalled) {
      const timer = setTimeout(() => setShowInstallBanner(true), 1500);
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
      {/* ── Native Mobile Install Banner ────────────────────────────────────────── */}
      {showInstallBanner && !isInstalled && (
        <div
          className="glass-card glass-card-floating"
          style={{
            position: "fixed",
            bottom: "calc(env(safe-area-inset-bottom, 0px) + 72px)",
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 18,
            border: "1px solid rgba(0, 230, 118, 0.3)",
            background: "rgba(13, 22, 17, 0.94)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 230, 118, 0.18)",
            maxWidth: 380,
            width: "calc(100vw - 32px)",
          }}
        >
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "rgba(0, 230, 118, 0.1)",
              border: "1px solid rgba(0, 230, 118, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="Level Up" style={{ width: 24, height: 24 }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)", lineHeight: 1.2 }}>
              Install Level Up App
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.2 }}>
              Instant mobile home screen access &amp; timers
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
              height: 32,
              padding: "0 12px",
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            <Download size={13} strokeWidth={2.5} />
            <span>Install</span>
          </button>

          <button
            onClick={() => setShowInstallBanner(false)}
            style={{
              all: "unset",
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Notification Permission Request Banner ──────────────────────────── */}
      {showNotifBanner && (
        <div
          className="glass-card glass-card-floating"
          style={{
            position: "fixed",
            top: 20,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "10px 14px",
            borderRadius: 18,
            border: "1px solid rgba(0, 230, 118, 0.3)",
            background: "rgba(13, 22, 17, 0.94)",
            backdropFilter: "blur(20px)",
            boxShadow: "0 12px 36px rgba(0, 0, 0, 0.6), 0 0 20px rgba(0, 230, 118, 0.18)",
            maxWidth: 380,
            width: "calc(100vw - 32px)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: "rgba(0, 230, 118, 0.1)",
              border: "1px solid rgba(0, 230, 118, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--mint)",
              flexShrink: 0,
            }}
          >
            <BellRing size={16} strokeWidth={2.2} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-hero)", lineHeight: 1.2 }}>
              Enable Table Notifications
            </div>
            <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.2 }}>
              Get mobile alerts when tables go active or finish
            </div>
          </div>

          <button
            onClick={handleRequestNotifications}
            className="btn btn-primary"
            style={{
              height: 32,
              padding: "0 12px",
              fontSize: 12,
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
              color: "var(--muted)",
              cursor: "pointer",
              padding: 4,
              display: "flex",
              alignItems: "center",
            }}
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── iOS Safari Guided Instructions Modal ────────────────────────────── */}
      {showIOSGuide && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(12px)",
            zIndex: 10000,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
          onClick={() => setShowIOSGuide(false)}
        >
          <div
            className="glass-card"
            style={{
              width: "100%",
              maxWidth: 440,
              background: "#0D140F",
              borderTop: "1px solid rgba(0, 230, 118, 0.25)",
              borderRadius: "24px 24px 0 0",
              padding: "24px 20px 36px",
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--text-hero)" }}>
                Install on iPhone / iPad
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                style={{ all: "unset", color: "var(--muted)", cursor: "pointer" }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--mint)",
                    flexShrink: 0,
                  }}
                >
                  <Share2 size={16} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>
                  1. Tap the <strong>Share</strong> button on the Safari bottom bar.
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: "rgba(255, 255, 255, 0.06)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "var(--mint)",
                    flexShrink: 0,
                  }}
                >
                  <PlusSquare size={16} />
                </div>
                <div style={{ fontSize: 13, color: "var(--text)" }}>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </div>
              </div>
            </div>

            <button
              className="btn btn-primary"
              style={{ width: "100%", height: 42, marginTop: 8 }}
              onClick={() => setShowIOSGuide(false)}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
