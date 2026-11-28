import { describe, expect, it } from "vitest";
import { HOME_LINKS } from "./departments";
import { COLLECTIONS } from "./shop";
import { builtinShopCategories, homeShopCategories } from "./shop-category-data";

describe("builtin shop categories", () => {
  const rows = builtinShopCategories();

  it("keeps the home row and the collection pages in their current order", () => {
    expect(homeShopCategories(rows).map((row) => row.slug)).toEqual(HOME_LINKS.map((link) => link.slug));
    const listed = rows.filter((row) => row.listing).sort((a, b) => a.listOrder - b.listOrder);
    expect(listed.map((row) => row.nav)).toEqual(COLLECTIONS.map((c) => c.nav));
    expect(listed.map((row) => row.match)).toEqual(COLLECTIONS.map((c) => c.match));
    const groups = rows.filter((row) => row.groupOrder >= 0).sort((a, b) => a.groupOrder - b.groupOrder);
    expect(groups.map((row) => row.groupLabel)).toEqual(["School", "Writing", "Office", "Tapes & glue", "Paper", "Art & craft", "Gifts & decoration", "Toys & daily use"]);
  });

  it("gives every shelf a unique slug and keeps the written text", () => {
    expect(new Set(rows.map((row) => row.slug)).size).toBe(rows.length);
    const children = rows.filter((row) => row.parent);
    expect(children.length).toBeGreaterThanOrEqual(42);
    for (const row of rows) {
      expect(row.about.length).toBeGreaterThan(20);
      expect(row.faqs.length).toBeGreaterThan(0);
      expect(row.about).not.toMatch(/₹|Rs\s*\d/i);
    }
  });
});
