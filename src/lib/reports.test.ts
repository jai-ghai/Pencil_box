import { describe, expect, it } from "vitest";
import { addDays, buildReport, istDate, mondayOf, periodKey, type ReportSale } from "./reports";

const sale = (iso: string, total: number, items: { id: string; name: string; qty: number; cost: number; line: number }[], pay: "cash" | "upi" = "cash", discount = 0): ReportSale => ({
  at: new Date(iso),
  total,
  discount,
  payments: pay === "cash" ? { cash: total, upi: 0 } : { cash: 0, upi: total },
  items: items.map((i) => ({ variantId: i.id, name: i.name, qty: i.qty, unitCost: i.cost, lineTotal: i.line })),
});
const cat = (id: string) => (id.startsWith("p") ? "Pens" : "Notebooks");

describe("india-time dates", () => {
  it("puts a late-evening UTC time on the next India day", () => {
    expect(istDate(new Date("2026-10-14T20:00:00Z"))).toBe("2026-10-15"); // 01:30 IST next day
    expect(istDate(new Date("2026-10-14T10:00:00Z"))).toBe("2026-10-14");
  });
  it("weeks run Monday to Sunday", () => {
    expect(mondayOf("2026-10-14")).toBe("2026-10-12"); // Wednesday -> Monday
    expect(mondayOf("2026-10-18")).toBe("2026-10-12"); // Sunday belongs to the week before
    expect(periodKey("2026-10-14", "month")).toBe("2026-10");
    expect(addDays("2026-02-28", 1)).toBe("2026-03-01");
  });
});

describe("buildReport", () => {
  const sales = [
    sale("2026-10-12T05:00:00Z", 5000, [{ id: "p1", name: "Pen", qty: 5, cost: 600, line: 5000 }]), // cost 3000
    sale("2026-10-12T08:00:00Z", 12000, [{ id: "n1", name: "Register", qty: 7, cost: 1400, line: 12000 }], "upi", 2000), // 6 paid + 1 free, cost 9800
    sale("2026-10-14T05:00:00Z", 1000, [{ id: "p1", name: "Pen", qty: 1, cost: 600, line: 1000 }]),
  ];
  const r = buildReport({ sales, group: "day", from: "2026-10-12", to: "2026-10-14", categoryOf: cat });

  it("adds up sales, cost, profit and margin", () => {
    expect(r.totals.bills).toBe(3);
    expect(r.totals.units).toBe(13);
    expect(r.totals.revenue).toBe(18000);
    expect(r.totals.cost).toBe(3000 + 9800 + 600);
    expect(r.totals.profit).toBe(18000 - 13400);
    expect(r.totals.marginPct).toBe(25.6); // 4600 / 18000
    expect(r.totals.discount).toBe(2000);
    expect(r.totals.cash).toBe(6000);
    expect(r.totals.upi).toBe(12000);
    expect(r.totals.avgBill).toBe(6000);
  });
  it("shows days without sales as zero", () => {
    expect(r.series.map((p) => p.key)).toEqual(["2026-10-12", "2026-10-13", "2026-10-14"]);
    expect(r.series[1].revenue).toBe(0);
    expect(r.series[0].revenue).toBe(17000);
    expect(r.series[0].profit).toBe(17000 - 12800);
  });
  it("ranks items by units and splits by category", () => {
    expect(r.topItems[0]).toMatchObject({ name: "Register", units: 7 });
    expect(r.categories.find((c) => c.name === "Pens")).toMatchObject({ units: 6, revenue: 6000, profit: 6000 - 3600 });
    expect(r.categories.find((c) => c.name === "Notebooks")!.profit).toBe(12000 - 9800);
  });
  it("groups into weeks and months", () => {
    const w = buildReport({ sales, group: "week", categoryOf: cat });
    expect(w.series).toHaveLength(1);
    expect(w.series[0].key).toBe("2026-10-12");
    expect(buildReport({ sales, group: "month", categoryOf: cat }).series[0].key).toBe("2026-10");
  });
  it("flags sales of items whose cost was never entered, so profit is not overstated unnoticed", () => {
    const x = buildReport({ sales: [sale("2026-10-12T05:00:00Z", 2000, [{ id: "p9", name: "Photocopy", qty: 10, cost: 0, line: 2000 }])], group: "day", categoryOf: cat });
    expect(x.totals.costMissingUnits).toBe(10);
    expect(x.totals.marginPct).toBe(100);
  });
  it("handles an empty period", () => {
    const e = buildReport({ sales: [], group: "day", from: "2026-10-01", to: "2026-10-02", categoryOf: cat });
    expect(e.totals.revenue).toBe(0);
    expect(e.totals.marginPct).toBe(0);
    expect(e.series).toHaveLength(2);
  });
});
