import { z } from "zod";
import { route, STAFF } from "@/lib/api";
import { priceFromDb } from "@/lib/sales";
import { ENFORCE_STOCK_LIMITS } from "@/lib/flags";

const body = z.object({ items: z.array(z.object({ variantId: z.string().length(24), qty: z.number().int().min(1).max(100000), unitPrice: z.number().int().min(0).optional() })).min(1).max(200) });

/** Live cart pricing for the billing screen, using the same engine and DB prices as the final sale. */
export const POST = route(STAFF, async (req) => {
  const { items } = body.parse(await req.json());
  const { priced, meta } = await priceFromDb(items);
  return {
    ...priced,
    stockLimits: ENFORCE_STOCK_LIMITS,
    lines: priced.lines.map((l) => ({ ...l, name: meta.get(l.variantId)?.name ?? "", stockOnHand: meta.get(l.variantId)?.stockOnHand ?? 0 })),
  };
});
