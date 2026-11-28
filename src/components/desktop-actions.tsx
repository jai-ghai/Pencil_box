"use client";

import { useEffect, useState } from "react";

const CART_KEY = "pb_cart_v1";
const WISH_KEY = "pb_wish_v1";

function readCount(key: string, mode: "sum" | "list"): number {
  try {
    const raw = JSON.parse(localStorage.getItem(key) || (mode === "sum" ? "{}" : "[]"));
    if (mode === "sum" && raw && typeof raw === "object") {
      return Object.values(raw as Record<string, number>).reduce((sum, n) => sum + (Number(n) || 0), 0);
    }
    return Array.isArray(raw) ? raw.length : 0;
  } catch {
    return 0;
  }
}

function Badge({ n }: { n: number }) {
  if (!n) return null;
  return <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#e23b3b] px-1 text-[10px] font-extrabold text-white">{n > 99 ? "99+" : n}</span>;
}

/** Cart and wishlist counts for the white desktop header. */
export function DesktopActions() {
  const [cart, setCart] = useState(0);
  const [wish, setWish] = useState(0);
  useEffect(() => {
    const read = () => {
      setCart(readCount(CART_KEY, "sum"));
      setWish(readCount(WISH_KEY, "list"));
    };
    read();
    window.addEventListener("pb-cart", read);
    window.addEventListener("pb-wish", read);
    return () => {
      window.removeEventListener("pb-cart", read);
      window.removeEventListener("pb-wish", read);
    };
  }, []);
  return (
    <div className="flex items-center gap-2">
      <a href="/orders" className="relative grid h-11 w-11 place-items-center rounded-full text-[#153a7a] no-underline hover:bg-[#f0f3f8]" aria-label={`Wishlist, ${wish} saved`}>
        <Heart />
        <Badge n={wish} />
        <span className="sr-only">Wishlist</span>
      </a>
      <button type="button" className="relative grid h-11 w-11 place-items-center rounded-full text-[#153a7a] hover:bg-[#f0f3f8]" aria-label={`Cart, ${cart} items`} onClick={() => window.dispatchEvent(new Event("pb-open-cart"))}>
        <CartIcon />
        <Badge n={cart} />
      </button>
    </div>
  );
}

export function WishButton({ id, label }: { id: string; label: string }) {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const list = JSON.parse(localStorage.getItem(WISH_KEY) || "[]") as string[];
        setOn(Array.isArray(list) && list.includes(id));
      } catch {
        setOn(false);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id]);
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={on ? `Saved ${label}` : `Save ${label}`}
      className="mt-3 rounded-[10px] border border-[#153a7a] px-4 py-2 text-sm font-extrabold text-[#153a7a]"
      onClick={() => {
        try {
          const list = JSON.parse(localStorage.getItem(WISH_KEY) || "[]") as string[];
          const next = Array.isArray(list) ? list.filter((item) => item !== id) : [];
          if (!on) next.push(id);
          localStorage.setItem(WISH_KEY, JSON.stringify(next));
          setOn(!on);
        } catch {
          /* private mode */
        }
        window.dispatchEvent(new Event("pb-wish"));
      }}
    >
      {on ? "Saved" : "Save"}
    </button>
  );
}

function Heart() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M12 20s-7-4.4-7-9a4 4 0 0 1 7-2 4 4 0 0 1 7 2c0 4.6-7 9-7 9z" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <path d="M6 6h15l-1.5 9h-12z" />
      <path d="M6 6 5 3H2" />
      <circle cx="9" cy="20" r="1.2" fill="currentColor" />
      <circle cx="18" cy="20" r="1.2" fill="currentColor" />
    </svg>
  );
}
