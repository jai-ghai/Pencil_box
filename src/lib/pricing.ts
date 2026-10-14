/**
 * Offers / pricing engine. Pure functions only: no DB, no clock except the `now` argument.
 * Shared by POS billing and the online cart so both always give identical discounts.
 *
 * All money is integer paise (Rs 1 = 100 paise) to avoid float rounding.
 * Quantity in a cart line is the TOTAL number of items the customer takes. For
 * "buy 6 get 1 free" a line of 7 pays for 6.
 */

export type OfferType = "BUY_X_GET_Y" | "BUNDLE" | "PERCENT" | "FLAT" | "SLAB";

export interface OfferScope {
  variantIds?: string[];
  categoryIds?: string[];
  brandIds?: string[];
}

export interface Offer {
  id: string;
  type: OfferType;
  scope: OfferScope;
  active: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  label_en: string;
  label_hi?: string;
  /** BUY_X_GET_Y: buy `buyQty`, get `freeQty` free */
  buyQty?: number;
  freeQty?: number;
  /** BUNDLE: `bundleQty` items for `bundlePrice` paise */
  bundleQty?: number;
  bundlePrice?: number;
  /** PERCENT: 0-100 */
  percent?: number;
  /** FLAT: paise off per unit */
  flatOff?: number;
  /** SLAB: from `slabMinQty` items, each costs `slabPrice` paise */
  slabMinQty?: number;
  slabPrice?: number;
}

export interface CartLineInput {
  variantId: string;
  qty: number;
  /** Unit sell price in paise */
  unitPrice: number;
  categoryId?: string;
  brandId?: string;
}

export interface PricedLine {
  variantId: string;
  qty: number;
  /** Units given free (included in qty) */
  freeUnits: number;
  unitPrice: number;
  /** qty * unitPrice, before any offer */
  baseTotal: number;
  discount: number;
  lineTotal: number;
  offerId?: string;
  offerLabel_en?: string;
  offerLabel_hi?: string;
  /** e.g. "Add 1 more to get 1 free" */
  nudge?: { addQty: number; label_en: string; label_hi?: string };
}

export interface PricedCart {
  lines: PricedLine[];
  subtotal: number;
  discount: number;
  total: number;
}

export function isOfferLive(offer: Offer, now: Date): boolean {
  if (!offer.active) return false;
  if (offer.startsAt && now < offer.startsAt) return false;
  if (offer.endsAt && now > offer.endsAt) return false;
  return true;
}

export function offerApplies(offer: Offer, line: CartLineInput): boolean {
  const { variantIds, categoryIds, brandIds } = offer.scope;
  const hasScope = !!(variantIds?.length || categoryIds?.length || brandIds?.length);
  if (!hasScope) return false; // an offer with no scope applies to nothing
  if (variantIds?.length && variantIds.includes(line.variantId)) return true;
  if (categoryIds?.length && line.categoryId && categoryIds.includes(line.categoryId)) return true;
  if (brandIds?.length && line.brandId && brandIds.includes(line.brandId)) return true;
  return false;
}

interface Outcome {
  lineTotal: number;
  freeUnits: number;
}

function evaluate(offer: Offer, qty: number, unit: number): Outcome | null {
  const base = qty * unit;
  switch (offer.type) {
    case "BUY_X_GET_Y": {
      const x = offer.buyQty ?? 0;
      const y = offer.freeQty ?? 0;
      if (x < 1 || y < 1) return null;
      const freeUnits = Math.floor(qty / (x + y)) * y;
      if (freeUnits === 0) return null;
      return { lineTotal: (qty - freeUnits) * unit, freeUnits };
    }
    case "BUNDLE": {
      const n = offer.bundleQty ?? 0;
      const price = offer.bundlePrice ?? 0;
      if (n < 2 || price <= 0) return null;
      const groups = Math.floor(qty / n);
      if (groups === 0) return null;
      const total = groups * price + (qty - groups * n) * unit;
      return total < base ? { lineTotal: total, freeUnits: 0 } : null;
    }
    case "PERCENT": {
      const p = offer.percent ?? 0;
      if (p <= 0 || p > 100) return null;
      return { lineTotal: Math.round((base * (100 - p)) / 100), freeUnits: 0 };
    }
    case "FLAT": {
      const off = offer.flatOff ?? 0;
      if (off <= 0) return null;
      return { lineTotal: qty * Math.max(0, unit - off), freeUnits: 0 };
    }
    case "SLAB": {
      const min = offer.slabMinQty ?? 0;
      const price = offer.slabPrice ?? 0;
      if (min < 2 || price < 0 || qty < min) return null;
      return price < unit ? { lineTotal: qty * price, freeUnits: 0 } : null;
    }
  }
}

function buildNudge(offer: Offer, qty: number) {
  if (offer.type !== "BUY_X_GET_Y") return undefined;
  const x = offer.buyQty ?? 0;
  const y = offer.freeQty ?? 0;
  if (x < 1 || y < 1 || qty < 1) return undefined;
  const group = x + y;
  const remainder = qty % group;
  if (remainder === 0) return undefined;
  const addQty = group - remainder;
  return {
    addQty,
    label_en: `Add ${addQty} more to get ${y} free`,
    label_hi: `${addQty} और जोड़ें और ${y} फ्री पाएं`,
  };
}

/** Price a single line: the single best live offer wins (no stacking). */
export function priceLine(line: CartLineInput, offers: Offer[], now: Date = new Date()): PricedLine {
  if (!Number.isInteger(line.qty) || line.qty < 1) throw new Error("qty must be a positive integer");
  if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) throw new Error("unitPrice must be integer paise");

  const baseTotal = line.qty * line.unitPrice;
  let best: { offer: Offer; outcome: Outcome } | null = null;
  let nudgeOffer: Offer | undefined;

  for (const offer of offers) {
    if (!isOfferLive(offer, now) || !offerApplies(offer, line)) continue;
    if (offer.type === "BUY_X_GET_Y" && !nudgeOffer) nudgeOffer = offer;
    const outcome = evaluate(offer, line.qty, line.unitPrice);
    if (!outcome || outcome.lineTotal >= baseTotal) continue;
    if (!best || outcome.lineTotal < best.outcome.lineTotal) best = { offer, outcome };
  }

  const priced: PricedLine = {
    variantId: line.variantId,
    qty: line.qty,
    freeUnits: best?.outcome.freeUnits ?? 0,
    unitPrice: line.unitPrice,
    baseTotal,
    discount: best ? baseTotal - best.outcome.lineTotal : 0,
    lineTotal: best ? best.outcome.lineTotal : baseTotal,
  };
  if (best) {
    priced.offerId = best.offer.id;
    priced.offerLabel_en = best.offer.label_en;
    priced.offerLabel_hi = best.offer.label_hi;
  }
  const nudge = nudgeOffer ? buildNudge(nudgeOffer, line.qty) : undefined;
  if (nudge) priced.nudge = nudge;
  return priced;
}

export function priceCart(lines: CartLineInput[], offers: Offer[], now: Date = new Date()): PricedCart {
  const priced = lines.map((l) => priceLine(l, offers, now));
  const subtotal = priced.reduce((s, l) => s + l.baseTotal, 0);
  const total = priced.reduce((s, l) => s + l.lineTotal, 0);
  return { lines: priced, subtotal, discount: subtotal - total, total };
}

export const rupees = (paise: number): string =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;
