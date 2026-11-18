import { describe, expect, it } from "vitest";
import { findAmounts, parseDaybookText } from "./daybook-parse";

describe("findAmounts", () => {
  it("reads plain, comma and decimal rupee amounts as paise", () => {
    expect(findAmounts("4200")).toEqual([4200_00]);
    expect(findAmounts("4,200")).toEqual([4200_00]);
    expect(findAmounts("₹1,800.50")).toEqual([1800_50]);
    expect(findAmounts("cash 4200 upi 1800")).toEqual([4200_00, 1800_00]);
  });
});

describe("parseDaybookText", () => {
  it("parses the WhatsApp-style day total the owner actually writes", () => {
    const r = parseDaybookText("Sold 4,200 cash, 1,800 UPI. Bought from Balaji 3,200. Light bill 800.");
    expect(r.matched).toBe(true);
    expect(r.sales).toEqual({ cash: 4200_00, upi: 1800_00 });
    expect(r.costs).toEqual([
      { kind: "purchase", amount: 3200_00, party: "Balaji" },
      { kind: "expense", amount: 800_00, party: "" },
    ]);
    expect(r.unknown).toEqual([]);
  });

  it("understands cash / upi / gpay / phonepe without the word sold", () => {
    expect(parseDaybookText("cash 5000").sales).toEqual({ cash: 5000_00, upi: 0 });
    expect(parseDaybookText("upi 1200").sales).toEqual({ cash: 0, upi: 1200_00 });
    expect(parseDaybookText("gpay 900").sales).toEqual({ cash: 0, upi: 900_00 });
    expect(parseDaybookText("PhonePe 250").sales).toEqual({ cash: 0, upi: 250_00 });
  });

  it("splits '4200 cash 1800 upi' on one line", () => {
    expect(parseDaybookText("4200 cash 1800 upi").sales).toEqual({ cash: 4200_00, upi: 1800_00 });
  });

  it("treats a bare 'sold 5000' as cash", () => {
    expect(parseDaybookText("sold 5000").sales).toEqual({ cash: 5000_00, upi: 0 });
  });

  it("reads purchase party from 'from X' and leftover words", () => {
    expect(parseDaybookText("bought from Balaji 3200").costs).toEqual([{ kind: "purchase", amount: 3200_00, party: "Balaji" }]);
    expect(parseDaybookText("purchase Laxman 1500").costs[0]).toMatchObject({ kind: "purchase", amount: 1500_00, party: "Laxman" });
  });

  it("reads common expense words", () => {
    expect(parseDaybookText("rent 5000").costs).toEqual([{ kind: "expense", amount: 5000_00, party: "" }]);
    expect(parseDaybookText("helper 800").costs[0]).toMatchObject({ kind: "expense", amount: 800_00 });
    expect(parseDaybookText("electricity 1200").costs[0].kind).toBe("expense");
  });

  it("keeps clauses with an amount but no cue as unknown", () => {
    const r = parseDaybookText("something 999");
    expect(r.sales).toEqual({ cash: 0, upi: 0 });
    expect(r.costs).toEqual([]);
    expect(r.unknown).toHaveLength(1);
    expect(r.unknown[0].amount).toBe(999_00);
  });

  it("handles newlines the same as full stops", () => {
    const r = parseDaybookText("cash 2000\nupi 500\nbought from Balaji 1000");
    expect(r.sales).toEqual({ cash: 2000_00, upi: 500_00 });
    expect(r.costs).toEqual([{ kind: "purchase", amount: 1000_00, party: "Balaji" }]);
  });

  it("returns matched:false for empty or cue-only text", () => {
    expect(parseDaybookText("").matched).toBe(false);
    expect(parseDaybookText("nothing today").matched).toBe(false);
  });

  it("adds multiple amounts of the same kind", () => {
    const r = parseDaybookText("cash 1000. cash 500. upi 200.");
    expect(r.sales).toEqual({ cash: 1500_00, upi: 200_00 });
  });
});
