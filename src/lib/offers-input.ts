import { z } from "zod";
import { toPaise } from "./catalog";

const ids = z.array(z.string().length(24)).max(300).default([]);
const base = {
  variantIds: ids,
  categoryIds: ids,
  brandIds: ids,
  startsAt: z.string().datetime().optional().or(z.literal("")),
  endsAt: z.string().datetime().optional().or(z.literal("")),
  label_en: z.string().min(1).max(80),
  label_hi: z.string().max(80).optional(),
};

/** What the Offers screen sends. Money fields arrive in rupees; they are stored as integer paise. */
export const offerBody = z.discriminatedUnion("type", [
  z.object({ type: z.literal("BUY_X_GET_Y"), buyQty: z.number().int().min(1).max(1000), freeQty: z.number().int().min(1).max(1000), ...base }),
  z.object({ type: z.literal("BUNDLE"), bundleQty: z.number().int().min(2).max(1000), bundlePrice: z.number().positive(), ...base }),
  z.object({ type: z.literal("PERCENT"), percent: z.number().min(1).max(100), ...base }),
  z.object({ type: z.literal("FLAT"), flatOff: z.number().positive(), ...base }),
  z.object({ type: z.literal("SLAB"), slabMinQty: z.number().int().min(2).max(100000), slabPrice: z.number().min(0), ...base }),
]);
export type OfferBody = z.infer<typeof offerBody>;

/** Database fields for an offer. Fields of other offer types are cleared so changing an offer's type leaves nothing behind. */
export function offerFields(b: OfferBody): Record<string, unknown> {
  const { variantIds, categoryIds, brandIds, startsAt, endsAt, ...rest } = b;
  const doc: Record<string, unknown> = {
    buyQty: undefined, freeQty: undefined, bundleQty: undefined, bundlePrice: undefined, percent: undefined, flatOff: undefined, slabMinQty: undefined, slabPrice: undefined,
    ...rest,
    scope: { variantIds, categoryIds, brandIds },
    startsAt: startsAt || undefined,
    endsAt: endsAt || undefined,
  };
  if ("bundlePrice" in b) doc.bundlePrice = toPaise(b.bundlePrice);
  if ("flatOff" in b) doc.flatOff = toPaise(b.flatOff);
  if ("slabPrice" in b) doc.slabPrice = toPaise(b.slabPrice);
  return doc;
}
