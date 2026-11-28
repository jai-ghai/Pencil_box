import { cacheLife, cacheTag, revalidatePath, revalidateTag } from "next/cache";
import { connectDb } from "./db";
import { EMPTY_PREFS, normalisePrefs } from "./departments";
import { Category, Product, ShopCategory } from "./models";
import { getSetting } from "./settings";
import { builtinShopCategories, type ShopCategoryRow } from "./shop-category-data";

const TAG = "shop-categories";

export interface StoredShopCategory extends ShopCategoryRow {
  catalogCategoryId: string;
  products: number;
}

function plain(doc: {
  slug: string;
  label: string;
  groupLabel?: string;
  groupOrder?: number;
  nav?: string;
  parent?: string;
  home?: boolean;
  subtitle?: string;
  about?: string;
  faqs?: { q?: string; a?: string }[];
  sortOrder?: number;
  listOrder?: number;
  hidden?: boolean;
  image?: string;
  match?: string;
  title?: string;
  h1?: string;
  description?: string;
  lede?: string;
  listing?: boolean;
  catalogCategoryId?: unknown;
}): ShopCategoryRow & { catalogCategoryId: string } {
  return {
    slug: doc.slug,
    label: doc.label,
    groupLabel: doc.groupLabel || "",
    groupOrder: doc.groupOrder ?? -1,
    nav: doc.nav || doc.label,
    parent: doc.parent || "",
    home: Boolean(doc.home),
    subtitle: doc.subtitle || "",
    about: doc.about || "",
    faqs: (doc.faqs ?? []).filter((faq) => faq.q && faq.a).map((faq) => ({ q: faq.q!, a: faq.a! })),
    sortOrder: doc.sortOrder ?? 0,
    listOrder: doc.listOrder ?? -1,
    hidden: Boolean(doc.hidden),
    image: doc.image || "",
    match: doc.match || "",
    title: doc.title || "",
    h1: doc.h1 || "",
    description: doc.description || "",
    lede: doc.lede || "",
    listing: Boolean(doc.listing),
    catalogCategoryId: doc.catalogCategoryId ? String(doc.catalogCategoryId) : "",
  };
}

async function linkCatalogue(row: ShopCategoryRow, parentId: string | null): Promise<string> {
  const existing = row.match
    ? await Category.findOne({ name_en: row.match })
    : await Category.findOne({ slug: row.slug });
  if (existing) return String(existing._id);
  const bySlug = await Category.findOne({ slug: row.slug });
  if (bySlug) return String(bySlug._id);
  const created = await Category.create({ name_en: row.label, slug: row.slug, parentId });
  return String(created._id);
}

/** Insert the current shelves once. Later edits stay in the database. */
export async function seedShopCategories(): Promise<void> {
  if (await ShopCategory.countDocuments()) return;
  const prefs = normalisePrefs(await getSetting("departments.prefs", EMPTY_PREFS));
  const rank = new Map(prefs.order.map((slug, index) => [slug, index]));
  const rows = builtinShopCategories().map((row) => ({
    ...row,
    hidden: prefs.hidden.includes(row.slug),
    image: prefs.images[row.slug] || "",
    sortOrder: rank.get(row.slug) ?? row.sortOrder,
  }));
  const ids = new Map<string, string>();
  for (const row of rows.filter((item) => !item.parent).concat(rows.filter((item) => item.parent))) {
    const id = await linkCatalogue(row, row.parent ? ids.get(row.parent) ?? null : null);
    ids.set(row.slug, id);
  }
  await ShopCategory.insertMany(rows.map((row) => ({ ...row, catalogCategoryId: ids.get(row.slug) || null })));
}

async function readRows(): Promise<ShopCategoryRow[]> {
  await connectDb();
  await seedShopCategories();
  const docs = await ShopCategory.find().sort({ sortOrder: 1, label: 1 }).lean();
  if (!docs.length) return builtinShopCategories();
  return docs.map((doc) => plain(doc));
}

async function cachedRows(): Promise<ShopCategoryRow[]> {
  "use cache";
  cacheTag(TAG);
  cacheLife("minutes");
  if (!process.env.MONGODB_URI) return builtinShopCategories();
  try {
    return await readRows();
  } catch {
    return builtinShopCategories();
  }
}

/**
 * Shelves for the public shop. A production build does not open the database,
 * and falls back to the same lists the site used before they were stored.
 */
export async function shopCategories(): Promise<ShopCategoryRow[]> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return builtinShopCategories();
  return cachedRows();
}

export async function shopCategoryBySlug(slug: string): Promise<ShopCategoryRow | undefined> {
  return (await shopCategories()).find((row) => row.slug === slug);
}

export async function adminShopCategories(): Promise<StoredShopCategory[]> {
  await connectDb();
  await seedShopCategories();
  const docs = await ShopCategory.find().sort({ sortOrder: 1, label: 1 }).lean();
  const counts = new Map(
    (await Product.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$categoryId", n: { $sum: 1 } } }])).map((row) => [String(row._id), row.n]),
  );
  return docs.map((doc) => {
    const row = plain(doc);
    return { ...row, products: row.catalogCategoryId ? counts.get(row.catalogCategoryId) ?? 0 : 0 };
  });
}

export function refreshShopCategories(): void {
  revalidateTag(TAG, { expire: 0 });
  revalidatePath("/", "layout");
}
