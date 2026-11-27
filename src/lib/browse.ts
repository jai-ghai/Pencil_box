import type { StoreProduct } from "./store";

export type SortKey = "popular" | "price-asc" | "price-desc" | "new";
export const SORTS: { value: SortKey; label: string }[] = [
  { value: "popular", label: "Popular" },
  { value: "price-asc", label: "Price: low to high" },
  { value: "price-desc", label: "Price: high to low" },
  { value: "new", label: "New" },
];
export const PAGE_SIZE = 24;

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
}

export function lowestPrice(p: StoreProduct): number {
  return Math.min(...p.variants.map((v) => v.price));
}

const byId = (a: StoreProduct, b: StoreProduct) => a.id.localeCompare(b.id);

export function sortProducts(products: StoreProduct[], sort: SortKey): StoreProduct[] {
  const list = [...products];
  if (sort === "price-asc") list.sort((a, b) => lowestPrice(a) - lowestPrice(b) || a.name_en.localeCompare(b.name_en) || byId(a, b));
  else if (sort === "price-desc") list.sort((a, b) => lowestPrice(b) - lowestPrice(a) || a.name_en.localeCompare(b.name_en) || byId(a, b));
  else if (sort === "new") list.sort((a, b) => b.createdAt - a.createdAt || a.name_en.localeCompare(b.name_en) || byId(a, b));
  else list.sort((a, b) => Number(b.variants.some((v) => v.offers.length)) - Number(a.variants.some((v) => v.offers.length)) || a.name_en.localeCompare(b.name_en) || byId(a, b));
  return list;
}

/** "Akash Notebook ₹20" → "Akash Notebook". The stored name is left as the owner saved it. */
export function cleanItemName(name: string): string {
  return name.replace(/\s*(?:₹|Rs\.?)\s*\d+(?:[.,]\d+)?\s*$/i, "").replace(/\s{2,}/g, " ").trim();
}

function listingKey(p: StoreProduct): string {
  return `${(p.brand || "").trim().toLowerCase()}|${cleanItemName(p.name_en).toLowerCase()}|${(p.image || "").trim()}`;
}

/**
 * One card when separate catalogue rows are the same product (same brand, same name once a
 * trailing price is removed, same photo). Variants are combined. Rows are not deleted.
 */
export function groupSameProducts(products: StoreProduct[]): StoreProduct[] {
  const sorted = [...products].sort(byId);
  const groups = new Map<string, StoreProduct>();
  const order: string[] = [];
  for (const p of sorted) {
    const key = listingKey(p);
    const name = cleanItemName(p.name_en) || p.name_en;
    const hit = groups.get(key);
    if (!hit) {
      groups.set(key, { ...p, name_en: name, variants: p.variants.map((v) => ({ ...v })) });
      order.push(key);
      continue;
    }
    const ids = new Set(hit.variants.map((v) => v.id));
    for (const v of p.variants) {
      if (!ids.has(v.id)) hit.variants.push({ ...v });
    }
    if (p.createdAt > hit.createdAt) hit.createdAt = p.createdAt;
  }
  for (const g of groups.values()) {
    if (g.variants.length < 2) continue;
    const counts = new Map<string, number>();
    for (const v of g.variants) counts.set(v.label, (counts.get(v.label) ?? 0) + 1);
    g.variants = g.variants.map((v) => {
      const base = v.label || formatInr(v.price);
      const shared = (counts.get(v.label) ?? 0) > 1 || !v.label;
      const label = shared && !base.includes("₹") ? `${base} · ${formatInr(v.price)}` : base;
      return { ...v, label };
    });
  }
  return order.map((key) => groups.get(key)!);
}

export function pageCount(total: number, size = PAGE_SIZE): number {
  return Math.max(1, Math.ceil(total / size));
}

export function pageSlice<T>(items: T[], page: number, size = PAGE_SIZE): T[] {
  const start = (Math.max(1, page) - 1) * size;
  return items.slice(start, start + size);
}

/** Rupees off, only when an MRP above the selling price is saved. */
export function discountPercent(price: number, mrp: number): number {
  if (!mrp || mrp <= price) return 0;
  return Math.round((1 - price / mrp) * 100);
}
