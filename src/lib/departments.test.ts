import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DEPARTMENTS, HOME_LINKS, orderedHomeLinks, normalisePrefs } from "./departments";

describe("departments", () => {
  it("lists every extra shelf once, with two questions and no prices", () => {
    const children = DEPARTMENTS.filter((d) => d.parent);
    expect(new Set(children.map((d) => d.slug)).size).toBe(children.length);
    expect(children.length).toBeGreaterThanOrEqual(42);
    for (const d of DEPARTMENTS) {
      expect(d.faqs).toHaveLength(2);
      expect(d.about).not.toMatch(/₹|Rs\s*\d/i);
      expect(d.label).not.toMatch(/doms|nataraj|flair|apsara/i);
    }
  });

  it("keeps a short home row and honours hide and order", () => {
    expect(HOME_LINKS.length).toBeGreaterThanOrEqual(11);
    const prefs = normalisePrefs({ hidden: ["printing"], order: ["toys", "notebooks"], images: { toys: "https://cdn.example/toy.png", bad: "nope" } });
    const labels = orderedHomeLinks(prefs).map((c) => c.slug);
    expect(labels[0]).toBe("toys");
    expect(labels).not.toContain("printing");
    expect(prefs.images.toys).toBe("https://cdn.example/toy.png");
    expect(prefs.images.bad).toBeUndefined();
  });

  it("gives every shelf its own drawing", () => {
    const slugs = [...new Set([...DEPARTMENTS.map((d) => d.slug), ...HOME_LINKS.map((h) => h.slug)])];
    const bodies = slugs.map((slug) => {
      const path = `public/category/${slug}.svg`;
      expect(existsSync(path), path).toBe(true);
      return readFileSync(path, "utf8");
    });
    expect(new Set(bodies).size).toBe(bodies.length);
    expect(bodies.join("")).not.toMatch(/circle cx="100" cy="100" r="58"/);
  });
});
