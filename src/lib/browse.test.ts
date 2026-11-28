import { describe, expect, it } from "vitest";
import { cleanItemName, discountPercent, groupSameProducts, pageCount, pageSlice, sortProducts } from "./browse";
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

  it("breaks price ties by id so a page boundary cannot repeat an item", () => {
    const rows = [item("same", 100), item("same", 100)].map((p, i) => ({ ...p, id: i === 0 ? "b" : "a" }));
    expect(sortProducts(rows, "price-asc").map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("groups one category by price and drops the brand from the title", () => {
    expect(cleanItemName("Akash Notebook ₹30")).toBe("Akash Notebook");
    const cheap = item("Akash Notebook ₹20", 2000);
    const mid = item("Akash Notebook ₹30", 3000);
    cheap.id = "1";
    mid.id = "2";
    cheap.brand = "Akash";
    mid.brand = "Akash";
    cheap.image = "twenty.jpg";
    mid.image = "thirty.jpg";
    cheap.variants[0].id = "v1";
    cheap.variants[0].label = "Maths";
    mid.variants[0].id = "v2";
    mid.variants[0].label = "Hindi";
    const alfa = item("Alfa + Notebook ₹20", 2000);
    alfa.id = "3";
    alfa.brand = "Alfa +";
    alfa.image = "twenty.jpg";
    alfa.variants[0].id = "v3";
    alfa.variants[0].label = "English";
    const grouped = groupSameProducts([mid, alfa, cheap]);
    expect(grouped).toHaveLength(2);
    const twenty = grouped.find((p) => p.variants[0].price === 2000);
    const thirty = grouped.find((p) => p.variants.some((v) => v.price === 3000));
    expect(twenty?.name_en).toBe("Notebook");
    expect(twenty?.brand).toBe("");
    expect(twenty?.variants.map((v) => v.label).sort()).toEqual(["English", "Maths"]);
    expect(thirty?.name_en).toBe("Notebook");
  });

  it("keeps a real photo that several prices of one item share", () => {
    const rows = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110].map((rupees, index) => {
      const row = item("Register", rupees * 100);
      row.id = String(index);
      row.image = "https://res.cloudinary.com/demo/image/upload/v1/pencilbox/front.jpg";
      row.images = [row.image, "https://res.cloudinary.com/demo/image/upload/v1/pencilbox/back.jpg"];
      return row;
    });
    const grouped = groupSameProducts(rows);
    expect(grouped).toHaveLength(10);
    expect(grouped.every((p) => p.image.endsWith("front.jpg") && p.images.length === 2)).toBe(true);
  });
});
