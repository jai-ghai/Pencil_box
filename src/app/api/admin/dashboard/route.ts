import { route, can } from "@/lib/api";
import { Product, Sale, Setting, Variant } from "@/lib/models";
import { startOfDayIST } from "@/lib/time";
import { verifyLedger } from "@/lib/stock";

/** Full ledger scan is heavy — cache the drift count for 6h instead of scanning on every dashboard open. */
const LEDGER_CACHE_MS = 6 * 3600_000;
async function ledgerDriftCount(): Promise<number> {
  const cached = await Setting.findById("ledgerCheck").lean();
  const at = (cached?.value as { at?: number } | undefined)?.at ?? 0;
  const count = (cached?.value as { count?: number } | undefined)?.count ?? 0;
  if (Date.now() - at < LEDGER_CACHE_MS) return count;
  const drift = await verifyLedger();
  await Setting.updateOne({ _id: "ledgerCheck" }, { $set: { value: { at: Date.now(), count: drift.length, drift: drift.slice(0, 20) } } }, { upsert: true });
  return drift.length;
}

export const GET = route(can("dashboard"), async () => {
  const from = startOfDayIST();
  const [today] = await Sale.aggregate([
    { $match: { at: { $gte: from }, voided: false } },
    { $group: { _id: null, bills: { $sum: 1 }, total: { $sum: "$total" }, discount: { $sum: "$discount" }, cash: { $sum: "$payments.cash" }, upi: { $sum: "$payments.upi" } } },
  ]);
  const lowStock = await Variant.find({ active: true, reorderLevel: { $gt: 0 }, $expr: { $lte: ["$stockOnHand", "$reorderLevel"] } })
    .populate("productId", "name_en")
    .sort({ stockOnHand: 1 })
    .limit(50)
    .lean();
  const products = await Product.countDocuments({ active: true });
  return {
    today: today ?? { bills: 0, total: 0, discount: 0, cash: 0, upi: 0 },
    lowStock: lowStock.map((v) => ({ id: v._id, name: [(v.productId as unknown as { name_en: string })?.name_en, v.label].filter(Boolean).join(" "), stockOnHand: v.stockOnHand, reorderLevel: v.reorderLevel })),
    products,
    ledgerDrift: await ledgerDriftCount(),
  };
});
