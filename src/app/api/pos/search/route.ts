import { route, STAFF } from "@/lib/api";
import { Variant } from "@/lib/models";
import { wordsRegexFilter } from "@/lib/search";

type Populated = { name_en: string; name_hi?: string; images?: string[]; brandId?: { name: string } | null };

/** Type-to-find for the billing screen. Empty query returns the owner's quick-tap items. Cost price is never returned. */
export const GET = route(STAFF, async (req) => {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().slice(0, 60);
  const words = wordsRegexFilter(q);
  const filter = q ? { active: true, ...words } : { active: true, quickTap: true };

  const found = await Variant.find(filter)
    .populate({ path: "productId", select: "name_en name_hi images brandId", populate: { path: "brandId", select: "name" } })
    .limit(q ? 30 : 60)
    .lean();

  const lower = q.toLowerCase();
  const items = found
    .map((v) => {
      const p = v.productId as unknown as Populated | null;
      return {
        variantId: String(v._id),
        name: p?.name_en ?? "",
        name_hi: p?.name_hi ?? "",
        brand: p?.brandId?.name ?? "",
        label: v.label,
        shortCode: v.shortCode ?? "",
        sellPrice: v.sellPrice,
        maxPrice: v.maxPrice ?? 0,
        packSize: v.packSize,
        stockOnHand: v.stockOnHand,
        image: p?.images?.[0] ?? "",
      };
    })
    .sort((a, b) => {
      // exact short code first, then names starting with the query, then A-Z
      const rank = (x: typeof a) => (x.shortCode && x.shortCode === lower ? 0 : x.name.toLowerCase().startsWith(lower) ? 1 : 2);
      return rank(a) - rank(b) || a.name.localeCompare(b.name) || a.label.localeCompare(b.label);
    })
    .slice(0, 20);
  return { items };
});
