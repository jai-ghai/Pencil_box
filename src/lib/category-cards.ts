import { collectionByMatch } from "./shop";

/** Generic shop departments. The label is never a brand name. */
export interface CardSpec {
  key: string;
  label: string;
  /** Prefer a subcategory whose name matches this. */
  sub: RegExp;
  /** If no subcategory matches, a top-level category matching this can stand in. */
  parent?: RegExp;
  skip?: RegExp;
}

export const CARD_SPECS: CardSpec[] = [
  { key: "pencil", label: "PENCIL", sub: /\bpencil/i, skip: /box|colour|color/i },
  { key: "pen", label: "PEN", sub: /\bpens?\b/i, skip: /pencil/i },
  { key: "notebook", label: "NOTEBOOK", sub: /notebook/i },
  { key: "eraser", label: "ERASER", sub: /eraser|rubber/i },
  { key: "sharpener", label: "SHARPENER", sub: /sharp/i },
  { key: "colours", label: "COLOURS", sub: /colour|color/i },
  { key: "geometry", label: "GEOMETRY BOX", sub: /geometry/i },
  { key: "pencil-box", label: "PENCIL BOX", sub: /pencil box/i },
  { key: "diary", label: "DIARY", sub: /diary|register/i, skip: /notebook/i },
  { key: "art", label: "ART & CRAFT", sub: /craft/i, parent: /art/i },
  { key: "gifts", label: "GIFTS", sub: /gift/i, parent: /gift/i },
  { key: "toys", label: "SOFT TOYS", sub: /toy|plush/i },
  { key: "printing", label: "PRINTING", sub: /photocopy|xerox/i, parent: /print|photocopy/i },
];

export interface CardCategory {
  id: string;
  name_en: string;
  name_hi: string;
  parentId: string | null;
  slug: string;
  image?: string;
}

export interface ShopCard {
  key: string;
  label: string;
  href: string;
  image: string;
  /** true when the picture is an owner upload rather than the built-in drawing */
  uploaded: boolean;
}

function matches(spec: CardSpec, name: string, asParent: boolean): boolean {
  if (spec.skip?.test(name)) return false;
  return asParent ? !!spec.parent?.test(name) : spec.sub.test(name);
}

export function categoryHref(cat: CardCategory, categories: CardCategory[]): string {
  const parent = cat.parentId ? categories.find((c) => c.id === cat.parentId) : null;
  const top = parent ?? cat;
  const collection = collectionByMatch(top.name_en);
  if (!collection) return "/";
  if (!parent || !cat.slug) return `/c/${collection.slug}`;
  return `/c/${collection.slug}?sub=${encodeURIComponent(cat.slug)}`;
}

/** One card per generic department that this catalogue actually sells. */
export function shopCards(categories: CardCategory[], counts: Map<string, number>): ShopCard[] {
  const out: ShopCard[] = [];
  for (const spec of CARD_SPECS) {
    const subs = categories
      .filter((c) => c.parentId && matches(spec, c.name_en, false) && (counts.get(c.id) ?? 0) > 0)
      .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0));
    const parents = categories.filter((c) => !c.parentId && matches(spec, c.name_en, true));
    const cat = subs[0] ?? parents[0];
    if (!cat) continue;
    const uploaded = !!cat.image;
    out.push({
      key: spec.key,
      label: spec.label,
      href: categoryHref(cat, categories),
      image: uploaded ? cat.image! : `/category/${spec.key}.svg`,
      uploaded,
    });
  }
  return out;
}
