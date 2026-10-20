import { z } from "zod";
import { route, can } from "@/lib/api";
import { createPurchase } from "@/lib/purchases";
import { Brand, Product, Purchase, Variant } from "@/lib/models";

/**
 * Purchases with, for every line, the item's current selling price (SP) beside the cost price (CP) paid.
 * Each line's `name` is the item's CURRENT brand, name and variant, so a renamed item or a newly set brand shows here too.
 */
export const GET = route(can("purchases"), async () => {
  const purchases = await Purchase.find().sort({ date: -1 }).limit(200).populate("supplierId", "name").lean();
  const ids = [...new Set(purchases.flatMap((p) => p.items.map((i: { variantId: unknown }) => String(i.variantId))))];
  const variants = await Variant.find({ _id: { $in: ids } }, "productId label sellPrice stockOnHand shortCode").lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en brandId").lean();
  const brands = await Brand.find({ _id: { $in: products.map((p) => p.brandId).filter(Boolean) } }, "name").lean();
  const byId = new Map(variants.map((v) => [String(v._id), v]));
  const prod = new Map(products.map((p) => [String(p._id), p]));
  const brand = new Map(brands.map((b) => [String(b._id), b.name]));

  const title = (v: (typeof variants)[number] | undefined, fallback?: string | null) => {
    const p = v ? prod.get(String(v.productId)) : undefined;
    if (!v || !p) return fallback ?? "";
    const b = p.brandId ? brand.get(String(p.brandId)) : "";
    const name = b && p.name_en.toLowerCase().startsWith(b.toLowerCase()) ? p.name_en : [b, p.name_en].filter(Boolean).join(" ");
    return [name, v.label].filter(Boolean).join(" ");
  };

  return {
    purchases: purchases.map((p) => ({
      ...p,
      items: p.items.map((i: { variantId: unknown; name?: string | null }) => {
        const v = byId.get(String(i.variantId));
        return { ...i, name: title(v, i.name), variantId: String(i.variantId), sellPrice: v?.sellPrice ?? null, stockOnHand: v?.stockOnHand ?? null, code: (v?.shortCode ?? "").toUpperCase() };
      }),
    })),
  };
});

const body = z.object({
  supplierId: z.string().length(24).optional(),
  supplierName: z.string().max(80).optional(),
  invoiceNo: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  date: z.string().datetime().optional(),
  lines: z.array(z.object({ variantId: z.string().length(24), qty: z.number().int().min(1).max(1_000_000), cost: z.number().min(0).max(10_000_000), price: z.number().min(0).max(10_000_000).optional() })).min(1).max(300),
});

/** Record a new purchase: stock goes up, and each item's cost and selling price follow the bill. */
export const POST = route(can("purchases"), async (req, actor) => {
  const b = body.parse(await req.json());
  return { purchase: await createPurchase({ ...b, date: b.date ? new Date(b.date) : undefined }, actor.username) };
});
