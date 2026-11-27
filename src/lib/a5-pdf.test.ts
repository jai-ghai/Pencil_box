import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import { billPdfName, buildA5Pdf } from "./a5-pdf";

const sample = {
  billNo: 12,
  at: "2026-11-27T08:00:00.000Z",
  customerName: "Ravi",
  items: [{ name: "Notebook", qty: 2, unitPrice: 3000, lineTotal: 6000 }],
  subtotal: 6000,
  discount: 0,
  total: 6000,
  payments: { cash: 6000, upi: 0 },
};

describe("a5 pdf", () => {
  it("names the file and writes a cash-memo PDF", async () => {
    expect(billPdfName(12)).toBe("PencilBox-Bill-12.pdf");
    const bytes = await buildA5Pdf(sample);
    expect(Buffer.from(bytes).subarray(0, 5).toString()).toBe("%PDF-");
    const loaded = await PDFDocument.load(bytes);
    expect(loaded.getTitle()).toBe("Bill 12");
    expect(loaded.getPageCount()).toBe(1);
    const many = {
      ...sample,
      items: Array.from({ length: 40 }, (_, i) => ({ name: `Item ₹${i + 1}`, qty: 1, unitPrice: 1000, lineTotal: 1000 })),
      subtotal: 40000,
      total: 40000,
      payments: { cash: 0, upi: 0, card: 40000 },
    };
    const long = await PDFDocument.load(await buildA5Pdf(many, "shop@upi"));
    expect(long.getPageCount()).toBeGreaterThan(1);
  });
});
