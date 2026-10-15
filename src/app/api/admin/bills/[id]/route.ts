import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { deleteBill, editBill, editBillSchema } from "@/lib/bills";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("Bad id");
  return id;
};

/** Edit a bill (quantities, items, cash or UPI, note). Needs the "Edit bills" permission. */
export const PATCH = route(can("orders:edit"), async (req, actor, ctx) => {
  const input = editBillSchema.parse(await req.json());
  return { ok: true, ...(await editBill(await idOf(ctx), input, actor.username)) };
});

/** Delete a bill and put its items back in stock. Needs the "Delete bills" permission. */
export const DELETE = route(can("orders:delete"), async (_req, actor, ctx) => ({ ok: true, ...(await deleteBill(await idOf(ctx), actor.username)) }));
