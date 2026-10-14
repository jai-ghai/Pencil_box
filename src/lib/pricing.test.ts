import { describe, expect, it } from "vitest";
import { priceCart, priceLine, type Offer } from "./pricing";

const NOW = new Date("2026-10-15T10:00:00Z");
const nb = { variantId: "nb1", unitPrice: 2000, categoryId: "notebooks", brandId: "classmate" };

const buy6get1: Offer = {
  id: "o1",
  type: "BUY_X_GET_Y",
  scope: { categoryIds: ["notebooks"] },
  buyQty: 6,
  freeQty: 1,
  active: true,
  label_en: "Buy 6 Get 1 Free",
};

describe("BUY_X_GET_Y", () => {
  it("gives no discount below the group size", () => {
    const l = priceLine({ ...nb, qty: 6 }, [buy6get1], NOW);
    expect(l.lineTotal).toBe(12000);
    expect(l.freeUnits).toBe(0);
  });
  it("buy 6 get 1 free: 7 notebooks cost 6", () => {
    const l = priceLine({ ...nb, qty: 7 }, [buy6get1], NOW);
    expect(l.lineTotal).toBe(12000);
    expect(l.freeUnits).toBe(1);
    expect(l.discount).toBe(2000);
    expect(l.offerId).toBe("o1");
  });
  it("repeats per full group: 14 pay for 12", () => {
    const l = priceLine({ ...nb, qty: 14 }, [buy6get1], NOW);
    expect(l.freeUnits).toBe(2);
    expect(l.lineTotal).toBe(24000);
  });
  it("shows a nudge when close to the next free item", () => {
    const l = priceLine({ ...nb, qty: 6 }, [buy6get1], NOW);
    expect(l.nudge?.addQty).toBe(1);
    expect(priceLine({ ...nb, qty: 7 }, [buy6get1], NOW).nudge).toBeUndefined();
  });
});

describe("other offers", () => {
  it("bundle: 3 for Rs 50", () => {
    const o: Offer = { id: "b", type: "BUNDLE", scope: { variantIds: ["nb1"] }, bundleQty: 3, bundlePrice: 5000, active: true, label_en: "3 for 50" };
    expect(priceLine({ ...nb, qty: 3 }, [o], NOW).lineTotal).toBe(5000);
    expect(priceLine({ ...nb, qty: 4 }, [o], NOW).lineTotal).toBe(7000);
    expect(priceLine({ ...nb, qty: 2 }, [o], NOW).lineTotal).toBe(4000);
  });
  it("ignores a bundle that would cost more", () => {
    const o: Offer = { id: "b", type: "BUNDLE", scope: { variantIds: ["nb1"] }, bundleQty: 3, bundlePrice: 7000, active: true, label_en: "bad" };
    expect(priceLine({ ...nb, qty: 3 }, [o], NOW).lineTotal).toBe(6000);
  });
  it("percent and flat", () => {
    const p: Offer = { id: "p", type: "PERCENT", scope: { brandIds: ["classmate"] }, percent: 10, active: true, label_en: "10%" };
    const f: Offer = { id: "f", type: "FLAT", scope: { brandIds: ["classmate"] }, flatOff: 100, active: true, label_en: "Rs1 off" };
    expect(priceLine({ ...nb, qty: 5 }, [p], NOW).lineTotal).toBe(9000);
    expect(priceLine({ ...nb, qty: 5 }, [f], NOW).lineTotal).toBe(9500);
  });
  it("slab: 10+ at Rs 18", () => {
    const o: Offer = { id: "s", type: "SLAB", scope: { variantIds: ["nb1"] }, slabMinQty: 10, slabPrice: 1800, active: true, label_en: "10+" };
    expect(priceLine({ ...nb, qty: 9 }, [o], NOW).lineTotal).toBe(18000);
    expect(priceLine({ ...nb, qty: 10 }, [o], NOW).lineTotal).toBe(18000);
    expect(priceLine({ ...nb, qty: 11 }, [o], NOW).lineTotal).toBe(19800);
  });
});

describe("rules", () => {
  it("picks the single best offer, never stacks", () => {
    const p: Offer = { id: "p", type: "PERCENT", scope: { categoryIds: ["notebooks"] }, percent: 5, active: true, label_en: "5%" };
    const l = priceLine({ ...nb, qty: 7 }, [p, buy6get1], NOW);
    expect(l.offerId).toBe("o1");
    expect(l.lineTotal).toBe(12000);
  });
  it("respects active flag and date window", () => {
    expect(priceLine({ ...nb, qty: 7 }, [{ ...buy6get1, active: false }], NOW).discount).toBe(0);
    expect(priceLine({ ...nb, qty: 7 }, [{ ...buy6get1, endsAt: new Date("2026-10-01") }], NOW).discount).toBe(0);
    expect(priceLine({ ...nb, qty: 7 }, [{ ...buy6get1, startsAt: new Date("2026-11-01") }], NOW).discount).toBe(0);
  });
  it("an offer with empty scope applies to nothing", () => {
    expect(priceLine({ ...nb, qty: 7 }, [{ ...buy6get1, scope: {} }], NOW).discount).toBe(0);
  });
  it("rejects bad input", () => {
    expect(() => priceLine({ ...nb, qty: 0 }, [], NOW)).toThrow();
    expect(() => priceLine({ ...nb, qty: 1.5 }, [], NOW)).toThrow();
    expect(() => priceLine({ ...nb, qty: 1, unitPrice: 20.5 }, [], NOW)).toThrow();
  });
  it("totals a cart", () => {
    const c = priceCart([{ ...nb, qty: 7 }, { variantId: "pen", unitPrice: 1000, qty: 2 }], [buy6get1], NOW);
    expect(c.subtotal).toBe(16000);
    expect(c.discount).toBe(2000);
    expect(c.total).toBe(14000);
  });
});
