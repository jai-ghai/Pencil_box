import { describe, expect, it } from "vitest";
import { suggest } from "./search-match";

const source = {
  categories: [
    { label: "Notebooks", href: "/c/notebooks", image: "/category/notebooks.svg" },
    { label: "Art & craft", href: "/c/art", image: "/category/art.svg" },
    { label: "Pens", href: "/c/pens", image: "/category/pens.svg" },
  ],
  products: [
    { name: "Chart paper", href: "/p/chart-paper", image: "", price: "₹20", brand: "" },
    { name: "Apsara pencil", href: "/p/apsara-pencil", image: "", price: "₹5", brand: "Apsara" },
  ],
};

describe("suggest", () => {
  it("maps copy to notebooks and chart to chart paper", () => {
    expect(suggest("copy", source).some((hit) => hit.href === "/c/notebooks")).toBe(true);
    expect(suggest("chart", source).some((hit) => hit.label === "Chart paper")).toBe(true);
  });

  it("tolerates a one-letter slip", () => {
    expect(suggest("notbook", source).some((hit) => hit.href === "/c/notebooks")).toBe(true);
  });
});
