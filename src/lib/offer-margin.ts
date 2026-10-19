/** What the shop earns for each unit sold under an offer, so the owner can see the profit before switching it on. */
export interface OfferRule {
  type: string;
  buyQty?: number | null;
  freeQty?: number | null;
  bundleQty?: number | null;
  bundlePrice?: number | null;
  percent?: number | null;
  flatOff?: number | null;
  slabPrice?: number | null;
}

/** Average money received per unit (paise) when the offer applies; never more than the normal price. */
export function unitRevenue(o: OfferRule, price: number): number {
  let rev = price;
  if (o.type === "BUY_X_GET_Y" && o.buyQty && o.freeQty) rev = (price * o.buyQty) / (o.buyQty + o.freeQty);
  else if (o.type === "BUNDLE" && o.bundleQty && o.bundlePrice) rev = o.bundlePrice / o.bundleQty;
  else if (o.type === "PERCENT" && o.percent) rev = price * (1 - o.percent / 100);
  else if (o.type === "FLAT" && o.flatOff) rev = Math.max(0, price - o.flatOff);
  else if (o.type === "SLAB" && o.slabPrice !== undefined && o.slabPrice !== null) rev = o.slabPrice;
  return Math.min(price, rev);
}

/** Profit as a share of what the customer pays under the offer (0.25 = 25%), or null when the cost is not entered. */
export function profitShare(o: OfferRule, price: number, cost: number): number | null {
  if (cost <= 0) return null;
  const rev = unitRevenue(o, price);
  return rev > 0 ? (rev - cost) / rev : -1;
}
