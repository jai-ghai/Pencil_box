import { z } from "zod";
import { route, OWNER, HttpError } from "@/lib/api";
import { OfferModel } from "@/lib/models";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

export const PATCH = route(OWNER, async (req, _s, ctx) => {
  const { active } = z.object({ active: z.boolean() }).parse(await req.json());
  const offer = await OfferModel.findByIdAndUpdate(await idOf(ctx), { active }, { returnDocument: "after" });
  if (!offer) throw new HttpError(404, "Not found");
  return { offer };
});

export const DELETE = route(OWNER, async (_req, _s, ctx) => {
  await OfferModel.findByIdAndDelete(await idOf(ctx));
  return { ok: true };
});
