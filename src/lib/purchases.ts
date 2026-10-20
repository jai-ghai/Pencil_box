import { Product, Purchase, Supplier, Variant } from "./models";
import { escapeRegex } from "./search";
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

export interface NewPurchase {
  supplierId?: string;
  /** used when no supplier is chosen: finds the supplier by this name or creates it */
  supplierName?: string;
  invoiceNo?: string;
  note?: string;
  date?: Date;
  lines: { variantId: string; qty: number; cost: number; price?: number }[];
}

/**
 * Record stock bought from a supplier: one purchase record, one ledger row per item (stock goes up),
 * and the item's cost price (and selling price, if given) is brought in line with this bill.
 */
export async function createPurchase(input: NewPurchase, by: string) {
  if (!input.lines.length) throw new AppError("Add at least one item");
  const seen = new Set<string>();
  for (const l of input.lines) {
    if (seen.has(l.variantId)) throw new AppError("The same item is in the list twice. Add its quantities together.");
    seen.add(l.variantId);
    if (!Number.isInteger(l.qty) || l.qty < 1) throw new AppError("Every quantity must be a whole number of at least 1");
    if (!Number.isFinite(l.cost) || l.cost < 0) throw new AppError("Cost cannot be negative");
  }

  let supplier = input.supplierId ? await Supplier.findById(input.supplierId) : null;
  const name = input.supplierName?.trim();
  if (!supplier && name) supplier = (await Supplier.findOne({ name: new RegExp(`^${escapeRegex(name)}$`, "i") })) ?? (await Supplier.create({ name }));
  if (!supplier) throw new AppError("Choose a supplier or type a new supplier name");

  const variants = await Variant.find({ _id: { $in: input.lines.map((l) => l.variantId) } }).lean();
  const products = await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en").lean();
  const vById = new Map(variants.map((v) => [String(v._id), v]));
  const pName = new Map(products.map((p) => [String(p._id), p.name_en]));
  const items = input.lines.map((l) => {
    const v = vById.get(l.variantId);
    if (!v) throw new AppError("An item in the list was not found. Reload and try again.", 404);
    const unitCost = toPaise(l.cost);
    return { variantId: v._id, name: [pName.get(String(v.productId)), v.label].filter(Boolean).join(" "), qty: l.qty, unitCost, lineTotal: l.qty * unitCost };
  });
  const total = items.reduce((s, i) => s + i.lineTotal, 0);

  const purchaseId = await withStockTransaction(async (session) => {
    const [purchase] = await Purchase.create([{ supplierId: supplier._id, invoiceNo: input.invoiceNo?.trim() || undefined, note: input.note?.trim() || undefined, items, total, date: input.date ?? new Date() }], { session });
    for (let i = 0; i < items.length; i++) {
      const it = items[i];
      await recordMovement({ variantId: String(it.variantId), type: "PURCHASE", qty: it.qty, unitCost: it.unitCost, refId: purchase._id, note: "Purchase", by }, session);
      const set: Record<string, number> = {};
      if (it.unitCost !== vById.get(String(it.variantId))!.costPrice) set.costPrice = it.unitCost;
      const price = input.lines[i].price;
      if (price !== undefined && toPaise(price) !== vById.get(String(it.variantId))!.sellPrice) set.sellPrice = toPaise(price);
      if (Object.keys(set).length) await Variant.updateOne({ _id: it.variantId }, { $set: set }, { session });
    }
    return String(purchase._id);
  });
  await Variant.updateMany({ _id: { $in: items.map((x) => x.variantId) }, $expr: { $lt: ["$maxPrice", "$sellPrice"] } }, { $unset: { maxPrice: "" } });
  await audit(by, "purchase.create", "purchase", `New purchase from ${supplier.name}: ${items.length} items, total ${total / 100}`, { entityId: purchaseId });
  return Purchase.findById(purchaseId).populate("supplierId", "name").lean();
}
