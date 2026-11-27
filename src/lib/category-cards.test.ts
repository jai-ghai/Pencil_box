import { describe, expect, it } from "vitest";
import { shopCards, type CardCategory } from "./category-cards";

const cats: CardCategory[] = [
  { id: "1", name_en: "Pens & Pencils", name_hi: "", parentId: null, slug: "pens-pencils" },
  { id: "2", name_en: "Pencils", name_hi: "", parentId: "1", slug: "pencils" },
  { id: "3", name_en: "Ball Pens", name_hi: "", parentId: "1", slug: "ball-pens" },
  { id: "4", name_en: "Notebooks & Registers", name_hi: "", parentId: null, slug: "notebooks-registers" },
  { id: "5", name_en: "Notebooks", name_hi: "", parentId: "4", slug: "notebooks" },
  { id: "6", name_en: "Registers", name_hi: "", parentId: "4", slug: "registers" },
  { id: "7", name_en: "Art & Craft", name_hi: "", parentId: null, slug: "art-craft" },
  { id: "8", name_en: "Colours", name_hi: "", parentId: "7", slug: "colours" },
  { id: "9", name_en: "Gifts & More", name_hi: "", parentId: null, slug: "gifts-more" },
  { id: "10", name_en: "Printing & Photocopy", name_hi: "", parentId: null, slug: "printing-photocopy" },
  { id: "11", name_en: "Erasers", name_hi: "", parentId: "1", slug: "erasers" },
];

const counts = new Map(cats.filter((c) => c.parentId).map((c) => [c.id, 3]));
counts.set("9", 2);
counts.set("10", 4);

describe("generic category cards", () => {
  const cards = shopCards(cats, counts);

  it("uses plain department names, never a brand", () => {
    const labels = cards.map((c) => c.label);
    expect(labels).toEqual(expect.arrayContaining(["PENCIL", "PEN", "NOTEBOOK", "ERASER", "COLOURS", "DIARY", "ART & CRAFT", "GIFTS", "PRINTING"]));
    expect(labels.join(" ")).not.toMatch(/doms|flair|delta|luxor|nataraj/i);
    expect(labels).not.toContain("GEOMETRY BOX");
    expect(labels).not.toContain("SOFT TOYS");
  });

  it("links a subcategory through its parent collection", () => {
    expect(cards.find((c) => c.label === "PENCIL")?.href).toBe("/c/pens?sub=pencils");
    expect(cards.find((c) => c.label === "ART & CRAFT")?.href).toBe("/c/art");
    expect(cards.find((c) => c.label === "PENCIL")?.image).toBe("/category/pencil.svg");
  });

  it("prefers an owner-uploaded picture", () => {
    const withPhoto = cats.map((c) => (c.id === "2" ? { ...c, image: "https://res.cloudinary.com/demo/image/upload/v1/pencilbox/plain.jpg" } : c));
    const pencil = shopCards(withPhoto, counts).find((c) => c.label === "PENCIL");
    expect(pencil?.uploaded).toBe(true);
    expect(pencil?.image).toContain("res.cloudinary.com");
  });
});
