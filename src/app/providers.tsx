"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import { buildTheme } from "@/lib/theme";

/* ---------- light / dark preference (remembered on this device) ---------- */

export type ThemePref = "light" | "dark";
const THEME_KEY = "pb_theme";
const listeners = new Set<() => void>();

/** Light is the default; the visitor can switch to dark and the choice is remembered. */
function readTheme(): ThemePref {
  try {
    return window.localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch {
    return "light";
  }
}
export function setTheme(pref: ThemePref) {
  try {
    window.localStorage.setItem(THEME_KEY, pref);
  } catch {
    /* private mode: the choice just lasts until reload */
  }
  document.documentElement.dataset.theme = pref; // page background follows at once (see globals.css)
  listeners.forEach((l) => l());
}
function subscribeTheme(cb: () => void) {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
export function useThemePref(): [ThemePref, (p: ThemePref) => void] {
  const pref = useSyncExternalStore(subscribeTheme, readTheme, (): ThemePref => "light");
  return [pref, setTheme];
}

/** Follows the visitor's "reduce motion" setting without extra re-renders. */
function useReducedMotion(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia("(prefers-reduced-motion: reduce)");
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

export function useThemeMode() {
  const [pref] = useThemePref();
  return { dark: pref === "dark", reduceMotion: useReducedMotion() };
}

/**
 * The theme is set once here, at the root. `accent` lets the public storefront use the yellow accent
 * while staff screens use navy (see lib/theme.ts).
 */
export function Providers({ children, accent = "navy" }: { children: React.ReactNode; accent?: "navy" | "sun" }) {
  const { dark, reduceMotion } = useThemeMode();
  const theme = useMemo(() => buildTheme({ dark, reduceMotion, accent }), [dark, reduceMotion, accent]);
  return (
    <AntdRegistry layer>
      <ConfigProvider theme={theme}>
        <App className="flex min-h-dvh flex-1 flex-col">{children}</App>
      </ConfigProvider>
    </AntdRegistry>
  );
}

/** Nested provider for a section that needs a different accent (the storefront). */
export function AccentScope({ accent, children }: { accent: "navy" | "sun"; children: React.ReactNode }) {
  const { dark, reduceMotion } = useThemeMode();
  const theme = useMemo(() => buildTheme({ dark, reduceMotion, accent }), [dark, reduceMotion, accent]);
  return <ConfigProvider theme={theme}>{children}</ConfigProvider>;
}
