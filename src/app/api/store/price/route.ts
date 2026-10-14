import { z } from "zod";
import { publicRoute } from "@/lib/api";
import { Variant } from "@/lib/models";
import { priceFromDb } from "@/lib/sales";
import { MAX_CART_QTY } from "@/lib/store";

const body = z.object({
  items: z.array(z.object({ variantId: z.string().length(24), qty: z.number().int().min(1).max(MAX_CART_QTY) })).min(1).max(60),
});

/**
 * Live cart total for visitors. The server decides the prices (the browser never sends a price), applies the same
 * offers engine as the billing screen, and trims quantities to what is in stock.
 */
export const POST = publicRoute({ bucket: "store-price", limit: 90 }, async (req) => {
  const { items } = body.parse(await req.json());
  const wanted = new Map<string, number>();
  for (const i of items) wanted.set(i.variantId, (wanted.get(i.variantId) ?? 0) + i.qty);

  const found = await Variant.find({ _id: { $in: [...wanted.keys()] }, active: true }, "trackStock stockOnHand").lean();
  const byId = new Map(found.map((v) => [String(v._id), v]));
  const unavailable: string[] = [];
  const limited: string[] = [];
  const valid: { variantId: string; qty: number }[] = [];
  for (const [variantId, qty] of wanted) {
    const v = byId.get(variantId);
    const available = !v ? 0 : v.trackStock === false ? MAX_CART_QTY : Math.min(v.stockOnHand, MAX_CART_QTY);
    if (available < 1) {
      unavailable.push(variantId);
      continue;
    }
    if (qty > available) limited.push(variantId);
    valid.push({ variantId, qty: Math.min(qty, available) });
  }
  if (!valid.length) return { lines: [], subtotal: 0, discount: 0, total: 0, unavailable, limited };

  const { priced } = await priceFromDb(valid);
  return {
    lines: priced.lines.map((l) => ({
      variantId: l.variantId,
      qty: l.qty,
      freeUnits: l.freeUnits,
      unitPrice: l.unitPrice,
      lineTotal: l.lineTotal,
      discount: l.discount,
      offerLabel_en: l.offerLabel_en,
      offerLabel_hi: l.offerLabel_hi,
      nudge: l.nudge,
    })),
    subtotal: priced.subtotal,
    discount: priced.discount,
    total: priced.total,
    unavailable,
    limited,
  };
});
