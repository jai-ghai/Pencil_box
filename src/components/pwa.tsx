"use client";

import { useEffect, useState } from "react";
import { Button, Flex, Typography } from "antd";
import { CloseOutlined, DownloadOutlined } from "@ant-design/icons";
import { BRAND } from "@/lib/theme";

const DISMISS_KEY = "pb_pwa_dismiss";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Registers the service worker (needed for "Install app" on Android Chrome) and shows a small
 * "Add Pencil Box to your phone" banner the first time the browser fires beforeinstallprompt.
 * iOS Safari has no beforeinstallprompt; the banner stays hidden there (Share → Add to Home Screen still works).
 */
export function PwaBootstrap() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    // Only register over https (or localhost); browsers refuse SW on plain http.
    const ok = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (ok) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const onBip = async (e: Event) => {
      e.preventDefault();
      try {
        if (localStorage.getItem(DISMISS_KEY) === "1") return;
      } catch {
        /* private mode */
      }
      // Signed-in staff already have the app on their phone — don't nag them on the storefront.
      try {
        const me = await fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null));
        if (me?.role) return;
      } catch {
        /* signed out */
      }
      setDeferred(e as BeforeInstallPromptEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    return () => window.removeEventListener("beforeinstallprompt", onBip);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setShow(false);
    setDeferred(null);
    if (outcome === "dismissed") {
      try {
        localStorage.setItem(DISMISS_KEY, "1");
      } catch {
        /* ignore */
      }
    }
  }

  function dismiss() {
    setShow(false);
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  if (!show) return null;
  return (
    <div
      role="region"
      aria-label="Install Pencil Box"
        style={{ position: "fixed", left: 12, right: 12, bottom: "max(12px, env(safe-area-inset-bottom, 0px))", zIndex: 1000, background: BRAND.navy, color: "#fff", borderRadius: 14, padding: "12px 14px", boxShadow: "0 8px 24px rgba(0,0,0,0.35)" }}
    >
      <Flex align="center" gap={12} justify="space-between" wrap>
        <div style={{ flex: "1 1 180px" }}>
          <Typography.Text strong style={{ color: BRAND.sun, display: "block" }}>Add Pencil Box to your phone</Typography.Text>
          <Typography.Text style={{ color: "rgba(255,255,255,0.85)", fontSize: 13 }}>Install for a one-tap open — no app store needed.</Typography.Text>
        </div>
        <Flex gap={8}>
          <Button type="primary" icon={<DownloadOutlined />} onClick={install} style={{ background: BRAND.sun, color: BRAND.navyDeep, borderColor: BRAND.sun }}>
            Install
          </Button>
          <Button type="text" aria-label="Dismiss" icon={<CloseOutlined style={{ color: "#fff" }} />} onClick={dismiss} />
        </Flex>
      </Flex>
    </div>
  );
}
