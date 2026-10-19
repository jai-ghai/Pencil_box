import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { OfferModel } from "@/lib/models";
import { offerBody, offerFields } from "@/lib/offers-input";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

/** Switch one offer on or off. */
export const PATCH = route(can("offers"), async (req, _s, ctx) => {
  const { active } = z.object({ active: z.boolean() }).parse(await req.json());
  const offer = await OfferModel.findByIdAndUpdate(await idOf(ctx), { active }, { returnDocument: "after" });
  if (!offer) throw new HttpError(404, "Not found");
  return { offer };
});

/** Edit an offer: its kind, numbers, labels, dates and what it applies to. Whether it is on or off is not changed. */
export const PUT = route(can("offers"), async (req, _s, ctx) => {
  const b = offerBody.parse(await req.json());
  if (!b.variantIds.length && !b.categoryIds.length && !b.brandIds.length) throw new HttpError(400, "Pick at least one item, category or brand for the offer");
  const offer = await OfferModel.findByIdAndUpdate(await idOf(ctx), offerFields(b), { returnDocument: "after" });
  if (!offer) throw new HttpError(404, "Not found");
  return { offer };
});

export const DELETE = route(can("offers"), async (_req, _s, ctx) => {
  await OfferModel.findByIdAndDelete(await idOf(ctx));
  return { ok: true };
});
