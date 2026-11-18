import { theme as antTheme, type ThemeConfig } from "antd";

/**
 * Pencil Box palette — cool ink navy + warm gold accent.
 * Light: soft mist workspace. Dark: lifted slate panels (not pure black).
 */
export const BRAND = {
  navy: "#153a7a",
  navyDeep: "#0a1628",
  sun: "#ecc233",
  sunSoft: "#f6e7a0",
  teal: "#0f766e",
  mist: "#f0f3f8",
  ink: "#0c1222",
  slate: "#141c2e",
  slateLift: "#1a2438",
} as const;

/**
 * One theme for the whole app (Ant Design tokens), light and dark.
 *
 *  - One accent. Navy is the base; gold is the accent. Storefront buttons are gold with navy text,
 *    staff screens use navy buttons (gold in dark mode).
 *  - One shape scale: controls 10px, cards 14px, small 8px. No pill buttons.
 *  - Cool neutrals only (no cream/beige page backgrounds).
 *  - Motion off when the visitor asks for reduced motion.
 */
export function buildTheme(opts: { dark: boolean; reduceMotion: boolean; accent: "navy" | "sun" }): ThemeConfig {
  const { dark, reduceMotion, accent } = opts;
  const primary = accent === "sun" || dark ? BRAND.sun : BRAND.navy;
  const onPrimary = primary === BRAND.sun ? BRAND.navyDeep : "#ffffff";

  return {
    algorithm: dark ? antTheme.darkAlgorithm : antTheme.defaultAlgorithm,
    token: {
      colorPrimary: primary,
      colorInfo: dark ? "#5b8def" : BRAND.navy,
      colorLink: dark ? BRAND.sunSoft : BRAND.navy,
      colorSuccess: dark ? "#3ecf8e" : "#147a3f",
      colorWarning: dark ? "#f0c040" : "#c47a0a",
      colorError: dark ? "#f07178" : "#c0392b",
      colorBgBase: dark ? BRAND.navyDeep : "#ffffff",
      colorBgLayout: dark ? BRAND.navyDeep : BRAND.mist,
      colorBgContainer: dark ? BRAND.slate : "#ffffff",
      colorBgElevated: dark ? BRAND.slateLift : "#ffffff",
      colorTextBase: dark ? "#e8eef8" : BRAND.ink,
      colorTextSecondary: dark ? "#9aabc4" : "#5a6a82",
      colorBorder: dark ? "rgba(232,238,248,0.10)" : "rgba(12,18,34,0.10)",
      colorBorderSecondary: dark ? "rgba(232,238,248,0.07)" : "rgba(12,18,34,0.07)",
      colorFillSecondary: dark ? "rgba(232,238,248,0.06)" : "rgba(21,58,122,0.05)",
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", "Nirmala UI", sans-serif',
      fontSize: 15,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      motion: !reduceMotion,
      boxShadow: dark ? "0 8px 24px rgba(0,0,0,0.35)" : "0 8px 24px rgba(10,22,40,0.06)",
      boxShadowSecondary: dark ? "0 2px 8px rgba(0,0,0,0.28)" : "0 1px 3px rgba(10,22,40,0.06)",
    },
    components: {
      Button: {
        fontWeight: 600,
        primaryColor: onPrimary,
        primaryShadow: "none",
        defaultShadow: "none",
        dangerShadow: "none",
        defaultBorderColor: dark ? "rgba(232,238,248,0.14)" : "rgba(12,18,34,0.14)",
      },
      Layout: {
        headerBg: BRAND.navy,
        headerColor: "#ffffff",
        headerHeight: 56,
        headerPadding: "0 16px",
        bodyBg: "transparent",
        siderBg: BRAND.navyDeep,
      },
      Menu: {
        darkItemBg: "transparent",
        darkItemColor: "rgba(255,255,255,0.85)",
        darkItemHoverColor: "#ffffff",
        darkItemSelectedBg: "rgba(236,194,51,0.18)",
        darkItemSelectedColor: BRAND.sun,
      },
      Card: {
        bodyPadding: 16,
        colorBgContainer: dark ? BRAND.slate : "#ffffff",
      },
      Table: {
        headerBg: dark ? BRAND.slateLift : "#e8edf5",
        rowHoverBg: dark ? "rgba(236,194,51,0.06)" : "rgba(21,58,122,0.04)",
      },
      Segmented: {
        itemSelectedBg: dark ? BRAND.sun : BRAND.navy,
        itemSelectedColor: dark ? BRAND.navyDeep : "#ffffff",
        trackBg: dark ? "rgba(232,238,248,0.06)" : "rgba(21,58,122,0.06)",
      },
      Alert: {
        borderRadiusLG: 10,
        defaultPadding: "8px 12px",
      },
      Drawer: {
        colorBgElevated: dark ? BRAND.slate : "#ffffff",
      },
      Modal: {
        contentBg: dark ? BRAND.slate : "#ffffff",
        headerBg: dark ? BRAND.slate : "#ffffff",
      },
    },
  };
}
