/**
 * Native phone notification helper via Service Worker.
 * Triggers native mobile alerts with custom vibration sequences.
 */
export async function showLocalNativeNotification({
  title,
  body,
  tag,
  url,
}: {
  title: string;
  body: string;
  tag?: string;
  url?: string;
}) {
  if (typeof window === "undefined") return;

  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  try {
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.ready;
      if (reg && reg.showNotification) {
        await reg.showNotification(title, {
          body,
          icon: "/icon.svg",
          badge: "/icon.svg",
          tag: tag || `levelup-${Date.now()}`,
          vibrate: [250, 100, 250, 100, 250],
          data: { url: url || "/tables" },
        } as NotificationOptions);
        return;
      }
    }

    // Fallback if SW registration not ready
    new Notification(title, {
      body,
      icon: "/icon.svg",
      tag: tag || `levelup-${Date.now()}`,
    });
  } catch (err) {
    console.debug("Native notification dispatch error:", err);
  }
}
