import { builtinShopCategories } from "./shop-category-data";
import { COLLECTIONS } from "./shop";
import { connectDb } from "./db";
import { Product, ShopCategory } from "./models";

/**
 * Slug of the card a folded product now lives on.
 * The merge leaves the old row in the database and writes "Merged into <id> (<slug>)".
 */
export async function retiredProductSlug(slug: string): Promise<string | null> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await connectDb();
  const row = await Product.findOne({ slug, active: false }, "internalNote").lean();
  const note = row?.internalNote ?? "";
  const match = /Merged into [a-f0-9]{24} \(([^)]+)\)/i.exec(note);
  const next = match?.[1]?.trim();
  if (!next || next === slug) return null;
  const live = await Product.findOne({ slug: next, active: { $ne: false } }, "_id").lean();
  return live ? next : null;
}

/** True when this slug is a live product. Missing database means do not block the page. */
export async function activeProductExists(slug: string): Promise<boolean | null> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await connectDb();
  const row = await Product.findOne({ slug, active: { $ne: false } }, "_id").lean();
  return !!row;
}

/** True when /c/<slug> is a shelf the shop knows. */
export async function shelfExists(slug: string): Promise<boolean | null> {
  if (COLLECTIONS.some((c) => c.slug === slug)) return true;
  if (builtinShopCategories().some((row) => row.slug === slug && !row.hidden)) return true;
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await connectDb();
  const row = await ShopCategory.findOne({ slug, hidden: { $ne: true } }, "_id").lean();
  return !!row;
}
