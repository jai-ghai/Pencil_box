"use client";

import { useMemo, useSyncExternalStore } from "react";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { App, ConfigProvider } from "antd";
import { buildTheme } from "@/lib/theme";

/** Follows the visitor's system setting (dark mode, reduced motion) without extra re-renders. */
function useMedia(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", notify);
      return () => m.removeEventListener("change", notify);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

export function useThemeMode() {
  return { dark: useMedia("(prefers-color-scheme: dark)"), reduceMotion: useMedia("(prefers-reduced-motion: reduce)") };
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
