import { Brand, Category, Product, Variant } from "./models";
import { loadOffers } from "./sales";
import { isOfferLive, offerApplies } from "./pricing";
import { normalizeWhatsappNumber } from "./whatsapp";
import { ENFORCE_STOCK_LIMITS } from "./flags";

/**
 * What the public website may see. This is an allow-list: cost price, supplier, private notes and exact
 * stock counts are never included. Out-of-stock items are left out entirely.
 */
export interface StoreVariant {
  id: string;
  /** upper-case item code shown to customers and put in the WhatsApp message, e.g. BP-02 */
  code: string;
  label: string;
  /** paise */
  price: number;
  /** paise, 0 when the item has a single price */
  maxPrice: number;
  /** how many the customer may add (stock, capped at 99) */
  maxQty: number;
  /** true when only a few are left */
  low: boolean;
  offers: { label_en: string; label_hi?: string }[];
}
export interface StoreProduct {
  id: string;
  name_en: string;
  name_hi: string;
  brand: string;
  brandId: string;
  categoryId: string;
  image: string;
  /** the picture is a general stand-in, not the exact item (the website says so) */
  imageGeneric: boolean;
  variants: StoreVariant[];
}
export interface StoreCatalog {
  whatsapp: string | null;
  categories: { id: string; name_en: string; name_hi: string; parentId: string | null }[];
  brands: { id: string; name: string }[];
  products: StoreProduct[];
}

export const LOW_STOCK_AT = 5;
export const MAX_CART_QTY = 99;

export async function buildStoreCatalog(now = new Date()): Promise<StoreCatalog> {
  // everything is read at the same time, and only the fields the website shows (no costs, notes or search text)
  const [variants, allProducts, cats, brands, allOffers] = await Promise.all([
    Variant.find(ENFORCE_STOCK_LIMITS ? { active: true, $or: [{ trackStock: false }, { stockOnHand: { $gt: 0 } }] } : { active: true }, "productId shortCode label sellPrice maxPrice stockOnHand trackStock").lean(),
    Product.find({ active: true }, "name_en name_hi brandId categoryId images imageGeneric").lean(),
    Category.find({}, "name_en name_hi parentId sortOrder").sort({ sortOrder: 1, name_en: 1 }).lean(),
    Brand.find({}, "name").lean(),
    loadOffers(),
  ]);
  const withStock = new Set(variants.map((v) => String(v.productId)));
  const products = allProducts.filter((p) => withStock.has(String(p._id)));
  const offers = allOffers.filter((o) => isOfferLive(o, now));
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));

  const byProduct = new Map<string, StoreVariant[]>();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  for (const v of variants) {
    const p = productById.get(String(v.productId));
    if (!p || !v.shortCode) continue; // items without a code can't be ordered by code, so they are not listed
    const line = { variantId: String(v._id), qty: 1, unitPrice: v.sellPrice, categoryId: String(p.categoryId), brandId: p.brandId ? String(p.brandId) : undefined };
    const stock = !ENFORCE_STOCK_LIMITS || v.trackStock === false ? MAX_CART_QTY : Math.min(v.stockOnHand, MAX_CART_QTY);
    const sv: StoreVariant = {
      id: String(v._id),
      code: v.shortCode.toUpperCase(),
      label: v.label,
      price: v.sellPrice,
      maxPrice: v.maxPrice && v.maxPrice > v.sellPrice ? v.maxPrice : 0,
      maxQty: stock,
      low: ENFORCE_STOCK_LIMITS && v.trackStock !== false && v.stockOnHand <= LOW_STOCK_AT,
      offers: offers.filter((o) => offerApplies(o, line)).map((o) => ({ label_en: o.label_en, label_hi: o.label_hi })),
    };
    const arr = byProduct.get(String(v.productId)) ?? [];
    arr.push(sv);
    byProduct.set(String(v.productId), arr);
  }

  const out: StoreProduct[] = [];
  for (const p of products) {
    const vs = byProduct.get(String(p._id));
    if (!vs?.length) continue;
    out.push({
      id: String(p._id),
      name_en: p.name_en,
      name_hi: p.name_hi ?? "",
      brand: p.brandId ? brandName.get(String(p.brandId)) ?? "" : "",
      brandId: p.brandId ? String(p.brandId) : "",
      categoryId: String(p.categoryId),
      image: p.images?.[0] ?? "",
      imageGeneric: !!p.images?.[0] && p.imageGeneric === true,
      variants: vs.sort((a, b) => a.code.localeCompare(b.code, undefined, { numeric: true })),
    });
  }

  // only show categories and brands that actually have something to buy
  const usedCats = new Set(out.map((p) => p.categoryId));
  const parentOf = new Map(cats.map((c) => [String(c._id), c.parentId ? String(c.parentId) : null]));
  for (const id of [...usedCats]) {
    const parent = parentOf.get(id);
    if (parent) usedCats.add(parent);
  }
  const usedBrands = new Set(out.map((p) => p.brandId).filter(Boolean));

  return {
    whatsapp: normalizeWhatsappNumber(process.env.WHATSAPP_NUMBER),
    categories: cats.filter((c) => usedCats.has(String(c._id))).map((c) => ({ id: String(c._id), name_en: c.name_en, name_hi: c.name_hi ?? "", parentId: c.parentId ? String(c.parentId) : null })),
    brands: brands.filter((b) => usedBrands.has(String(b._id))).map((b) => ({ id: String(b._id), name: b.name })).sort((a, b) => a.name.localeCompare(b.name)),
    products: out.sort((a, b) => a.name_en.localeCompare(b.name_en)),
  };
}
