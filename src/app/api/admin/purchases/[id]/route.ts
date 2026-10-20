import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { deletePurchase, editPurchase } from "@/lib/purchases";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

const body = z.object({
  invoiceNo: z.string().max(40).optional(),
  note: z.string().max(500).optional(),
  lines: z.array(z.object({ qty: z.number().min(0).max(1_000_000), cost: z.number().min(0).max(10_000_000), price: z.number().min(0).max(10_000_000).optional() })).min(1).max(500),
});

/** Fix quantity, cost and selling price of the lines of a purchase. */
export const PUT = route(can("purchases:edit"), async (req, actor, ctx) => ({ purchase: await editPurchase(await idOf(ctx), body.parse(await req.json()), actor.username) }));

/** Delete a purchase entered by mistake; the stock it added is taken back out. */
export const DELETE = route(can("purchases:edit"), async (_req, actor, ctx) => {
  await deletePurchase(await idOf(ctx), actor.username);
  return { ok: true };
});
