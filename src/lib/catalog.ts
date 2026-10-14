import { z } from "zod";
import { Brand, Category, Product, Variant } from "./models";
import { buildSearchText } from "./search";
import { adjustStock } from "./stock";

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
  images: z.array(z.string().max(300)).max(8).default([]),
  attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  tags: z.array(z.string().max(40)).max(20).default([]),
  active: z.boolean().default(true),
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

export async function saveProduct(input: ProductInput, productId?: string) {
  const { variants, brandId, supplierId, imageGeneric, ...fields } = input;
  const doc = { ...fields, ...(imageGeneric !== undefined ? { imageGeneric } : {}), brandId: brandId || undefined, supplierId: supplierId || undefined };
  const product = productId ? await Product.findByIdAndUpdate(productId, doc, { returnDocument: "after" }) : await Product.create(doc);
  if (!product) throw new Error("Product not found");

  const cat = await Category.findById(product.categoryId).lean();
  const prefix = codePrefix(cat?.name_en ?? "");
  for (const v of variants) {
    const { _id, sellPrice, costPrice, maxPrice, openingStock, ...rest } = v;
    if (maxPrice !== undefined && maxPrice !== 0 && maxPrice < sellPrice) throw new CatalogError("The higher price must be at least the normal price");
    const data: Record<string, unknown> = { ...rest, productId: product._id, sellPrice: toPaise(sellPrice), costPrice: toPaise(costPrice), maxPrice: maxPrice ? toPaise(maxPrice) : undefined };
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
