import { describe, expect, it } from "vitest";
import { alertsFor, expandMonthlyBill, isAlertActive, nthWeekday, seasonalPackForYear } from "./shop-calendar";

describe("isAlertActive", () => {
  it("shows from remindDaysBefore through the event day", () => {
    expect(isAlertActive({ date: "2026-11-10", remindDaysBefore: 1 }, "2026-11-09")).toBe(true);
    expect(isAlertActive({ date: "2026-11-10", remindDaysBefore: 1 }, "2026-11-10")).toBe(true);
    expect(isAlertActive({ date: "2026-11-10", remindDaysBefore: 1 }, "2026-11-08")).toBe(false);
    expect(isAlertActive({ date: "2026-11-10", remindDaysBefore: 1 }, "2026-11-11")).toBe(false);
  });
});

describe("alertsFor", () => {
  it("returns only events in the remind window, soonest first", () => {
    const list = alertsFor(
      [
        { id: "1", date: "2026-11-20", title: "Later", type: "note", remindDaysBefore: 1 },
        { id: "2", date: "2026-11-10", title: "Rent", type: "bill", remindDaysBefore: 1 },
        { id: "3", date: "2026-11-11", title: "Diwali prep", type: "season", remindDaysBefore: 7, itemsHint: "hampers" },
      ],
      "2026-11-10",
    );
    expect(list.map((e) => e.id)).toEqual(["2", "3"]);
  });
});

describe("expandMonthlyBill", () => {
  it("creates one event per month on the chosen day", () => {
    const rows = expandMonthlyBill({ title: "Shop rent", dayOfMonth: 5, from: "2026-11-01", months: 3 });
    expect(rows.map((r) => r.date)).toEqual(["2026-11-05", "2026-12-05", "2027-01-05"]);
    expect(rows.every((r) => r.type === "bill" && r.title === "Shop rent")).toBe(true);
  });

  it("still returns full months count when started after this month's bill day", () => {
    const rows = expandMonthlyBill({ title: "Shop rent", dayOfMonth: 5, from: "2026-11-18", months: 12 });
    expect(rows).toHaveLength(12);
    expect(rows[0].date).toBe("2026-12-05");
    expect(rows[11].date).toBe("2027-11-05");
  });
});

describe("seasonalPackForYear", () => {
  it("includes stationery seasons, Valentine week and Guru Nanak Jayanti for 2026", () => {
    const pack = seasonalPackForYear(2026);
    const titles = pack.map((p) => p.title);
    expect(titles).toContain("Back-to-school starts");
    expect(titles).toContain("Teachers' Day");
    expect(titles).toContain("Diwali");
    expect(titles).toContain("Exam season (Oct)");
    expect(titles).toContain("Rose Day");
    expect(titles).toContain("Valentine's Day");
    expect(titles).toContain("Guru Nanak Jayanti");
    expect(titles).toContain("Children's Day");
    expect(titles).toContain("Friendship Day");
    expect(pack.every((p) => p.templateKey?.includes("2026"))).toBe(true);
    expect(pack.find((p) => p.title === "Diwali")?.itemsHint).toMatch(/hamper/i);
    expect(pack.find((p) => p.title === "Guru Nanak Jayanti")?.date).toBe("2026-11-24");
    expect(pack.find((p) => p.title === "Valentine's Day")?.date).toBe("2026-02-14");
    // sorted by date
    for (let i = 1; i < pack.length; i++) {
      expect(pack[i].date >= pack[i - 1].date).toBe(true);
    }
  });
});

describe("nthWeekday", () => {
  it("finds Friendship Day (first Sunday of August) 2026", () => {
    expect(nthWeekday(2026, 8, 0, 1)).toBe("2026-08-02");
  });
});
