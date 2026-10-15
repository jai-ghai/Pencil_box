import ExcelJS from "exceljs";
import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { Brand, Category, Product, Purchase, Variant } from "@/lib/models";

const IST = (d: Date) => new Date(d.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10);
interface Item { variantId: unknown; name: string; qty: number; unitCost: number; lineTotal: number }
interface Row { date: Date; supplierId?: { name?: string } | null; invoiceNo?: string; note?: string; total: number; items: Item[] }
const rupees = (paise: number) => Math.round(paise) / 100;

/**
 * Excel file of purchases: one row per item bought, with the current selling price and margin beside the cost so the
 * whole bill can be checked. `?id=` exports one purchase, otherwise the latest 500. Totals are live formulas.
 */
export const GET = route(can("purchases"), async (req) => {
  const id = new URL(req.url).searchParams.get("id");
  if (id && !/^[0-9a-f]{24}$/i.test(id)) throw new AppError("Invalid purchase");
  const found = await Purchase.find(id ? { _id: id } : {}).sort({ date: -1 }).limit(500).populate("supplierId", "name").lean();
  const purchases = found as unknown as Row[];
  if (id && purchases.length === 0) throw new AppError("Purchase not found", 404);

  const variantIds = [...new Set(purchases.flatMap((p) => p.items.map((i) => String(i.variantId))))];
  const variants = await Variant.find({ _id: { $in: variantIds } }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }).lean();
  const brands = new Map((await Brand.find({}).lean()).map((b) => [String(b._id), b.name]));
  const cats = new Map((await Category.find({}).lean()).map((c) => [String(c._id), c]));
  const vById = new Map(variants.map((v) => [String(v._id), v]));
  const pById = new Map(products.map((p) => [String(p._id), p]));
  const catName = (cid: unknown) => {
    const c = cats.get(String(cid));
    const parent = c?.parentId ? cats.get(String(c.parentId)) : null;
    return parent ? `${parent.name_en} / ${c?.name_en}` : (c?.name_en ?? "");
  };

  const wb = new ExcelJS.Workbook();
  wb.creator = "Pencil Box";
  const ws = wb.addWorksheet("Items bought", { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Supplier", key: "supplier", width: 14 },
    { header: "Invoice", key: "invoice", width: 10 },
    { header: "Code", key: "code", width: 9 },
    { header: "Brand", key: "brand", width: 14 },
    { header: "Item", key: "item", width: 38 },
    { header: "Option", key: "label", width: 24 },
    { header: "Category", key: "cat", width: 30 },
    { header: "Qty", key: "qty", width: 8 },
    { header: "Unit", key: "unit", width: 8 },
    { header: "Cost each (₹)", key: "cost", width: 13 },
    { header: "Line total (₹)", key: "total", width: 14 },
    { header: "Selling price (₹)", key: "sell", width: 15 },
    { header: "Profit each (₹)", key: "profit", width: 14 },
    { header: "Margin %", key: "margin", width: 10 },
    { header: "Stock now", key: "stock", width: 10 },
    { header: "Note", key: "note", width: 50 },
  ];

  let row = 1;
  for (const p of purchases) {
    for (const it of p.items) {
      const v = vById.get(String(it.variantId));
      const prod = v ? pById.get(String(v.productId)) : undefined;
      row++;
      const cost = rupees(it.unitCost);
      const sell = v ? rupees(v.sellPrice) : null;
      ws.addRow({
        date: IST(p.date),
        supplier: (p.supplierId as { name?: string } | null)?.name ?? "",
        invoice: p.invoiceNo ?? "",
        code: v?.shortCode?.toUpperCase() ?? "",
        brand: prod?.brandId ? (brands.get(String(prod.brandId)) ?? "") : "",
        item: prod?.name_en ?? it.name,
        label: v?.label ?? "",
        cat: prod ? catName(prod.categoryId) : "",
        qty: it.qty,
        unit: v?.baseUnit ?? "piece",
        cost,
        total: { formula: `I${row}*K${row}`, result: rupees(it.lineTotal) },
        sell,
        profit: sell === null ? null : { formula: `M${row}-K${row}`, result: Math.round((sell - cost) * 100) / 100 },
        margin: sell === null || !sell ? null : { formula: `IF(M${row}=0,"",(M${row}-K${row})/M${row})`, result: (sell - cost) / sell },
        stock: v?.stockOnHand ?? null,
        note: prod?.internalNote ?? "",
      });
    }
  }
  const last = row;
  const totals = ws.addRow({
    item: "TOTAL",
    qty: { formula: `SUM(I2:I${last})`, result: purchases.reduce((s, p) => s + p.items.reduce((a, i) => a + i.qty, 0), 0) },
    total: { formula: `SUM(L2:L${last})`, result: rupees(purchases.reduce((s, p) => s + p.total, 0)) },
  });
  totals.font = { bold: true };
  ws.getRow(1).font = { bold: true };
  ws.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE680" } };
  ws.autoFilter = { from: "A1", to: "Q1" };
  for (const key of ["cost", "total", "sell", "profit"]) ws.getColumn(key).numFmt = "#,##0.00";
  ws.getColumn("margin").numFmt = "0%";

  const sum = wb.addWorksheet("Purchases", { views: [{ state: "frozen", ySplit: 1 }] });
  sum.columns = [
    { header: "Date", key: "date", width: 12 },
    { header: "Supplier", key: "supplier", width: 16 },
    { header: "Invoice", key: "invoice", width: 10 },
    { header: "Items", key: "items", width: 8 },
    { header: "Pieces", key: "pieces", width: 8 },
    { header: "Total (₹)", key: "total", width: 14 },
    { header: "Note", key: "note", width: 70 },
  ];
  for (const p of purchases) {
    sum.addRow({ date: IST(p.date), supplier: (p.supplierId as { name?: string } | null)?.name ?? "", invoice: p.invoiceNo ?? "", items: p.items.length, pieces: p.items.reduce((s, i) => s + i.qty, 0), total: rupees(p.total), note: p.note ?? "" });
  }
  sum.getRow(1).font = { bold: true };
  sum.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFFE680" } };
  sum.getColumn("total").numFmt = "#,##0.00";

  const file = await wb.xlsx.writeBuffer();
  const name = id ? `pencilbox-purchase-${IST(purchases[0].date)}.xlsx` : "pencilbox-purchases.xlsx";
  return new Response(file as ArrayBuffer, {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": `attachment; filename="${name}"`,
      "cache-control": "no-store",
    },
  });
});
