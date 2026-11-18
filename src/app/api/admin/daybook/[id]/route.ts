import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DayCost, COST_KINDS } from "@/lib/models";
import { istDate } from "@/lib/reports";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

const patch = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  kind: z.enum(COST_KINDS).optional(),
  amount: z.number().int().min(1).max(100_000_000_00).optional(),
  party: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});

/** Correct a purchase or expense entry. */
export const PATCH = route(can("daybook"), async (req, _a, ctx) => {
  const b = patch.parse(await req.json());
  if (b.date && (b.date > istDate(new Date()) || Number.isNaN(Date.parse(`${b.date}T00:00:00Z`)))) throw new HttpError(400, "That date is not valid");
  const doc = await DayCost.findByIdAndUpdate(await idOf(ctx), { $set: b }, { returnDocument: "after" }).lean();
  if (!doc) throw new HttpError(404, "Not found");
  return { ok: true };
});

export const DELETE = route(can("daybook"), async (_req, actor, ctx) => {
  const old = await DayCost.findByIdAndDelete(await idOf(ctx)).lean();
  if (!old) throw new HttpError(404, "Not found");
  await audit(actor.username, "daybook.cost.delete", "daybook", `Deleted ${old.kind} of Rs ${old.amount / 100} on ${old.date}${old.party ? ` (${old.party})` : ""}`, { entityId: String(old._id), meta: old });
  return { ok: true };
});
