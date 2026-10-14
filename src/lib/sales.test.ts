import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Brand, Category, OfferModel, Product, StockMovement, Variant } from "./models";
import { completeSale, SaleError } from "./sales";
import { adjustStock, verifyLedger } from "./stock";

let repl: MongoMemoryReplSet;
let nbId: string;
let penId: string;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  const brand = await Brand.create({ name: "Classmate" });
  const cat = await Category.create({ name_en: "Notebooks", slug: "notebooks" });
  const p1 = await Product.create({ name_en: "Register", brandId: brand._id, categoryId: cat._id });
  const nb = await Variant.create({ productId: p1._id, label: "172 pages", sellPrice: 2000, costPrice: 1400 });
  const p2 = await Product.create({ name_en: "Pen", categoryId: cat._id });
  const pen = await Variant.create({ productId: p2._id, label: "blue", sellPrice: 1000, costPrice: 600 });
  nbId = String(nb._id);
  penId = String(pen._id);
  await adjustStock({ variantId: nbId, type: "OPENING", qty: 20 });
  await adjustStock({ variantId: penId, type: "OPENING", qty: 50 });
  await OfferModel.create({ type: "BUY_X_GET_Y", scope: { categoryIds: [String(cat._id)] }, buyQty: 6, freeQty: 1, label_en: "Buy 6 Get 1 Free" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

describe("completeSale", () => {
  it("applies buy 6 get 1 free, deducts full qty from stock, keeps ledger consistent", async () => {
    const { sale } = await completeSale(
      { items: [{ variantId: nbId, qty: 7 }, { variantId: penId, qty: 2 }], payments: { cash: 14000, upi: 0 } },
      "cashier1",
    );
    expect(sale.total).toBe(14000); // 6*2000 + 2*1000
    expect(sale.discount).toBe(2000);
    expect(sale.billNo).toBe(1);
    expect((await Variant.findById(nbId))!.stockOnHand).toBe(13);
    expect((await Variant.findById(penId))!.stockOnHand).toBe(48);
    expect(await verifyLedger()).toEqual([]);
  });

  it("rejects payments that do not match the server-side total", async () => {
    await expect(
      completeSale({ items: [{ variantId: nbId, qty: 7 }], payments: { cash: 100, upi: 0 } }, "c"),
    ).rejects.toThrow(SaleError);
  });

  it("merges duplicate lines so the offer sees the real quantity", async () => {
    const { sale } = await completeSale(
      { items: [{ variantId: nbId, qty: 3 }, { variantId: nbId, qty: 4 }], payments: { cash: 12000, upi: 0 } },
      "c",
    );
    expect(sale.total).toBe(12000);
    expect(sale.billNo).toBe(2);
  });

  it("service items (trackStock false) bill without touching stock or the ledger", async () => {
    const cat = await Category.findOne({ slug: "notebooks" });
    const prod = await Product.create({ name_en: "Photocopy", categoryId: cat!._id });
    const svc = await Variant.create({ productId: prod._id, label: "B/W", sellPrice: 200, trackStock: false });
    // a category offer must not accidentally discount it either
    const { sale } = await completeSale({ items: [{ variantId: String(svc._id), qty: 10 }], payments: { cash: 1800, upi: 0 } }, "c"); // 10 in offer category: 1 free
    expect(sale.total).toBe(1800);
    expect((await Variant.findById(svc._id))!.stockOnHand).toBe(0);
    expect(await StockMovement.countDocuments({ variantId: svc._id })).toBe(0);
  });

  it("warns, but still bills, when stock is short", async () => {
    const { warnings } = await completeSale({ items: [{ variantId: penId, qty: 100 }], payments: { cash: 86000, upi: 0 } }, "c"); // 100 pens in the offer category: 14 free
    expect(warnings.length).toBe(1);
    expect(await verifyLedger()).toEqual([]);
  });
});
