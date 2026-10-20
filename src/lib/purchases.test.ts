import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Category, Product, Purchase, StockMovement, Supplier, Variant } from "./models";
import { saveProduct } from "./catalog";
import { recordMovement, verifyLedger, withStockTransaction } from "./stock";
import { createPurchase, deletePurchase, editPurchase } from "./purchases";
import { AppError } from "./errors";

let repl: MongoMemoryReplSet;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

/** One product with one variant (cost 5, price 10) and a purchase of 20 pieces at 5. */
async function setup(name: string) {
  const cat = (await Category.findOne({ slug: "c" })) ?? (await Category.create({ name_en: "C", slug: "c" }));
  const supplier = (await Supplier.findOne({ name: "S" })) ?? (await Supplier.create({ name: "S" }));
  const p = await saveProduct({ name_en: name, categoryId: String(cat._id), images: [], attributes: {}, tags: [], active: true, variants: [{ label: "", sellPrice: 10, costPrice: 5, aliases: [], baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: true }] } as Parameters<typeof saveProduct>[0]);
  const variant = (await Variant.findOne({ productId: p._id }))!;
  const purchase = await Purchase.create({ supplierId: supplier._id, items: [{ variantId: variant._id, name, qty: 20, unitCost: 500, lineTotal: 10000 }], total: 10000 });
  await withStockTransaction((s) => recordMovement({ variantId: String(variant._id), type: "PURCHASE", qty: 20, unitCost: 500, refId: purchase._id, by: "t" }, s));
  return { variant, purchase };
}

describe("editPurchase", () => {
  it("fixes quantity, cost and price, and stock follows", async () => {
    const { variant, purchase } = await setup("Edit A");
    const out = await editPurchase(String(purchase._id), { lines: [{ qty: 12, cost: 6, price: 12 }] }, "owner");
    expect(out?.items[0].qty).toBe(12);
    expect(out?.total).toBe(12 * 600);
    const v = (await Variant.findById(variant._id))!;
    expect(v.stockOnHand).toBe(12);
    expect(v.costPrice).toBe(600);
    expect(v.sellPrice).toBe(1200);
    expect(await verifyLedger()).toEqual([]);
  });
  it("removing every line is refused and changes nothing", async () => {
    const { variant, purchase } = await setup("Edit B");
    await expect(editPurchase(String(purchase._id), { lines: [{ qty: 0, cost: 5 }] }, "owner")).rejects.toBeInstanceOf(AppError);
    expect((await Variant.findById(variant._id))!.stockOnHand).toBe(20); // the refused edit changed nothing
  });
  it("refuses negative numbers", async () => {
    const { purchase } = await setup("Edit C");
    await expect(editPurchase(String(purchase._id), { lines: [{ qty: -1, cost: 5 }] }, "owner")).rejects.toBeInstanceOf(AppError);
  });
});

describe("deletePurchase", () => {
  it("takes the stock back out and removes the purchase, keeping the ledger in balance", async () => {
    const { variant, purchase } = await setup("Del A");
    await deletePurchase(String(purchase._id), "owner");
    expect(await Purchase.findById(purchase._id)).toBeNull();
    expect((await Variant.findById(variant._id))!.stockOnHand).toBe(0);
    expect(await StockMovement.countDocuments({ variantId: variant._id })).toBe(2); // the purchase and its reversal
    expect(await verifyLedger()).toEqual([]);
    expect(await Product.countDocuments({ name_en: "Del A" })).toBe(1); // the product itself stays
  });
});

describe("createPurchase", () => {
  it("adds stock, records the purchase, updates cost and price, and creates a new supplier by name", async () => {
    const { variant } = await setup("New A"); // stock 20, cost 5, price 10
    const out = await createPurchase({ supplierName: "Fresh Supplier", lines: [{ variantId: String(variant._id), qty: 10, cost: 6, price: 12 }] }, "owner");
    expect(out?.total).toBe(6000);
    expect(out?.supplierId).toMatchObject({ name: "Fresh Supplier" });
    const v = (await Variant.findById(variant._id))!;
    expect(v.stockOnHand).toBe(30);
    expect(v.costPrice).toBe(600);
    expect(v.sellPrice).toBe(1200);
    expect(await verifyLedger()).toEqual([]);
    // the same name later finds the same supplier
    await createPurchase({ supplierName: "fresh supplier", lines: [{ variantId: String(variant._id), qty: 1, cost: 6 }] }, "owner");
    expect(await Supplier.countDocuments({ name: /^fresh supplier$/i })).toBe(1);
  });
  it("refuses an empty list, a repeated item, a zero quantity and a missing supplier", async () => {
    const { variant } = await setup("New B");
    const id = String(variant._id);
    await expect(createPurchase({ supplierName: "X", lines: [] }, "o")).rejects.toBeInstanceOf(AppError);
    await expect(createPurchase({ supplierName: "X", lines: [{ variantId: id, qty: 1, cost: 1 }, { variantId: id, qty: 1, cost: 1 }] }, "o")).rejects.toBeInstanceOf(AppError);
    await expect(createPurchase({ supplierName: "X", lines: [{ variantId: id, qty: 0, cost: 1 }] }, "o")).rejects.toBeInstanceOf(AppError);
    await expect(createPurchase({ lines: [{ variantId: id, qty: 1, cost: 1 }] }, "o")).rejects.toBeInstanceOf(AppError);
  });
});
