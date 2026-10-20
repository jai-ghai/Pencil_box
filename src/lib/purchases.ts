import { Purchase, Variant } from "./models";
import { recordMovement, withStockTransaction } from "./stock";
import { toPaise } from "./catalog";
import { AppError } from "./errors";
import { audit } from "./audit";

export interface PurchaseLineEdit {
  /** pieces bought; 0 removes the line (its stock is taken back out) */
  qty: number;
  /** cost per piece, rupees */
  cost: number;
  /** selling price per piece, rupees; changes the item's price on the shop */
  price?: number;
}
export interface PurchaseEdit {
  invoiceNo?: string;
  note?: string;
  /** one entry per existing line, in the same order */
  lines: PurchaseLineEdit[];
}

/**
 * Fix a purchase that was entered wrongly: quantity, cost per piece and selling price of each line.
 * Stock follows the quantity change through the ledger (a correcting row is added, nothing is rewritten),
 * the item's cost and selling price are updated when changed, and the purchase total is recalculated.
 */
export async function editPurchase(id: string, input: PurchaseEdit, by: string) {
  const purchase = await Purchase.findById(id);
  if (!purchase) throw new AppError("Purchase not found", 404);
  if (input.lines.length !== purchase.items.length) throw new AppError("This purchase changed. Reload the page and try again.", 409);

  const items: { variantId: unknown; name?: string | null; qty: number; unitCost: number; lineTotal: number }[] = [];
  const changes: string[] = [];
  await withStockTransaction(async (session) => {
    items.length = 0; // a transaction may run this block again after a transient error: start clean
    changes.length = 0;
    for (let i = 0; i < purchase.items.length; i++) {
      const old = purchase.items[i];
      const l = input.lines[i];
      const qty = Math.round(l.qty);
      if (!Number.isFinite(qty) || qty < 0 || !Number.isFinite(l.cost) || l.cost < 0) throw new AppError("Quantity and cost cannot be negative");
      const unitCost = toPaise(l.cost);
      const delta = qty - old.qty;
      if (delta !== 0) {
        await recordMovement({ variantId: String(old.variantId), type: "PURCHASE", qty: delta, unitCost, refId: purchase._id, note: "Purchase corrected", by }, session);
        changes.push(`${old.name}: qty ${old.qty} to ${qty}`);
      }
      if (qty > 0) {
        const set: Record<string, number> = {};
        if (unitCost !== old.unitCost) {
          set.costPrice = unitCost;
          changes.push(`${old.name}: cost ${old.unitCost / 100} to ${unitCost / 100}`);
        }
        if (l.price !== undefined) {
          const price = toPaise(l.price);
          const v = await Variant.findById(old.variantId, "sellPrice maxPrice", { session }).lean();
          if (v && v.sellPrice !== price) {
            set.sellPrice = price;
            changes.push(`${old.name}: price ${v.sellPrice / 100} to ${price / 100}`);
          }
        }
        if (Object.keys(set).length) await Variant.updateOne({ _id: old.variantId }, { $set: set }, { session });
        items.push({ variantId: old.variantId, name: old.name, qty, unitCost, lineTotal: qty * unitCost });
      } else {
        changes.push(`${old.name}: line removed`);
      }
    }
    if (!items.length) throw new AppError("Every line was removed. Use Delete to remove the whole purchase.");
    const total = items.reduce((s, x) => s + x.lineTotal, 0);
    await Purchase.updateOne(
      { _id: purchase._id },
      { $set: { items, total, invoiceNo: input.invoiceNo?.trim() || undefined, note: input.note?.trim() || undefined } },
      { session },
    );
  });
  // a change in selling price must not leave an old "higher price" below it
  await Variant.updateMany({ _id: { $in: items.map((x) => x.variantId) }, $expr: { $lt: ["$maxPrice", "$sellPrice"] } }, { $unset: { maxPrice: "" } });
  if (changes.length) await audit(by, "purchase.edit", "purchase", `Edited purchase: ${changes.join("; ")}`, { entityId: id });
  return Purchase.findById(id).populate("supplierId", "name").lean();
}

/** Delete a purchase entered by mistake: the stock it added is taken back out (a reversing row per line), then the record is removed. */
export async function deletePurchase(id: string, by: string) {
  const purchase = await Purchase.findById(id).lean();
  if (!purchase) throw new AppError("Purchase not found", 404);
  await withStockTransaction(async (session) => {
    for (const it of purchase.items) {
      if (it.qty !== 0) await recordMovement({ variantId: String(it.variantId), type: "PURCHASE", qty: -it.qty, unitCost: it.unitCost, refId: purchase._id, note: "Purchase deleted", by }, session);
    }
    await Purchase.deleteOne({ _id: purchase._id }, { session });
  });
  await audit(by, "purchase.delete", "purchase", `Deleted purchase (${purchase.items.length} lines, total ${purchase.total / 100})`, { entityId: id });
}
