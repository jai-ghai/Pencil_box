import { z } from "zod";
import { Counter, OfferModel, Product, Sale, Variant } from "./models";
import { priceCart, type CartLineInput, type Offer } from "./pricing";
import { recordMovement, withStockTransaction } from "./stock";

export const saleInputSchema = z.object({
  items: z
    .array(
      z.object({
        variantId: z.string().length(24),
        qty: z.number().int().min(1).max(100000),
        /** optional paise price, only accepted if it is the item's normal price or its allowed higher price */
        unitPrice: z.number().int().min(0).optional(),
      }),
    )
    .min(1)
    .max(200),
  payments: z.object({
    cash: z.number().int().min(0).default(0),
    upi: z.number().int().min(0).default(0),
  }),
  note: z.string().max(200).optional(),
  /** "whatsapp" when the cart was filled from a pasted customer message (the text is kept on the bill) */
  source: z.enum(["pos", "whatsapp"]).optional(),
  waText: z.string().max(3000).optional(),
});
export type SaleInput = z.infer<typeof saleInputSchema>;

export class SaleError extends Error {}

/**
 * What leaves the shelf when `qty` of this variant is sold: a gift hamper takes its components, a service takes
 * nothing, anything else takes itself. Billing, bill editing and bill deleting all use this one rule.
 */
export function stockEffects(
  v: { _id: unknown; trackStock?: boolean | null; bundleItems?: { variantId: unknown; qty: number }[] | null },
  qty: number,
): { variantId: string; qty: number }[] {
  if (v.bundleItems?.length) return v.bundleItems.map((b) => ({ variantId: String(b.variantId), qty: b.qty * qty }));
  if (v.trackStock === false) return [];
  return [{ variantId: String(v._id), qty }];
}

/** Load live offers from the DB in the pure-engine shape. */
export async function loadOffers(): Promise<Offer[]> {
  const docs = await OfferModel.find({ active: true }).lean();
  return docs.map((o) => ({
    id: String(o._id),
    type: o.type,
    scope: { variantIds: o.scope?.variantIds, categoryIds: o.scope?.categoryIds, brandIds: o.scope?.brandIds },
    active: o.active,
    startsAt: o.startsAt,
    endsAt: o.endsAt,
    label_en: o.label_en,
    label_hi: o.label_hi ?? undefined,
    buyQty: o.buyQty ?? undefined,
    freeQty: o.freeQty ?? undefined,
    bundleQty: o.bundleQty ?? undefined,
    bundlePrice: o.bundlePrice ?? undefined,
    percent: o.percent ?? undefined,
    flatOff: o.flatOff ?? undefined,
    slabMinQty: o.slabMinQty ?? undefined,
    slabPrice: o.slabPrice ?? undefined,
  }));
}

/**
 * Price a cart from DB prices + live offers. Clients send only variantId and qty,
 * never prices or discounts.
 */
export async function priceFromDb(items: { variantId: string; qty: number; unitPrice?: number }[]) {
  // merge duplicate variants so offers see the true quantity
  const merged = new Map<string, number>();
  const chosenPrice = new Map<string, number>();
  for (const i of items) {
    merged.set(i.variantId, (merged.get(i.variantId) ?? 0) + i.qty);
    if (i.unitPrice !== undefined) {
      const prev = chosenPrice.get(i.variantId);
      if (prev !== undefined && prev !== i.unitPrice) throw new SaleError("The same item has two different prices on this bill");
      chosenPrice.set(i.variantId, i.unitPrice);
    }
  }

  const variants = await Variant.find({ _id: { $in: [...merged.keys()] }, active: true }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en brandId categoryId").lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const byId = new Map(variants.map((v) => [String(v._id), v]));

  const lines: CartLineInput[] = [];
  const meta = new Map<string, { name: string; unitCost: number; stockOnHand: number }>();
  for (const [variantId, qty] of merged) {
    const v = byId.get(variantId);
    if (!v) throw new SaleError(`Item not found or inactive: ${variantId}`);
    const p = productById.get(String(v.productId));
    // the cashier may pick the normal price or the item's one higher price; any other price is refused
    const asked = chosenPrice.get(variantId);
    if (asked !== undefined && asked !== v.sellPrice && !(v.maxPrice && v.maxPrice > v.sellPrice && asked === v.maxPrice)) {
      throw new SaleError(`That price is not allowed for ${p?.name_en ?? "this item"}`);
    }
    lines.push({
      variantId,
      qty,
      unitPrice: asked ?? v.sellPrice,
      categoryId: p?.categoryId ? String(p.categoryId) : undefined,
      brandId: p?.brandId ? String(p.brandId) : undefined,
    });
    meta.set(variantId, { name: [p?.name_en, v.label].filter(Boolean).join(" "), unitCost: v.costPrice, stockOnHand: v.stockOnHand });
  }
  const offers = await loadOffers();
  const priced = priceCart(lines, offers);
  return { priced, meta, variants: byId };
}

export async function completeSale(input: SaleInput, cashierId: string) {
  const { priced, meta, variants } = await priceFromDb(input.items);
  const { cash, upi } = input.payments;
  if (cash + upi !== priced.total) {
    throw new SaleError(`Payments (${cash + upi}) must equal the bill total (${priced.total}) in paise`);
  }

  const warnings: string[] = [];
  for (const l of priced.lines) {
    const m = meta.get(l.variantId)!;
    if (variants.get(l.variantId)!.trackStock !== false && m.stockOnHand < l.qty) warnings.push(`Low stock: ${m.name} (have ${m.stockOnHand}, selling ${l.qty})`);
  }

  const sale = await withStockTransaction(async (session) => {
    const counter = await Counter.findOneAndUpdate({ _id: "billNo" }, { $inc: { seq: 1 } }, { upsert: true, returnDocument: "after", session });
    const [created] = await Sale.create(
      [
        {
          billNo: counter.seq,
          items: priced.lines.map((l) => ({
            variantId: l.variantId,
            name: meta.get(l.variantId)!.name,
            qty: l.qty,
            freeUnits: l.freeUnits,
            unitPrice: l.unitPrice,
            unitCost: meta.get(l.variantId)!.unitCost,
            baseTotal: l.baseTotal,
            discount: l.discount,
            lineTotal: l.lineTotal,
            offerId: l.offerId,
            offerLabel: l.offerLabel_en,
          })),
          subtotal: priced.subtotal,
          discount: priced.discount,
          total: priced.total,
          payments: { cash, upi },
          cashierId,
          note: input.note?.trim() || undefined,
          source: input.source ?? "pos",
          waText: input.source === "whatsapp" ? input.waText : undefined,
          at: new Date(),
        },
      ],
      { session },
    );

    for (const l of priced.lines) {
      const v = variants.get(l.variantId)!;
      // free units are still handed over, so stock goes down by the full qty
      for (const e of stockEffects(v, l.qty)) {
        await recordMovement({ variantId: e.variantId, type: "SALE", qty: -e.qty, unitCost: e.variantId === l.variantId ? v.costPrice : undefined, refId: created._id, by: cashierId, note: `bill ${counter.seq}${v.bundleItems?.length ? " (bundle)" : ""}` }, session);
      }
    }
    return created;
  });

  return { sale, priced, warnings };
}
