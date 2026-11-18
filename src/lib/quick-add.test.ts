import { describe, expect, it } from "vitest";
import { guessCategoryHint, matchBrand, parseQuickAdd, pickCategory } from "./quick-add";

const BRANDS = ["Natraj", "Doms", "Classmate", "Camlin", "Apsara"];

describe("parseQuickAdd", () => {
  it("pulls brand, name and trailing price", () => {
    expect(parseQuickAdd("Natraj HB pencil 5", BRANDS)).toEqual({
      brand: "Natraj",
      name: "HB pencil",
      price: 5,
      categoryHint: "Pencil",
    });
  });

  it("handles a leading rupee price", () => {
    expect(parseQuickAdd("₹25 eraser", BRANDS)).toEqual({
      brand: "",
      name: "eraser",
      price: 25,
      categoryHint: "Eraser",
    });
  });

  it("works without a brand or a price", () => {
    expect(parseQuickAdd("glue stick", BRANDS)).toEqual({
      brand: "",
      name: "glue stick",
      price: undefined,
      categoryHint: "Glue",
    });
  });

  it("does not treat a page count in the middle as the price when a trailing price exists", () => {
    // "200" is pages; "40" is the price
    expect(parseQuickAdd("Classmate notebook 200 pages 40", BRANDS)).toMatchObject({
      brand: "Classmate",
      name: "notebook 200 pages",
      price: 40,
      categoryHint: "Notebook",
    });
  });

  it("returns null for empty input", () => {
    expect(parseQuickAdd("  ", BRANDS)).toBeNull();
    expect(parseQuickAdd("5", BRANDS)).toBeNull(); // price only, no name
  });
});

describe("matchBrand", () => {
  it("picks the longest matching brand", () => {
    expect(matchBrand("Classmate notebook", ["Class", "Classmate"])?.brand).toBe("Classmate");
  });
});

describe("guessCategoryHint", () => {
  it("maps common stationery words", () => {
    expect(guessCategoryHint("HB pencil")).toBe("Pencil");
    expect(guessCategoryHint("gel pen blue")).toBe("Gel Pen");
    expect(guessCategoryHint("return gift hamper")).toBe("Gift");
  });
});

describe("pickCategory", () => {
  const cats = [
    { id: "1", name: "Stationery", parentId: null },
    { id: "2", name: "Pencils", parentId: "1" },
    { id: "3", name: "Pens", parentId: "1" },
    { id: "4", name: "Ball Pens", parentId: "1" },
  ];
  it("prefers the most specific child match", () => {
    expect(pickCategory("Pencil", cats)).toBe("2");
    expect(pickCategory("Ball Pen", cats)).toBe("4");
  });
  it("falls back to the first child when nothing matches", () => {
    expect(pickCategory("Toy", cats)).toBe("2");
  });
});
