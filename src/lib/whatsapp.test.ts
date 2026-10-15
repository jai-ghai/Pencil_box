import { describe, expect, it } from "vitest";
import { buildOrderMessage, normalizeWhatsappNumber, parseOrderText, whatsappUrl, MAX_LINES } from "./whatsapp";

describe("normalizeWhatsappNumber", () => {
  it("adds India's 91 to a 10-digit number and strips formatting", () => {
    expect(normalizeWhatsappNumber("98765 43210")).toBe("919876543210");
    expect(normalizeWhatsappNumber("+91-98765-43210")).toBe("919876543210");
    expect(normalizeWhatsappNumber("09876543210")).toBe("919876543210");
  });
  it("rejects missing or implausible numbers", () => {
    expect(normalizeWhatsappNumber("")).toBeNull();
    expect(normalizeWhatsappNumber(undefined)).toBeNull();
    expect(normalizeWhatsappNumber("12345")).toBeNull();
    expect(normalizeWhatsappNumber("YOUR_NUMBER")).toBeNull();
  });
});

describe("buildOrderMessage", () => {
  const lines = [
    { code: "bp-02", name: "Ball Pen (Standard) Blue", qty: 5, freeUnits: 0, lineTotal: 2500 },
    { code: "reg-01", name: "Register ₹20", qty: 7, freeUnits: 1, lineTotal: 12000 },
  ];
  it("lists every item with its upper-case code, quantity and amount", () => {
    const m = buildOrderMessage(lines, 14500, { lang: "en", hasPriceRange: false });
    expect(m).toContain("1. [BP-02] Ball Pen (Standard) Blue x 5 = ₹25");
    expect(m).toContain("2. [REG-01] Register ₹20 x 7 (1 free) = ₹120");
    expect(m).toContain("Estimated total: ₹145");
    expect(m).not.toContain("two possible prices");
  });
  it("mentions a price range only when needed, and supports Hindi", () => {
    const m = buildOrderMessage(lines, 14500, { lang: "hi", hasPriceRange: true });
    expect(m).toContain("नमस्ते Pencil Box");
    expect(m).toContain("फ्री");
    expect(m).toContain("दो रेट");
  });
  it("caps very long carts so the link stays small", () => {
    const many = Array.from({ length: MAX_LINES + 5 }, (_, i) => ({ code: `x-${i}`, name: "Item", qty: 1, freeUnits: 0, lineTotal: 100 }));
    const m = buildOrderMessage(many, 100, { lang: "en", hasPriceRange: false });
    expect(m).toContain("+ 5 more items");
    expect(m.split("\n").filter((l) => /^\d+\. /.test(l)).length).toBe(MAX_LINES);
  });
});

describe("whatsappUrl", () => {
  it("url-encodes the text and round-trips", () => {
    const text = "Hello\n1. [BP-02] Pen & Co x 2 = ₹10";
    const url = whatsappUrl("919876543210", text);
    expect(url.startsWith("https://wa.me/919876543210?text=")).toBe(true);
    expect(decodeURIComponent(url.split("?text=")[1])).toBe(text);
  });
});

describe("parseOrderText", () => {
  const lines = [
    { code: "bp-02", name: "Ball Pen (Standard) Blue", qty: 5, freeUnits: 0, lineTotal: 2500 },
    { code: "reg-01", name: "Register ₹20", qty: 7, freeUnits: 1, lineTotal: 12000 },
    { code: "pen-05", name: "Doms X1 Pencil", qty: 10, freeUnits: 0, lineTotal: 5000 },
  ];
  it("reads back exactly what the website wrote, in English and Hindi", () => {
    for (const lang of ["en", "hi"] as const) {
      const parsed = parseOrderText(buildOrderMessage(lines, 19500, { lang, hasPriceRange: false }));
      expect(parsed).toEqual([{ code: "BP-02", qty: 5 }, { code: "REG-01", qty: 7 }, { code: "PEN-05", qty: 10 }]);
    }
  });
  it("is not fooled by an X in the product name", () => {
    expect(parseOrderText("1. [PEN-05] Doms X1 Pencil x 10 = ₹50")).toEqual([{ code: "PEN-05", qty: 10 }]);
  });
  it("accepts plain lines, merges repeated codes and ignores everything else", () => {
    const text = "Hello Pencil Box!\nbp-02 x 3\nBP-02 × 2\nSER-01 x 25\nEstimated total: ₹100\nPlease confirm";
    expect(parseOrderText(text)).toEqual([{ code: "BP-02", qty: 5 }, { code: "SER-01", qty: 25 }]);
    expect(parseOrderText("nothing useful here")).toEqual([]);
    expect(parseOrderText("[BP-02] no quantity")).toEqual([]);
  });
});
