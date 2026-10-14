import { z } from "zod";
import { route, OWNER, HttpError } from "@/lib/api";
import { OfferModel } from "@/lib/models";
import { toPaise } from "@/lib/catalog";

const ids = z.array(z.string().length(24)).max(200).default([]);
const base = {
  variantIds: ids,
  categoryIds: ids,
  brandIds: ids,
  startsAt: z.string().datetime().optional().or(z.literal("")),
  endsAt: z.string().datetime().optional().or(z.literal("")),
  label_en: z.string().min(1).max(80),
  label_hi: z.string().max(80).optional(),
};

// Money fields arrive in rupees from the UI; stored as integer paise.
const body = z.discriminatedUnion("type", [
  z.object({ type: z.literal("BUY_X_GET_Y"), buyQty: z.number().int().min(1).max(1000), freeQty: z.number().int().min(1).max(1000), ...base }),
  z.object({ type: z.literal("BUNDLE"), bundleQty: z.number().int().min(2).max(1000), bundlePrice: z.number().positive(), ...base }),
  z.object({ type: z.literal("PERCENT"), percent: z.number().min(1).max(100), ...base }),
  z.object({ type: z.literal("FLAT"), flatOff: z.number().positive(), ...base }),
  z.object({ type: z.literal("SLAB"), slabMinQty: z.number().int().min(2).max(100000), slabPrice: z.number().min(0), ...base }),
]);

export const GET = route(OWNER, async () => ({ offers: await OfferModel.find().sort({ createdAt: -1 }).lean() }));

export const POST = route(OWNER, async (req) => {
  const b = body.parse(await req.json());
  if (!b.variantIds.length && !b.categoryIds.length && !b.brandIds.length) throw new HttpError(400, "Pick at least one item, category or brand for the offer");
  const { variantIds, categoryIds, brandIds, startsAt, endsAt, ...rest } = b;
  const doc: Record<string, unknown> = { ...rest, scope: { variantIds, categoryIds, brandIds }, startsAt: startsAt || undefined, endsAt: endsAt || undefined };
  if ("bundlePrice" in b) doc.bundlePrice = toPaise(b.bundlePrice);
  if ("flatOff" in b) doc.flatOff = toPaise(b.flatOff);
  if ("slabPrice" in b) doc.slabPrice = toPaise(b.slabPrice);
  return { offer: await OfferModel.create(doc) };
});
