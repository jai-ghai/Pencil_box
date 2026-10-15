"use client";

import Link from "next/link";
import NextImage from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Badge, Button, Card, ConfigProvider, Drawer, Empty, Flex, Grid, Input, Result, Segmented, Select, Skeleton, Space, Tag, Typography, theme } from "antd";
import { MinusOutlined, PictureOutlined, PlusOutlined, SearchOutlined, ShoppingCartOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleList } from "@/components/simple-list";
import { AccentScope } from "./providers";
import { inr, itemTitle, stripBrand } from "@/lib/client";
import { text, type Lang, type TextKey } from "@/lib/i18n";
import { BRAND } from "@/lib/theme";
import { buildOrderMessage, whatsappUrl, type OrderLine } from "@/lib/whatsapp";
import type { StoreCatalog, StoreProduct, StoreVariant } from "@/lib/store";

interface PricedLine {
  variantId: string;
  qty: number;
  freeUnits: number;
  unitPrice: number;
  lineTotal: number;
  discount: number;
  offerLabel_en?: string;
  offerLabel_hi?: string;
  nudge?: { addQty: number; label_en: string; label_hi?: string };
}
interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
  unavailable: string[];
  limited: string[];
}
type Cart = Record<string, number>;
type T = (k: TextKey) => string;

const CART_KEY = "pb_cart_v1";
const LANG_KEY = "pb_lang";
const WHATSAPP_GREEN = "#15803d"; // white text on this passes WCAG AA

/** The six categories from the shop poster, with their icons and colours. Order matches the poster. */
const TILES = [
  { match: "Notebooks & Registers", icon: "notebooks", accent: "#1d89e4", hi: "नोटबुक और रजिस्टर" },
  { match: "Pens & Pencils", icon: "pens", accent: "#ea1f7b", hi: "पेन और पेंसिल" },
  { match: "Art & Craft", icon: "art", accent: "#ff791a", hi: "आर्ट और क्राफ्ट" },
  { match: "School Supplies", icon: "school", accent: "#1ba64b", hi: "स्कूल सामान" },
  { match: "Gifts & More", icon: "gifts", accent: "#9a28b4", hi: "उपहार और बहुत कुछ" },
  { match: "Printing & Photocopy", icon: "printing", accent: "#1465c0", hi: "प्रिंटिंग और फोटोकॉपी" },
] as const;

/* localStorage can be blocked (private mode); the site must work without it */
const store = {
  get(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

function loadCart(): Cart {
  try {
    const raw = JSON.parse(store.get(CART_KEY) ?? "{}") as Record<string, unknown>;
    const out: Cart = {};
    for (const [id, qty] of Object.entries(raw)) if (/^[a-f0-9]{24}$/.test(id) && Number.isInteger(qty) && (qty as number) > 0) out[id] = Math.min(qty as number, 99);
    return out;
  } catch {
    return {};
  }
}

/** Smaller, faster images for Cloudinary links; other links are used as they are. */
const thumb = (url: string) => (url.includes("res.cloudinary.com") && url.includes("/upload/") ? url.replace("/upload/", "/upload/f_auto,q_auto,w_500/") : url);
const priceText = (v: StoreVariant) => (v.maxPrice ? `${inr(v.price)}–${inr(v.maxPrice).replace("₹", "")}` : inr(v.price));

export function Storefront() {
  return (
    <AccentScope accent="sun">
      <StorefrontInner />
    </AccentScope>
  );
}

function StorefrontInner() {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [lang, setLang] = useState<Lang>("en");
  const [catalog, setCatalog] = useState<StoreCatalog | null>(null);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const [topCat, setTopCat] = useState<string | null>(null);
  const [subCat, setSubCat] = useState<string | null>(null);
  const [brand, setBrand] = useState<string | undefined>(undefined);
  const [cart, setCart] = useState<Cart>({});
  const [pricedRaw, setPriced] = useState<PricedCart | null>(null);
  const [sheet, setSheet] = useState(false);
  const [notice, setNotice] = useState<TextKey | "">("");
  const [ready, setReady] = useState(false);
  const t: T = useCallback((k) => text(lang, k), [lang]);

  const load = useCallback(() => {
    fetch("/api/store/products")
      .then((r) => (r.ok ? (r.json() as Promise<StoreCatalog>) : Promise.reject(new Error("bad"))))
      .then((c) => {
        const saved = store.get(LANG_KEY);
        setLang(saved === "hi" || saved === "en" ? saved : navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en");
        // drop saved cart items that are no longer sold
        const known = new Set(c.products.flatMap((p) => p.variants.map((v) => v.id)));
        const savedCart = loadCart();
        const kept: Cart = {};
        let dropped = false;
        for (const [id, n] of Object.entries(savedCart)) (known.has(id) ? (kept[id] = n) : (dropped = true));
        setCart(kept);
        if (dropped) setNotice("removedSoldOut");
        setCatalog(c);
        setReady(true);
      })
      .catch(() => setError(true));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ready) store.set(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    document.documentElement.lang = lang; // screen readers and browsers pick the right voice and font
  }, [lang]);

  const chooseLang = (l: Lang) => {
    setLang(l);
    store.set(LANG_KEY, l);
  };

  /* lookup tables */
  const variantInfo = useMemo(() => {
    const m = new Map<string, { product: StoreProduct; variant: StoreVariant }>();
    for (const p of catalog?.products ?? []) for (const v of p.variants) m.set(v.id, { product: p, variant: v });
    return m;
  }, [catalog]);

  const cartIds = Object.keys(cart);
  const cartCount = cartIds.reduce((s, id) => s + cart[id], 0);

  /* live price from the server (same offers engine as the shop's billing screen) */
  useEffect(() => {
    if (!cartIds.length) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch("/api/store/price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: cartIds.map((id) => ({ variantId: id, qty: cart[id] })) }),
        signal: ctrl.signal,
      })
        .then((r) => (r.ok ? (r.json() as Promise<PricedCart>) : Promise.reject(new Error("bad"))))
        .then((p) => {
          setPriced(p);
          if (p.unavailable.length || p.limited.length) {
            setCart((c) => {
              const next = { ...c };
              for (const id of p.unavailable) delete next[id];
              for (const l of p.lines) if (next[l.variantId] !== undefined) next[l.variantId] = l.qty;
              return next;
            });
            setNotice(p.unavailable.length ? "removedSoldOut" : "qtyTrimmed");
          }
        })
        .catch(() => {});
    }, 150);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(cart)]);
  const priced = cartIds.length ? pricedRaw : null;

  const setQty = (id: string, qty: number) => {
    const max = variantInfo.get(id)?.variant.maxQty ?? 99;
    setNotice("");
    setCart((c) => {
      const next = { ...c };
      if (qty <= 0) delete next[id];
      else next[id] = Math.min(qty, max);
      return next;
    });
  };

  /* filtering */
  const topCats = catalog?.categories.filter((c) => !c.parentId) ?? [];
  const subCats = topCat ? catalog?.categories.filter((c) => c.parentId === topCat) ?? [] : [];
  const parentOf = useMemo(() => new Map((catalog?.categories ?? []).map((c) => [c.id, c.parentId])), [catalog]);
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    return (catalog?.products ?? []).filter((p) => {
      if (subCat ? p.categoryId !== subCat : topCat && p.categoryId !== topCat && parentOf.get(p.categoryId) !== topCat) return false;
      if (brand && p.brandId !== brand) return false;
      if (!words.length) return true;
      const hay = `${p.name_en} ${p.name_hi} ${p.brand} ${p.variants.map((v) => `${v.label} ${v.code}`).join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }, [catalog, q, topCat, subCat, brand, parentOf]);
  const clearFilters = () => {
    setQ("");
    setTopCat(null);
    setSubCat(null);
    setBrand(undefined);
  };

  /* cart numbers */
  const hasRange = cartIds.some((id) => (variantInfo.get(id)?.variant.maxPrice ?? 0) > 0);
  const localSubtotal = cartIds.reduce((s, id) => s + (variantInfo.get(id)?.variant.price ?? 0) * cart[id], 0);
  const total = priced?.total ?? localSubtotal;
  const orderLines: OrderLine[] = cartIds.flatMap((id) => {
    const info = variantInfo.get(id);
    if (!info) return [];
    const pl = priced?.lines.find((l) => l.variantId === id);
    return [{
      code: info.variant.code,
      name: itemTitle({ brand: info.product.brand, name: info.product.name_en, label: info.variant.label }),
      qty: cart[id],
      freeUnits: pl?.freeUnits ?? 0,
      lineTotal: pl?.lineTotal ?? info.variant.price * cart[id],
    }];
  });
  const waHref = catalog?.whatsapp && orderLines.length ? whatsappUrl(catalog.whatsapp, buildOrderMessage(orderLines, total, { lang, hasPriceRange: hasRange })) : null;
  const catName = (c: { name_en: string; name_hi: string }) => (lang === "hi" && c.name_hi ? c.name_hi : c.name_en);

  return (
    <div className="flex min-h-dvh flex-1 flex-col" style={{ background: token.colorBgLayout }}>
      {/* header: wordmark, language, cart; search sits in the same navy band */}
      <header style={{ background: BRAND.navy }} className="sticky top-0 z-40">
        <div className="mx-auto w-full max-w-6xl px-4 pb-3 pt-3">
          <Flex align="center" gap={screens.sm ? 12 : 6}>
            <div className="min-w-0 flex-1">
              <Wordmark size={screens.sm ? 28 : 19} />
              {screens.sm && <div className="mt-1 truncate text-xs italic" style={{ color: "rgba(255,255,255,0.85)" }}>{t("tagline")}</div>}
            </div>
            <Segmented<Lang> size={screens.sm ? "middle" : "small"} value={lang} onChange={chooseLang} aria-label={t("language")} options={[{ label: "EN", value: "en" }, { label: "हिं", value: "hi" }]} />
            <ThemeToggle toLight={t("lightMode")} toDark={t("darkMode")} />
            <Badge count={cartCount} color={BRAND.navyDeep} offset={[-2, 4]}>
              <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setSheet(true)} aria-label={`${t("cart")}: ${cartCount}`}>
                {screens.sm ? t("cart") : null}
              </Button>
            </Badge>
          </Flex>
          <Input size="large" allowClear className="mt-3" prefix={<SearchOutlined />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-4 pb-28">
        {catalog && (
          <Flex vertical gap={10} className="mb-4">
            <div className="pb-scroll-x -mx-4 flex gap-3 px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-6 lg:overflow-visible lg:px-0" role="group" aria-label="Categories">
              {TILES.map((tile) => {
                const cat = topCats.find((c) => c.name_en === tile.match);
                const active = !!cat && topCat === cat.id;
                return (
                  <button
                    key={tile.match}
                    type="button"
                    disabled={!cat}
                    aria-pressed={active}
                    onClick={() => cat && (setTopCat(active ? null : cat.id), setSubCat(null))}
                    className="flex shrink-0 items-center gap-3 text-left lg:min-w-0"
                    style={{
                      minWidth: 176,
                      padding: "10px 12px",
                      borderRadius: token.borderRadiusLG,
                      background: token.colorBgContainer,
                      border: `1px solid ${token.colorBorderSecondary}`,
                      borderBottom: `4px solid ${tile.accent}`,
                      boxShadow: active ? `0 0 0 2px ${token.colorText}` : undefined,
                      opacity: cat ? 1 : 0.6,
                      cursor: cat ? "pointer" : "not-allowed",
                      color: token.colorText,
                    }}
                  >
                    <NextImage src={`/brand/cat-${tile.icon}.png`} alt="" width={40} height={40} />
                    <span style={{ fontWeight: 700, lineHeight: 1.2 }}>
                      {cat ? catName(cat) : lang === "hi" ? tile.hi : tile.match}
                      {!cat && <span style={{ display: "block", fontSize: 12, fontWeight: 500, color: token.colorTextSecondary }}>{t("comingSoon")}</span>}
                    </span>
                  </button>
                );
              })}
            </div>
            {subCats.length > 0 && (
              <div className="pb-scroll-x -mx-4 flex items-center gap-2 px-4" role="group" aria-label="Sub categories">
                <Button size="small" type="text" onClick={() => (setTopCat(null), setSubCat(null))}>{t("showAll")}</Button>
                <Button size="small" type={!subCat ? "primary" : "default"} onClick={() => setSubCat(null)}>{t("all")}</Button>
                {subCats.map((c) => (
                  <Button key={c.id} size="small" type={subCat === c.id ? "primary" : "default"} onClick={() => setSubCat(c.id)} className="shrink-0">
                    {catName(c)}
                  </Button>
                ))}
              </div>
            )}
            {catalog.brands.length > 0 && (
              <Select
                allowClear
                showSearch={{ optionFilterProp: "label" }}
                value={brand}
                onChange={(v) => setBrand(v)}
                placeholder={t("allBrands")}
                aria-label={t("brand")}
                style={{ width: screens.sm ? 260 : "100%" }}
                options={catalog.brands.map((b) => ({ value: b.id, label: b.name }))}
              />
            )}
          </Flex>
        )}

        {notice && <Alert type="info" showIcon closable title={t(notice)} className="mb-3" onClose={() => setNotice("")} />}

        {!catalog && !error && <LoadingGrid />}
        {error && <Result status="warning" title={t("error")} extra={<Button type="primary" onClick={() => (setError(false), load())}>{t("retry")}</Button>} />}
        {catalog && shown.length === 0 && (
          <Empty description={t("noResults")} image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button onClick={clearFilters}>{t("clearFilters")}</Button>
          </Empty>
        )}

        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:items-start lg:grid-cols-3 xl:grid-cols-4">
          {shown.map((p) => (
            <li key={p.id}>
              <ProductCard p={p} lang={lang} t={t} cart={cart} setQty={setQty} />
            </li>
          ))}
        </ul>
      </main>

      <footer className="px-4 pb-24 pt-2 text-center">
        <NextImage src="/brand/mascot.png" alt="" width={72} height={68} className="mx-auto mb-2" style={{ height: "auto" }} />
        <Typography.Paragraph type="secondary" style={{ fontSize: 13, marginBottom: 4 }}>
          {t("pickupNote")} {t("finalPrice")}
        </Typography.Paragraph>
        <Link href="/login" style={{ fontSize: 13, color: token.colorTextSecondary, textDecoration: "underline" }}>{t("staff")}</Link>
      </footer>

      {/* sticky cart bar */}
      {cartCount > 0 && !sheet && (
        <div className="fixed inset-x-0 bottom-0 z-30 p-3">
          <Flex align="center" justify="space-between" gap={12} className="mx-auto max-w-xl rounded-[14px] px-4 py-3" style={{ background: BRAND.navy, boxShadow: "0 8px 24px rgba(11,29,82,0.35)" }}>
            <span className="text-sm font-semibold text-white">{cartCount} {t("items")} · {hasRange ? `${t("fromPrice")} ` : ""}{inr(total)}</span>
            <Button type="primary" onClick={() => setSheet(true)}>{t("cart")}</Button>
          </Flex>
        </div>
      )}

      <CartDrawer
        open={sheet} onClose={() => setSheet(false)} t={t} lang={lang} cartIds={cartIds} cart={cart} variantInfo={variantInfo} priced={priced}
        total={total} hasRange={hasRange} waHref={waHref} setQty={setQty} onClear={() => (setCart({}), setNotice(""), setSheet(false))} wide={!!screens.md}
      />
    </div>
  );
}

function LoadingGrid() {
  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }, (_, i) => (
        <li key={i}>
          <Card styles={{ body: { padding: 0 } }}>
            <Flex className="sm:flex-col">
              <Skeleton.Node active style={{ width: 96, height: 120 }}>{" "}</Skeleton.Node>
              <div className="flex-1 p-3">
                <Skeleton active title={{ width: "70%" }} paragraph={{ rows: 2 }} />
              </div>
            </Flex>
          </Card>
        </li>
      ))}
    </ul>
  );
}

function Stepper({ qty, max, onChange, label, t }: { qty: number; max: number; onChange: (n: number) => void; label: string; t: T }) {
  const { token } = theme.useToken();
  return (
    <Space.Compact>
      <Button icon={<MinusOutlined />} onClick={() => onChange(qty - 1)} aria-label={`${t("remove")}: ${label}`} />
      <Button disabled style={{ width: 44, color: token.colorText, background: token.colorBgContainer, cursor: "default", fontWeight: 700 }} aria-live="polite">{qty}</Button>
      <Button icon={<PlusOutlined />} disabled={qty >= max} title={qty >= max ? t("maxReached") : undefined} onClick={() => onChange(qty + 1)} aria-label={`${t("add")}: ${label}`} />
    </Space.Compact>
  );
}

function ProductCard({ p, lang, t, cart, setQty }: { p: StoreProduct; lang: Lang; t: T; cart: Cart; setQty: (id: string, qty: number) => void }) {
  const { token } = theme.useToken();
  const name = lang === "hi" && p.name_hi ? p.name_hi : stripBrand(p.name_en, p.brand);
  const showBrand = !!p.brand;
  return (
    <Card hoverable={false} styles={{ body: { padding: 0 } }} className="h-full overflow-hidden [&>.ant-card-body]:h-full">
      <div className="flex h-full flex-col">
        {/* phones: small picture beside the name; larger screens: picture on top. Variants always get the full width. */}
        <div className="flex gap-3 p-3 sm:block sm:p-0">
          {/* picture frame: a square thumbnail on phones, a 4:3 crop on larger screens; empty until a picture exists */}
          <div
            className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[10px] sm:h-auto sm:w-full sm:aspect-[4/3] sm:rounded-none"
            style={{ background: "rgba(255,213,0,0.14)" }}
          >
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumb(p.image)} alt={p.name_en} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center"><PictureOutlined style={{ fontSize: 30, color: token.colorTextQuaternary }} aria-hidden /></div>
            )}
          </div>
          <div className="min-w-0 flex-1 sm:p-3 sm:pb-1">
            {showBrand && <Typography.Text type="secondary" style={{ fontSize: 12 }}>{p.brand}</Typography.Text>}
            <Typography.Title level={5} style={{ margin: 0, lineHeight: 1.3 }}>{name}</Typography.Title>
          </div>
        </div>
        <ul className="px-3 pb-2">
          {p.variants.map((v, i) => {
            const qty = cart[v.id] ?? 0;
            return (
              <li key={v.id} className="py-2" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                <Flex align="center" gap={8}>
                  <div className="min-w-0 flex-1">
                    <div style={{ fontWeight: 600, lineHeight: 1.25 }}>{v.label || "\u00a0"}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("code")} <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700 }}>{v.code}</span></Typography.Text>
                  </div>
                  <div className="text-right">
                    <div style={{ fontWeight: 800, fontSize: 17 }}>{priceText(v)}</div>
                    {v.low && <Tag color="warning" variant="filled" style={{ marginInlineEnd: 0 }}>{t("fewLeft")}</Tag>}
                  </div>
                  {qty === 0 ? (
                    <Button type="primary" onClick={() => setQty(v.id, 1)} aria-label={`${t("add")}: ${name} ${v.label}`}>{t("add")}</Button>
                  ) : (
                    <Stepper qty={qty} max={v.maxQty} onChange={(n) => setQty(v.id, n)} label={`${name} ${v.label}`} t={t} />
                  )}
                </Flex>
                {v.offers.map((o) => (
                  <Tag key={o.label_en} color="success" variant="solid" style={{ marginTop: 6 }}>{lang === "hi" && o.label_hi ? o.label_hi : o.label_en}</Tag>
                ))}
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}

function CartDrawer(props: {
  open: boolean;
  onClose: () => void;
  t: T;
  lang: Lang;
  cartIds: string[];
  cart: Cart;
  variantInfo: Map<string, { product: StoreProduct; variant: StoreVariant }>;
  priced: PricedCart | null;
  total: number;
  hasRange: boolean;
  waHref: string | null;
  setQty: (id: string, qty: number) => void;
  onClear: () => void;
  wide: boolean;
}) {
  const { open, onClose, t, lang, cartIds, cart, variantInfo, priced, total, hasRange, waHref, setQty, onClear, wide } = props;
  const { token } = theme.useToken();
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t("yourCart")}
      placement={wide ? "right" : "bottom"}
      size={wide ? 460 : "86dvh"}
      destroyOnHidden
      footer={
        cartIds.length > 0 ? (
          <Flex vertical gap={10}>
            {!!priced?.discount && (
              <Flex justify="space-between"><Typography.Text type="success" strong>{t("offersApplied")}</Typography.Text><Typography.Text type="success" strong>−{inr(priced.discount)}</Typography.Text></Flex>
            )}
            <Flex justify="space-between" align="baseline">
              <Typography.Text strong>{t("estTotal")}</Typography.Text>
              <Typography.Title level={3} style={{ margin: 0 }}>{hasRange ? `${t("fromPrice")} ` : ""}{inr(total)}</Typography.Title>
            </Flex>
            {hasRange && <Typography.Text type="secondary" style={{ fontSize: 13 }}>{t("twoPrices")}</Typography.Text>}
            {waHref ? (
              <ConfigProvider theme={{ token: { colorPrimary: WHATSAPP_GREEN }, components: { Button: { primaryColor: "#ffffff" } } }}>
                <Button type="primary" size="large" block href={waHref} target="_blank" rel="noopener noreferrer" icon={<WhatsAppOutlined />} style={{ fontSize: 18, height: 52 }}>
                  {t("orderWhatsapp")}
                </Button>
              </ConfigProvider>
            ) : (
              <Alert type="warning" showIcon title={t("orderSoon")} />
            )}
            <Typography.Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>{t("pickupNote")} {t("finalPrice")}</Typography.Text>
            <Button type="link" danger onClick={onClear}>{t("clear")}</Button>
          </Flex>
        ) : undefined
      }
    >
      {cartIds.length === 0 ? (
        <Empty description={t("emptyCart")} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <SimpleList
          dataSource={cartIds}
          getKey={(id) => id}
          renderItem={(id) => {
            const info = variantInfo.get(id);
            if (!info) return null;
            const { product: p, variant: v } = info;
            const pl = priced?.lines.find((l) => l.variantId === id);
            const nm = lang === "hi" && p.name_hi ? p.name_hi : p.name_en;
            const label = pl ? (lang === "hi" && pl.offerLabel_hi ? pl.offerLabel_hi : pl.offerLabel_en) : undefined;
            const nudge = pl?.nudge ? (lang === "hi" && pl.nudge.label_hi ? pl.nudge.label_hi : pl.nudge.label_en) : undefined;
            return (
              <>
                <Flex gap={12} className="w-full" align="flex-start">
                  <div className="min-w-0 flex-1">
                    <div style={{ fontWeight: 700, lineHeight: 1.3 }}>{itemTitle({ brand: p.brand, name: nm, label: v.label })}</div>
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {t("code")} <span style={{ fontFamily: "var(--font-geist-mono), monospace", fontWeight: 700 }}>{v.code}</span> · {priceText(v)}
                    </Typography.Text>
                    {label && pl && pl.discount > 0 && <div><Tag color="success" variant="solid" style={{ marginTop: 6 }}>{label}{pl.freeUnits > 0 ? ` · ${pl.freeUnits} ${t("free")}` : ""}</Tag></div>}
                    {nudge && <div><Tag color="gold" style={{ marginTop: 6, color: token.colorText }}>{nudge}</Tag></div>}
                  </div>
                  <Flex vertical align="flex-end" gap={8}>
                    <Typography.Text strong style={{ fontSize: 16 }}>{inr(pl?.lineTotal ?? v.price * cart[id])}</Typography.Text>
                    <Stepper qty={cart[id]} max={v.maxQty} onChange={(n) => setQty(id, n)} label={nm} t={t} />
                  </Flex>
                </Flex>
              </>
            );
          }}
        />
      )}
    </Drawer>
  );
}
