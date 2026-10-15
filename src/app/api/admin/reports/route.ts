import { z } from "zod";
import { route, can } from "@/lib/api";
import { Category, Product, Sale, Variant } from "@/lib/models";
import { buildReport, istDate, type ReportSale } from "@/lib/reports";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ from: date.optional(), to: date.optional(), group: z.enum(["day", "week", "month"]).default("day") });
const DAY_MS = 24 * 3600 * 1000;

/** One line of a saved bill (Mongoose types sub-documents loosely, so this is spelled out). */
type Row = { variantId: unknown; name?: string | null; qty?: number | null; unitCost?: number | null; lineTotal?: number | null };

/** Sales, cost, profit and margin for a date range (India time), grouped by day, week or month. */
export const GET = route(can("reports"), async (req) => {
  const { from, to, group } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const toDay = to ?? istDate(new Date());
  const at: Record<string, Date> = { $lt: new Date(Date.parse(`${toDay}T00:00:00+05:30`) + DAY_MS) };
  if (from) at.$gte = new Date(`${from}T00:00:00+05:30`);
  const sales = await Sale.find({ voided: false, at }).sort({ at: 1 }).limit(100_000).lean();

  // which top-level category each sold item belongs to
  const variantIds = [...new Set(sales.flatMap((s) => (s.items as unknown as Row[]).map((i) => String(i.variantId))))];
  const variants = await Variant.find({ _id: { $in: variantIds } }, "productId").lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "categoryId").lean();
  const cats = await Category.find({}, "name_en parentId").lean();
  const catById = new Map(cats.map((c) => [String(c._id), c]));
  const catOfProduct = new Map(products.map((p) => [String(p._id), String(p.categoryId)]));
  const categoryName = new Map<string, string>();
  for (const v of variants) {
    const cid = catOfProduct.get(String(v.productId));
    const c = cid ? catById.get(cid) : undefined;
    const top = c?.parentId ? catById.get(String(c.parentId)) : c;
    categoryName.set(String(v._id), top?.name_en ?? "Other");
  }

  const rows: ReportSale[] = sales.map((s) => ({
    at: s.at,
    total: s.total ?? 0,
    discount: s.discount ?? 0,
    payments: { cash: s.payments?.cash ?? 0, upi: s.payments?.upi ?? 0 },
    items: (s.items as unknown as Row[]).map((i) => ({ variantId: String(i.variantId), name: i.name ?? "", qty: i.qty ?? 0, unitCost: i.unitCost ?? 0, lineTotal: i.lineTotal ?? 0 })),
  }));
  const report = buildReport({ sales: rows, group, from, to: toDay, categoryOf: (id) => categoryName.get(id) ?? "Other" });
  return { range: { from: from ?? (rows[0] ? istDate(rows[0].at) : toDay), to: toDay }, group, ...report };
});
