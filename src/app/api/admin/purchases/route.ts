import { route, can } from "@/lib/api";
import { Purchase, Variant } from "@/lib/models";

/** Purchases with, for every line, the item's current selling price (SP) beside the cost price (CP) paid. */
export const GET = route(can("purchases"), async () => {
  const purchases = await Purchase.find().sort({ date: -1 }).limit(200).populate("supplierId", "name").lean();
  const ids = [...new Set(purchases.flatMap((p) => p.items.map((i: { variantId: unknown }) => String(i.variantId))))];
  const variants = await Variant.find({ _id: { $in: ids } }, "sellPrice stockOnHand shortCode").lean();
  const byId = new Map(variants.map((v) => [String(v._id), v]));
  return {
    purchases: purchases.map((p) => ({
      ...p,
      items: p.items.map((i: { variantId: unknown }) => {
        const v = byId.get(String(i.variantId));
        return { ...i, variantId: String(i.variantId), sellPrice: v?.sellPrice ?? null, stockOnHand: v?.stockOnHand ?? null, code: (v?.shortCode ?? "").toUpperCase() };
      }),
    })),
  };
});
