import { afterAll, beforeAll, describe, expect, it } from "vitest";
import mongoose from "mongoose";
import { MongoMemoryReplSet } from "mongodb-memory-server";
import { AuditLog, Category, OfferModel, Product, Sale, Variant } from "./models";
import { completeSale } from "./sales";
import { adjustStock, verifyLedger } from "./stock";
import { deleteBill, editBill } from "./bills";
import { AppError } from "./errors";

let repl: MongoMemoryReplSet;
let nb: string; // notebook, Rs 20, offer: buy 6 get 1 free
let pen: string; // pen, Rs 10
let copy: string; // photocopy service, Rs 2, no stock

const stock = async (id: string) => (await Variant.findById(id))!.stockOnHand;

beforeAll(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri());
  const nbCat = await Category.create({ name_en: "Notebooks", slug: "notebooks" });
  const penCat = await Category.create({ name_en: "Pens", slug: "pens" });
  const mk = async (name: string, categoryId: unknown, sell: number, cost: number, extra: Record<string, unknown> = {}) => {
    const p = await Product.create({ name_en: name, categoryId });
    return String((await Variant.create({ productId: p._id, label: "", sellPrice: sell, costPrice: cost, ...extra }))._id);
  };
  nb = await mk("Register", nbCat._id, 2000, 1400);
  pen = await mk("Pen", penCat._id, 1000, 600);
  copy = await mk("Photocopy", penCat._id, 200, 0, { trackStock: false });
  await adjustStock({ variantId: nb, type: "OPENING", qty: 50 });
  await adjustStock({ variantId: pen, type: "OPENING", qty: 50 });
  await OfferModel.create({ type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1, scope: { categoryIds: [String(nbCat._id)] }, label_en: "Buy 6 Get 1 Free", active: true });
});
afterAll(async () => {
  await mongoose.disconnect();
  await repl.stop();
});

describe("deleteBill", () => {
  it("puts every item back in stock, removes the bill and keeps a copy in the audit trail", async () => {
    const { sale } = await completeSale({ items: [{ variantId: nb, qty: 7 }, { variantId: pen, qty: 2 }, { variantId: copy, qty: 10 }], payments: { cash: 14000 + 2000, upi: 0 } }, "c");
    expect(await stock(nb)).toBe(43);
    expect(await stock(pen)).toBe(48);
    await deleteBill(String(sale._id), "admin1");
    expect(await stock(nb)).toBe(50);
    expect(await stock(pen)).toBe(50);
    expect(await Sale.findById(sale._id)).toBeNull();
    const log = await AuditLog.findOne({ action: "bill.delete" });
    expect(log?.by).toBe("admin1");
    expect(JSON.stringify(log?.meta)).toContain("Register");
    expect(await verifyLedger()).toEqual([]);
  });
  it("refuses a bill that does not exist", async () => {
    await expect(deleteBill("000000000000000000000000", "x")).rejects.toThrow(AppError);
  });
});

describe("editBill", () => {
  it("changes quantities, re-applies offers, corrects stock by the difference and records who edited", async () => {
    const { sale } = await completeSale({ items: [{ variantId: nb, qty: 7 }], payments: { cash: 12000, upi: 0 } }, "c"); // 6 paid + 1 free
    const before = await stock(nb);
    const out = await editBill(String(sale._id), { items: [{ variantId: nb, qty: 3 }], payMode: "upi" }, "admin1");
    expect(out.total).toBe(6000); // 3 x Rs 20, no free unit any more
    expect(await stock(nb)).toBe(before + 4);
    const saved = (await Sale.findById(sale._id))!;
    expect(saved.payments?.upi).toBe(6000);
    expect(saved.payments?.cash).toBe(0);
    expect(saved.editedBy).toBe("admin1");
    expect(await verifyLedger()).toEqual([]);
  });

  it("keeps the original price on existing lines even if the item's price changed, and uses today's price for new lines", async () => {
    const { sale } = await completeSale({ items: [{ variantId: pen, qty: 2 }], payments: { cash: 2000, upi: 0 } }, "c");
    await Variant.updateOne({ _id: pen }, { sellPrice: 1500 }); // price goes up after the sale
    const out = await editBill(String(sale._id), { items: [{ variantId: pen, qty: 3 }, { variantId: nb, qty: 1 }], payMode: "cash" }, "admin1");
    expect(out.total).toBe(3 * 1000 + 2000); // pen at the old Rs 10, register at Rs 20
    await Variant.updateOne({ _id: pen }, { sellPrice: 1000 });
  });

  it("removing a line and a service line both leave stock consistent", async () => {
    const { sale } = await completeSale({ items: [{ variantId: pen, qty: 4 }, { variantId: copy, qty: 5 }], payments: { cash: 4000 + 1000, upi: 0 } }, "c");
    const penBefore = await stock(pen);
    await editBill(String(sale._id), { items: [{ variantId: copy, qty: 8 }], payMode: "cash" }, "admin1"); // pens removed
    expect(await stock(pen)).toBe(penBefore + 4);
    expect((await Variant.findById(copy))!.stockOnHand).toBe(0); // services never hold stock
    expect(await verifyLedger()).toEqual([]);
  });

  it("refuses a missing bill or an unknown item", async () => {
    await expect(editBill("000000000000000000000000", { items: [{ variantId: nb, qty: 1 }], payMode: "cash" }, "x")).rejects.toThrow(AppError);
    const { sale } = await completeSale({ items: [{ variantId: pen, qty: 1 }], payments: { cash: 1000, upi: 0 } }, "c");
    await expect(editBill(String(sale._id), { items: [{ variantId: "000000000000000000000000", qty: 1 }], payMode: "cash" }, "x")).rejects.toThrow(AppError);
  });
});
