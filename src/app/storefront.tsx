"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { Alert, Badge, Button, Card, Checkbox, ConfigProvider, Drawer, Empty, Flex, Grid, Input, Modal, Result, Segmented, Select, Skeleton, Slider, Space, Tag, Typography, theme } from "antd";
import { DownOutlined, MenuOutlined, MinusOutlined, PictureOutlined, PlusOutlined, PrinterOutlined, SafetyCertificateOutlined, SearchOutlined, ShoppingCartOutlined, StopOutlined, TagsOutlined, WhatsAppOutlined } from "@ant-design/icons";
import { HomeGrid } from "@/components/home-grid";
import { ShopMenu } from "@/components/shop-menu";
import { ShopTabBar } from "@/components/shop-tabbar";
import { Wordmark } from "@/components/wordmark";
import { ThemeToggle } from "@/components/theme-toggle";
import { SimpleList } from "@/components/simple-list";
import { AccentScope } from "./providers";
import { inr, itemTitle, stripBrand } from "@/lib/client";
import { text, type Lang, type TextKey } from "@/lib/i18n";
import { BRAND } from "@/lib/theme";
import { buildOrderMessage, whatsappUrl, type OrderLine } from "@/lib/whatsapp";
import { categoryMatchFromPath, collectionByMatch } from "@/lib/shop";
import { ShopImage } from "@/components/shop-image";
import { SORTS, cleanItemName, discountPercent, groupSameProducts, lowestPrice, pageCount, pageSlice, sortProducts, type SortKey } from "@/lib/browse";
import { COLLECTIONS } from "@/lib/shop";
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
const CATALOG_KEY = "pb_catalog_v1"; // last catalogue seen, so a repeat visit paints at once
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

/** Square Cloudinary photos on white; local drawings stay as they are. */
const priceText = (v: StoreVariant) => (v.maxPrice ? `${inr(v.price)}–${inr(v.maxPrice).replace("₹", "")}` : inr(v.price));
function pageHref(pathname: string, params: { toString(): string }, page: number): string {
  const next = new URLSearchParams(params.toString());
  if (page <= 1) next.delete("page");
  else next.set("page", String(page));
  const qs = next.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

function FilterPanel({ catalog, subCats, brandIds, minRupee, maxRupee, subSlug, catName, onQuery, onSub }: {
  catalog: StoreCatalog | null;
  subCats: { id: string; name_en: string; name_hi: string; slug: string }[];
  brandIds: string[];
  minRupee: string | null;
  maxRupee: string | null;
  subSlug: string | null;
  catName: (c: { name_en: string; name_hi: string }) => string;
  onQuery: (updates: Record<string, string | null>) => void;
  onSub: (slug: string | null) => void;
}) {
  if (!catalog) return null;
  const top = Math.max(100, ...catalog.products.flatMap((p) => p.variants.map((v) => Math.ceil(v.price / 100))));
  const lo = minRupee ? Number(minRupee) : 0;
  const hi = maxRupee ? Number(maxRupee) : top;
  return (
    <div className="flex flex-col gap-4 text-sm">
      <div>
        <p className="mb-1 font-extrabold">Categories</p>
        <ul className="flex flex-col gap-1">
          {COLLECTIONS.map((c) => (
            <li key={c.slug}><Link href={`/c/${c.slug}`} className="font-semibold underline">{c.nav}</Link></li>
          ))}
        </ul>
      </div>
      {subCats.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold">Subcategories</p>
          {subCats.map((c) => (
            <label key={c.id} className="flex items-center gap-2 py-0.5">
              <Checkbox checked={subSlug === c.slug} onChange={() => onSub(subSlug === c.slug ? null : c.slug)} />
              <span>{catName(c)}</span>
            </label>
          ))}
        </div>
      )}
      {catalog.brands.length > 0 && (
        <div>
          <p className="mb-1 font-extrabold">Brands</p>
          {catalog.brands.map((b) => (
            <label key={b.id} className="mb-1 flex items-center gap-2">
              <Checkbox checked={brandIds.includes(b.id)} onChange={() => {
                const next = brandIds.includes(b.id) ? brandIds.filter((id) => id !== b.id) : [...brandIds, b.id];
                onQuery({ brand: next.length ? next.join(",") : null });
              }} />
              <span>{b.name}</span>
            </label>
          ))}
        </div>
      )}
      <div>
        <p className="mb-1 font-extrabold">Price (₹)</p>
        <Slider range min={0} max={top} value={[lo, hi]} onChangeComplete={(value) => {
          const next = value as number[];
          onQuery({ min: next[0] > 0 ? String(next[0]) : null, max: next[1] < top ? String(next[1]) : null });
        }} />
      </div>
    </div>
  );
}

function productAlt(p: StoreProduct): string {
  const name = [p.brand, p.name_en].filter(Boolean).join(" ") || "Stationery item";
  return p.imageGeneric ? `Illustration of ${name}` : name;
}

export function Storefront({ children, initialCatalog = null }: { children?: ReactNode; initialCatalog?: StoreCatalog | null }) {
  return (
    <AccentScope accent="sun">
      <StorefrontInner initialCatalog={initialCatalog}>{children}</StorefrontInner>
    </AccentScope>
  );
}

function routeCategory(catalog: StoreCatalog | null, pathname: string, subSlug: string | null): { top: string | null; sub: string | null } {
  const routeName = categoryMatchFromPath(pathname);
  const top = routeName && catalog ? (catalog.categories.find((c) => !c.parentId && c.name_en === routeName)?.id ?? null) : null;
  const sub = subSlug && top && catalog ? (catalog.categories.find((c) => c.slug === subSlug && c.parentId === top)?.id ?? null) : null;
  return { top, sub };
}

function StorefrontInner({ children, initialCatalog = null }: { children?: ReactNode; initialCatalog?: StoreCatalog | null }) {
  const { token } = theme.useToken();
  const screens = Grid.useBreakpoint();
  const [lang, setLang] = useState<Lang>("en");
  const [requestOpen, setRequestOpen] = useState(false);
  const [catalog, setCatalog] = useState<StoreCatalog | null>(initialCatalog);
  const [error, setError] = useState(false);
  const [q, setQ] = useState("");
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const routeName = categoryMatchFromPath(pathname);
  const subSlug = searchParams.get("sub");
  /* Category filter. A /c/<slug> URL sets it; subcategory picks on the home page set it too.
     Seed it when the catalogue is already known, so the first HTML is the real shelf. */
  const seeded = routeCategory(initialCatalog, pathname, subSlug);
  const [topCat, setTopCat] = useState<string | null>(seeded.top);
  const [subCat, setSubCat] = useState<string | null>(seeded.sub);
  const routeKey = `${routeName ?? ""}:${subSlug ?? ""}:${catalog ? "y" : "n"}`;
  const [appliedRoute, setAppliedRoute] = useState(routeKey);
  const sort = (SORTS.some((s) => s.value === searchParams.get("sort")) ? searchParams.get("sort") : "popular") as SortKey;
  const page = Math.max(1, Number.parseInt(searchParams.get("page") ?? "1", 10) || 1);
  const brandIds = (searchParams.get("brand") ?? "").split(",").filter(Boolean);
  const minRupee = searchParams.get("min");
  const maxRupee = searchParams.get("max");
  const [offersOnly, setOffersOnly] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [cart, setCart] = useState<Cart>({});
  const [pricedRaw, setPriced] = useState<PricedCart | null>(null);
  const [sheet, setSheet] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [notice, setNotice] = useState<TextKey | "">("");
  const [ready, setReady] = useState(false);
  if (appliedRoute !== routeKey) {
    setAppliedRoute(routeKey);
    const match = routeName ? (catalog?.categories.find((c) => !c.parentId && c.name_en === routeName)?.id ?? null) : null;
    const sub = subSlug ? catalog?.categories.find((c) => c.slug === subSlug && c.parentId === match) : undefined;
    setTopCat(match);
    setSubCat(sub?.id ?? null);
  }
  const t: T = useCallback((k) => text(lang, k), [lang]);

  const load = useCallback(() => {
    // repeat visitors: draw the last catalogue straight away, the fresh one replaces it a moment later
    Promise.resolve().then(() => {
      try {
        const cached = JSON.parse(store.get(CATALOG_KEY) ?? "null") as StoreCatalog | null;
        if (cached && Array.isArray(cached.products)) {
          const saved = store.get(LANG_KEY);
          setLang(saved === "hi" || saved === "en" ? saved : navigator.language?.toLowerCase().startsWith("hi") ? "hi" : "en");
          setCart(loadCart());
          setCatalog((now) => now ?? cached); // never replace a fresher catalogue that already arrived
          if (new URLSearchParams(window.location.search).get("offers") === "1") setOffersOnly(true);
          setReady(true);
        }
      } catch {
        /* no saved copy: wait for the network */
      }
    });
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
        store.set(CATALOG_KEY, JSON.stringify(c));
        if (new URLSearchParams(window.location.search).get("offers") === "1") setOffersOnly(true); // QR / link straight to the offers
        setReady(true);
      })
      .catch(() => setError((e) => e || !store.get(CATALOG_KEY)));
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (ready) store.set(CART_KEY, JSON.stringify(cart));
  }, [cart, ready]);

  useEffect(() => {
    const sync = () => setCart(loadCart());
    const openCart = () => setSheet(true);
    window.addEventListener("pb-cart", sync);
    window.addEventListener("pb-open-cart", openCart);
    const menuTimer = new URLSearchParams(window.location.search).get("menu") === "1" ? window.setTimeout(() => setMenuOpen(true), 0) : 0;
    return () => {
      window.clearTimeout(menuTimer);
      window.removeEventListener("pb-cart", sync);
      window.removeEventListener("pb-open-cart", openCart);
    };
  }, []);

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
  const minPaise = minRupee ? Math.round(Number(minRupee) * 100) : null;
  const maxPaise = maxRupee ? Math.round(Number(maxRupee) * 100) : null;
  const shown = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    const filtered = (catalog?.products ?? []).filter((p) => {
      if (subCat ? p.categoryId !== subCat : topCat && p.categoryId !== topCat && parentOf.get(p.categoryId) !== topCat) return false;
      if (brandIds.length && !brandIds.includes(p.brandId)) return false;
      if (offersOnly && !p.variants.some((v) => v.offers.length > 0)) return false;
      const low = lowestPrice(p);
      if (minPaise != null && low < minPaise) return false;
      if (maxPaise != null && low > maxPaise) return false;
      if (!words.length) return true;
      const hay = `${p.name_en} ${p.name_hi} ${p.brand} ${p.variants.map((v) => `${v.label} ${v.code}`).join(" ")}`.toLowerCase();
      return words.every((w) => hay.includes(w));
    });
    return sortProducts(groupSameProducts(filtered), sort);
  }, [catalog, q, topCat, subCat, brandIds, offersOnly, parentOf, minPaise, maxPaise, sort]);
  const pages = pageCount(shown.length);
  const safePage = Math.min(page, pages);
  const pageItems = pageSlice(shown, safePage);
  const hasOffers = !!catalog?.products.some((p) => p.variants.some((v) => v.offers.length > 0));
  /* photocopy and printout rates come from the Printing & Photocopy > Services items, so a price changed in admin changes here too */
  const printTop = topCats.find((c) => c.name_en === "Printing & Photocopy");
  const servicesCat = catalog?.categories.find((c) => c.name_en === "Services" && c.parentId === printTop?.id);
  const rates = servicesCat ? (catalog?.products ?? []).filter((p) => p.categoryId === servicesCat.id && p.variants.length > 0) : [];
  const showRates = rates.length > 0 && !q && !brandIds.length && !offersOnly && !subCat && !minPaise && !maxPaise && (!topCat || topCat === printTop?.id);
  /* landing view (nothing searched or filtered): collection tiles and a row of products per category, before the full list */
  const home = pathname === "/";
  const sectionSlug = pathname.startsWith("/c/") ? pathname.slice(3).split("/")[0] : "";
  const showBrowse = pathname === "/products" || COLLECTIONS.some((c) => c.slug === sectionSlug);
  const landing = false;
  const categoryRows = landing
    ? TILES.flatMap((tile) => {
        const cat = topCats.find((c) => c.name_en === tile.match);
        if (!cat || cat.id === printTop?.id) return []; // printing already has the rates card
        const items = groupSameProducts((catalog?.products ?? []).filter((p) => p.categoryId === cat.id || parentOf.get(p.categoryId) === cat.id));
        // short cards keep the row tidy (a card with ten colours would stretch it); pictures first
        const compact = items.filter((p) => p.variants.length <= 3);
        const ranked = [...compact.filter((p) => p.image), ...compact.filter((p) => !p.image), ...items.filter((p) => p.variants.length > 3)].slice(0, 8);
        return ranked.length ? [{ cat, accent: tile.accent, items: ranked, total: items.length }] : [];
      })
    : [];
  const pickCollection = (catId: string, parentId: string | null) => {
    setTopCat(parentId ?? catId);
    setSubCat(parentId ? catId : null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const clearFilters = () => {
    setQ("");
    setTopCat(null);
    setSubCat(null);
    setOffersOnly(false);
    router.push(pathname.startsWith("/c/") ? pathname : "/");
  };
  const setQuery = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value) next.delete(key);
      else next.set(key, value);
    }
    next.delete("page");
    const qs = next.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
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
      name: itemTitle({ brand: info.product.brand, name: cleanItemName(info.product.name_en), label: info.variant.label }),
      qty: cart[id],
      freeUnits: pl?.freeUnits ?? 0,
      lineTotal: pl?.lineTotal ?? info.variant.price * cart[id],
    }];
  });
  const waHref = catalog?.whatsapp && orderLines.length ? whatsappUrl(catalog.whatsapp, buildOrderMessage(orderLines, total, { lang, hasPriceRange: hasRange })) : null;
  const catName = (c: { name_en: string; name_hi: string }) => (lang === "hi" && c.name_hi ? c.name_hi : c.name_en);

  return (
    <div className="flex min-h-dvh flex-1 flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))]" style={{ background: token.colorBgLayout }}>
      <header style={{ background: BRAND.navy }} className="sticky top-0 z-40 overflow-x-hidden">
        <div className="mx-auto w-full max-w-6xl px-3 pb-3 pt-2">
          <Flex align="center" gap={screens.sm ? 12 : 4}>
            <Button type="text" aria-label="Open menu" icon={<MenuOutlined style={{ color: "#fff", fontSize: 20 }} />} onClick={() => setMenuOpen(true)} style={{ paddingInline: 6 }} />
            <div className="min-w-0 flex-1">
              <Link href="/" aria-label="Pencil Box home" className="inline-block max-w-full rounded-md outline-offset-4">
                <Wordmark size={screens.sm ? 22 : 14} />
              </Link>
            </div>
            <Segmented<Lang> size="small" value={lang} onChange={chooseLang} aria-label={t("language")} options={[{ label: "EN", value: "en" }, { label: "हिं", value: "hi" }]} />
            <ThemeToggle toLight={t("lightMode")} toDark={t("darkMode")} />
            <Badge count={cartCount} color={BRAND.navyDeep} offset={[-2, 4]}>
              <Button type="primary" icon={<ShoppingCartOutlined />} onClick={() => setSheet(true)} aria-label={`${t("cart")}: ${cartCount}`} style={{ paddingInline: screens.sm ? undefined : 8 }} />
            </Badge>
          </Flex>
          <Input size="large" allowClear className="mt-2" prefix={<SearchOutlined />} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t("search")} aria-label={t("search")} />
        </div>
      </header>
      <ShopMenu open={menuOpen} onClose={() => setMenuOpen(false)} cartCount={cartCount} onCart={() => setSheet(true)} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-3">
        {children}
        {home && <div className="order-2"><HomeGrid query={q} /></div>}
        {catalog && (
          <Flex vertical gap={10} className="order-2 mb-4">
            {showBrowse && hasOffers && (
              <Button type={offersOnly ? "primary" : "default"} size="large" icon={<TagsOutlined />} aria-pressed={offersOnly} onClick={() => setOffersOnly((v) => !v)} style={{ alignSelf: "flex-start" }}>
                {t("offersToday")}
              </Button>
            )}
            {showBrowse && subCats.length > 0 && (
              <div className="pb-scroll-x -mx-4 flex items-center gap-2 px-4" role="group" aria-label="Sub categories">
                <Button size="small" type="text" onClick={() => { setTopCat(null); setSubCat(null); if (routeName) router.push("/"); }}>{t("showAll")}</Button>
                <Button size="small" type={!subCat ? "primary" : "default"} onClick={() => setSubCat(null)}>{t("all")}</Button>
                {subCats.map((c) => (
                  <Button key={c.id} size="small" type={subCat === c.id ? "primary" : "default"} onClick={() => setSubCat(c.id)} className="shrink-0">
                    {catName(c)}
                  </Button>
                ))}
              </div>
            )}
            {showBrowse && (
              <Flex gap={8} wrap>
                <Button className="lg:hidden" onClick={() => setFiltersOpen(true)}>Filter</Button>
                <Select
                  value={sort}
                  onChange={(v) => setQuery({ sort: v === "popular" ? null : v })}
                  aria-label="Sort"
                  style={{ width: 180 }}
                  options={SORTS.map((s) => ({ value: s.value, label: s.label }))}
                />
              </Flex>
            )}
          </Flex>
        )}

        <div className="order-2 flex flex-col gap-3">
        {showBrowse && catalog && <PolicyStrip t={t} showBulk={hasOffers} />}
        {showBrowse && showRates && <RatesCard rates={rates} lang={lang} t={t} />}

        {notice && <Alert type="info" showIcon closable title={t(notice)} className="mb-3" onClose={() => setNotice("")} />}

        {showBrowse && categoryRows.map((row) => (
          <section key={row.cat.id} className="mb-5" aria-label={catName(row.cat)}>
            <Flex align="center" justify="space-between" gap={8} className="mb-2" style={{ borderLeft: `4px solid ${row.accent}`, paddingLeft: 10 }}>
              <Typography.Title level={4} style={{ margin: 0 }}>{catName(row.cat)}</Typography.Title>
              {collectionByMatch(row.cat.name_en) ? (
                <Link href={`/c/${collectionByMatch(row.cat.name_en)!.slug}`} style={{ color: token.colorLink, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {t("viewAll")} ({row.total})
                </Link>
              ) : (
                <Button type="link" onClick={() => pickCollection(row.cat.id, null)}>{t("viewAll")} ({row.total})</Button>
              )}
            </Flex>
            <ul className="pb-scroll-x -mx-4 flex items-start gap-3 px-4 pb-2 lg:mx-0 lg:px-0">
              {row.items.map((p) => (
                <li key={p.id} className="w-[172px] shrink-0">
                  <ProductCard p={p} lang={lang} t={t} cart={cart} setQty={setQty} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        {showBrowse && landing && categoryRows.length > 0 && <Typography.Title level={4} className="!mb-3 !mt-2">{t("allItems")}</Typography.Title>}

        {home && !catalog && !error && <LoadingGrid />}
        {showBrowse && !catalog && !error && <LoadingGrid />}
        {error && <Result status="warning" title={t("error")} extra={<Button type="primary" onClick={() => (setError(false), load())}>{t("retry")}</Button>} />}
        {showBrowse && catalog && shown.length === 0 && (
          <Empty description={t("noResults")} image={Empty.PRESENTED_IMAGE_SIMPLE}>
            <Button onClick={clearFilters}>{t("clearFilters")}</Button>
          </Empty>
        )}
        </div>

        {showBrowse && (
          <div className="order-2 lg:flex lg:items-start lg:gap-4">
            <aside className="mb-4 hidden w-56 shrink-0 lg:block">
              <FilterPanel catalog={catalog} subCats={subCats} brandIds={brandIds} minRupee={minRupee} maxRupee={maxRupee} subSlug={subSlug} catName={catName} onQuery={setQuery} onSub={(slug) => setQuery({ sub: slug })} />
            </aside>
            <div className="min-w-0 flex-1">
              <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4">
                {pageItems.map((p, i) => (
                  <li key={p.id}>
                    <ProductCard p={p} lang={lang} t={t} cart={cart} setQty={setQty} priority={safePage === 1 && i < 4} />
                  </li>
                ))}
              </ul>
              {pages > 1 && (
                <nav aria-label="Pages" className="mt-4 flex flex-wrap gap-2">
                  {Array.from({ length: pages }, (_, i) => i + 1).map((n) => (
                    <Link key={n} href={pageHref(pathname, searchParams, n)} aria-current={n === safePage ? "page" : undefined} className="rounded-[8px] border px-3 py-1 text-sm font-bold no-underline" style={{ borderColor: n === safePage ? "#153a7a" : "rgba(12,18,34,0.15)", background: n === safePage ? "#153a7a" : "#fff", color: n === safePage ? "#fff" : "#0c1222" }}>{n}</Link>
                  ))}
                </nav>
              )}
            </div>
          </div>
        )}
        {showBrowse && (
          <Drawer open={filtersOpen} onClose={() => setFiltersOpen(false)} title="Filter" size="min(100%, 360px)">
            {catalog && <FilterPanel catalog={catalog} subCats={subCats} brandIds={brandIds} minRupee={minRupee} maxRupee={maxRupee} subSlug={subSlug} catName={catName} onQuery={(u) => (setQuery(u), setFiltersOpen(false))} onSub={(slug) => (setQuery({ sub: slug }), setFiltersOpen(false))} />}
          </Drawer>
        )}
      </main>

      {showBrowse && (
        <div className="px-4 pb-4 text-center">
          <Button onClick={() => setRequestOpen(true)}>{t("reqCta")}</Button>
        </div>
      )}
      <RequestModal open={requestOpen} onClose={() => setRequestOpen(false)} t={t} />
      <ShopTabBar cartCount={cartCount} onCart={() => setSheet(true)} />

      <CartDrawer
        open={sheet} onClose={() => setSheet(false)} t={t} lang={lang} cartIds={cartIds} cart={cart} variantInfo={variantInfo} priced={priced}
        total={total} hasRange={hasRange} waHref={waHref} setQty={setQty} onClear={() => (setCart({}), setNotice(""), setSheet(false))} wide={!!screens.md}
      />
    </div>
  );
}

/** "Request an item": name, optional note, phone and photo, sent to the shop (no login needed). */
function RequestModal({ open, onClose, t }: { open: boolean; onClose: () => void; t: T }) {
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [phone, setPhone] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);
  const [trap, setTrap] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function send() {
    setState("sending");
    const fd = new FormData();
    fd.set("name", name);
    fd.set("note", note);
    fd.set("phone", phone);
    fd.set("website", trap);
    if (photo) fd.set("photo", photo);
    try {
      const res = await fetch("/api/store/request", { method: "POST", body: fd });
      if (!res.ok) throw new Error("failed");
      setState("done");
      setName("");
      setNote("");
      setPhone("");
      setPhoto(null);
    } catch {
      setState("error");
    }
  }
  const close = () => (setState("idle"), onClose());

  return (
    <Modal open={open} onCancel={close} title={t("reqTitle")} footer={null} destroyOnHidden>
      {state === "done" ? (
        <Result status="success" title={t("reqDone")} extra={<Button type="primary" onClick={close}>{t("close")}</Button>} />
      ) : (
        <Flex vertical gap={12}>
          <Typography.Text type="secondary">{t("reqIntro")}</Typography.Text>
          <label>{t("reqName")}<Input value={name} maxLength={120} onChange={(e) => setName(e.target.value)} /></label>
          <label>{t("reqNote")}<Input.TextArea value={note} maxLength={300} rows={2} onChange={(e) => setNote(e.target.value)} /></label>
          <label>{t("reqPhone")}<Input value={phone} maxLength={15} inputMode="tel" onChange={(e) => setPhone(e.target.value)} /></label>
          <label>{t("reqPhoto")}<input type="file" accept="image/jpeg,image/png,image/webp" className="mt-1 block w-full text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} /></label>
          {/* hidden trap field for bots */}
          <input aria-hidden tabIndex={-1} autoComplete="off" value={trap} onChange={(e) => setTrap(e.target.value)} style={{ position: "absolute", left: -9999, height: 0, width: 0, opacity: 0 }} />
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>{t("reqPrivacy")}</Typography.Text>
          {state === "error" && <Alert type="error" showIcon title={t("reqFail")} />}
          <Button type="primary" size="large" loading={state === "sending"} disabled={name.trim().length < 2} onClick={send}>{t("reqSend")}</Button>
        </Flex>
      )}
    </Modal>
  );
}

/** Shop rules, shown before anyone orders: fixed prices, no return on toys and electronics, bulk prices when offers exist. */
function PolicyStrip({ t, showBulk }: { t: T; showBulk: boolean }) {
  const { token } = theme.useToken();
  const rows = [
    { icon: <SafetyCertificateOutlined />, text: t("policyFixed"), color: token.colorSuccess },
    { icon: <StopOutlined />, text: t("policyNoReturn"), color: token.colorError },
    ...(showBulk ? [{ icon: <TagsOutlined />, text: t("policyBulk"), color: token.colorPrimaryText }] : []),
  ];
  return (
    <ul className="mb-4 flex flex-col gap-1 rounded-[12px] px-3 py-2" style={{ background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` }} aria-label="Shop rules">
      {rows.map((r) => (
        <li key={r.text} className="flex items-start gap-2" style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35 }}>
          <span style={{ color: r.color, marginTop: 2 }} aria-hidden>{r.icon}</span>
          <span>{r.text}</span>
        </li>
      ))}
    </ul>
  );
}


/** Photocopy and printout prices per page, taken live from the Services items. */
function RatesCard({ rates, lang, t }: { rates: StoreProduct[]; lang: Lang; t: T }) {
  const { token } = theme.useToken();
  const rows = rates
    .map((p) => ({ id: p.id, name: lang === "hi" && p.name_hi ? p.name_hi : p.name_en, price: p.variants[0].price }))
    .sort((a, b) => a.price - b.price);
  return (
    <section className="mb-4 rounded-[12px] p-3" style={{ background: BRAND.navy, color: "#fff" }} aria-label={t("ratesTitle")}>
      <div className="mb-2 flex items-center gap-2" style={{ fontWeight: 800, fontSize: 16 }}>
        <PrinterOutlined aria-hidden /> {t("ratesTitle")}
      </div>
      <ul className="grid gap-2 sm:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 rounded-[10px] px-3 py-2" style={{ background: token.colorBgContainer, color: token.colorText }}>
            <span style={{ fontWeight: 600, lineHeight: 1.25 }}>{r.name}</span>
            <span className="text-right" style={{ fontWeight: 800, fontSize: 20, lineHeight: 1 }}>
              {inr(r.price)}
              <span style={{ display: "block", fontSize: 11, fontWeight: 500, color: token.colorTextSecondary }}>{t("perPage")}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
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

function Stepper({ qty, max, onChange, label, t, block }: { qty: number; max: number; onChange: (n: number) => void; label: string; t: T; block?: boolean }) {
  const { token } = theme.useToken();
  return (
    <Space.Compact block={block}>
      <Button type={block ? "primary" : "default"} icon={<MinusOutlined />} onClick={() => onChange(qty - 1)} aria-label={`${t("remove")}: ${label}`} />
      <Button disabled style={{ width: block ? undefined : 44, flex: block ? 1 : undefined, color: token.colorText, background: token.colorBgContainer, cursor: "default", fontWeight: 700 }} aria-live="polite">{qty}</Button>
      <Button type={block ? "primary" : "default"} icon={<PlusOutlined />} disabled={qty >= max} title={qty >= max ? t("maxReached") : undefined} onClick={() => onChange(qty + 1)} aria-label={`${t("add")}: ${label}`} />
    </Space.Compact>
  );
}

/**
 * A compact card: picture, name, price and ONE button. An item with a single choice is added straight from the card;
 * an item with several (colours, sizes, languages) shows "N options" and opens the choices only when tapped.
 */
function ProductCard({ p, lang, t, cart, setQty, priority = false }: { p: StoreProduct; lang: Lang; t: T; cart: Cart; setQty: (id: string, qty: number) => void; priority?: boolean }) {
  const { token } = theme.useToken();
  const [open, setOpen] = useState(false);
  const name = lang === "hi" && p.name_hi ? p.name_hi : stripBrand(p.name_en, p.brand);
  const single = p.variants.length === 1 ? p.variants[0] : null;
  const inCart = p.variants.reduce((s, v) => s + (cart[v.id] ?? 0), 0);
  const prices = p.variants.map((v) => v.price);
  const lowest = Math.min(...prices);
  const samePrice = Math.max(...prices) === lowest;
  const offers = single ? single.offers : [];
  return (
    <Card hoverable={false} styles={{ body: { padding: 0 } }} className="h-full overflow-hidden [&>.ant-card-body]:h-full">
      <div className="flex h-full flex-col">
        {/* picture frame: square, the whole picture visible; empty until a picture exists */}
        <div className="relative aspect-square w-full overflow-hidden bg-white">
          {p.image ? (
            <ShopImage src={p.image} alt={productAlt(p)} priority={priority} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center"><PictureOutlined style={{ fontSize: 30, color: token.colorTextQuaternary }} aria-hidden /></div>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-1 p-3 pt-2">
          {!!p.brand && <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>{p.brand}</Typography.Text>}
          {p.slug ? <Link href={`/p/${p.slug}`} className="line-clamp-2 no-underline" style={{ fontWeight: 800, lineHeight: 1.25, minHeight: "2.5em", color: "inherit" }}>{name}</Link> : <div className="line-clamp-2" style={{ fontWeight: 800, lineHeight: 1.25, minHeight: "2.5em" }}>{name}</div>}
          {single?.label && <Typography.Text type="secondary" style={{ fontSize: 12, lineHeight: 1.2 }}>{single.label}</Typography.Text>}
          <div className="mt-auto flex flex-wrap items-center gap-x-2 gap-y-1 pt-1">
            <span className="flex flex-wrap items-baseline gap-1" style={{ fontWeight: 800, fontSize: 17 }}>
              {single && discountPercent(single.price, single.mrp) > 0 && <span className="text-xs font-semibold line-through" style={{ color: token.colorTextSecondary }}>{inr(single.mrp)}</span>}
              {single ? priceText(single) : `${samePrice ? "" : `${t("fromPrice")} `}${inr(lowest)}`}
              {single && discountPercent(single.price, single.mrp) > 0 && <span className="rounded bg-[#147a3f] px-1.5 py-0.5 text-[10px] font-bold text-white">{discountPercent(single.price, single.mrp)}% OFF</span>}
            </span>
            {single?.low && <Tag color="warning" variant="filled" style={{ marginInlineEnd: 0 }}>{t("fewLeft")}</Tag>}
          </div>
          {offers.map((o) => (
            <Tag key={o.label_en} color="success" variant="solid" style={{ whiteSpace: "normal", marginInlineEnd: 0 }}>{lang === "hi" && o.label_hi ? o.label_hi : o.label_en}</Tag>
          ))}
          {single ? (
            (cart[single.id] ?? 0) === 0 ? (
              <Button type="primary" block onClick={() => setQty(single.id, 1)} aria-label={`${t("add")}: ${name}`}>{t("add")}</Button>
            ) : (
              <Stepper block qty={cart[single.id]} max={single.maxQty} onChange={(n) => setQty(single.id, n)} label={name} t={t} />
            )
          ) : (
            <Button type={inCart ? "primary" : "default"} block icon={<DownOutlined />} iconPlacement="end" onClick={() => setOpen(true)} aria-label={`${name}: ${p.variants.length} ${t("options")}`}>
              {inCart ? `${inCart} ${t("added")}` : `${p.variants.length} ${t("options")}`}
            </Button>
          )}
        </div>
      </div>
      {!single && (
        <Modal open={open} onCancel={() => setOpen(false)} title={name} destroyOnHidden centered
          footer={<Button type="primary" block size="large" onClick={() => setOpen(false)}>{t("done")}{inCart ? ` (${inCart})` : ""}</Button>}>
          <ul>
            {p.variants.map((v) => {
              const qty = cart[v.id] ?? 0;
              return (
                <li key={v.id} className="py-2" style={{ borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                  <Flex align="center" gap={8}>
                    <div className="min-w-0 flex-1">
                      <div style={{ fontWeight: 600, lineHeight: 1.25 }}>{v.label || name}</div>
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
        </Modal>
      )}
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
            <Typography.Text style={{ fontSize: 12, textAlign: "center", fontWeight: 600 }}>{t("policyFixed")} {t("policyNoReturn")}</Typography.Text>
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
            const nm = lang === "hi" && p.name_hi ? p.name_hi : cleanItemName(p.name_en);
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
