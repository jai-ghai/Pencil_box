import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { ShopEvent, SHOP_EVENT_TYPES } from "@/lib/models";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Not a real date");

const patch = z.object({
  date: date.optional(),
  title: z.string().trim().min(1).max(120).optional(),
  type: z.enum(SHOP_EVENT_TYPES).optional(),
  note: z.string().trim().max(500).optional(),
  itemsHint: z.string().trim().max(400).optional(),
  remindDaysBefore: z.number().int().min(0).max(30).optional(),
});

export const PATCH = route(can("calendar"), async (req, _a, ctx) => {
  const b = patch.parse(await req.json());
  const doc = await ShopEvent.findByIdAndUpdate(await idOf(ctx), { $set: b }, { returnDocument: "after" }).lean();
  if (!doc) throw new HttpError(404, "Not found");
  return {
    event: {
      id: String(doc._id),
      date: doc.date,
      title: doc.title,
      type: doc.type,
      note: doc.note ?? "",
      itemsHint: doc.itemsHint ?? "",
      remindDaysBefore: doc.remindDaysBefore ?? 1,
    },
  };
});

export const DELETE = route(can("calendar"), async (_req, _a, ctx) => {
  const old = await ShopEvent.findByIdAndDelete(await idOf(ctx)).lean();
  if (!old) throw new HttpError(404, "Not found");
  return { ok: true };
});
