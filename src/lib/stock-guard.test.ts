import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Category, Product, Purchase, StockMovement, Supplier, Variant } from "./models";
import { saveProduct } from "./catalog";

/**
 * Covers the fixes from the app audit:
 *  - HARD_STOCK_BLOCK on: a sale beyond the shelf count fails atomically (no negative stock, no half ledger)
 *  - flag off (default): sales may go negative (owner's stock counts are not trusted yet — deliberate)
 *  - createPurchase inside an outer session rolls back with it (buy-list path)
 */
let repl: MongoMemoryReplSet;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

async function makeVariant(name: string, stock: number) {
  const cat = (await Category.findOne({ slug: "c" })) ?? (await Category.create({ name_en: "C", slug: "c" }));
  const p = await saveProduct({
    name_en: name,
    categoryId: String(cat._id),
    images: [],
    attributes: {},
    tags: [],
    active: true,
    variants: [{ label: "", sellPrice: 10, costPrice: 5, aliases: [], baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: true }],
  } as Parameters<typeof saveProduct>[0]);
  const variant = (await Variant.findOne({ productId: p._id }))!;
  const supplier = (await Supplier.findOne({ name: "S" })) ?? (await Supplier.create({ name: "S" }));
  const purchase = await Purchase.create({ supplierId: supplier._id, items: [], total: 0 });
  const { recordMovement, withStockTransaction } = await import("./stock");
  await withStockTransaction((s) => recordMovement({ variantId: String(variant._id), type: "OPENING", qty: stock, unitCost: 0, refId: purchase._id, by: "t" }, s));
  return variant;
}

describe("stock guard (HARD_STOCK_BLOCK)", () => {
  it("default off: selling more than the shelf allows negative stock (current shop behaviour)", async () => {
    vi.resetModules();
    vi.stubEnv("HARD_STOCK_BLOCK", "");
    const { recordMovement, withStockTransaction } = await import("./stock");
    const v = await makeVariant("Guard Off", 5);
    await withStockTransaction((s) => recordMovement({ variantId: String(v._id), type: "SALE", qty: -8, by: "t" }, s));
    expect((await Variant.findById(v._id))!.stockOnHand).toBe(-3);
    vi.unstubAllEnvs();
  });

  it("flag on: overselling fails atomically — stock and ledger untouched", async () => {
    vi.resetModules();
    vi.stubEnv("HARD_STOCK_BLOCK", "true");
    const { recordMovement, withStockTransaction } = await import("./stock");
    const v = await makeVariant("Guard On", 5);
    const before = await StockMovement.countDocuments({ variantId: v._id });
    // dynamic import after resetModules loads a fresh AppError class — match the thrown shape, not instanceof
    await expect(withStockTransaction((s) => recordMovement({ variantId: String(v._id), type: "SALE", qty: -8, by: "t" }, s))).rejects.toMatchObject({
      message: "Not enough stock for this sale. Check the count and try again.",
      status: 409,
    });
    expect((await Variant.findById(v._id))!.stockOnHand).toBe(5);
    expect(await StockMovement.countDocuments({ variantId: v._id })).toBe(before);
    vi.unstubAllEnvs();
  });

  it("flag on: a sale within the count still passes", async () => {
    vi.resetModules();
    vi.stubEnv("HARD_STOCK_BLOCK", "true");
    const { recordMovement, withStockTransaction } = await import("./stock");
    const v = await makeVariant("Guard OK", 5);
    await withStockTransaction((s) => recordMovement({ variantId: String(v._id), type: "SALE", qty: -5, by: "t" }, s));
    expect((await Variant.findById(v._id))!.stockOnHand).toBe(0);
    vi.unstubAllEnvs();
  });
});

describe("createPurchase inside an outer session (buy-list path)", () => {
  it("rolls the purchase back when the outer transaction fails", async () => {
    vi.resetModules();
    vi.stubEnv("HARD_STOCK_BLOCK", "");
    const { withStockTransaction } = await import("./stock");
    const { createPurchase } = await import("./purchases");
    const v = await makeVariant("Outer Txn", 10);
    const purchasesBefore = await Purchase.countDocuments();
    await expect(
      withStockTransaction(async (session) => {
        await createPurchase({ supplierName: "Rollback Supplier", lines: [{ variantId: String(v._id), qty: 4, cost: 3 }] }, "t", session);
        throw new Error("outer failure");
      }),
    ).rejects.toThrow("outer failure");
    expect((await Variant.findById(v._id))!.stockOnHand).toBe(10);
    expect(await Purchase.countDocuments()).toBe(purchasesBefore);
    vi.unstubAllEnvs();
  });

  it("commits once when the outer transaction succeeds", async () => {
    vi.resetModules();
    vi.stubEnv("HARD_STOCK_BLOCK", "");
    const { withStockTransaction } = await import("./stock");
    const { createPurchase } = await import("./purchases");
    const v = await makeVariant("Outer Commit", 10);
    await withStockTransaction(async (session) => {
      const r = await createPurchase({ supplierName: "Commit Supplier", lines: [{ variantId: String(v._id), qty: 4, cost: 3, price: 8 }] }, "t", session);
      expect(r.purchaseId).toBeTruthy();
    });
    const after = (await Variant.findById(v._id))!;
    expect(after.stockOnHand).toBe(14);
    expect(after.costPrice).toBe(300);
    expect(after.sellPrice).toBe(800);
    vi.unstubAllEnvs();
  });
});
