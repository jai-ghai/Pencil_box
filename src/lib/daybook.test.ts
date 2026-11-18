import { describe, expect, it } from "vitest";
import { buildAnalytics, catalogMarginPct, mergeSales, type CostEntry, type SalesDay } from "./daybook";

const day = (date: string, cash: number, upi = 0): SalesDay => ({ date, cash, upi });
const cost = (date: string, kind: CostEntry["kind"], amount: number, party?: string): CostEntry => ({ date, kind, amount, party });

describe("catalogMarginPct", () => {
  it("averages the margin of items that have both prices", () => {
    // 50% and 25% -> 37.5
    expect(catalogMarginPct([{ sellPrice: 1000, costPrice: 500 }, { sellPrice: 1000, costPrice: 750 }])).toBe(37.5);
  });
  it("skips items with no cost price and returns null when nothing is usable", () => {
    expect(catalogMarginPct([{ sellPrice: 1000, costPrice: 0 }])).toBeNull();
    expect(catalogMarginPct([])).toBeNull();
  });
});

describe("mergeSales", () => {
  it("uses the typed total for a day and never adds bills on top of it", () => {
    const { days } = mergeSales([day("2026-11-02", 10000, 5000)], [day("2026-11-02", 999), day("2026-11-03", 400, 100)]);
    expect(days.get("2026-11-02")).toEqual(day("2026-11-02", 10000, 5000));
    expect(days.get("2026-11-03")).toEqual(day("2026-11-03", 400, 100)); // no typed total: bills fill in
  });
});

describe("buildAnalytics", () => {
  const base = {
    entered: [day("2026-11-02", 10000, 2000), day("2026-11-03", 6000, 0), day("2026-11-05", 8000, 4000)], // Mon, Tue, Thu
    bills: [],
    costs: [cost("2026-11-02", "purchase", 5000, "Balaji"), cost("2026-11-03", "purchase", 3000, "Balaji"), cost("2026-11-04", "purchase", 1000, "Laxman"), cost("2026-11-04", "expense", 2000, "Helper")],
    from: "2026-11-02",
    to: "2026-11-08",
    group: "day" as const,
    marginPct: 30,
    today: "2026-11-09",
  };
  const a = buildAnalytics(base);

  it("adds up sales, buying and expenses", () => {
    expect(a.totals.sales).toBe(30000);
    expect(a.totals.cash).toBe(24000);
    expect(a.totals.upi).toBe(6000);
    expect(a.totals.buying).toBe(9000);
    expect(a.totals.expenses).toBe(2000);
  });
  it("estimates profit as sales x margin minus expenses, and cash left as sales minus buying and expenses", () => {
    expect(a.totals.estProfit).toBe(9000 - 2000);
    expect(a.totals.cashLeft).toBe(30000 - 9000 - 2000);
  });
  it("lists days with no figure so the owner can fill them in", () => {
    expect(a.totals.missingDays).toEqual(["2026-11-04", "2026-11-06", "2026-11-07", "2026-11-08"]);
    expect(a.totals.daysWithSales).toBe(3);
    expect(a.totals.avgDaily).toBe(10000);
  });
  it("does not call today missing, because the day is not over", () => {
    const b = buildAnalytics({ ...base, to: "2026-11-09", today: "2026-11-09" });
    expect(b.totals.missingDays).not.toContain("2026-11-09");
  });
  it("finds the best and slowest day and the weekday pattern", () => {
    const b = buildAnalytics({ ...base, entered: [day("2026-11-02", 10000, 2000), day("2026-11-03", 6000, 0), day("2026-11-05", 9000, 4000)] }); // Mon 120, Tue 60, Thu 130
    expect(b.bestDay).toEqual({ date: "2026-11-05", sales: 13000 });
    expect(b.slowestDay).toEqual({ date: "2026-11-03", sales: 6000 });
    expect(b.weekdays[0]).toEqual({ name: "Monday", avg: 12000, days: 1 });
    expect(b.weekdays[3].avg).toBe(13000); // Thursday
    expect(b.weekdays[6].days).toBe(0);
  });
  it("splits buying by wholesaler, biggest first", () => {
    expect(a.buyingByParty).toEqual([{ party: "Balaji", amount: 8000 }, { party: "Laxman", amount: 1000 }]);
    expect(a.expensesByParty).toEqual([{ party: "Helper", amount: 2000 }]);
  });
  it("compares with the previous period of the same length", () => {
    const b = buildAnalytics({ ...base, entered: [...base.entered, day("2026-10-27", 15000)] });
    expect(b.previous.range).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(b.previous.totals.sales).toBe(15000);
    expect(b.salesChangePct).toBe(100); // 30000 vs 15000
  });
  it("gives no percentage when the previous period had no sales", () => {
    expect(a.salesChangePct).toBeNull();
  });
  it("groups by week with no holes", () => {
    const w = buildAnalytics({ ...base, from: "2026-10-26", to: "2026-11-08", group: "week" });
    expect(w.series.map((s) => s.key)).toEqual(["2026-10-26", "2026-11-02"]);
    expect(w.series[1].sales).toBe(30000);
  });
  it("uses POS bills for days that were not typed and counts the days by source", () => {
    const b = buildAnalytics({ ...base, bills: [day("2026-11-02", 777), day("2026-11-06", 2000, 500)] });
    expect(b.totals.sales).toBe(30000 + 2500); // 02 Nov typed total wins; 06 Nov comes from bills
    expect(b.source).toEqual({ entered: 3, bills: 1 });
  });
  it("keeps the margin between 0 and 100", () => {
    expect(buildAnalytics({ ...base, marginPct: 250 }).marginPct).toBe(100);
    expect(buildAnalytics({ ...base, marginPct: -4 }).marginPct).toBe(0);
  });
});
