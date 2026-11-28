"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AppstoreOutlined, FileTextOutlined, HomeOutlined, ShoppingCartOutlined, UserOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { PHONE_TEL } from "@/lib/shop";

const SUPPORT = `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}`;

/** Fixed shop navigation. The cart button sits above the bar so it stays easy to hit. */
export function ShopTabBar({ cartCount, onCart }: { cartCount: number; onCart: () => void }) {
  const pathname = usePathname();
  const [staff, setStaff] = useState(false);
  useEffect(() => {
    let live = true;
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => live && setStaff(!!me?.role))
      .catch(() => live && setStaff(false));
    return () => {
      live = false;
    };
  }, []);
  const item = (active: boolean) =>
    `flex min-w-0 flex-1 flex-col items-center gap-0.5 pb-1.5 text-[10px] font-bold no-underline ${active ? "text-[#153a7a]" : "text-[#5a6a82]"}`;
  return (
    <nav className="pb-tabbar xl:hidden" aria-label="Primary">
      <Link href="/" className={item(pathname === "/")}><HomeOutlined style={{ fontSize: 18 }} />Home</Link>
      <Link href="/categories" className={item(pathname === "/categories")}><AppstoreOutlined style={{ fontSize: 18 }} />Categories</Link>
      <div className="pb-tab-slot">
        <button type="button" className="pb-tab-cart" onClick={onCart} aria-label={`Cart, ${cartCount} items`}>
          <ShoppingCartOutlined style={{ fontSize: 22 }} />
          {cartCount > 0 && <span className="pb-tab-count">{cartCount > 99 ? "99+" : cartCount}</span>}
        </button>
        <span className="pb-tab-cart-label">Cart</span>
      </div>
      <Link href="/orders" className={item(pathname === "/orders")}><FileTextOutlined style={{ fontSize: 18 }} />Orders</Link>
      {staff ? (
        <Link href="/admin" className={item(false)}><UserOutlined style={{ fontSize: 18 }} />Account</Link>
      ) : (
        <a className={item(false)} href={SUPPORT} target="_blank" rel="noopener noreferrer"><WhatsAppOutlined style={{ fontSize: 18 }} />WhatsApp</a>
      )}
    </nav>
  );
}
