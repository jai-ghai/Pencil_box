import { describe, expect, it } from "vitest";
import { discountPercent, pageCount, pageSlice, sortProducts } from "./browse";
import type { StoreProduct } from "./store";

function item(name: string, price: number, createdAt = 0, offer = false): StoreProduct {
  return {
    id: name, name_en: name, name_hi: "", brand: "", brandId: "", categoryId: "c", image: "", images: [],
    imageGeneric: false, slug: name, description_en: "", createdAt,
    variants: [{ id: name, code: "X-1", label: "", price, maxPrice: 0, maxQty: 9, low: false, offers: offer ? [{ label_en: "deal" }] : [], mrp: 0 }],
  };
}

describe("browse", () => {
  it("sorts by price and by newest", () => {
    const rows = [item("b", 500), item("a", 100), item("c", 300, 50)];
    expect(sortProducts(rows, "price-asc").map((p) => p.name_en)).toEqual(["a", "c", "b"]);
    expect(sortProducts(rows, "price-desc").map((p) => p.name_en)).toEqual(["b", "c", "a"]);
    expect(sortProducts(rows, "new")[0].name_en).toBe("c");
  });

  it("pages 24 at a time", () => {
    expect(pageCount(25)).toBe(2);
    expect(pageSlice([1, 2, 3], 2, 2)).toEqual([3]);
  });

  it("hides a discount unless MRP is above the sell price", () => {
    expect(discountPercent(8000, 10000)).toBe(20);
    expect(discountPercent(8000, 0)).toBe(0);
    expect(discountPercent(8000, 8000)).toBe(0);
  });
});
