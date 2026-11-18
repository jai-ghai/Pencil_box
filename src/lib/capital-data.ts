import { Brand, DayCost, DaySales, Product, Purchase, Sale, StockMovement, Variant } from "./models";
import { getSetting } from "./settings";
import { istDate } from "./reports";
import type { CostEntry, SalesDay } from "./daybook";
import type { CapitalInput, DeadStockLine, PurchaseTotal } from "./capital";

export const DEFAULT_DEAD_STOCK_DAYS = 60;

/**
 * Load everything the capital summary needs. One query per concept, joined in memory.
 * The shelf value and dead-stock aggregates are the heaviest; the rest are small reads.
 */
export async function loadCapitalSources(): Promise<Omit<CapitalInput, "today">> {
  const [capitalStart, startDate, deadStockDays] = await Promise.all([
    getSetting<number>("capitalStart", 0),
    getSetting<string | null>("capitalStartDate", null),
    getSetting<number>("deadStockDays", DEFAULT_DEAD_STOCK_DAYS),
  ]);

  const [entered, costs, bills, purchases, shelf, deadStock] = await Promise.all([
    loadTypedSales(),
    loadCosts(),
    loadBillDaysAllTime(),
    loadPurchaseTotals(),
    loadShelfValue(),
    loadDeadStock(deadStockDays),
  ]);

  return {
    capitalStart,
    startDate,
    entered,
    bills,
    costs,
    purchases,
    shelfValue: shelf.shelfValue,
    unpricedOnShelf: shelf.unpricedOnShelf,
    deadStock,
    deadStockDays,
  };
}

async function loadTypedSales(): Promise<SalesDay[]> {
  // DaySales is one row per India-time day; a 10,000 cap is 27 years of data.
  const rows = await DaySales.find({}).limit(10_000).lean();
  return rows.map((s) => ({ date: String(s._id), cash: s.cash ?? 0, upi: s.upi ?? 0 }));
}

async function loadCosts(): Promise<CostEntry[]> {
  const rows = await DayCost.find({}).limit(50_000).lean();
  return rows.map((c) => ({ date: c.date, kind: c.kind, amount: c.amount, party: c.party ?? undefined }));
}

/** Aggregate every non-voided POS bill into a per-India-day cash + UPI total. */
async function loadBillDaysAllTime(): Promise<SalesDay[]> {
  const rows = await Sale.aggregate<{ _id: string; cash: number; upi: number }>([
    { $match: { voided: false } },
    {
      $group: {
        _id: { $dateToString: { date: "$at", timezone: "+05:30", format: "%Y-%m-%d" } },
        cash: { $sum: { $ifNull: ["$payments.cash", 0] } },
        upi: { $sum: { $ifNull: ["$payments.upi", 0] } },
      },
    },
  ]);
  return rows.map((r) => ({ date: r._id, cash: r.cash ?? 0, upi: r.upi ?? 0 }));
}

/** Aggregate full-form purchases by India day. Keeping them separate from daybook purchases is the UI's job. */
async function loadPurchaseTotals(): Promise<PurchaseTotal[]> {
  const rows = await Purchase.aggregate<{ _id: string; total: number }>([
    {
      $group: {
        _id: { $dateToString: { date: "$date", timezone: "+05:30", format: "%Y-%m-%d" } },
        total: { $sum: { $ifNull: ["$total", 0] } },
      },
    },
  ]);
  return rows.map((r) => ({ date: r._id, total: r.total ?? 0 }));
}

/** Active, stock-tracked variants with something on hand, valued at their saved cost price. */
async function loadShelfValue(): Promise<{ shelfValue: number; unpricedOnShelf: number }> {
  const [row] = await Variant.aggregate<{ value: number; unpriced: number }>([
    { $match: { active: true, trackStock: { $ne: false }, stockOnHand: { $gt: 0 } } },
    {
      $group: {
        _id: null,
        value: { $sum: { $multiply: ["$stockOnHand", { $ifNull: ["$costPrice", 0] }] } },
        unpriced: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$costPrice", 0] }, 0] }, 0, 1] } },
      },
    },
  ]);
  return { shelfValue: row?.value ?? 0, unpricedOnShelf: row?.unpriced ?? 0 };
}

/** "Brand Name Label", without repeating the brand when the product name already starts with it. */
function title(brand: string, name: string, label: string): string {
  const b = brand && !name.toLowerCase().startsWith(brand.toLowerCase()) ? brand : "";
  return [b, name, label].filter(Boolean).join(" ");
}

/**
 * Items with stock but no SALE movement in the last `deadStockDays` days. One aggregation on the
 * ledger for the latest sale per variant, then joined with the live variants.
 */
async function loadDeadStock(deadStockDays: number): Promise<DeadStockLine[]> {
  const cutoff = new Date(Date.now() - deadStockDays * 86_400_000);

  const [lastSales, variants] = await Promise.all([
    StockMovement.aggregate<{ _id: unknown; lastSale: Date }>([
      { $match: { type: "SALE" } },
      { $group: { _id: "$variantId", lastSale: { $max: "$at" } } },
    ]),
    Variant.find({ active: true, trackStock: { $ne: false }, stockOnHand: { $gt: 0 } }, "productId label costPrice stockOnHand").lean(),
  ]);
  const lastById = new Map(lastSales.map((r) => [String(r._id), r.lastSale]));

  const productIds = [...new Set(variants.map((v) => String(v.productId)))];
  const products = await Product.find({ _id: { $in: productIds } }, "name_en brandId").lean();
  const productById = new Map(products.map((p) => [String(p._id), p]));
  const brands = await Brand.find({ _id: { $in: [...new Set(products.map((p) => p.brandId).filter(Boolean))] } }, "name").lean();
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));

  const dead: DeadStockLine[] = [];
  for (const v of variants) {
    const last = lastById.get(String(v._id));
    if (last && last >= cutoff) continue; // sold recently, not dead
    const p = productById.get(String(v.productId));
    if (!p) continue;
    const brand = p.brandId ? brandName.get(String(p.brandId)) ?? "" : "";
    const name = title(brand, p.name_en, v.label ?? "");
    const cost = v.costPrice ?? 0;
    dead.push({ id: String(v._id), name, qty: v.stockOnHand, value: cost * v.stockOnHand, lastSoldDate: last ? istDate(last) : null });
  }
  // Priced items first (so the owner sees real money at the top), then by qty for the unpriced tail.
  return dead.sort((a, b) => b.value - a.value || b.qty - a.qty);
}

/** Convenience re-export: today in India time, for the route handler. */
export const todayIST = (): string => istDate(new Date());
