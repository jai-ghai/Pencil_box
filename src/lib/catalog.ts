import { z } from "zod";
import { Brand, Category, Product, Variant } from "./models";
import { buildSearchText } from "./search";
import { adjustStock } from "./stock";
import { deleteProductImage } from "./storage";

export class CatalogError extends Error {}

/** "Ball Pens" -> BP, "Pencils" -> PEN, "Covers & Name Slips" -> CNS. Used for item codes like BP-02. */
export function codePrefix(categoryName: string): string {
  const words = categoryName.replace(/&/g, " ").split(/\s+/).filter(Boolean);
  const p = words.length === 1 ? words[0].slice(0, 3) : words.map((w) => w[0]).join("").slice(0, 3);
  return p.toUpperCase().replace(/[^A-Z]/g, "") || "PB";
}

/** Next free code for a prefix: bp-01, bp-02 ... (stored lower-case, shown upper-case). */
export async function nextShortCode(prefix: string): Promise<string> {
  const p = prefix.toLowerCase();
  const rx = new RegExp(`^${p}-([0-9]+)$`);
  const rows = await Variant.find({ shortCode: rx }, { shortCode: 1 }).lean();
  let max = 0;
  for (const r of rows) max = Math.max(max, parseInt(rx.exec(r.shortCode ?? "")?.[1] ?? "0", 10));
  return `${p}-${String(max + 1).padStart(2, "0")}`;
}

export const slugify = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "item";

/** First free slug. `used` is every slug already taken. */
export function uniqueSlug(name: string, used: Set<string>): string {
  const base = slugify(name);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

/** Give every product a stable public slug, once. Safe to call often. */
export async function ensureProductSlugs(): Promise<void> {
  const rows = await Product.find({}, "name_en slug").lean();
  const used = new Set(rows.map((r) => r.slug).filter((s): s is string => !!s));
  for (const row of rows) {
    if (row.slug) continue;
    const slug = uniqueSlug(row.name_en, used);
    used.add(slug);
    await Product.updateOne({ _id: row._id, slug: { $in: [null, ""] } }, { $set: { slug } });
    await Product.updateOne({ _id: row._id, slug: { $exists: false } }, { $set: { slug } });
  }
}

/** Prices come from the UI in rupees (may have paise); store integer paise. */
export const toPaise = (rupees: number) => Math.round(rupees * 100);

export const variantInput = z.object({
  _id: z.string().length(24).optional(),
  label: z.string().max(80).default(""),
  shortCode: z.string().max(20).optional(),
  aliases: z.array(z.string().max(40)).max(15).default([]),
  sellPrice: z.number().min(0).max(10_000_000), // rupees
  costPrice: z.number().min(0).max(10_000_000).default(0), // rupees
  maxPrice: z.number().min(0).max(10_000_000).optional(), // rupees, optional higher price
  mrp: z.number().min(0).max(10_000_000).optional(), // rupees, printed MRP; omit when you do not have one
  baseUnit: z.string().max(20).default("piece"),
  packSize: z.number().int().min(1).max(100000).default(1),
  reorderLevel: z.number().int().min(0).default(0),
  quickTap: z.boolean().default(false),
  trackStock: z.boolean().default(true),
  active: z.boolean().default(true),
  /** only used when creating a new variant: stock already on the shelf, in base units */
  openingStock: z.number().int().min(0).max(1_000_000).optional(),
  bundleItems: z.array(z.object({ variantId: z.string().length(24), qty: z.number().int().min(1) })).optional(),
});

export const productInput = z.object({
  name_en: z.string().min(1).max(120),
  name_hi: z.string().max(120).optional(),
  brandId: z.string().length(24).optional().or(z.literal("")),
  categoryId: z.string().length(24),
  description_en: z.string().max(2000).optional(),
  description_hi: z.string().max(2000).optional(),
  internalNote: z.string().max(500).optional(),
  imageGeneric: z.boolean().optional(),
  supplierId: z.string().length(24).optional().or(z.literal("")),
  images: z
    .array(z.string().max(300).refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "Bad image URL"))
    .max(8)
    .default([]),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  tags: z.array(z.string().max(40)).max(20).default([]),
  active: z.boolean().default(true),
  /** set after the owner confirms a same-category, same-price warning */
  acknowledgeSamePrice: z.boolean().optional(),
  variants: z.array(variantInput).min(1).max(30),
});
export type ProductInput = z.infer<typeof productInput>;

/** Recompute the POS search string for every variant of a product. */
export async function syncSearchText(productId: string): Promise<void> {
  const product = await Product.findById(productId).lean();
  if (!product) return;
  const brand = product.brandId ? await Brand.findById(product.brandId).lean() : null;
  const cat = await Category.findById(product.categoryId).lean();
  const variants = await Variant.find({ productId });
  for (const v of variants) {
    v.searchText = buildSearchText([product.name_en, product.name_hi, brand?.name, cat?.name_en, v.label, v.aliases, v.shortCode, product.tags]);
    await v.save();
  }
}

/** Delete pictures nobody uses any more, from the server / Cloudinary. A picture still on another product is kept (stand-ins are shared). */
export async function removeUnusedImages(urls: string[]): Promise<number> {
  let removed = 0;
  for (const url of new Set(urls)) {
    if (await Product.exists({ images: url })) continue;
    if (await deleteProductImage(url)) removed++;
  }
  return removed;
}

/** Another active product in this category already sells at one of these prices (paise). */
export async function samePriceClash(categoryId: string, pricesPaise: number[], exceptProductId?: string): Promise<string | null> {
  const prices = [...new Set(pricesPaise)];
  if (!prices.length) return null;
  const hits = await Variant.find({ sellPrice: { $in: prices }, active: { $ne: false } }, "productId sellPrice").lean();
  const ids = [...new Set(hits.map((hit) => String(hit.productId)))].filter((id) => id !== exceptProductId);
  if (!ids.length) return null;
  const products = await Product.find({ _id: { $in: ids }, categoryId, active: { $ne: false } }, "name_en").lean();
  if (!products.length) return null;
  const used = new Set(products.map((p) => String(p._id)));
  const clashing = [...new Set(hits.filter((hit) => used.has(String(hit.productId))).map((hit) => hit.sellPrice))];
  const list = clashing.map((paise) => `₹${paise / 100}`).join(", ");
  return `Same price: this category already has an item at ${list}. Customers see that as one product.`;
}

export async function saveProduct(input: ProductInput, productId?: string) {
  const { variants, brandId, supplierId, imageGeneric, acknowledgeSamePrice, ...fields } = input;
  if (!acknowledgeSamePrice) {
    const warning = await samePriceClash(input.categoryId, variants.map((v) => toPaise(v.sellPrice)), productId);
    if (warning) throw new CatalogError(warning);
  }
  const before: string[] = productId ? ((await Product.findById(productId, { images: 1 }).lean())?.images ?? []) : [];
  const doc = { ...fields, ...(imageGeneric !== undefined ? { imageGeneric } : {}), brandId: brandId || undefined, supplierId: supplierId || undefined };
  const product = productId ? await Product.findByIdAndUpdate(productId, doc, { returnDocument: "after" }) : await Product.create(doc);
  if (!product) throw new Error("Product not found");
  if (!product.slug) {
    const taken = new Set((await Product.find({ slug: { $nin: [null, ""] } }, "slug").lean()).map((r) => r.slug).filter((s): s is string => !!s));
    product.slug = uniqueSlug(product.name_en, taken);
    await product.save();
  }
  await removeUnusedImages(before.filter((u) => !product.images.includes(u)));

  const cat = await Category.findById(product.categoryId).lean();
  const prefix = codePrefix(cat?.name_en ?? "");
  for (const v of variants) {
    const { _id, sellPrice, costPrice, maxPrice, mrp, openingStock, ...rest } = v;
    if (maxPrice !== undefined && maxPrice !== 0 && maxPrice < sellPrice) throw new CatalogError("The higher price must be at least the normal price");
    const data: Record<string, unknown> = { ...rest, productId: product._id, sellPrice: toPaise(sellPrice), costPrice: toPaise(costPrice), maxPrice: maxPrice ? toPaise(maxPrice) : undefined, mrp: mrp && mrp > 0 ? toPaise(mrp) : undefined };
    const code = rest.shortCode?.trim().toLowerCase();
    if (code && (await Variant.findOne({ shortCode: code, ...(_id ? { _id: { $ne: _id } } : {}) }))) throw new CatalogError(`Item code "${code.toUpperCase()}" is already used by another item`);
    if (_id) {
      if (!code) delete data.shortCode; // keep the existing code when the form leaves it blank
      await Variant.findOneAndUpdate({ _id, productId: product._id }, data);
    } else {
      data.shortCode = code || (await nextShortCode(prefix));
      const created = await Variant.create(data);
      if (openingStock) await adjustStock({ variantId: String(created._id), type: "OPENING", qty: openingStock, unitCost: toPaise(costPrice), note: "opening stock" });
    }
  }
  await syncSearchText(String(product._id));
  return product;
}
