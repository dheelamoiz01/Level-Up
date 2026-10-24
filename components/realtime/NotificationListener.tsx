"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, X, ArrowUpRight, AlertCircle, Bell, Volume2, Sliders } from "lucide-react";
import { playChime, playTimerRingingSound, startContinuousAlarm, stopContinuousAlarm } from "@/lib/notifications/audio";
import { showLocalNativeNotification } from "@/lib/notifications/push-service";
import { useAuth } from "@/lib/auth/AuthContext";
import { getTursoClient } from "@/lib/turso/client";
import type { FloorNotification } from "@/lib/types";

const notifiedEventIds = new Set<string>();

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
  const initialLoadDoneRef = useRef(false);
  const seenSessionIdsRef = useRef<Set<string>>(new Set());
  const rungTimeUpSessionIdsRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    setMounted(true);
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
        navigator.vibrate(isTimeUpRinging ? [400, 150, 400, 150, 600] : [200, 100, 200, 100, 300]);
      } catch {}
    }

    // 3. Dispatch native mobile phone notification via Service Worker
    showLocalNativeNotification({
      title: notif.title,
      body: notif.body,
      tag: notif.id,
      url: notif.table_id ? `/tables?focus=${notif.table_id}` : "/tables",
    });

    // 4. Show in-app integrated toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 6000);

    // 5. Notify open windows to refresh telemetry
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update", { detail: notif }));
    }
  };

  // Cross-device Turso live telemetry polling
  useEffect(() => {
    if (!mounted) return;
    let isCancelled = false;

    // Request notification permission on first user tap
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

        const activeSessions = res.rows as any[];

        if (!initialLoadDoneRef.current) {
          // First load: seed seen IDs so we don't spam retroactively
          activeSessions.forEach((s) => {
            seenSessionIdsRef.current.add(String(s.id));
            if (s.scheduled_end_at && new Date(s.scheduled_end_at).getTime() <= Date.now()) {
              rungTimeUpSessionIdsRef.current.add(String(s.id));
            }
          });
          initialLoadDoneRef.current = true;
          return;
        }

        const nowMs = Date.now();

        for (const s of activeSessions) {
          const sessId = String(s.id);
          const tableName = String(s.table_name || "Table");
          const customerName = String(s.customer_name || "Player");
          const duration = String(s.duration_choice || "30m");
          const amount = Number(s.table_amount || 0);
          const manager = String(s.created_by || "manager");

          // 1. New Session started on another device -> Notify Owner's phone!
          if (!seenSessionIdsRef.current.has(sessId)) {
            seenSessionIdsRef.current.add(sessId);

            if (isOwner) {
              triggerFloorAlert({
                id: `cross-dev-start-${sessId}`,
                title: `🟢 Match Started: ${tableName}`,
                body: `Match for "${customerName}" (${duration} · ₹${amount}) started by ${manager}.`,
                table_id: String(s.table_id),
                table_name: tableName,
                type: "session_start",
                timestamp: Date.now(),
                read: false,
              });
            }
          }

          // 2. Session Ended / Time Up -> Ringing alarm + Pop-up Modal on Manager's phone!
          if (s.scheduled_end_at) {
            const endMs = new Date(s.scheduled_end_at).getTime();
            if (nowMs >= endMs && !rungTimeUpSessionIdsRef.current.has(sessId)) {
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
      } catch (err) {
        // Silent catch
      }
    };

    checkLiveTursoEvents();
    // Ultra-fast 1.2s poll for instantaneous cross-phone reaction
    const interval = setInterval(checkLiveTursoEvents, 1200);

    return () => {
      isCancelled = true;
      clearInterval(interval);
    };
  }, [mounted, isOwner]);

  // BroadcastChannel & local window listeners for same-device instant response
  useEffect(() => {
    if (!mounted || typeof window === "undefined") return;

    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("levelup_floor_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "TRIGGER_FLOOR_ALERT") {
            triggerFloorAlert(event.data.notif, event.data.isTimeUp);
          }
        };
      }
    } catch {}

    const handleLocalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<FloorNotification>;
      if (customEvent.detail) {
        triggerFloorAlert(customEvent.detail);
      }
    };
    window.addEventListener("levelup_trigger_notif", handleLocalTrigger);

    return () => {
      if (bc) bc.close();
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

      {/* 2. Top-Right Telemetry Alert Banner */}
      {activeToast && (
        <aside
          aria-label="Floor Alert Notification"
          role="status"
          style={{
            position: "fixed",
            top: 14,
            right: 14,
            left: "auto",
            maxWidth: "calc(100vw - 28px)",
            width: 360,
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            background: isAlarm ? "rgba(35, 23, 14, 0.96)" : "var(--bg-surface-raised)",
            border: isAlarm ? "1.5px solid rgba(245, 158, 11, 0.7)" : "1px solid var(--border-default)",
            borderRadius: "var(--r-md)",
            boxShadow: isAlarm
              ? "0 0 24px rgba(245, 158, 11, 0.35), 0 12px 32px rgba(0, 0, 0, 0.7)"
              : "var(--shadow-lg)",
            animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: "var(--r-xs)",
              background: isAlarm ? "rgba(245, 158, 11, 0.18)" : "rgba(16, 185, 129, 0.12)",
              border: isAlarm ? "1px solid rgba(245, 158, 11, 0.4)" : "1px solid rgba(16, 185, 129, 0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: isAlarm ? "var(--amber)" : "var(--accent-primary)",
              flexShrink: 0,
            }}
          >
            {isAlarm ? <AlertCircle size={18} /> : <CircleDot size={18} />}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: isAlarm ? "var(--amber)" : "var(--text-primary)",
                lineHeight: 1.3,
              }}
            >
              {activeToast.title}
            </div>
            <div
              style={{
                fontSize: 11.5,
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
                  all: "unset",
                  cursor: "pointer",
                  padding: "5px",
                  color: isAlarm ? "var(--amber)" : "var(--accent-primary)",
                  display: "flex",
                  alignItems: "center",
                }}
                title="View Table"
              >
                <ArrowUpRight size={15} />
              </button>
            )}
            <button
              onClick={() => setActiveToast(null)}
              style={{
                all: "unset",
                cursor: "pointer",
                padding: "5px",
                color: "var(--text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              title="Dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </aside>
      )}
    </>
  );
}
