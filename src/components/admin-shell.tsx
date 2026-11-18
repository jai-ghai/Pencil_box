"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Drawer, Flex, Grid, Result, Skeleton, Tooltip } from "antd";
import {
  LogoutOutlined,
  MenuOutlined,
  CalendarOutlined,
  CheckSquareOutlined,
  BookOutlined,
  WalletOutlined,
  RiseOutlined,
  FileTextOutlined,
  BarChartOutlined,
  ShoppingOutlined,
  InboxOutlined,
  DatabaseOutlined,
  ShoppingCartOutlined,
  TagsOutlined,
  CloudUploadOutlined,
  AppstoreOutlined,
  QrcodeOutlined,
  TeamOutlined,
  HomeOutlined,
} from "@ant-design/icons";
import { AdminAlerts } from "@/components/admin-alerts";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";
import { ADMIN_NAV_GROUPS, matchAdminNav, type AdminNavItem, type NavPerm } from "@/lib/admin-nav";
import { useMe, type Me } from "@/lib/use-me";
import { BRAND } from "@/lib/theme";

const ROLE_LABEL = { superadmin: "Super admin", admin: "Admin", cashier: "Cashier" } as const;

const ICONS: Record<string, React.ReactNode> = {
  "/admin": <HomeOutlined />,
  "/admin/calendar": <CalendarOutlined />,
  "/admin/check": <CheckSquareOutlined />,
  "/admin/daybook": <BookOutlined />,
  "/admin/capital": <WalletOutlined />,
  "/admin/analytics": <RiseOutlined />,
  "/admin/orders": <FileTextOutlined />,
  "/admin/reports": <BarChartOutlined />,
  "/admin/products": <ShoppingOutlined />,
  "/admin/requests": <InboxOutlined />,
  "/admin/stock": <DatabaseOutlined />,
  "/admin/purchases": <ShoppingCartOutlined />,
  "/admin/offers": <TagsOutlined />,
  "/admin/import": <CloudUploadOutlined />,
  "/admin/setup": <AppstoreOutlined />,
  "/qr-generator": <QrcodeOutlined />,
  "/admin/users": <TeamOutlined />,
};

function canOpen(me: Me | null, perm: NavPerm): boolean {
  if (!me) return false;
  if (perm === "users") return me.role === "superadmin";
  return me.permissions.includes(perm);
}

/**
 * New admin chrome: navy sidebar with grouped shop jobs (Plan / Money / Stock / Setup),
 * slim top bar for the page title, drawer on small screens.
 */
export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const me = useMe();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const desktop = !!screens.lg;

  const current = matchAdminNav(pathname);
  const blocked = !!me && !!current && !canOpen(me, current.perm);
  const homeHref =
    ADMIN_NAV_GROUPS.flatMap((g) => g.items).find((n) => canOpen(me, n.perm))?.href ?? "/admin";

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  const nav = (
    <AdminNav
      me={me}
      currentHref={current?.href}
      onNavigate={() => setDrawerOpen(false)}
      onSignOut={signOut}
      showFooter
    />
  );

  return (
    <div className="flex min-h-[100dvh] flex-1">
      {/* Desktop sidebar */}
      {desktop && (
        <aside
          className="sticky top-0 flex h-[100dvh] w-[260px] shrink-0 flex-col"
          style={{ background: BRAND.navyDeep, borderRight: `1px solid rgba(245,197,24,0.14)` }}
        >
          <div className="flex h-14 shrink-0 items-center px-4" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
            <Link href={homeHref} aria-label="Pencil Box admin home">
              <Wordmark size={20} />
            </Link>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-3">{nav}</div>
        </aside>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-3 px-3 md:px-5"
          style={{
            background: BRAND.navy,
            borderBottom: `1px solid rgba(245,197,24,0.18)`,
          }}
        >
          {!desktop && (
            <Button
              type="text"
              aria-label="Open menu"
              icon={<MenuOutlined style={{ color: "#fff", fontSize: 18 }} />}
              onClick={() => setDrawerOpen(true)}
            />
          )}
          {!desktop && (
            <Link href={homeHref} aria-label="Pencil Box admin home" className="shrink-0">
              <Wordmark size={18} />
            </Link>
          )}
          <div className="min-w-0 flex-1">
            {desktop && current && (
              <div className="truncate">
                <div className="text-sm font-semibold text-white">{current.label}</div>
                {current.hint && <div className="truncate text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>{current.hint}</div>}
              </div>
            )}
          </div>
          <Flex gap={6} align="center" className="shrink-0">
            <ThemeToggle />
            <Button type="link" href="/pos" className="hidden sm:inline-flex" style={{ color: "rgba(255,255,255,0.75)", fontWeight: 600, paddingInline: 8 }}>
              Counter
            </Button>
            {desktop && me && (
              <Tooltip title={`Sign out ${me.username} (${ROLE_LABEL[me.role]})`}>
                <Button icon={<LogoutOutlined />} onClick={signOut} aria-label="Sign out" />
              </Tooltip>
            )}
          </Flex>
        </header>

        <Drawer
          open={drawerOpen && !desktop}
          onClose={() => setDrawerOpen(false)}
          placement="left"
          size={300}
          title={<Wordmark size={18} />}
          styles={{
            header: { background: BRAND.navyDeep, borderBottom: "1px solid rgba(255,255,255,0.08)" },
            body: { background: BRAND.navyDeep, padding: "12px 8px 16px" },
            wrapper: { background: BRAND.navyDeep },
          }}
          closeIcon={<span style={{ color: "#fff", fontSize: 18 }}>×</span>}
        >
          {nav}
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
                <Button type="primary" href={homeHref}>
                  Back to Today
                </Button>
              }
            />
          )}
          <div hidden={!me || blocked}>{children}</div>
        </main>
      </div>
    </div>
  );
}

function AdminNav({
  me,
  currentHref,
  onNavigate,
  onSignOut,
  showFooter,
}: {
  me: Me | null;
  currentHref?: string;
  onNavigate: () => void;
  onSignOut: () => void;
  showFooter: boolean;
}) {
  return (
    <nav aria-label="Admin sections" className="flex h-full flex-col gap-1">
      {!me && (
        <div className="space-y-2 px-2">
          <div className="h-3 w-16 rounded" style={{ background: "rgba(255,255,255,0.12)" }} />
          <div className="h-9 w-full rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }} />
          <div className="h-9 w-full rounded-lg" style={{ background: "rgba(255,255,255,0.08)" }} />
        </div>
      )}
      {me &&
        ADMIN_NAV_GROUPS.map((group) => {
          const items = group.items.filter((n) => canOpen(me, n.perm));
          if (!items.length) return null;
          return (
            <div key={group.id} className="mb-3">
              <div
                className="px-3 pb-1.5 text-[10px] font-bold uppercase tracking-[0.14em]"
                style={{ color: "rgba(245,197,24,0.7)" }}
              >
                {group.label}
              </div>
              <ul className="m-0 flex list-none flex-col gap-0.5 p-0">
                {items.map((item) => (
                  <li key={item.href}>
                    <NavLink item={item} active={currentHref === item.href} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}

      {showFooter && (
        <div className="mt-auto space-y-2 border-t px-2 pt-3" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
          {me && (
            <div className="px-2 text-xs" style={{ color: "rgba(255,255,255,0.55)" }}>
              {me.username}
              <span style={{ opacity: 0.7 }}> · {ROLE_LABEL[me.role]}</span>
            </div>
          )}
          <Button block href="/pos" style={{ fontWeight: 600 }}>
            Counter
          </Button>
          <Button block icon={<LogoutOutlined />} onClick={onSignOut} style={{ color: "#fff", borderColor: "rgba(255,255,255,0.2)", background: "transparent" }}>
            Sign out
          </Button>
        </div>
      )}
    </nav>
  );
}

function NavLink({ item, active, onNavigate }: { item: AdminNavItem; active: boolean; onNavigate: () => void }) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 transition-colors"
      style={{
        background: active ? BRAND.sun : "transparent",
        color: active ? BRAND.navyDeep : "rgba(255,255,255,0.88)",
      }}
    >
      <span className="mt-0.5 text-base leading-none" aria-hidden>
        {ICONS[item.href] ?? <AppstoreOutlined />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-tight">{item.label}</span>
        {item.hint && (
          <span className="mt-0.5 block text-[11px] leading-snug" style={{ color: active ? "rgba(8,25,54,0.65)" : "rgba(255,255,255,0.45)" }}>
            {item.hint}
          </span>
        )}
      </span>
    </Link>
  );
}
