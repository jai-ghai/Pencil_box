"use client";

import { useState } from "react";
import { Button, ConfigProvider } from "antd";
import { WhatsAppOutlined } from "@ant-design/icons";
import { inr, itemTitle } from "@/lib/client";
import { discountPercent } from "@/lib/browse";
import { buildOrderMessage, whatsappUrl } from "@/lib/whatsapp";
import type { StoreProduct } from "@/lib/store";

const CART_KEY = "pb_cart_v1";

function readCart(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) ?? "{}") as Record<string, unknown>;
    const out: Record<string, number> = {};
    for (const [id, qty] of Object.entries(raw)) if (/^[a-f0-9]{24}$/.test(id) && Number.isInteger(qty) && (qty as number) > 0) out[id] = qty as number;
    return out;
  } catch {
    return {};
  }
}

export function ProductBuy({ product, whatsapp }: { product: StoreProduct; whatsapp: string | null }) {
  const [variantId, setVariantId] = useState(product.variants[0]?.id ?? "");
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  if (!variant) return null;
  const off = discountPercent(variant.price, variant.mrp);
  const name = itemTitle({ brand: product.brand, name: product.name_en, label: variant.label });

  function add() {
    const cart = readCart();
    cart[variant.id] = Math.min(variant.maxQty, (cart[variant.id] ?? 0) + qty);
    localStorage.setItem(CART_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("pb-cart"));
    setAdded(true);
  }

  const line = { code: variant.code, name, qty, freeUnits: 0, lineTotal: variant.price * qty };
  const wa = whatsapp ? whatsappUrl(whatsapp, buildOrderMessage([line], line.lineTotal, { lang: "en", hasPriceRange: false })) : null;

  return (
    <div className="mt-4 flex max-w-md flex-col gap-3">
      {product.variants.length > 1 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Options">
          {product.variants.map((v) => (
            <button key={v.id} type="button" onClick={() => setVariantId(v.id)} className="rounded-[8px] border px-3 py-1 text-sm font-semibold" style={{ borderColor: v.id === variant.id ? "#153a7a" : "rgba(12,18,34,0.15)", background: v.id === variant.id ? "#153a7a" : "#fff", color: v.id === variant.id ? "#fff" : "#0c1222" }}>
              {v.label || v.code}
            </button>
          ))}
        </div>
      )}
      <p className="flex flex-wrap items-baseline gap-2">
        {off > 0 && <span className="text-sm line-through text-[#5a6a82]">{inr(variant.mrp)}</span>}
        <span className="text-2xl font-extrabold">{inr(variant.price)}</span>
        {off > 0 && <span className="rounded bg-[#147a3f] px-2 py-0.5 text-xs font-bold text-white">{off}% OFF</span>}
      </p>
      <p className="text-sm font-semibold">{variant.low ? "Few left" : "In stock"}</p>
      <div className="flex items-center gap-2">
        <button type="button" className="h-10 w-10 rounded-[8px] border font-bold" aria-label="Decrease quantity" onClick={() => setQty((n) => Math.max(1, n - 1))}>−</button>
        <span className="min-w-8 text-center font-bold" aria-live="polite">{qty}</span>
        <button type="button" className="h-10 w-10 rounded-[8px] border font-bold" aria-label="Increase quantity" onClick={() => setQty((n) => Math.min(variant.maxQty, n + 1))}>+</button>
      </div>
      <button type="button" onClick={add} className="h-12 w-full rounded-[10px] bg-[#ecc233] text-base font-extrabold text-[#0a1628]">{added ? "Added to cart" : "Add to cart"}</button>
      {wa ? (
        <ConfigProvider theme={{ token: { colorPrimary: "#15803d" }, components: { Button: { primaryColor: "#fff" } } }}>
          <Button type="primary" size="large" block href={wa} target="_blank" rel="noopener noreferrer" icon={<WhatsAppOutlined />}>Order on WhatsApp</Button>
        </ConfigProvider>
      ) : (
        <p className="text-sm">Ordering on WhatsApp will open soon. Please visit the shop.</p>
      )}
    </div>
  );
}
