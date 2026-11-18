/**
 * Daily-book analytics. Pure functions (no database), so the numbers can be tested. Money is integer paise,
 * days are India-time "YYYY-MM-DD" strings.
 *
 * The owner does not bill every sale, so the day's total is typed in by hand. Where a day has no typed total
 * but POS bills exist, the bills are used instead (never both, so nothing is counted twice).
 *
 *   sales          = typed total (cash + UPI) for the day
 *   buying         = stock bought (money out, but it is stock on the shelf, not yet a cost)
 *   expenses       = rent, power, helper pay, etc.
 *   estimated profit = sales x average margin - expenses
 *   cash left      = sales - buying - expenses   (a cash view; it goes down in a week you stock up heavily)
 */
import { addDays, istDate, mondayOf, periodKey, periodLabel, type Group } from "./reports";

export interface SalesDay {
  date: string;
  cash: number;
  upi: number;
}
export interface CostEntry {
  date: string;
  kind: "purchase" | "expense";
  amount: number;
  party?: string;
}

export interface Totals {
  sales: number;
  cash: number;
  upi: number;
  buying: number;
  expenses: number;
  estProfit: number;
  cashLeft: number;
  /** days in the range that have a sales figure */
  daysWithSales: number;
  /** days in the range with no sales figure at all (today excluded: the day is not over) */
  missingDays: string[];
  avgDaily: number;
}
export interface Slice {
  key: string;
  label: string;
  sales: number;
  buying: number;
  expenses: number;
  estProfit: number;
  cashLeft: number;
}
export interface Analytics {
  range: { from: string; to: string };
  group: Group;
  marginPct: number;
  totals: Totals;
  previous: { range: { from: string; to: string }; totals: Totals };
  /** percent change in sales against the previous period of the same length; null when that period had none */
  salesChangePct: number | null;
  series: Slice[];
  bestDay: { date: string; sales: number } | null;
  slowestDay: { date: string; sales: number } | null;
  weekdays: { name: string; avg: number; days: number }[];
  buyingByParty: { party: string; amount: number }[];
  expensesByParty: { party: string; amount: number }[];
  /** how much of the sales came from typed totals versus POS bills, in days */
  source: { entered: number; bills: number };
}

const MAX_DAYS = 400;
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function daysBetween(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from, n = 0; d <= to && n < MAX_DAYS; d = addDays(d, 1), n++) out.push(d);
  return out;
}

function nextKey(key: string, group: Group): string {
  if (group === "day") return addDays(key, 1);
  if (group === "week") return addDays(key, 7);
  const [y, m] = key.split("-").map(Number);
  return m === 12 ? `${y + 1}-01` : `${y}-${String(m + 1).padStart(2, "0")}`;
}

/** Average profit margin of the catalogue, from items that have both a selling and a cost price. Null when none do. */
export function catalogMarginPct(variants: { sellPrice: number; costPrice: number }[]): number | null {
  const m = variants.filter((v) => v.sellPrice > 0 && v.costPrice > 0 && v.costPrice < v.sellPrice * 3).map((v) => ((v.sellPrice - v.costPrice) / v.sellPrice) * 100);
  if (!m.length) return null;
  return Math.round((m.reduce((a, b) => a + b, 0) / m.length) * 10) / 10;
}

/** Typed totals win; bills fill the days nobody typed. */
export function mergeSales(entered: SalesDay[], bills: SalesDay[]): { days: Map<string, SalesDay> } {
  const days = new Map<string, SalesDay>();
  for (const b of bills) {
    const cur = days.get(b.date);
    days.set(b.date, cur ? { date: b.date, cash: cur.cash + b.cash, upi: cur.upi + b.upi } : { ...b });
  }
  for (const e of entered) days.set(e.date, { ...e }); // a typed day replaces that day's bills
  return { days };
}

function summarize(days: Map<string, SalesDay>, costs: CostEntry[], from: string, to: string, marginPct: number, today: string): Totals {
  const list = daysBetween(from, to);
  const t: Totals = { sales: 0, cash: 0, upi: 0, buying: 0, expenses: 0, estProfit: 0, cashLeft: 0, daysWithSales: 0, missingDays: [], avgDaily: 0 };
  for (const d of list) {
    const s = days.get(d);
    if (s) {
      t.cash += s.cash;
      t.upi += s.upi;
      t.daysWithSales += 1;
    } else if (d < today) t.missingDays.push(d);
  }
  t.sales = t.cash + t.upi;
  for (const c of costs) {
    if (c.date < from || c.date > to) continue;
    if (c.kind === "purchase") t.buying += c.amount;
    else t.expenses += c.amount;
  }
  t.estProfit = Math.round((t.sales * marginPct) / 100) - t.expenses;
  t.cashLeft = t.sales - t.buying - t.expenses;
  t.avgDaily = t.daysWithSales ? Math.round(t.sales / t.daysWithSales) : 0;
  return t;
}

const sumBy = (rows: CostEntry[], kind: CostEntry["kind"], from: string, to: string) => {
  const m = new Map<string, number>();
  for (const c of rows) {
    if (c.kind !== kind || c.date < from || c.date > to) continue;
    const k = c.party?.trim() || "Not named";
    m.set(k, (m.get(k) ?? 0) + c.amount);
  }
  return [...m].map(([party, amount]) => ({ party, amount })).sort((a, b) => b.amount - a.amount);
};

export function buildAnalytics(opts: { entered: SalesDay[]; bills: SalesDay[]; costs: CostEntry[]; from: string; to: string; group: Group; marginPct: number; today?: string }): Analytics {
  const { from, to, group, costs } = opts;
  const marginPct = Math.min(100, Math.max(0, opts.marginPct));
  const today = opts.today ?? istDate(new Date());
  const merged = mergeSales(opts.entered, opts.bills);
  const totals = summarize(merged.days, costs, from, to, marginPct, today);

  const len = daysBetween(from, to).length;
  const prevTo = addDays(from, -1);
  const prevFrom = addDays(from, -len);
  const prevTotals = summarize(merged.days, costs, prevFrom, prevTo, marginPct, today);

  // series: one slice per day / week / month, empty ones included so the chart has no holes
  const blank = () => ({ sales: 0, buying: 0, expenses: 0 });
  const slices = new Map<string, ReturnType<typeof blank>>();
  for (const d of daysBetween(from, to)) {
    const k = periodKey(d, group);
    const s = slices.get(k) ?? blank();
    const day = merged.days.get(d);
    if (day) s.sales += day.cash + day.upi;
    slices.set(k, s);
  }
  for (const c of costs) {
    if (c.date < from || c.date > to) continue;
    const k = periodKey(c.date, group);
    const s = slices.get(k) ?? blank();
    if (c.kind === "purchase") s.buying += c.amount;
    else s.expenses += c.amount;
    slices.set(k, s);
  }
  const keys = [...slices.keys()].sort();
  const series: Slice[] = [];
  if (keys.length) {
    for (let k = keys[0], n = 0; k <= keys[keys.length - 1] && n < MAX_DAYS; k = nextKey(k, group), n++) {
      const s = slices.get(k) ?? blank();
      series.push({ key: k, label: periodLabel(k, group), ...s, estProfit: Math.round((s.sales * marginPct) / 100) - s.expenses, cashLeft: s.sales - s.buying - s.expenses });
    }
  }

  const inRange = [...merged.days.values()].filter((d) => d.date >= from && d.date <= to && d.cash + d.upi > 0);
  const byTotal = [...inRange].sort((a, b) => b.cash + b.upi - (a.cash + a.upi));
  const dayView = (d?: SalesDay) => (d ? { date: d.date, sales: d.cash + d.upi } : null);

  const wd = WEEKDAYS.map((name) => ({ name, sum: 0, days: 0 }));
  for (const d of inRange) {
    const idx = (new Date(`${d.date}T00:00:00Z`).getUTCDay() + 6) % 7;
    wd[idx].sum += d.cash + d.upi;
    wd[idx].days += 1;
  }

  const enteredInRange = opts.entered.filter((e) => e.date >= from && e.date <= to).length;
  const billsOnly = [...new Set(opts.bills.filter((b) => b.date >= from && b.date <= to && !opts.entered.some((e) => e.date === b.date)).map((b) => b.date))].length;

  return {
    range: { from, to },
    group,
    marginPct,
    totals,
    previous: { range: { from: prevFrom, to: prevTo }, totals: prevTotals },
    salesChangePct: prevTotals.sales > 0 ? Math.round(((totals.sales - prevTotals.sales) / prevTotals.sales) * 1000) / 10 : null,
    series,
    bestDay: dayView(byTotal[0]),
    slowestDay: inRange.length > 1 ? dayView(byTotal[byTotal.length - 1]) : null,
    weekdays: wd.map((w) => ({ name: w.name, avg: w.days ? Math.round(w.sum / w.days) : 0, days: w.days })),
    buyingByParty: sumBy(costs, "purchase", from, to),
    expensesByParty: sumBy(costs, "expense", from, to),
    source: { entered: enteredInRange, bills: billsOnly },
  };
}

export { mondayOf };
