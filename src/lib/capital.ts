/**
 * Capital and cash position. Pure functions (no database). Money is integer paise,
 * days are India-time "YYYY-MM-DD" strings.
 *
 * The owner put a fixed amount of capital into the shop. These numbers answer the question
 * "where is that money now?":
 *
 *   sales          = typed daily total (cash + UPI); POS bills fill days nobody typed
 *   purchases      = stock bought (money out, but it goes on the shelf)
 *   expenses       = rent, power, helper pay, etc.
 *   cashRecovered  = sales - purchases - expenses                    (money back in your pocket)
 *   shelfValue     = sum(stockOnHand x costPrice) for live items     (money sitting on the shelf)
 *   position       = cashRecovered + shelfValue - capital            (profit/loss on paper)
 *   recovered%     = cashRecovered / capital                         (cash-only recovery)
 *   books%         = position / capital                              (full recovery incl. the shelf)
 *   dead stock     = items with stock but no sale in N days          (capital that is stuck)
 */
import { mergeSales, type CostEntry, type SalesDay } from "./daybook";

export interface PurchaseTotal {
  date: string;
  /** paise */
  total: number;
}

export interface DeadStockLine {
  id: string;
  name: string;
  qty: number;
  /** qty x costPrice in paise; 0 when the item has no cost price saved */
  value: number;
  /** India-time date of the last SALE movement, or null if the item has never been sold */
  lastSoldDate: string | null;
}

export interface CapitalInput {
  /** paise; 0 when the owner has not set it yet */
  capitalStart: number;
  /** YYYY-MM-DD; null to count every day of data on file */
  startDate: string | null;
  today: string;
  entered: SalesDay[];
  bills: SalesDay[];
  costs: CostEntry[];
  /** totals from the full Purchase entry form, keyed by India-time day */
  purchases: PurchaseTotal[];
  shelfValue: number;
  /** count of items with stock on hand but no cost price saved: the shelf value is understated by this many */
  unpricedOnShelf: number;
  deadStock: DeadStockLine[];
  deadStockDays: number;
}

export interface CapitalSummary {
  capitalStart: number;
  startDate: string | null;
  /** first India-time day used in the window (= startDate, or the earliest data on file) */
  from: string;
  to: string;
  /** days from `from` to `to`, inclusive */
  days: number;

  sales: number;
  purchases: number;
  expenses: number;
  cashRecovered: number;

  shelfValue: number;
  unpricedOnShelf: number;

  position: number;
  /** cashRecovered / capitalStart, rounded to 1 decimal; null when no capital is set */
  recoveredPct: number | null;
  /** position / capitalStart, rounded to 1 decimal; null when no capital is set */
  booksPct: number | null;

  deadStockValue: number;
  deadStockLines: DeadStockLine[];
  deadStockDays: number;

  /** cashRecovered / monthsOfData, rounded to paise; the shop's net monthly rate so far */
  monthlyNetAvg: number;
  monthsOfData: number;
  /**
   * Months to recover the rest of the capital at `monthlyNetAvg`:
   *   - 0 when already recovered
   *   - null when there are fewer than 30 days of data (any figure would be a guess) or the rate is <= 0
   */
  monthsToPayback: number | null;
}

const DAY_MS = 86_400_000;
const MIN_DAYS_FOR_PAYBACK = 30;

/** Inclusive count of India-time days between two YYYY-MM-DD strings. Always at least 1. */
export function dayCount(from: string, to: string): number {
  if (from > to) return 1;
  return Math.floor((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS) + 1;
}

/** Earliest date in a list of dated records, or null if the list is empty. */
export function earliestDate(items: { date: string }[]): string | null {
  if (!items.length) return null;
  let m = items[0].date;
  for (const i of items) if (i.date < m) m = i.date;
  return m;
}

const divPct = (num: number, den: number): number | null => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

export function buildCapital(opts: CapitalInput): CapitalSummary {
  const today = opts.today;
  // Start of the window: the owner's chosen date, or the earliest day we have data for.
  // Falling back to today keeps dayCount at 1 when the shop has literally no data yet.
  const earliest = earliestDate([...opts.entered, ...opts.bills, ...opts.costs, ...opts.purchases]);
  const from = opts.startDate ?? earliest ?? today;
  const to = today;
  const inRange = (d: string) => d >= from && d <= to;

  // Sales: a typed day replaces that day's POS bills, so the same money can't be counted twice.
  const { days } = mergeSales(opts.entered.filter((e) => inRange(e.date)), opts.bills.filter((b) => inRange(b.date)));
  let sales = 0;
  for (const d of days.values()) sales += d.cash + d.upi;

  // Stock bought: the daybook shortcut AND the full Purchase form. The owner is told not to enter both for the same money.
  let purchases = 0;
  for (const c of opts.costs) if (c.kind === "purchase" && inRange(c.date)) purchases += c.amount;
  for (const p of opts.purchases) if (inRange(p.date)) purchases += p.total;

  let expenses = 0;
  for (const c of opts.costs) if (c.kind === "expense" && inRange(c.date)) expenses += c.amount;

  const cashRecovered = sales - purchases - expenses;
  const position = cashRecovered + opts.shelfValue - opts.capitalStart;

  const days_ = dayCount(from, to);
  const monthsOfData = Math.max(days_ / 30, 1 / 30); // never 0, but kept honest for very short windows
  const monthlyNetAvg = Math.round(cashRecovered / monthsOfData);

  const stillToRecover = Math.max(0, opts.capitalStart - cashRecovered);
  const haveEnoughData = days_ >= MIN_DAYS_FOR_PAYBACK;
  const monthsToPayback =
    opts.capitalStart <= 0 || !haveEnoughData ? null : stillToRecover === 0 ? 0 : monthlyNetAvg > 0 ? Math.ceil(stillToRecover / monthlyNetAvg) : null;

  let deadStockValue = 0;
  for (const d of opts.deadStock) deadStockValue += d.value;

  return {
    capitalStart: opts.capitalStart,
    startDate: opts.startDate,
    from,
    to,
    days: days_,
    sales,
    purchases,
    expenses,
    cashRecovered,
    shelfValue: opts.shelfValue,
    unpricedOnShelf: opts.unpricedOnShelf,
    position,
    recoveredPct: divPct(cashRecovered, opts.capitalStart),
    booksPct: divPct(position, opts.capitalStart),
    deadStockValue,
    deadStockLines: opts.deadStock,
    deadStockDays: opts.deadStockDays,
    monthlyNetAvg,
    monthsOfData: Math.round(monthsOfData * 10) / 10,
    monthsToPayback,
  };
}
