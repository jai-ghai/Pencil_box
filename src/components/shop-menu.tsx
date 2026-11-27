"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Button, Drawer } from "antd";
import {
  AppstoreOutlined,
  FileTextOutlined,
  HomeOutlined,
  LoginOutlined,
  ShoppingCartOutlined,
  ShoppingOutlined,
  WhatsAppOutlined,
} from "@ant-design/icons";
import { Wordmark } from "@/components/wordmark";
import { getInstallPrompt, publishInstallPrompt, subscribeInstallPrompt } from "@/lib/pwa-prompt";
import { HOME_LINKS } from "@/lib/departments";
import { PHONE_TEL } from "@/lib/shop";
import { BRAND } from "@/lib/theme";

const SUPPORT = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}`;

function installedAlready(): boolean {
  if (typeof window === "undefined") return false;
  const nav = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia("(display-mode: standalone)").matches || nav.standalone === true;
}

export function ShopMenu({
  open,
  onClose,
  cartCount,
  onCart,
}: {
  open: boolean;
  onClose: () => void;
  cartCount: number;
  onCart: () => void;
}) {
  const prompt = useSyncExternalStore(subscribeInstallPrompt, getInstallPrompt, () => null);
  const [staff, setStaff] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => live && setStaff(!!me?.role))
      .catch(() => live && setStaff(false));
    const id = window.setTimeout(() => setInstalled(installedAlready()), 0);
    return () => {
      live = false;
      window.clearTimeout(id);
    };
  }, []);

  async function install() {
    if (!prompt) return;
    await prompt.prompt();
    await prompt.userChoice.catch(() => {});
    publishInstallPrompt(null);
    onClose();
  }

  const row = "flex w-full cursor-pointer items-center gap-3 border-0 bg-transparent px-4 py-3 text-left text-[15px] font-semibold text-[#153a7a] no-underline";

  return (
    <Drawer
      open={open}
      onClose={onClose}
      placement="left"
      size="min(75vw, 340px)"
      keyboard
      maskClosable
      destroyOnHidden
      closable={false}
      title={null}
      aria-label="Menu"
      styles={{ body: { padding: 0, background: "#fff" }, wrapper: { background: "#fff" } }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3" style={{ borderBottom: "1px solid rgba(12,18,34,0.08)" }}>
        <Link href="/" aria-label="Pencil Box home" onClick={onClose}>
          <span className="inline-block rounded-md px-2 py-1" style={{ background: BRAND.navy }}>
            <Wordmark size={16} />
          </span>
        </Link>
        <Button autoFocus type="text" aria-label="Close menu" onClick={onClose} style={{ color: BRAND.navy, fontSize: 22, lineHeight: 1 }}>
          ×
        </Button>
      </div>
      <nav aria-label="Shop menu" className="flex flex-col py-1">
        <Link href="/" className={row} onClick={onClose}><HomeOutlined /> Home</Link>
        <Link href="/categories" className={row} onClick={onClose}><AppstoreOutlined /> All categories</Link>
        <Link href="/products" className={row} onClick={onClose}><ShoppingOutlined /> All products</Link>
        <button type="button" className={row} onClick={() => (onCart(), onClose())}>
          <ShoppingCartOutlined /> My Cart{cartCount > 0 ? ` (${cartCount})` : ""}
        </button>
        <Link href="/orders" className={row} onClick={onClose}><FileTextOutlined /> My Orders</Link>
        <Link href={staff ? "/admin" : "/login"} className={row} onClick={onClose}>
          <LoginOutlined /> {staff ? "Admin" : "Login / Register"}
        </Link>
        <a className={row} href={SUPPORT} target="_blank" rel="noopener noreferrer"><WhatsAppOutlined /> WhatsApp Support</a>
        {prompt && !installed && (
          <button type="button" className={row} onClick={install} style={{ background: BRAND.sun, color: BRAND.navyDeep }}>
            Install App
          </button>
        )}
      </nav>
      <div className="px-4 pb-2 pt-3 text-xs font-extrabold tracking-wide" style={{ color: BRAND.navy }}>CATEGORIES</div>
      <ul className="m-0 list-none p-0 pb-6">
        {HOME_LINKS.map((c) => (
          <li key={c.slug}>
            <Link href={c.href} className="block px-4 py-2 text-sm font-semibold text-[#153a7a] no-underline" onClick={onClose}>
              {c.label}
            </Link>
          </li>
        ))}
        <li><Link href="/categories" className="block px-4 py-2 text-sm font-bold text-[#153a7a] no-underline" onClick={onClose}>All categories</Link></li>
      </ul>
    </Drawer>
  );
}
