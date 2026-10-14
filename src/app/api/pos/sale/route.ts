import { route, STAFF } from "@/lib/api";
import { completeSale, saleInputSchema } from "@/lib/sales";

export const POST = route(STAFF, async (req, session) => {
  const input = saleInputSchema.parse(await req.json());
  const { sale, priced, warnings } = await completeSale(input, session.username);
  return { billNo: sale.billNo, total: sale.total, discount: sale.discount, lines: priced.lines, warnings };
});
