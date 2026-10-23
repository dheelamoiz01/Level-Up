"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, X, ArrowUpRight } from "lucide-react";
import { playChime } from "@/lib/notifications/audio";
import { showLocalNativeNotification } from "@/lib/notifications/push-service";
import type { FloorNotification } from "@/lib/types";

const notifiedEventIds = new Set<string>();

export function NotificationListener() {
  const router = useRouter();
  const [activeToast, setActiveToast] = useState<FloorNotification | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerFloorAlert = (notif: FloorNotification) => {
    if (notifiedEventIds.has(notif.id)) return;
    notifiedEventIds.add(notif.id);

    // 1. Play clean harmonic cue chime
    playChime(notif.type === "session_end" ? "session_end" : "session_start");

    // 2. Dispatch native mobile phone notification via Service Worker
    showLocalNativeNotification({
      title: notif.title,
      body: notif.body,
      tag: notif.id,
      url: notif.table_id ? `/tables?focus=${notif.table_id}` : "/tables",
    });

    // 3. Show in-app integrated toast
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActiveToast(notif);
    toastTimeoutRef.current = setTimeout(() => {
      setActiveToast(null);
    }, 5000);

    // 4. Notify open windows to refresh telemetry
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("levelup_floor_update", { detail: notif }));
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. BroadcastChannel for instant same-browser cross-tab sync
    let bc: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        bc = new BroadcastChannel("levelup_floor_sync");
        bc.onmessage = (event) => {
          if (event.data?.type === "TRIGGER_FLOOR_ALERT") {
            triggerFloorAlert(event.data.notif);
          }
        };
      }
    } catch {}

    // 2. Global event listener for local state actions
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
  }, []);

  if (!activeToast) return null;

  return (
    <aside
      aria-label="Floor Alert Notification"
      role="status"
      style={{
        position: "fixed",
        top: 16,
        right: 16,
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "12px 16px",
        background: "var(--bg-surface-raised)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--r-md)",
        boxShadow: "var(--shadow-lg)",
        maxWidth: 380,
        animation: "slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--r-xs)",
          background: "rgba(0, 199, 138, 0.1)",
          border: "1px solid rgba(0, 199, 138, 0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--accent-primary)",
          flexShrink: 0,
        }}
      >
        <CircleDot size={16} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
          {activeToast.title}
        </div>
        <div
          style={{
            fontSize: 11.5,
            color: "var(--text-secondary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {activeToast.body}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        {activeToast.table_id && (
          <button
            onClick={() => {
              router.push(`/tables?focus=${activeToast.table_id}`);
              setActiveToast(null);
            }}
            style={{
              all: "unset",
              cursor: "pointer",
              padding: "4px",
              color: "var(--accent-primary)",
              display: "flex",
              alignItems: "center",
            }}
            title="View Table"
          >
            <ArrowUpRight size={14} />
          </button>
        )}
        <button
          onClick={() => setActiveToast(null)}
          style={{
            all: "unset",
            cursor: "pointer",
            padding: "4px",
            color: "var(--text-muted)",
            display: "flex",
            alignItems: "center",
          }}
          title="Dismiss"
        >
          <X size={14} />
        </button>
      </div>
    </aside>
  );
}
