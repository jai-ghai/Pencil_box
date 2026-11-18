"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Drawer, Flex, Grid, Menu, Result, Skeleton, Tooltip, theme } from "antd";
import type { MenuProps } from "antd";
import { LogoutOutlined, MenuOutlined } from "@ant-design/icons";
import { AdminAlerts } from "@/components/admin-alerts";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { PAGE_PERMS, type Perm } from "@/lib/permissions";
import { useMe } from "@/lib/use-me";
import { BRAND } from "@/lib/theme";

interface NavItem {
  href: string;
  label: string;
  /** a permission, or "users" which only the super admin has */
  perm: Perm | "users";
}

const SHORT: Partial<Record<Perm, string>> = { setup: "Setup", qr: "QR codes", analytics: "Profit" };
const NAV: NavItem[] = [
  ...PAGE_PERMS.map((p) => ({ href: p.href, label: SHORT[p.key] ?? p.label, perm: p.key })),
  { href: "/admin/requests", label: "Requests", perm: "products" },
  { href: "/admin/users", label: "Users", perm: "users" },
];
const ROLE_LABEL = { superadmin: "Super admin", admin: "Admin", cashier: "Cashier" } as const;

/**
 * Header, navigation and access check for every admin screen.
 * Ops pages (Today, Calendar, Daily book, Capital) lead the menu; the counter is a quiet link, not the hero.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const desktop = !!screens.xl;

  const allowed = (n: NavItem) => !!me && (n.perm === "users" ? me.role === "superadmin" : me.permissions.includes(n.perm));
  const visible = NAV.filter(allowed);
  const current = NAV.filter((n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))).sort((a, b) => b.href.length - a.href.length)[0];
  const blocked = !!me && !!current && !allowed(current);
  const selected = [current?.href ?? "/admin"];

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }
  const items: MenuProps["items"] = visible.map((n) => ({ key: n.href, label: <Link href={n.href}>{n.label}</Link> }));

  return (
    <div className="flex flex-1 flex-col">
      <header style={{ background: BRAND.navy, borderBottom: `1px solid rgba(255,213,0,0.18)` }} className="sticky top-0 z-40">
        <Flex align="center" gap={12} className="mx-auto w-full max-w-7xl px-4" style={{ height: 64 }}>
          {!desktop && <Button type="text" aria-label="Open menu" icon={<MenuOutlined style={{ color: "#fff", fontSize: 18 }} />} onClick={() => setOpen(true)} />}
          <Link href={visible[0]?.href ?? "/admin"} aria-label="Pencil Box admin home" className="shrink-0">
            <Wordmark size={desktop ? 22 : 18} />
          </Link>
          {desktop && (
            <nav aria-label="Admin pages" className="pb-scroll-x flex min-w-0 flex-1 items-center gap-0.5">
              {me ? (
                visible.map((n) => {
                  const active = current?.href === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className="shrink-0 whitespace-nowrap px-2.5 py-1.5 text-sm font-semibold transition-colors"
                      style={{
                        borderRadius: token.borderRadiusSM,
                        color: active ? BRAND.navyDeep : "rgba(255,255,255,0.88)",
                        background: active ? BRAND.sun : "transparent",
                      }}
                    >
                      {n.label}
                    </Link>
                  );
                })
              ) : (
                <span style={{ width: 360, height: 20, display: "block", background: "rgba(255,255,255,0.12)", borderRadius: 6 }} aria-hidden />
              )}
            </nav>
          )}
          <Flex gap={8} align="center" className="ml-auto shrink-0">
            <ThemeToggle />
            <Link href="/pos" className="hidden text-sm font-semibold sm:inline" style={{ color: "rgba(255,255,255,0.72)" }}>
              Counter
            </Link>
            {desktop && (
              <Tooltip title={me ? `Sign out ${me.username} (${ROLE_LABEL[me.role]})` : "Sign out"}>
                <Button icon={<LogoutOutlined />} onClick={signOut} aria-label="Sign out" />
              </Tooltip>
            )}
          </Flex>
        </Flex>
      </header>

      <Drawer open={open && !desktop} onClose={() => setOpen(false)} placement="left" size={280} title="Menu" styles={{ body: { padding: 0 } }}>
        <Menu mode="inline" items={items} selectedKeys={selected} onClick={() => setOpen(false)} style={{ borderInlineEnd: 0 }} />
        <div className="p-4">
          {me && (
            <div className="mb-3 text-sm" style={{ color: token.colorTextSecondary }}>
              {me.username} · {ROLE_LABEL[me.role]}
            </div>
          )}
          <Button block className="mb-2" href="/pos">
            Counter
          </Button>
          <Button block icon={<LogoutOutlined />} onClick={signOut}>
            Sign out
          </Button>
        </div>
      </Drawer>

      {me && !blocked && <AdminAlerts />}
      <main className="mx-auto w-full max-w-7xl flex-1 p-4 md:p-6">
        {!me && <Skeleton active paragraph={{ rows: 6 }} />}
        {blocked && (
          <Result
            status="403"
            title="No access to this page"
            subTitle="The super admin has not given you permission for it. Ask them if you need it."
            extra={
              <Button type="primary" href={visible[0]?.href ?? "/admin"}>
                Go to {visible[0]?.label ?? "Today"}
              </Button>
            }
          />
        )}
        <div hidden={!me || blocked}>{children}</div>
      </main>
    </div>
  );
}
