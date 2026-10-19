import { describe, expect, it } from "vitest";
import { profitShare, unitRevenue } from "./offer-margin";

describe("offer margin", () => {
  it("buy 6 get 1 free on a Rs 20 notebook costing Rs 13", () => {
    const rule = { type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1 };
    expect(Math.round(unitRevenue(rule, 2000))).toBe(1714);
    expect(profitShare(rule, 2000, 1300)).toBeCloseTo(0.242, 2);
  });
  it("bundle, slab, percent and flat", () => {
    expect(unitRevenue({ type: "BUNDLE", bundleQty: 10, bundlePrice: 4500 }, 500)).toBe(450);
    expect(unitRevenue({ type: "SLAB", slabPrice: 1900 }, 2000)).toBe(1900);
    expect(unitRevenue({ type: "PERCENT", percent: 10 }, 2000)).toBe(1800);
    expect(unitRevenue({ type: "FLAT", flatOff: 200 }, 2000)).toBe(1800);
  });
  it("never earns more than the normal price, and flags a loss", () => {
    expect(unitRevenue({ type: "BUNDLE", bundleQty: 2, bundlePrice: 9999 }, 500)).toBe(500);
    expect(profitShare({ type: "PERCENT", percent: 50 }, 1000, 700)).toBeLessThan(0);
  });
  it("is unknown when the cost is not entered", () => {
    expect(profitShare({ type: "PERCENT", percent: 10 }, 500, 0)).toBeNull();
  });
});
