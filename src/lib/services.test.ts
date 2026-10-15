import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Category, Variant } from "./models";
import { ensureServices } from "./seed-services";
import { buildStoreCatalog } from "./store";
import { completeSale } from "./sales";

let repl: MongoMemoryReplSet;
beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
});
afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

describe("photocopy and printing items", () => {
  it("adds the three priced items once, however many times it runs", async () => {
    expect(await ensureServices()).toEqual({ created: 3, skipped: 0 });
    expect(await ensureServices()).toEqual({ created: 0, skipped: 3 });
    const vs = await Variant.find({ baseUnit: "page" }).sort({ sellPrice: 1 });
    expect(vs.map((v) => v.sellPrice)).toEqual([200, 500, 1000]); // Rs 2, Rs 5, Rs 10
    expect(vs.every((v) => v.trackStock === false && v.quickTap)).toBe(true);
    expect(vs.every((v) => /^ser-\d+$/.test(v.shortCode ?? ""))).toBe(true);
    expect(await Category.countDocuments({ name_en: "Services" })).toBe(1);
  });

  it("can be billed by the page without touching stock, and shows on the website", async () => {
    const xerox = (await Variant.findOne({ sellPrice: 200 }))!;
    const { sale } = await completeSale({ items: [{ variantId: String(xerox._id), qty: 25 }], payments: { cash: 5000, upi: 0 } }, "c"); // 25 pages x Rs 2
    expect(sale.total).toBe(5000);
    expect((await Variant.findById(xerox._id))!.stockOnHand).toBe(0);
    const names = (await buildStoreCatalog()).products.map((p) => p.name_en);
    expect(names).toEqual(expect.arrayContaining(["Photocopy", "Printout (Black & White)", "Printout (Colour)"]));
  });
});
