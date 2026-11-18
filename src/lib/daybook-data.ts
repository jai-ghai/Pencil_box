import { DayCost, DaySales, Sale, Variant } from "./models";
import { catalogMarginPct, type CostEntry, type SalesDay } from "./daybook";
import { getSetting } from "./settings";
import { istDate } from "./reports";

const DAY_MS = 24 * 3600 * 1000;
/** Used until there is a cost price on the items or the owner sets a figure. */
export const DEFAULT_MARGIN_PCT = 25;

/** What the POS bills added up to on each India-time day in the range (voided bills left out). */
export async function loadBillDays(from: string, to: string): Promise<(SalesDay & { bills: number })[]> {
  const bills = await Sale.find(
    { voided: false, at: { $gte: new Date(`${from}T00:00:00+05:30`), $lt: new Date(Date.parse(`${to}T00:00:00+05:30`) + DAY_MS) } },
    "at payments",
  )
    .limit(100_000)
    .lean();
  const days = new Map<string, SalesDay & { bills: number }>();
  for (const b of bills) {
    const date = istDate(b.at);
    const cur = days.get(date) ?? { date, cash: 0, upi: 0, bills: 0 };
    cur.cash += b.payments?.cash ?? 0;
    cur.upi += b.payments?.upi ?? 0;
    cur.bills += 1;
    days.set(date, cur);
  }
  return [...days.values()];
}

export async function loadTyped(from: string, to: string): Promise<{ entered: SalesDay[]; costs: CostEntry[] }> {
  const [sales, costs] = await Promise.all([
    DaySales.find({ _id: { $gte: from, $lte: to } }).lean(),
    DayCost.find({ date: { $gte: from, $lte: to } }).limit(20_000).lean(),
  ]);
  return {
    entered: sales.map((s) => ({ date: String(s._id), cash: s.cash ?? 0, upi: s.upi ?? 0 })),
    costs: costs.map((c) => ({ date: c.date, kind: c.kind, amount: c.amount, party: c.party ?? undefined })),
  };
}

export type MarginSource = "set" | "catalogue" | "default";
/** The profit margin used for estimates: the owner's own figure, else the average over items with a cost price, else a default. */
export async function resolveMargin(): Promise<{ pct: number; source: MarginSource; catalogue: number | null; set: number | null }> {
  const set = await getSetting<number | null>("marginPct", null);
  const variants = await Variant.find({ active: true }, "sellPrice costPrice").lean();
  const catalogue = catalogMarginPct(variants.map((v) => ({ sellPrice: v.sellPrice, costPrice: v.costPrice ?? 0 })));
  if (typeof set === "number") return { pct: set, source: "set", catalogue, set };
  if (catalogue !== null) return { pct: catalogue, source: "catalogue", catalogue, set: null };
  return { pct: DEFAULT_MARGIN_PCT, source: "default", catalogue, set: null };
}
