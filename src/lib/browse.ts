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

/** "Akash Notebook" with brand Akash → "Notebook". The price on the card comes from the variant. */
export function genericItemName(name: string, brand?: string): string {
  let n = cleanItemName(name);
  const b = (brand || "").trim();
  if (b && n.toLowerCase().startsWith(b.toLowerCase())) n = n.slice(b.length).replace(/^[\s+\-–:]+/, "").trim();
  return n || cleanItemName(name) || name;
}

function solePrice(p: StoreProduct): number | null {
  const prices = new Set(p.variants.map((v) => v.price));
  return prices.size === 1 ? [...prices][0] : null;
}

function normImage(url: string): string {
  return url.replace(/\/upload\/[^/]+\//, "/upload/").split("?")[0];
}

/**
 * One card per category and price. Brand is not part of the title.
 * A product whose options have different prices stays on its own.
 * Rows in the database are not removed here.
 */
export function groupSameProducts(products: StoreProduct[]): StoreProduct[] {
  const freq = new Map<string, number>();
  for (const p of products) {
    for (const url of [p.image, ...p.images]) {
      if (!url) continue;
      const key = normImage(url);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }
  const sorted = [...products].sort(byId);
  const groups = new Map<string, StoreProduct[]>();
  const order: string[] = [];
  for (const p of sorted) {
    const price = solePrice(p);
    const key = price === null ? `own:${p.id}` : `${p.categoryId}|${price}`;
    const list = groups.get(key);
    if (!list) {
      groups.set(key, [p]);
      order.push(key);
    } else list.push(p);
  }
  return order.map((key) => {
    const members = groups.get(key)!;
    if (members.length === 1 && solePrice(members[0]) === null) {
      const only = members[0];
      return { ...only, name_en: genericItemName(only.name_en, only.brand), variants: only.variants.map((v) => ({ ...v })) };
    }
    const names = new Map<string, number>();
    for (const p of members) {
      const name = genericItemName(p.name_en, p.brand);
      names.set(name, (names.get(name) ?? 0) + 1);
    }
    const title = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
    let image = "";
    let best = 0;
    for (const p of members) {
      for (const url of [p.image, ...p.images]) {
        if (!url) continue;
        const n = freq.get(normImage(url)) ?? 1;
        if (n >= 8) continue;
        const score = 1000 / n + (p.imageGeneric ? 0 : 2);
        if (score > best) {
          best = score;
          image = url;
        }
      }
    }
    const keeper = [...members].sort((a, b) => b.variants.length - a.variants.length || a.id.localeCompare(b.id))[0];
    const seen = new Set<string>();
    const variants = [];
    for (const p of members) {
      for (const v of p.variants) {
        const labelKey = `${v.label.trim().toLowerCase()}|${v.price}`;
        if (seen.has(labelKey)) continue;
        seen.add(labelKey);
        variants.push({ ...v });
      }
    }
    return {
      ...keeper,
      name_en: title,
      brand: "",
      image,
      images: image ? [image] : [],
      variants,
      createdAt: Math.max(...members.map((p) => p.createdAt)),
    };
  });
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
