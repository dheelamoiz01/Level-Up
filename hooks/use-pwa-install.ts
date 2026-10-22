"use client";

import { useState, useEffect } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type BeforeInstallPromptEvent = any;

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Check if running in standalone mode (already installed as PWA)
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window.navigator as any).standalone === true ||
      document.referrer.includes("android-app://");

    setIsInstalled(isStandalone);

    // Detect device characteristics
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIosDevice =
      /iphone|ipad|ipod/.test(userAgent) &&
      !(window as unknown as { MSStream?: unknown }).MSStream;
    const isMobileDevice =
      /iphone|ipad|ipod|android|mobile/.test(userAgent) || window.innerWidth < 768;

    setIsIOS(isIosDevice);
    setIsMobile(isMobileDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser default mini-infobar
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const installApp = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      if (choiceResult.outcome === "accepted") {
        setIsInstalled(true);
        setIsInstallable(false);
        setDeferredPrompt(null);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Installation prompt error:", err);
      return false;
    }
  };

  return {
    isInstallable,
    isInstalled,
    isIOS,
    isMobile,
    installApp,
  };
}
