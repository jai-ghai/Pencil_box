import { z } from "zod";
import { route, STAFF } from "@/lib/api";
import { Brand, Product, Variant } from "@/lib/models";

const body = z.object({ codes: z.array(z.string().max(20)).min(1).max(100) });

/** Look items up by their codes (BP-02 ...), for filling the bill from a pasted WhatsApp order. Cost prices are never returned. */
export const POST = route(STAFF, async (req) => {
  const { codes } = body.parse(await req.json());
  const wanted = [...new Set(codes.map((c) => c.trim().toLowerCase()))];
  const variants = await Variant.find({ shortCode: { $in: wanted }, active: true }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en brandId").lean();
  const brands = await Brand.find({ _id: { $in: products.map((p) => p.brandId).filter(Boolean) } }, "name").lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const brandById = new Map(brands.map((b) => [String(b._id), b.name]));
  const items = variants.map((v) => {
    const p = productById.get(String(v.productId));
    return {
      variantId: String(v._id),
      name: p?.name_en ?? "",
      brand: p?.brandId ? brandById.get(String(p.brandId)) ?? "" : "",
      label: v.label,
      shortCode: v.shortCode ?? "",
      sellPrice: v.sellPrice,
      stockOnHand: v.stockOnHand,
    };
  });
  const found = new Set(items.map((i) => i.shortCode));
  return { items, missing: wanted.filter((c) => !found.has(c)).map((c) => c.toUpperCase()) };
});
