import { route, can } from "@/lib/api";
import { Product, Sale, Variant } from "@/lib/models";
import { startOfDayIST } from "@/lib/time";
import { verifyLedger } from "@/lib/stock";

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
    ledgerDrift: (await verifyLedger()).length,
  };
});
