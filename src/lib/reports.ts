/**
 * Sales report maths. Pure functions (no database), so the numbers can be tested.
 * All money is integer paise. Days, weeks and months are India time (IST).
 *
 *   revenue = what customers paid (after offers)
 *   cost    = quantity handed over (free units included) x the cost price saved on the bill line
 *   profit  = revenue - cost        margin = profit / revenue
 */
export type Group = "day" | "week" | "month";

export interface ReportItem {
  variantId: string;
  name: string;
  qty: number;
  unitCost: number;
  lineTotal: number;
}
export interface ReportSale {
  at: Date;
  total: number;
  discount: number;
  payments: { cash: number; upi: number };
  items: ReportItem[];
}

const IST_MS = 5.5 * 3600 * 1000;
const DAY_MS = 24 * 3600 * 1000;

/** "2026-10-15" for the India-time calendar day of an instant. */
export const istDate = (d: Date): string => new Date(d.getTime() + IST_MS).toISOString().slice(0, 10);

/** Add days to a "YYYY-MM-DD" string. */
export function addDays(date: string, n: number): string {
  return new Date(Date.parse(`${date}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}
/** Monday of the week containing the date (weeks run Monday to Sunday). */
export function mondayOf(date: string): string {
  const dow = new Date(`${date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  return addDays(date, -((dow + 6) % 7));
}
export const monthOf = (date: string): string => date.slice(0, 7);

export function periodKey(date: string, group: Group): string {
  return group === "day" ? date : group === "week" ? mondayOf(date) : monthOf(date);
}
export function periodLabel(key: string, group: Group): string {
  const fmt = (d: string, o: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { timeZone: "UTC", ...o });
  if (group === "day") return fmt(key, { day: "2-digit", month: "short" });
  if (group === "week") return `Week of ${fmt(key, { day: "2-digit", month: "short" })}`;
  return fmt(`${key}-01`, { month: "short", year: "numeric" });
}
function nextKey(key: string, group: Group): string {
  if (group === "day") return addDays(key, 1);
  if (group === "week") return addDays(key, 7);
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

export interface Row {
  bills: number;
  units: number;
  revenue: number;
  cost: number;
  profit: number;
}
export interface Period extends Row {
  key: string;
  label: string;
}
export interface Report {
  totals: Row & { discount: number; cash: number; upi: number; avgBill: number; marginPct: number; costMissingUnits: number };
  series: Period[];
  topItems: (Row & { name: string })[];
  categories: (Row & { name: string })[];
}

const blank = (): Row => ({ bills: 0, units: 0, revenue: 0, cost: 0, profit: 0 });
const pct = (profit: number, revenue: number) => (revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0);

export function buildReport(opts: { sales: ReportSale[]; group: Group; from?: string; to?: string; categoryOf: (variantId: string) => string }): Report {
  const { sales, group, categoryOf } = opts;
  const totals = { ...blank(), discount: 0, cash: 0, upi: 0, avgBill: 0, marginPct: 0, costMissingUnits: 0 };
  const periods = new Map<string, Row>();
  const items = new Map<string, Row & { name: string }>();
  const cats = new Map<string, Row & { name: string }>();

  for (const s of sales) {
    const saleCost = s.items.reduce((c, i) => c + i.qty * i.unitCost, 0);
    const saleUnits = s.items.reduce((u, i) => u + i.qty, 0);
    totals.bills += 1;
    totals.units += saleUnits;
    totals.revenue += s.total;
    totals.cost += saleCost;
    totals.discount += s.discount;
    totals.cash += s.payments.cash;
    totals.upi += s.payments.upi;
    totals.costMissingUnits += s.items.filter((i) => i.unitCost === 0).reduce((u, i) => u + i.qty, 0);

    const key = periodKey(istDate(s.at), group);
    const p = periods.get(key) ?? blank();
    p.bills += 1;
    p.units += saleUnits;
    p.revenue += s.total;
    p.cost += saleCost;
    periods.set(key, p);

    for (const i of s.items) {
      const cost = i.qty * i.unitCost;
      const it = items.get(i.variantId) ?? { ...blank(), name: i.name };
      it.units += i.qty;
      it.revenue += i.lineTotal;
      it.cost += cost;
      items.set(i.variantId, it);
      const cn = categoryOf(i.variantId);
      const c = cats.get(cn) ?? { ...blank(), name: cn };
      c.units += i.qty;
      c.revenue += i.lineTotal;
      c.cost += cost;
      cats.set(cn, c);
    }
  }
  totals.profit = totals.revenue - totals.cost;
  totals.avgBill = totals.bills ? Math.round(totals.revenue / totals.bills) : 0;
  totals.marginPct = pct(totals.profit, totals.revenue);

  // continuous series, so days with no sales show as zero instead of disappearing
  const keys = [...periods.keys()].sort();
  const first = opts.from ? periodKey(opts.from, group) : keys[0];
  const last = opts.to ? periodKey(opts.to, group) : keys[keys.length - 1];
  const series: Period[] = [];
  if (first && last) {
    for (let k = first, n = 0; k <= last && n < 400; k = nextKey(k, group), n++) {
      const r = periods.get(k) ?? blank();
      series.push({ key: k, label: periodLabel(k, group), ...r, profit: r.revenue - r.cost });
    }
  }
  const finish = <T extends Row>(r: T): T => ({ ...r, profit: r.revenue - r.cost });
  return {
    totals,
    series,
    topItems: [...items.values()].map(finish).sort((a, b) => b.units - a.units).slice(0, 15),
    categories: [...cats.values()].map(finish).sort((a, b) => b.revenue - a.revenue),
  };
}
