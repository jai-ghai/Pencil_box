"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Button, Drawer, Flex, Grid, Menu } from "antd";
import type { MenuProps } from "antd";
import { AppstoreOutlined, DashboardOutlined, FileTextOutlined, InboxOutlined, LogoutOutlined, MenuOutlined, SettingOutlined, ShoppingOutlined, TagsOutlined, UploadOutlined } from "@ant-design/icons";
import { Wordmark } from "@/components/wordmark";
import { BRAND } from "@/lib/theme";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: <DashboardOutlined /> },
  { href: "/admin/orders", label: "Orders", icon: <FileTextOutlined /> },
  { href: "/admin/products", label: "Products", icon: <AppstoreOutlined /> },
  { href: "/admin/stock", label: "Stock", icon: <InboxOutlined /> },
  { href: "/admin/purchases", label: "Purchases", icon: <ShoppingOutlined /> },
  { href: "/admin/offers", label: "Offers", icon: <TagsOutlined /> },
  { href: "/admin/import", label: "Import", icon: <UploadOutlined /> },
  { href: "/admin/setup", label: "Setup", icon: <SettingOutlined /> },
];
const items: MenuProps["items"] = NAV.map((n) => ({ key: n.href, icon: n.icon, label: <Link href={n.href}>{n.label}</Link> }));

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const screens = Grid.useBreakpoint();
  const [open, setOpen] = useState(false);
  const selected = [NAV.filter((n) => pathname === n.href || (n.href !== "/admin" && pathname.startsWith(n.href))).sort((a, b) => b.href.length - a.href.length)[0]?.href ?? "/admin"];
  const desktop = !!screens.lg;

  async function signOut() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="flex flex-1 flex-col">
      <header style={{ background: BRAND.navy }} className="sticky top-0 z-40">
        <Flex align="center" gap={16} className="mx-auto w-full max-w-7xl px-4" style={{ height: 64 }}>
          {!desktop && <Button type="text" aria-label="Open menu" icon={<MenuOutlined style={{ color: "#fff", fontSize: 18 }} />} onClick={() => setOpen(true)} />}
          <Link href="/admin" aria-label="Pencil Box admin home"><Wordmark size={22} /></Link>
          {desktop && <Menu theme="dark" mode="horizontal" items={items} selectedKeys={selected} className="min-w-0 flex-1" style={{ background: "transparent", borderBottom: 0 }} />}
          <Flex gap={8} className="ml-auto">
            <Link href="/pos"><Button>Open billing</Button></Link>
            {desktop && <Button icon={<LogoutOutlined />} onClick={signOut}>Sign out</Button>}
          </Flex>
        </Flex>
      </header>
      <Drawer open={open && !desktop} onClose={() => setOpen(false)} placement="left" size={280} title="Menu" styles={{ body: { padding: 0 } }}>
        <Menu mode="inline" items={items} selectedKeys={selected} onClick={() => setOpen(false)} style={{ borderInlineEnd: 0 }} />
        <div className="p-4"><Button block icon={<LogoutOutlined />} onClick={signOut}>Sign out</Button></div>
      </Drawer>
      <main className="mx-auto w-full max-w-7xl flex-1 p-4">{children}</main>
    </div>
  );
}
