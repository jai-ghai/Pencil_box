import { Brand, Category, Product, StockCheck, Supplier, Variant } from "./models";
import { getSetting } from "./settings";

export interface CheckItem {
  id: string;
  code: string;
  name: string;
  category: string;
  supplier: string;
  packSize: number;
  /** paise per piece */
  cost: number;
  status: "ok" | "missing" | null;
  needQty: number;
  checkedAt: string | null;
  /** true when ticked or crossed since the current round began */
  inRound: boolean;
}

/** When the current check round began (ISO text), or null while no round has been started (everything ticked counts). */
export const getRoundStart = () => getSetting<string | null>("checkRoundStart", null);

/** "Brand Name Label", without repeating the brand when the product name already starts with it. */
function title(brand: string, name: string, label: string): string {
  const b = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? brand : "";
  return [b, name, label].filter(Boolean).join(" ");
}

/**
 * Every item the shop sells on a shelf (services such as photocopy are left out), with its tick or cross.
 * One query per collection, joined in memory: a few hundred items, so this is cheap.
 */
export async function loadCheckItems(): Promise<CheckItem[]> {
  const [variants, checks, roundStart] = await Promise.all([
    Variant.find({ active: true, trackStock: { $ne: false } }).lean(),
    StockCheck.find({}).lean(),
    getRoundStart(),
  ]);
  const products = await Product.find({ _id: { $in: [...new Set(variants.map((v) => String(v.productId)))] }, active: true }).lean();
  const [cats, brands, suppliers] = await Promise.all([
    Category.find({}, "name_en parentId").lean(),
    Brand.find({ _id: { $in: products.map((p) => p.brandId).filter(Boolean) } }, "name").lean(),
    Supplier.find({}, "name").lean(),
  ]);

  const catById = new Map(cats.map((c) => [String(c._id), c]));
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));
  const supplierName = new Map(suppliers.map((s) => [String(s._id), s.name]));
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const checkByVariant = new Map(checks.map((c) => [String(c.variantId), c]));
  const since = roundStart ? new Date(roundStart).getTime() : 0;

  const items: CheckItem[] = [];
  for (const v of variants) {
    const p = productById.get(String(v.productId));
    if (!p) continue;
    const c = catById.get(String(p.categoryId));
    const top = c?.parentId ? catById.get(String(c.parentId)) : c;
    const chk = checkByVariant.get(String(v._id));
    items.push({
      id: String(v._id),
      code: (v.shortCode ?? "").toUpperCase(),
      name: title(p.brandId ? (brandName.get(String(p.brandId)) ?? "") : "", p.name_en, v.label ?? ""),
      category: top?.name_en ?? "Other",
      supplier: p.supplierId ? (supplierName.get(String(p.supplierId)) ?? "") : "",
      packSize: v.packSize ?? 1,
      cost: v.costPrice ?? 0,
      status: chk?.status ?? null,
      needQty: chk?.needQty ?? Math.max(1, v.packSize ?? 1),
      checkedAt: chk?.checkedAt ? chk.checkedAt.toISOString() : null,
      inRound: !!chk && chk.checkedAt.getTime() >= since,
    });
  }
  return items.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name, "en", { numeric: true }));
}
