import { describe, expect, it } from "vitest";
import { buildCapital, dayCount, earliestDate, type DeadStockLine, type PurchaseTotal } from "./capital";
import type { CostEntry, SalesDay } from "./daybook";

const day = (date: string, cash: number, upi = 0): SalesDay => ({ date, cash, upi });
const cost = (date: string, kind: CostEntry["kind"], amount: number, party?: string): CostEntry => ({ date, kind, amount, party });
const purchase = (date: string, total: number): PurchaseTotal => ({ date, total });
const dead = (id: string, name: string, qty: number, value: number, lastSoldDate: string | null = null): DeadStockLine => ({ id, name, qty, value, lastSoldDate });

const EMPTY: Pick<import("./capital").CapitalInput, "entered" | "bills" | "costs" | "purchases" | "shelfValue" | "unpricedOnShelf" | "deadStock" | "deadStockDays"> = {
  entered: [],
  bills: [],
  costs: [],
  purchases: [],
  shelfValue: 0,
  unpricedOnShelf: 0,
  deadStock: [],
  deadStockDays: 60,
};

describe("dayCount", () => {
  it("is inclusive on both ends", () => {
    expect(dayCount("2026-11-01", "2026-11-01")).toBe(1);
    expect(dayCount("2026-11-01", "2026-11-07")).toBe(7);
  });
  it("falls back to 1 when from is after to", () => {
    expect(dayCount("2026-11-10", "2026-11-01")).toBe(1);
  });
});

describe("earliestDate", () => {
  it("returns the oldest date in the list", () => {
    expect(earliestDate([{ date: "2026-11-05" }, { date: "2026-11-02" }, { date: "2026-11-04" }])).toBe("2026-11-02");
  });
  it("is null for an empty list", () => {
    expect(earliestDate([])).toBeNull();
  });
});

describe("buildCapital", () => {
  it("adds up sales, stock bought and expenses in the range, and reports money back in your pocket", () => {
    // Rs 500 sales, Rs 200 daybook stock + Rs 100 purchase-form stock, Rs 50 expenses, Rs 800 shelf value
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 2_00_000_00, // Rs 2 lakh in paise
      startDate: null,
      today: "2026-11-30",
      entered: [day("2026-11-05", 20_000, 10_000), day("2026-11-10", 15_000, 5_000)],
      costs: [cost("2026-11-06", "purchase", 20_000, "Balaji"), cost("2026-11-12", "expense", 5_000, "Electricity")],
      purchases: [purchase("2026-11-08", 10_000)],
      shelfValue: 80_000,
    });
    expect(r.sales).toBe(50_000);
    expect(r.purchases).toBe(30_000);
    expect(r.expenses).toBe(5_000);
    expect(r.cashRecovered).toBe(15_000);
    expect(r.shelfValue).toBe(80_000);
    // position = cashRecovered + shelfValue - capital = 15,000 + 80,000 - 2,00,00,000 paise
    // The owner is Rs 1,99,050 short against a Rs 2 lakh capital.
    expect(r.position).toBe(-1_99_05_000);
  });

  it("gives recovered% as cashRecovered / capital", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 100_00, // Rs 100 for round numbers
      startDate: null,
      today: "2026-11-30",
      entered: [day("2026-11-01", 50_00)],
    });
    expect(r.cashRecovered).toBe(50_00);
    expect(r.recoveredPct).toBe(50);
  });

  it("gives null percentages when no capital is set", () => {
    const r = buildCapital({ ...EMPTY, capitalStart: 0, startDate: null, today: "2026-11-30", entered: [day("2026-11-01", 50_00)] });
    expect(r.recoveredPct).toBeNull();
    expect(r.booksPct).toBeNull();
  });

  it("uses POS bills for days nobody typed, but never counts both for the same day", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_000_00,
      startDate: null,
      today: "2026-11-30",
      entered: [day("2026-11-02", 10_000)], // 02-Nov typed total wins
      bills: [day("2026-11-02", 7_777), day("2026-11-03", 2_000, 500)], // 02-Nov bills are ignored; 03-Nov fills in
    });
    expect(r.sales).toBe(10_000 + 2_500);
  });

  it("respects the start date: only data on or after it counts", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_000_00,
      startDate: "2026-11-01",
      today: "2026-11-30",
      entered: [day("2026-10-25", 99_999), day("2026-11-05", 8_000)], // Oct 25 is before the window
      costs: [cost("2026-10-20", "purchase", 50_000), cost("2026-11-07", "expense", 1_000)], // Oct 20 is before
    });
    expect(r.sales).toBe(8_000);
    expect(r.purchases).toBe(0);
    expect(r.expenses).toBe(1_000);
    expect(r.from).toBe("2026-11-01");
  });

  it("uses the earliest day on file when no start date is set", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_000_00,
      startDate: null,
      today: "2026-11-30",
      entered: [day("2026-09-15", 100), day("2026-11-05", 500)],
    });
    expect(r.from).toBe("2026-09-15");
  });

  it("estimates months to payback at the shop's current monthly rate", () => {
    // 60 days, cashRecovered = Rs 20k, capital = Rs 1 lakh. Monthly net = Rs 10k. Still to recover = Rs 80k. 8 months.
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_00_000_00,
      startDate: "2026-09-01",
      today: "2026-10-30",
      entered: [day("2026-09-30", 10_000_00), day("2026-10-30", 10_000_00)],
    });
    expect(r.cashRecovered).toBe(20_000_00);
    expect(r.monthlyNetAvg).toBe(10_000_00);
    expect(r.monthsToPayback).toBe(8);
  });

  it("returns null months to payback with less than 30 days of data", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_00_000_00,
      startDate: "2026-11-20",
      today: "2026-11-30",
      entered: [day("2026-11-25", 50_000)],
    });
    expect(r.monthsToPayback).toBeNull();
  });

  it("returns null months to payback when the monthly rate is zero or negative", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_00_000_00,
      startDate: "2026-09-01",
      today: "2026-10-30",
      entered: [day("2026-09-10", 5_000)],
      costs: [cost("2026-09-20", "expense", 20_000)],
    });
    expect(r.cashRecovered).toBeLessThan(0);
    expect(r.monthsToPayback).toBeNull();
  });

  it("gives 0 months to payback when the capital is already recovered", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 10_000_00,
      startDate: "2026-09-01",
      today: "2026-10-30",
      entered: [day("2026-09-10", 50_000_00)],
    });
    expect(r.monthsToPayback).toBe(0);
  });

  it("totals the dead-stock value and passes the lines through", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_000_00,
      startDate: null,
      today: "2026-11-30",
      deadStock: [dead("v1", "Old pencil box", 12, 6_000, "2026-08-10"), dead("v2", "Expired paint", 3, 4_500, null)],
      deadStockDays: 60,
    });
    expect(r.deadStockValue).toBe(10_500);
    expect(r.deadStockLines).toHaveLength(2);
  });

  it("counts both DayCost purchases and Purchase docs as stock bought", () => {
    const r = buildCapital({
      ...EMPTY,
      capitalStart: 1_000_00,
      startDate: null,
      today: "2026-11-30",
      costs: [cost("2026-11-05", "purchase", 3_000)],
      purchases: [purchase("2026-11-06", 7_000), purchase("2026-11-10", 2_000)],
    });
    expect(r.purchases).toBe(12_000);
  });

  it("falls back to today when there is no data on file at all", () => {
    const r = buildCapital({ ...EMPTY, capitalStart: 2_00_000_00, startDate: null, today: "2026-11-30" });
    expect(r.from).toBe("2026-11-30");
    expect(r.to).toBe("2026-11-30");
    expect(r.days).toBe(1);
    expect(r.sales).toBe(0);
    expect(r.monthsToPayback).toBeNull();
  });
});
