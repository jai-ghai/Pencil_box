"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Drawer, Flex, Grid, Menu, Result, Skeleton, Tooltip, theme } from "antd";
import type { MenuProps } from "antd";
import { LogoutOutlined, MenuOutlined } from "@ant-design/icons";
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
const SHORT: Partial<Record<Perm, string>> = { setup: "Setup", qr: "QR codes" }; // shorter names so the whole menu fits on one line
const NAV: NavItem[] = [...PAGE_PERMS.map((p) => ({ href: p.href, label: SHORT[p.key] ?? p.label, perm: p.key })), { href: "/admin/users", label: "Users", perm: "users" }];
const ROLE_LABEL = { superadmin: "Super admin", admin: "Admin", cashier: "Cashier" } as const;

/**
 * Header, navigation and access check for every admin screen. Pages the person has no permission for are hidden
 * from the menu and, if they open the address anyway, replaced by a "no access" message. (The server checks again
 * on every request, so this is only the friendly side.)
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const { token } = theme.useToken();
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const desktop = !!screens.xl; // below 1200px the full menu would not fit, so it moves into the drawer

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
      <header style={{ background: BRAND.navy }} className="sticky top-0 z-40">
        <Flex align="center" gap={12} className="mx-auto w-full max-w-7xl px-4" style={{ height: 64 }}>
          {!desktop && <Button type="text" aria-label="Open menu" icon={<MenuOutlined style={{ color: "#fff", fontSize: 18 }} />} onClick={() => setOpen(true)} />}
          <Link href={visible[0]?.href ?? "/admin"} aria-label="Pencil Box admin home" className="shrink-0"><Wordmark size={desktop ? 22 : 18} /></Link>
          {desktop && (
            <nav aria-label="Admin pages" className="pb-scroll-x flex min-w-0 flex-1 items-center gap-1">
              {me ? (
                visible.map((n) => {
                  const active = current?.href === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      aria-current={active ? "page" : undefined}
                      className="shrink-0 whitespace-nowrap px-2.5 py-2 text-sm font-semibold"
                      style={{ borderRadius: token.borderRadius, color: active ? BRAND.sun : "rgba(255,255,255,0.88)", background: active ? "rgba(255,213,0,0.16)" : "transparent" }}
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
            <Link href="/pos"><Button>Billing</Button></Link>
            {desktop && <Tooltip title={me ? `Sign out ${me.username} (${ROLE_LABEL[me.role]})` : "Sign out"}><Button icon={<LogoutOutlined />} onClick={signOut} aria-label="Sign out" /></Tooltip>}
          </Flex>
        </Flex>
      </header>

      <Drawer open={open && !desktop} onClose={() => setOpen(false)} placement="left" size={280} title="Menu" styles={{ body: { padding: 0 } }}>
        <Menu mode="inline" items={items} selectedKeys={selected} onClick={() => setOpen(false)} style={{ borderInlineEnd: 0 }} />
        <div className="p-4">
          {me && <div className="mb-3 text-sm" style={{ color: token.colorTextSecondary }}>{me.username} · {ROLE_LABEL[me.role]}</div>}
          <Button block icon={<LogoutOutlined />} onClick={signOut}>Sign out</Button>
        </div>
      </Drawer>

      <main className="mx-auto w-full max-w-7xl flex-1 p-4">
        {!me && <Skeleton active paragraph={{ rows: 6 }} />}
        {blocked && (
          <Result
            status="403"
            title="No access to this page"
            subTitle="The super admin has not given you permission for it. Ask them if you need it."
            extra={<Link href={visible[0]?.href ?? "/pos"}><Button type="primary">Go to {visible[0]?.label ?? "billing"}</Button></Link>}
          />
        )}
        {/* The page is always rendered (Next.js checks every route renders), but stays hidden until the access check is done */}
        <div hidden={!me || blocked}>{children}</div>
      </main>
    </div>
  );
}
