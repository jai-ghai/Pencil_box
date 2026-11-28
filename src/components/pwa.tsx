"use client";

import { useEffect, useState } from "react";
import { publishInstallPrompt, type InstallPrompt } from "@/lib/pwa-prompt";
import { BRAND } from "@/lib/theme";

const DISMISS_KEY = "pb_pwa_dismiss_until";
const OLD_DISMISS_KEY = "pb_pwa_dismiss";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

interface BeforeInstallPromptEvent extends Event, InstallPrompt {}

function installedAlready(): boolean {
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

function dismissedUntilLater(): boolean {
  try {
    const until = Number(localStorage.getItem(DISMISS_KEY) || 0);
    if (until > Date.now()) return true;
    if (localStorage.getItem(OLD_DISMISS_KEY) === "1") {
      localStorage.setItem(DISMISS_KEY, String(Date.now() + WEEK_MS));
      localStorage.removeItem(OLD_DISMISS_KEY);
      return true;
    }
  } catch {
    /* private mode */
  }
  return false;
}

function rememberDismiss() {
  try {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + WEEK_MS));
  } catch {
    /* ignore */
  }
}

/**
 * Registers the service worker and offers a compact install card when the browser can install.
 * Closing it hides the card for about a week. It stays hidden once the app is installed.
 */
export function PwaBootstrap() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
    if (installedAlready()) return;
    const ok = location.protocol === "https:" || location.hostname === "localhost" || location.hostname === "127.0.0.1";
    if (ok) navigator.serviceWorker.register("/sw.js").catch(() => {});

    const preview = new URLSearchParams(location.search).get("pwa") === "preview";
    const previewTimer = preview && !dismissedUntilLater() ? window.setTimeout(() => setShow(true), 0) : 0;

    const onBip = async (e: Event) => {
      e.preventDefault();
      if (installedAlready() || dismissedUntilLater()) return;
      const event = e as BeforeInstallPromptEvent;
      setDeferred(event);
      publishInstallPrompt(event);
      try {
        const me = await fetch("/api/auth/me").then((r) => (r.ok ? r.json() : null));
        if (me?.role) return;
      } catch {
        /* signed out */
      }
      setShow(true);
    };
    const onInstalled = () => {
      setShow(false);
      setDeferred(null);
      publishInstallPrompt(null);
    };
    window.addEventListener("beforeinstallprompt", onBip);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.clearTimeout(previewTimer);
      window.removeEventListener("beforeinstallprompt", onBip);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    const { outcome } = await deferred.userChoice;
    setShow(false);
    setDeferred(null);
    publishInstallPrompt(null);
    if (outcome === "dismissed") rememberDismiss();
  }

  function dismiss() {
    setShow(false);
    rememberDismiss();
  }

  if (!show) return null;
  return (
    <div
      className="pb-install"
      style={{
        position: "fixed",
        left: 12,
        right: 12,
        bottom: "calc(70px + env(safe-area-inset-bottom, 0px))",
        zIndex: 45,
        display: "flex",
        justifyContent: "center",
        pointerEvents: "none",
      }}
    >
      <div
        role="region"
        aria-label="Install Pencil Box"
        style={{
          pointerEvents: "auto",
          width: "min(440px, 100%)",
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "8px 8px 8px 10px",
          background: "#fff",
          color: BRAND.ink,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(12, 18, 34, 0.16)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/icons/icon-192.png" alt="" width={36} height={36} style={{ borderRadius: 8, flex: "0 0 auto" }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 800, fontSize: 15, lineHeight: 1.2 }}>Pencil Box</div>
          <div style={{ color: "#5a6a82", fontSize: 13, lineHeight: 1.3 }}>Install app for quick ordering</div>
        </div>
        <button
          type="button"
          onClick={install}
          style={{
            flex: "0 0 auto",
            border: 0,
            borderRadius: 999,
            background: BRAND.navy,
            color: "#fff",
            fontWeight: 700,
            fontSize: 14,
            padding: "8px 14px",
            cursor: "pointer",
          }}
        >
          Install
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={dismiss}
          style={{
            flex: "0 0 auto",
            width: 32,
            height: 32,
            border: 0,
            borderRadius: 8,
            background: "transparent",
            color: "#5a6a82",
            fontSize: 20,
            lineHeight: 1,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
