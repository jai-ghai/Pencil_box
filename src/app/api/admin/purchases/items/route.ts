import { route, can } from "@/lib/api";
import { Variant } from "@/lib/models";
import { wordsRegexFilter } from "@/lib/search";

type Populated = { name_en: string; brandId?: { name: string } | null };

/** Item search for the New purchase screen. Unlike the billing search it returns the current cost price, because the owner is entering costs. */
export const GET = route(can("purchases"), async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  if (!q) return { items: [] };
  const found = await Variant.find({ active: true, trackStock: { $ne: false }, ...wordsRegexFilter(q) })
    .populate({ path: "productId", select: "name_en brandId", populate: { path: "brandId", select: "name" } })
    .limit(25)
    .lean();
  return {
    items: found.map((v) => {
      const p = v.productId as unknown as Populated | null;
      const brand = p?.brandId?.name ?? "";
      const name = p?.name_en ?? "";
      const title = [brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? brand : "", name, v.label].filter(Boolean).join(" ");
      return { variantId: String(v._id), title, code: (v.shortCode ?? "").toUpperCase(), costPrice: v.costPrice, sellPrice: v.sellPrice, stockOnHand: v.stockOnHand };
    }),
  };
});
