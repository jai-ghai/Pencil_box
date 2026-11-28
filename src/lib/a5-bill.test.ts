import { describe, expect, it } from "vitest";
import { a5BillHtml, paymentLabel, upiPayLink } from "./a5-bill";

const sample = {
  billNo: 12,
  at: "2026-11-27T08:00:00.000Z",
  customerName: "Ravi",
  customerPhone: "9810012345",
  items: [{ name: "Notebook", qty: 2, unitPrice: 3000, lineTotal: 6000 }],
  subtotal: 6000,
  discount: 0,
  total: 6000,
  payments: { cash: 6000, upi: 0, card: 0 },
};

describe("a5 bill", () => {
  it("is a cash memo with no tax invoice language", () => {
    const html = a5BillHtml(sample, { reviewQr: "data:image/png;base64,abc" });
    expect(html).toContain(">Bill<");
    expect(html).toContain("Cash Memo");
    expect(html).toContain("Thank you! Visit again");
    expect(html).toContain("Sixty rupees only");
    expect(html).toContain("Ravi");
    expect(html).not.toMatch(/GST|GSTIN|Tax Invoice|signatory|signature|For Pencil Box/i);
    expect(html).not.toContain("Pay ");
    expect(html).toContain("#153a7a");
  });

  it("prints a black and white copy with no filled brand colours", () => {
    const html = a5BillHtml(sample, { reviewQr: "data:image/png;base64,abc", tone: "bw" });
    expect(html).toContain("sheet bw");
    expect(html).toContain(">Bill<");
    expect(html).toContain("Cash Memo");
    expect(html).not.toMatch(/#153a7a|#ecc233|#e23b3b|#2f6fed|#1f9d55/i);
    expect(html).not.toMatch(/GST|GSTIN|Tax Invoice|signatory|signature|For Pencil Box/i);
  });

  it("prints a UPI QR only when an ID is provided", () => {
    const html = a5BillHtml(sample, { reviewQr: "data:image/png;base64,abc", upiQr: "data:image/png;base64,upi", upiId: "shop@upi" });
    expect(html).toContain("shop@upi");
    expect(html).toContain("data:image/png;base64,upi");
    expect(upiPayLink("shop@upi", 6000, 12)).toContain("pa=shop%40upi");
    expect(upiPayLink("shop@upi", 6000, 12)).toContain("am=60.00");
  });

  it("names the payment mode", () => {
    expect(paymentLabel({ cash: 1, upi: 0 })).toBe("Cash");
    expect(paymentLabel({ cash: 0, upi: 1 })).toBe("UPI");
    expect(paymentLabel({ cash: 0, upi: 0, card: 1 })).toBe("Card");
    expect(paymentLabel({ cash: 1, upi: 1, card: 0 })).toBe("Cash + UPI");
  });
});
