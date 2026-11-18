import { describe, expect, it } from "vitest";
import { buyListText, checkProgress, groupBuyList, NO_SUPPLIER, type BuyItem } from "./shopcheck";

const item = (name: string, supplier: string, needQty: number, cost: number, code = "BP-01"): BuyItem => ({ id: name, code, name, supplier, needQty, cost });

describe("groupBuyList", () => {
  const list = [item("Ball Pen Blue", "Balaji", 20, 300), item("Register 200pg", "Laxman", 5, 4000, "RG-01"), item("Apsara Pencil", "Balaji", 10, 250, "PN-02"), item("Mystery item", "", 2, 0, "XX-01")];
  const g = groupBuyList(list);

  it("groups by wholesaler, no-wholesaler group last", () => {
    expect(g.groups.map((x) => x.supplier)).toEqual(["Balaji", "Laxman", NO_SUPPLIER]);
    expect(g.groups[0].items.map((i) => i.name)).toEqual(["Apsara Pencil", "Ball Pen Blue"]);
  });
  it("estimates cost per wholesaler and overall, and counts items with no cost price", () => {
    expect(g.groups[0].estimate).toBe(20 * 300 + 10 * 250);
    expect(g.groups[1].estimate).toBe(20000);
    expect(g.estimate).toBe(8500 + 20000);
    expect(g.unpriced).toBe(1);
    expect(g.lines).toBe(4);
  });
  it("handles an empty list", () => {
    expect(groupBuyList([])).toEqual({ groups: [], estimate: 0, lines: 0, unpriced: 0 });
  });
});

describe("buyListText", () => {
  it("writes a pasteable list with codes and quantities", () => {
    const txt = buyListText(groupBuyList([item("Ball Pen Blue", "Balaji", 20, 300)]).groups, "2026-11-07");
    expect(txt).toBe(["Pencil Box buy list (2026-11-07)", "", "Balaji (1 item, about ₹60)", "1. [BP-01] Ball Pen Blue x 20"].join("\n"));
  });
  it("says so when there is nothing to buy", () => {
    expect(buyListText([], "2026-11-07")).toContain("nothing to buy");
  });
});

describe("checkProgress", () => {
  it("counts only this round's ticks and crosses as done, but keeps all crosses on the buy list", () => {
    const p = checkProgress([
      { status: "ok", inRound: true },
      { status: "ok", inRound: false }, // ticked in an older round: needs checking again
      { status: "missing", inRound: true },
      { status: "missing", inRound: false }, // still on the buy list, not yet re-checked
      { status: null, inRound: false },
    ]);
    expect(p).toEqual({ total: 5, ok: 1, missing: 2, left: 3, pct: 40 });
  });
});
