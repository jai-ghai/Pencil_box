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

export function sortProducts(products: StoreProduct[], sort: SortKey): StoreProduct[] {
  const list = [...products];
  if (sort === "price-asc") list.sort((a, b) => lowestPrice(a) - lowestPrice(b) || a.name_en.localeCompare(b.name_en));
  else if (sort === "price-desc") list.sort((a, b) => lowestPrice(b) - lowestPrice(a) || a.name_en.localeCompare(b.name_en));
  else if (sort === "new") list.sort((a, b) => b.createdAt - a.createdAt || a.name_en.localeCompare(b.name_en));
  else list.sort((a, b) => Number(b.variants.some((v) => v.offers.length)) - Number(a.variants.some((v) => v.offers.length)) || a.name_en.localeCompare(b.name_en));
  return list;
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
