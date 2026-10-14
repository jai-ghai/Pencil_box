"use client";

import { Button, Tooltip } from "antd";
import { MoonOutlined, SunOutlined } from "@ant-design/icons";
import { useThemePref } from "@/app/providers";

/** Light / dark switch for the navy headers. The choice is remembered on this device. */
export function ThemeToggle({ toLight = "Switch to light mode", toDark = "Switch to dark mode" }: { toLight?: string; toDark?: string }) {
  const [pref, setPref] = useThemePref();
  const dark = pref === "dark";
  const label = dark ? toLight : toDark;
  return (
    <Tooltip title={label}>
      <Button type="text" aria-label={label} aria-pressed={dark} icon={dark ? <SunOutlined /> : <MoonOutlined />} onClick={() => setPref(dark ? "light" : "dark")} style={{ color: "#fff", fontSize: 18 }} />
    </Tooltip>
  );
}
