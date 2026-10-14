import { theme as antTheme, type ThemeConfig } from "antd";

/** Brand colours taken from the shop poster. */
export const BRAND = { navy: "#12296b", navyDeep: "#0b1d52", sun: "#ffd500" } as const;

/**
 * One theme for the whole app (Ant Design tokens), light and dark.
 *
 * Rules (from the design skill):
 *  - One accent. Navy is the base; yellow is the accent. Storefront buttons are yellow with navy text,
 *    staff screens use navy buttons (yellow in dark mode). Green appears only for WhatsApp and success.
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
      colorInfo: primary,
      colorLink: dark ? BRAND.sun : BRAND.navy,
      // status colours get lighter seeds in dark mode so text stays readable (WCAG AA) on the dark surfaces
      colorSuccess: dark ? "#4ade80" : "#15803d",
      colorWarning: dark ? "#fbbf24" : "#d97706",
      colorError: dark ? "#f87171" : "#b42318",
      colorBgBase: dark ? "#0a1124" : "#ffffff",
      colorBgLayout: dark ? "#0a1124" : "#f2f5fb",
      colorBgContainer: dark ? "#101a36" : "#ffffff",
      colorTextBase: dark ? "#e8ecf6" : "#101828",
      fontFamily: 'var(--font-geist-sans), system-ui, -apple-system, "Segoe UI", "Nirmala UI", sans-serif',
      fontSize: 15,
      borderRadius: 10,
      borderRadiusLG: 14,
      borderRadiusSM: 8,
      controlHeight: 40,
      controlHeightLG: 48,
      motion: !reduceMotion,
    },
    components: {
      Button: { fontWeight: 600, primaryColor: onPrimary, primaryShadow: "none", defaultShadow: "none", dangerShadow: "none" },
      Layout: { headerBg: BRAND.navy, headerColor: "#ffffff", headerHeight: 64, headerPadding: "0 16px", bodyBg: "transparent" },
      Menu: { darkItemBg: "transparent", darkItemColor: "rgba(255,255,255,0.85)", darkItemHoverColor: "#ffffff", darkItemSelectedBg: "rgba(255,213,0,0.16)", darkItemSelectedColor: BRAND.sun },
      Card: { bodyPadding: 16 },
      Table: { headerBg: dark ? "#16224a" : "#eef1f8" },
      Segmented: { itemSelectedBg: dark ? BRAND.sun : BRAND.navy, itemSelectedColor: dark ? BRAND.navyDeep : "#ffffff" },
    },
  };
}
