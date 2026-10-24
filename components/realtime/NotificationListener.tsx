"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, X, ArrowUpRight, AlertCircle, Bell, Volume2, Sliders } from "lucide-react";
import { playChime, playTimerRingingSound, startContinuousAlarm, stopContinuousAlarm } from "@/lib/notifications/audio";
import { showLocalNativeNotification } from "@/lib/notifications/push-service";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTursoClient } from "@/lib/turso/client";
import type { FloorNotification } from "@/lib/types";

// Module-level deduplication cache
const notifiedEventIds = new Set<string>();

// Read alerted session IDs from sessionStorage to persist across tab sleep/wakeups
const getStoredAlertedIds = (): Set<string> => {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem("levelup_alerted_session_starts");
    if (raw) {
      return new Set(JSON.parse(raw));
    }
  } catch {}
  return new Set();
};

const saveAlertedId = (id: string) => {
  if (typeof window === "undefined") return;
  try {
    const raw = sessionStorage.getItem("levelup_alerted_session_starts");
    const arr: string[] = raw ? JSON.parse(raw) : [];
    if (!arr.includes(id)) {
      arr.push(id);
      if (arr.length > 100) arr.shift();
      sessionStorage.setItem("levelup_alerted_session_starts", JSON.stringify(arr));
    }
  } catch {}
};

export function NotificationListener() {
  const router = useRouter();
  const { user, isOwner } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [activeToast, setActiveToast] = useState<FloorNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Time-up ringing alarm pop-up modal state
  const [timeUpAlarm, setTimeUpAlarm] = useState<{
    id: string;
    tableName: string;
    customerName: string;
    tableId: string;
  } | null>(null);

  // Cross-device tracking refs
  const alertedSessionIdsRef = useRef<Set<string>>(getStoredAlertedIds());
  const rungTimeUpSessionIdsRef = useRef<Set<string>>(new Set());
  const locallyStartedSessionIdsRef = useRef<Set<string>>(new Set());
  const initialMountTimeRef = useRef<number>(Date.now());

  useEffect(() => {
    setMounted(true);
    initialMountTimeRef.current = Date.now();
    return () => {
      stopContinuousAlarm();
    };
  }, []);

  const handleDismissTimeUpAlarm = () => {
    stopContinuousAlarm();
    setTimeUpAlarm(null);
  };

  const handleManageFromAlarm = (tableId: string) => {
    stopContinuousAlarm();
    setTimeUpAlarm(null);
    router.push(`/tables?focus=${tableId}`);
  };

  const triggerFloorAlert = (notif: FloorNotification, isTimeUpRinging = false) => {
    if (notifiedEventIds.has(notif.id)) return;
    notifiedEventIds.add(notif.id);

    // 1. Play appropriate audio alert
    if (isTimeUpRinging || notif.type === "session_end") {
      startContinuousAlarm();
    } else {
      playChime(notif.type === "session_start" ? "session_start" : "alert");
    }

    // 2. Mobile vibration
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate(isTimeUpRinging ? [400, 150, 400, 150, 600] : [250, 100, 250, 100, 300]);
      } catch {}
    }

    // 3. Dispatch native mobile phone notification via Service Worker
    showLocalNativeNotification({
      title: notif.title,
      body: notif.body,
      tag: notif.id,
      url: notif.table_id ? `/tables?focus=${notif.table_id}` : "/tables",
    });

    // 4. Show in-app integrated toast (8s duration)
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 8000);

    // 5. Notify open windows to refresh floor telemetry immediately
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update", { detail: notif }));
    }
  };

  // Cross-device Turso live telemetry polling
  useEffect(() => {
    if (!mounted) return;
    let isCancelled = false;

    // Request notification permission on first user tap/touch
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      const askPerm = () => {
        Notification.requestPermission().catch(() => {});
        window.removeEventListener("click", askPerm);
        window.removeEventListener("touchstart", askPerm);
      };
      window.addEventListener("click", askPerm, { once: true });
      window.addEventListener("touchstart", askPerm, { once: true });
    }

    const checkLiveTursoEvents = async () => {
      if (isCancelled) return;
      try {
        const client = getTursoClient();

        // Query active sessions from Turso
        const res = await client.execute({
          sql: `SELECT id, table_id, table_name, customer_name, duration_choice, table_amount, started_at, scheduled_end_at, created_by, status
                FROM sessions 
                WHERE status = 'active'
                ORDER BY started_at DESC LIMIT 10`,
        });

        if (isCancelled) return;

        const activeSessions = (res.rows || []) as any[];
        const nowMs = Date.now();

        for (const s of activeSessions) {
          const sessId = String(s.id);
          const tableName = String(s.table_name || "Table");
          const customerName = String(s.customer_name || "Player");
          const duration = String(s.duration_choice || "30m");
          const amount = Number(s.table_amount || 0);
          const manager = String(s.created_by || "manager");
          const startedAtMs = s.started_at ? new Date(String(s.started_at)).getTime() : nowMs;
          const ageMs = nowMs - startedAtMs;

          // 1. MATCH STARTED DETECTION:
          // Alert Owner app if this session hasn't been alerted yet on this device
          if (!alertedSessionIdsRef.current.has(sessId)) {
            // If the session was started more than 3 minutes ago before opening the app,
            // mark it silently without playing stale alerts
            if (ageMs > 180000) {
              alertedSessionIdsRef.current.add(sessId);
              saveAlertedId(sessId);
            } else {
              // Recent session (< 3 minutes old or freshly started)!
              alertedSessionIdsRef.current.add(sessId);
              saveAlertedId(sessId);

              // Don't chime the manager device that clicked Start Match locally
              const isLocalInitiator = locallyStartedSessionIdsRef.current.has(sessId);
              const isOwnerTarget = isOwner || user?.role === "owner" || user?.username === "owner" || !isLocalInitiator;

              if (isOwnerTarget && !isLocalInitiator) {
                triggerFloorAlert({
                  id: `start-alert-${sessId}`,
                  title: `🟢 Match Started: ${tableName}`,
                  body: `Player: ${customerName} · ${duration} (₹${amount}) · Started by ${manager}`,
                  table_id: String(s.table_id),
                  table_name: tableName,
                  type: "session_start",
                  timestamp: Date.now(),
                  read: false,
                });
              }
            }
          }

          // 2. TIME-UP / SESSION EXPIRED ALARM:
          if (s.scheduled_end_at) {
            const endMs = new Date(String(s.scheduled_end_at)).getTime();
            const timeSinceEndMs = nowMs - endMs;

            if (nowMs >= endMs && !rungTimeUpSessionIdsRef.current.has(sessId)) {
              // If expired more than 5 minutes ago before load, silently track it
              if (timeSinceEndMs > 300000) {
                rungTimeUpSessionIdsRef.current.add(sessId);
              } else {
                rungTimeUpSessionIdsRef.current.add(sessId);

                // Start continuous ringing alarm and pop up modal with OK button
                startContinuousAlarm();
                setTimeUpAlarm({
                  id: sessId,
                  tableName,
                  customerName,
                  tableId: String(s.table_id),
                });

                triggerFloorAlert(
                  {
                    id: `time-up-alarm-${sessId}`,
                    title: `⏰ TIME UP: ${tableName}`,
                    body: `Match time expired for ${customerName}. Collect payment or extend now!`,
                    table_id: String(s.table_id),
                    table_name: tableName,
                    type: "session_end",
                    timestamp: Date.now(),
                    read: false,
                  },
                  true
                );
              }
            }
          }
        }
      } catch (err) {
        // Silent catch for network hiccups
      }
    };

    checkLiveTursoEvents();
    // 1.2s poll for instantaneous cross-phone reaction
    const interval = setInterval(checkLiveTursoEvents, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [mounted, isOwner, user?.role, user?.username]);

  // BroadcastChannel & local window listeners for same-device instant response
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("levelup_floor_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "TRIGGER_FLOOR_ALERT") {
            const notif = event.data.notif;
            if (notif && !locallyStartedSessionIdsRef.current.has(notif.table_id)) {
              triggerFloorAlert(notif, event.data.isTimeUp);
            }
          }
        };
      }
    } catch {}

    const handleLocalSessionStarted = (e: Event) => {
      const customEvent = e as CustomEvent<{ sessionId: string }>;
      if (customEvent.detail?.sessionId) {
        const id = customEvent.detail.sessionId;
        locallyStartedSessionIdsRef.current.add(id);
        alertedSessionIdsRef.current.add(id);
        saveAlertedId(id);
      }
    };

    const handleLocalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<FloorNotification>;
      if (customEvent.detail) {
        triggerFloorAlert(customEvent.detail);
      }
    };

    window.addEventListener("levelup_local_session_started", handleLocalSessionStarted);
    window.addEventListener("levelup_trigger_notif", handleLocalTrigger);

    return () => {
      if (bc) bc.close();
      window.removeEventListener("levelup_local_session_started", handleLocalSessionStarted);
      window.removeEventListener("levelup_trigger_notif", handleLocalTrigger);
    };
  }, [mounted]);

  if (!mounted) return null;

  const isAlarm = activeToast?.title.includes("TIME UP");

  return (
    <>
      {/* 1. Time-Up Loud Ringing Alarm Modal with "OK" Button */}
      {timeUpAlarm && (
        <div
          className="modal-overlay"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.88)",
            backdropFilter: "blur(10px)",
            zIndex: 100000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            animation: "fadeIn 0.2s ease-out",
          }}
        >
          <div
            className="glass-card modal-sheet"
            style={{
              width: "100%",
              maxWidth: 420,
              background: "var(--bg-surface-raised)",
              border: "2px solid rgba(245, 158, 11, 0.8)",
              borderRadius: "var(--r-md)",
              padding: "24px 20px",
              boxShadow: "0 0 50px rgba(245, 158, 11, 0.4), 0 24px 60px rgba(0, 0, 0, 0.95)",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 16,
            }}
          >
            {/* Pulsing Alarm Icon */}
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "rgba(245, 158, 11, 0.2)",
                border: "2px solid rgba(245, 158, 11, 0.6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--amber)",
                animation: "pulse 1.2s infinite",
              }}
            >
              <Volume2 size={32} />
            </div>

            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.12em",
                  color: "var(--amber)",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                Match Time Expired
              </div>
              <h2
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: "#FFFFFF",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {timeUpAlarm.tableName}
              </h2>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginTop: 6,
                }}
              >
                Player: <span style={{ color: "var(--text-primary)" }}>{timeUpAlarm.customerName}</span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "var(--text-muted)",
                  margin: "8px 0 0",
                  lineHeight: 1.4,
                }}
              >
                Alarm is ringing continuously. Tap OK to silence the alarm, then collect payment or extend time.
              </p>
            </div>

            {/* Action Buttons */}
            <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleDismissTimeUpAlarm}
                className="btn btn-primary"
                style={{
                  height: 48,
                  fontSize: 15,
                  fontWeight: 800,
                  width: "100%",
                  background: "var(--amber)",
                  borderColor: "var(--amber)",
                  color: "#050607",
                  boxShadow: "0 4px 16px rgba(245, 158, 11, 0.35)",
                }}
              >
                OK — Stop Alarm
              </button>

              <button
                type="button"
                onClick={() => handleManageFromAlarm(timeUpAlarm.tableId)}
                className="btn"
                style={{
                  height: 42,
                  fontSize: 13,
                  fontWeight: 600,
                  width: "100%",
                  gap: 6,
                  color: "var(--text-primary)",
                }}
              >
                <Sliders size={14} />
                <span>Manage Table &amp; Collect Payment</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Mobile-Optimized Telemetry Alert Banner (Centered across all screens 320px-430px) */}
      {activeToast && (
        <aside
          aria-label="Floor Alert Notification"
          role="status"
          style={{
            position: "fixed",
            top: "max(12px, env(safe-area-inset-top, 12px))",
            left: 12,
            right: 12,
            maxWidth: 440,
            margin: "0 auto",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: isAlarm ? "rgba(32, 18, 10, 0.98)" : "rgba(12, 22, 18, 0.98)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            border: isAlarm ? "1.5px solid rgba(245, 158, 11, 0.85)" : "1.5px solid rgba(16, 185, 129, 0.85)",
            borderRadius: 14,
            boxShadow: isAlarm
              ? "0 0 28px rgba(245, 158, 11, 0.35), 0 14px 36px rgba(0, 0, 0, 0.9)"
              : "0 0 28px rgba(16, 185, 129, 0.3), 0 14px 36px rgba(0, 0, 0, 0.9)",
            animation: "slideInDown 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: isAlarm ? "rgba(245, 158, 11, 0.2)" : "rgba(16, 185, 129, 0.18)",
              border: isAlarm ? "1px solid rgba(245, 158, 11, 0.5)" : "1px solid rgba(16, 185, 129, 0.4)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isAlarm ? "var(--amber)" : "var(--accent-primary)",
              flexShrink: 0,
            }}
          >
            {isAlarm ? <AlertCircle size={20} /> : <CircleDot size={20} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: isAlarm ? "var(--amber)" : "var(--text-primary)",
                lineHeight: 1.3,
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeToast.title}
              </span>
            </div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-secondary)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                marginTop: 2,
              }}
            >
              {activeToast.body}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
            {activeToast.table_id && (
              <button
                onClick={() => {
                  router.push(`/tables?focus=${activeToast.table_id}`);
                  setActiveToast(null);
                }}
                style={{
                  background: isAlarm ? "rgba(245, 158, 11, 0.15)" : "rgba(16, 185, 129, 0.15)",
                  border: isAlarm ? "1px solid rgba(245, 158, 11, 0.3)" : "1px solid rgba(16, 185, 129, 0.3)",
                  borderRadius: 6,
                  cursor: "pointer",
                  padding: "6px 8px",
                  color: isAlarm ? "var(--amber)" : "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 11,
                  fontWeight: 600,
                  gap: 4,
                }}
                title="View Table"
              >
                <span>View</span>
                <ArrowUpRight size={13} />
              </button>
            )}
            <button
              onClick={() => setActiveToast(null)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "6px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
