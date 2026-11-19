import { HttpError, route, STAFF } from "@/lib/api";
import { allow } from "@/lib/ratelimit";
import { completeSale, saleInputSchema } from "@/lib/sales";

/** In-memory per-user guard: 60 bills/min is far above counter speed, stops runaway scripts/double taps. */
export const POST = route(STAFF, async (req, session) => {
  if (!allow(`pos-sale:${session.uid}`, 60, 60_000)) throw new HttpError(429, "Too many bills at once. Wait a moment.");
  const input = saleInputSchema.parse(await req.json());
  const { sale, priced, warnings } = await completeSale(input, session.username);
  return { billNo: sale.billNo, total: sale.total, discount: sale.discount, lines: priced.lines, warnings };
});
