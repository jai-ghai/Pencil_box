import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { Brand, Category, OfferModel, Variant } from "./models";
import { CatalogError, codePrefix, saveProduct } from "./catalog";
import { buildStoreCatalog } from "./store";
import { completeSale, SaleError } from "./sales";
import { adjustStock } from "./stock";

let repl: MongoMemoryReplSet;
let penCat: string;
let notebookCat: string;
let brandId: string;

const v = (label: string, sell: number, extra: Record<string, unknown> = {}) => ({
  label, sellPrice: sell, costPrice: 1, aliases: [], baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: true, ...extra,
});
const product = (name: string, categoryId: string, variants: ReturnType<typeof v>[], extra: Record<string, unknown> = {}) =>
  saveProduct({ name_en: name, categoryId, brandId, images: [], attributes: {}, tags: [], active: true, variants, ...extra } as Parameters<typeof saveProduct>[0]);

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  penCat = String((await Category.create({ name_en: "Ball Pens", slug: "ball-pens" }))._id);
  notebookCat = String((await Category.create({ name_en: "Notebooks", slug: "notebooks" }))._id);
  brandId = String((await Brand.create({ name: "Doms" }))._id);
});
afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

describe("item codes", () => {
  it("derives a readable prefix from the category name", () => {
    expect(codePrefix("Ball Pens")).toBe("BP");
    expect(codePrefix("Pencils")).toBe("PEN");
    expect(codePrefix("Covers & Name Slips")).toBe("CNS");
  });
  it("auto-numbers new variants per prefix and keeps existing codes on edit", async () => {
    const p = await product("Ball Pen A", penCat, [v("Blue", 5, { openingStock: 10 }), v("Black", 5, { openingStock: 10 })]);
    const vs = await Variant.find({ productId: p._id }).sort({ shortCode: 1 });
    expect(vs.map((x) => x.shortCode)).toEqual(["bp-01", "bp-02"]);
    const p2 = await product("Ball Pen B", penCat, [v("Red", 5, { openingStock: 10 })]);
    expect((await Variant.findOne({ productId: p2._id }))!.shortCode).toBe("bp-03");
    // editing without a code must not change or drop the existing one
    await product("Ball Pen B", penCat, [{ ...v("Red", 6), _id: String((await Variant.findOne({ productId: p2._id }))!._id) } as ReturnType<typeof v>], {}).catch(() => {});
    await saveProduct({ name_en: "Ball Pen B", categoryId: penCat, images: [], attributes: {}, tags: [], active: true, variants: [{ ...v("Red", 6), _id: String((await Variant.findOne({ productId: p2._id }))!._id) }] } as Parameters<typeof saveProduct>[0], String(p2._id));
    expect((await Variant.findOne({ productId: p2._id }))!.shortCode).toBe("bp-03");
  });
  it("refuses a code that another item already uses", async () => {
    await expect(product("Dup", penCat, [v("X", 5, { shortCode: "BP-01" })])).rejects.toThrow(CatalogError);
  });
  it("refuses a higher price below the normal price", async () => {
    await expect(product("Bad range", penCat, [v("X", 25, { maxPrice: 20 })])).rejects.toThrow(CatalogError);
  });
});

describe("public catalogue", () => {
  it("hides out-of-stock items, shows services, and never exposes private fields", async () => {
    await product("Sold Out Pen", penCat, [v("Blue", 5)]); // stock 0
    await product("Photocopy", penCat, [v("A4", 2, { trackStock: false })]);
    await product("Secret", penCat, [v("Z", 5, { openingStock: 7 })], { internalNote: "PRIVATE-NOTE" });
    const cat = await buildStoreCatalog();
    const names = cat.products.map((p) => p.name_en);
    expect(names).not.toContain("Sold Out Pen");
    expect(names).toContain("Photocopy");
    const json = JSON.stringify(cat);
    for (const banned of ["costPrice", "stockOnHand", "internalNote", "PRIVATE-NOTE", "supplier", "unitCost"]) expect(json).not.toContain(banned);
    const secret = cat.products.find((p) => p.name_en === "Secret")!;
    expect(secret.variants[0].code).toMatch(/^BP-\d+$/);
    expect(secret.variants[0].maxQty).toBe(7);
    expect(secret.variants[0].low).toBe(false);
  });
  it("flags low stock and returns the price range only when higher than the normal price", async () => {
    await product("Colour Pencils", notebookCat, [v("Large", 25, { maxPrice: 30, openingStock: 3 }), v("Small", 10, { maxPrice: 10, openingStock: 20 })]);
    const p = (await buildStoreCatalog()).products.find((x) => x.name_en === "Colour Pencils")!;
    const large = p.variants.find((x) => x.label === "Large")!;
    expect([large.price, large.maxPrice, large.low]).toEqual([2500, 3000, true]);
    expect(p.variants.find((x) => x.label === "Small")!.maxPrice).toBe(0);
  });
  it("attaches live offers to matching items only", async () => {
    await OfferModel.create({ type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1, scope: { categoryIds: [notebookCat] }, label_en: "Buy 6 Get 1 Free", active: true });
    await OfferModel.create({ type: "PERCENT", percent: 50, scope: { categoryIds: [penCat] }, label_en: "OFF", active: false });
    const cat = await buildStoreCatalog();
    const nb = cat.products.find((x) => x.name_en === "Colour Pencils")!;
    expect(nb.variants[0].offers.map((o) => o.label_en)).toEqual(["Buy 6 Get 1 Free"]);
    expect(cat.products.find((x) => x.name_en === "Secret")!.variants[0].offers).toEqual([]);
  });
});

describe("billing with a two-price item", () => {
  it("accepts the normal or higher price, rejects anything else", async () => {
    const id = String((await Variant.findOne({ label: "Large" }))!._id);
    await adjustStock({ variantId: id, type: "ADJUSTMENT", qty: 10 });
    const ok = await completeSale({ items: [{ variantId: id, qty: 2, unitPrice: 3000 }], payments: { cash: 6000, upi: 0 } }, "c");
    expect(ok.sale.total).toBe(6000);
    const normal = await completeSale({ items: [{ variantId: id, qty: 1 }], payments: { cash: 2500, upi: 0 } }, "c");
    expect(normal.sale.total).toBe(2500);
    await expect(completeSale({ items: [{ variantId: id, qty: 1, unitPrice: 2700 }], payments: { cash: 2700, upi: 0 } }, "c")).rejects.toThrow(SaleError);
    await expect(completeSale({ items: [{ variantId: id, qty: 1, unitPrice: 100 }], payments: { cash: 100, upi: 0 } }, "c")).rejects.toThrow(SaleError);
  });
  it("a single-price item rejects any custom price", async () => {
    const id = String((await Variant.findOne({ label: "Small" }))!._id);
    await expect(completeSale({ items: [{ variantId: id, qty: 1, unitPrice: 500 }], payments: { cash: 500, upi: 0 } }, "c")).rejects.toThrow(SaleError);
  });
});
