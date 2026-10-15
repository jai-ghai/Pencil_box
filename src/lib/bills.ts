import { z } from "zod";
import { AppError } from "./errors";
import { Product, Sale, Variant } from "./models";
import { priceCart, type CartLineInput } from "./pricing";
import { loadOffers, stockEffects } from "./sales";
import { recordMovement, withStockTransaction } from "./stock";
import { audit } from "./audit";

/** One line of a saved bill (Mongoose types sub-documents loosely, so this is spelled out). */
interface SaleItemRow {
  variantId: unknown;
  name?: string | null;
  qty?: number | null;
  unitPrice?: number | null;
  unitCost?: number | null;
  lineTotal?: number | null;
}

/**
 * Delete a bill: put every item back on the shelf, remove the bill, and keep a copy of it in the audit trail
 * (so the super admin can still see what was deleted, by whom, and when). Bill numbers are not reused.
 */
export async function deleteBill(id: string, by: string): Promise<{ billNo: number }> {
  const sale = await Sale.findById(id);
  if (!sale) throw new AppError("Bill not found", 404);
  const rows = sale.items as unknown as SaleItemRow[];
  const variants = await Variant.find({ _id: { $in: rows.map((i) => i.variantId) } }).lean();
  const byId = new Map(variants.map((v) => [String(v._id), v]));
  await withStockTransaction(async (session) => {
    for (const it of rows) {
      const v = byId.get(String(it.variantId));
      if (!v) continue; // the item itself has since been removed; nothing to put back
      for (const e of stockEffects(v, it.qty ?? 0)) {
        await recordMovement({ variantId: e.variantId, type: "RETURN", qty: e.qty, refId: sale._id, by, note: `bill #${sale.billNo} deleted` }, session);
      }
    }
    await audit(by, "bill.delete", "bill", `Deleted bill #${sale.billNo} (Rs ${(sale.total ?? 0) / 100}, ${rows.length} item lines)`, { entityId: id, meta: sale.toObject(), session });
    await Sale.deleteOne({ _id: sale._id }, { session });
  });
  return { billNo: sale.billNo };
}

export const editBillSchema = z.object({
  items: z.array(z.object({ variantId: z.string().length(24), qty: z.number().int().min(1).max(100000) })).min(1).max(200),
  payMode: z.enum(["cash", "upi"]),
  note: z.string().max(200).optional(),
});
export type EditBillInput = z.infer<typeof editBillSchema>;

/**
 * Edit a bill: change quantities, remove lines, add items, and switch between cash and UPI.
 * Lines that were already on the bill keep their original price and cost; new lines use today's price.
 * Offers are applied as they are today. Stock is corrected by the difference.
 */
export async function editBill(id: string, input: EditBillInput, by: string) {
  const sale = await Sale.findById(id);
  if (!sale) throw new AppError("Bill not found", 404);
  const rows = sale.items as unknown as SaleItemRow[];

  const wanted = new Map<string, number>();
  for (const i of input.items) wanted.set(i.variantId, (wanted.get(i.variantId) ?? 0) + i.qty);
  const old = new Map(rows.map((i) => [String(i.variantId), i]));

  const ids = [...new Set([...wanted.keys(), ...old.keys()])];
  const variants = await Variant.find({ _id: { $in: ids } }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en brandId categoryId").lean();
  const vById = new Map(variants.map((v) => [String(v._id), v]));
  const pById = new Map(products.map((p) => [String(p._id), p]));

  const lines: CartLineInput[] = [];
  const meta = new Map<string, { name: string; unitCost: number }>();
  for (const [variantId, qty] of wanted) {
    const was = old.get(variantId);
    const v = vById.get(variantId);
    if (!was && (!v || !v.active)) throw new AppError("One of the items was not found");
    const p = v ? pById.get(String(v.productId)) : undefined;
    lines.push({
      variantId,
      qty,
      unitPrice: was ? (was.unitPrice ?? 0) : v!.sellPrice,
      categoryId: p?.categoryId ? String(p.categoryId) : undefined,
      brandId: p?.brandId ? String(p.brandId) : undefined,
    });
    meta.set(variantId, { name: was ? (was.name ?? "") : [p?.name_en, v!.label].filter(Boolean).join(" "), unitCost: was ? (was.unitCost ?? 0) : v!.costPrice });
  }
  const priced = priceCart(lines, await loadOffers());

  // stock difference: what the old bill took, minus what the new bill takes (positive = back on the shelf)
  const delta = new Map<string, number>();
  const bump = (variantId: string, d: number) => delta.set(variantId, (delta.get(variantId) ?? 0) + d);
  for (const it of rows) {
    const v = vById.get(String(it.variantId));
    if (v) for (const e of stockEffects(v, it.qty ?? 0)) bump(e.variantId, e.qty);
  }
  for (const l of priced.lines) {
    const v = vById.get(l.variantId);
    if (v) for (const e of stockEffects(v, l.qty)) bump(e.variantId, -e.qty);
  }

  const before = { total: sale.total, payments: sale.payments?.toObject?.() ?? sale.payments, items: rows.map((i) => ({ name: i.name, qty: i.qty, lineTotal: i.lineTotal })) };
  await withStockTransaction(async (session) => {
    for (const [variantId, d] of delta) {
      if (d !== 0) await recordMovement({ variantId, type: "ADJUSTMENT", qty: d, refId: sale._id, by, note: `bill #${sale.billNo} edited` }, session);
    }
    sale.set(
      "items",
      priced.lines.map((l) => ({
        variantId: l.variantId,
        name: meta.get(l.variantId)!.name,
        qty: l.qty,
        freeUnits: l.freeUnits,
        unitPrice: l.unitPrice,
        unitCost: meta.get(l.variantId)!.unitCost,
        baseTotal: l.baseTotal,
        discount: l.discount,
        lineTotal: l.lineTotal,
        offerId: l.offerId,
        offerLabel: l.offerLabel_en,
      })),
    );
    sale.subtotal = priced.subtotal;
    sale.discount = priced.discount;
    sale.total = priced.total;
    sale.set("payments", input.payMode === "cash" ? { cash: priced.total, upi: 0 } : { cash: 0, upi: priced.total });
    sale.note = input.note?.trim() || undefined;
    sale.editedAt = new Date();
    sale.editedBy = by;
    await sale.save({ session });
    await audit(by, "bill.edit", "bill", `Edited bill #${sale.billNo}: Rs ${(before.total ?? 0) / 100} -> Rs ${priced.total / 100}`, {
      entityId: id,
      meta: { before, after: { total: priced.total, payMode: input.payMode, items: priced.lines.map((l) => ({ name: meta.get(l.variantId)!.name, qty: l.qty, lineTotal: l.lineTotal })) } },
      session,
    });
  });
  return { billNo: sale.billNo, total: priced.total };
}
