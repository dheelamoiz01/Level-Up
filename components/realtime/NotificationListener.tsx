"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { CircleDot, X, ArrowUpRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
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

    const supabase = createClient();

    // 1. Listen for table updates
    const tablesChannel = supabase
      .channel("levelup_tables_stream")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "club_tables" },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const table = payload.new as any;
          if (table.status === "playing") {
            triggerFloorAlert({
              id: `tbl-${table.id}-${table.session_started_at || Date.now()}`,
              title: `${table.name} Active`,
              body: `Player: ${table.current_player || "Walk-in"} · Rate: ₹${table.hourly_rate}/hr`,
              table_id: table.id,
              table_name: table.name,
              type: "session_start",
              timestamp: Date.now(),
              read: false,
            });
          }
        }
      )
      .subscribe();

    // 2. Listen for session inserts
    const sessionsChannel = supabase
      .channel("levelup_sessions_stream")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "sessions" },
        (payload) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const sess = payload.new as any;
          triggerFloorAlert({
            id: `sess-${sess.id}`,
            title: `Session: ${sess.table_name}`,
            body: `${sess.customer_name} · ₹${sess.hourly_rate}/hr`,
            table_id: sess.table_id,
            table_name: sess.table_name,
            type: "session_start",
            timestamp: Date.now(),
            read: false,
          });
        }
      )
      .subscribe();

    // 3. BroadcastChannel for instant same-browser cross-tab sync
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

    // Global event listener for local state actions
    const handleLocalTrigger = (e: Event) => {
      const customEvent = e as CustomEvent<FloorNotification>;
      if (customEvent.detail) {
        triggerFloorAlert(customEvent.detail);
      }
    };
    window.addEventListener("levelup_trigger_notif", handleLocalTrigger);

    return () => {
      supabase.removeChannel(tablesChannel);
      supabase.removeChannel(sessionsChannel);
      if (bc) bc.close();
      window.removeEventListener("levelup_trigger_notif", handleLocalTrigger);
    };
  }, []);

  if (!activeToast) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 18,
        right: 18,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "10px 14px",
        borderRadius: "var(--r-md)",
        background: "var(--bg-surface-raised)",
        border: "1px solid var(--border-default)",
        boxShadow: "var(--shadow-lg)",
        maxWidth: 360,
        width: "calc(100vw - 32px)",
        animation: "slideInTop 0.2s ease-out",
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
        <CircleDot size={15} strokeWidth={2.2} />
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--text-primary)", lineHeight: 1.2 }}>
          {activeToast.title}
        </div>
        <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2, lineHeight: 1.25 }}>
          {activeToast.body}
        </div>
      </div>

      <button
        onClick={() => {
          setActiveToast(null);
          router.push(activeToast.table_id ? `/tables` : "/tables");
        }}
        className="btn"
        style={{
          height: 28,
          padding: "0 8px",
          fontSize: 11,
          fontWeight: 600,
          flexShrink: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 3,
        }}
      >
        <span>View</span>
        <ArrowUpRight size={12} />
      </button>

      <button
        onClick={() => setActiveToast(null)}
        style={{
          all: "unset",
          color: "var(--text-muted)",
          cursor: "pointer",
          padding: 2,
          display: "flex",
          alignItems: "center",
        }}
        aria-label="Dismiss toast"
      >
        <X size={15} />
      </button>
    </div>
  );
}
