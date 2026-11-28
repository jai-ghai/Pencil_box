/** Words shoppers type that should find the shelf we actually call it. */
const ALIASES: Record<string, string[]> = {
  copy: ["notebook", "register"],
  copies: ["notebook", "register"],
  notebook: ["copy", "register"],
  chart: ["chart paper", "art"],
  rubber: ["eraser"],
  eraser: ["rubber"],
  scale: ["ruler"],
  ruler: ["scale"],
  kalam: ["pen"],
  pen: ["pens"],
  glue: ["fevicol", "tape"],
  fevicol: ["glue"],
  colour: ["color", "crayon"],
  color: ["colour"],
};

export interface SuggestHit {
  kind: "category" | "product";
  label: string;
  href: string;
  image: string;
  price?: string;
  detail?: string;
}

export interface SuggestSource {
  categories: { label: string; href: string; image: string }[];
  products: { name: string; href: string; image: string; price: string; brand?: string }[];
}

function tokens(query: string): string[] {
  const raw = query.toLowerCase().replace(/[^a-z0-9\u0900-\u097f\s]/g, " ").split(/\s+/).filter((word) => word.length > 1);
  const extra = raw.flatMap((word) => ALIASES[word] ?? []);
  return [...new Set([...raw, ...extra])];
}

function distance(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 1) return 3;
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i - 1;
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const next = Math.min(row[j] + 1, row[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
      prev = row[j];
      row[j] = next;
    }
  }
  return row[b.length];
}

function score(hay: string, queryTokens: string[]): number {
  const text = hay.toLowerCase();
  const words = text.split(/[^a-z0-9\u0900-\u097f]+/).filter(Boolean);
  let total = 0;
  for (const token of queryTokens) {
    if (text.includes(token)) total += token.length > 3 ? 6 : 4;
    else if (token.length >= 4 && words.some((word) => distance(word.replace(/s$/, ""), token) <= 1)) total += 3;
  }
  return total;
}

export function suggest(query: string, source: SuggestSource, limit = 8): SuggestHit[] {
  const queryTokens = tokens(query.trim());
  if (!queryTokens.length) return [];
  const categories = source.categories
    .map((item) => ({ item, score: score(item.label, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map((row) => ({ kind: "category" as const, label: row.item.label, href: row.item.href, image: row.item.image }));
  const products = source.products
    .map((item) => ({ item, score: score(`${item.brand ?? ""} ${item.name}`, queryTokens) }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map((row) => ({
      kind: "product" as const,
      label: row.item.name,
      href: row.item.href,
      image: row.item.image,
      price: row.item.price,
      detail: row.item.brand,
    }));
  return [...categories, ...products].slice(0, limit);
}
