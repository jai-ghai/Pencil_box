/**
 * Shop check helpers. Pure functions (no database). The owner walks the shelves, ticks what is there and crosses
 * what is missing; every crossed item lands on the buy list, grouped by wholesaler so one trip covers one shop.
 * Money is integer paise.
 */
export interface BuyItem {
  id: string;
  code: string;
  name: string;
  supplier: string;
  needQty: number;
  /** paise per piece; 0 when unknown */
  cost: number;
}
export interface BuyGroup {
  supplier: string;
  items: BuyItem[];
  lines: number;
  /** paise; items with no cost price add nothing, see `unpriced` */
  estimate: number;
  unpriced: number;
}

export const NO_SUPPLIER = "No wholesaler set";

export function groupBuyList(items: BuyItem[]): { groups: BuyGroup[]; estimate: number; lines: number; unpriced: number } {
  const map = new Map<string, BuyItem[]>();
  for (const i of items) {
    const key = i.supplier.trim() || NO_SUPPLIER;
    map.set(key, [...(map.get(key) ?? []), i]);
  }
  const groups: BuyGroup[] = [...map]
    .map(([supplier, list]) => {
      const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
      return {
        supplier,
        items: sorted,
        lines: sorted.length,
        estimate: sorted.reduce((s, i) => s + i.needQty * i.cost, 0),
        unpriced: sorted.filter((i) => i.cost === 0).length,
      };
    })
    // the "no wholesaler" group goes last; the rest by name
    .sort((a, b) => (a.supplier === NO_SUPPLIER ? 1 : b.supplier === NO_SUPPLIER ? -1 : a.supplier.localeCompare(b.supplier)));
  return { groups, estimate: groups.reduce((s, g) => s + g.estimate, 0), lines: items.length, unpriced: groups.reduce((s, g) => s + g.unpriced, 0) };
}

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

/** Plain text of the buy list, for pasting into WhatsApp or a note. */
export function buyListText(groups: BuyGroup[], date: string): string {
  if (!groups.length) return `Pencil Box buy list (${date}): nothing to buy.`;
  const out = [`Pencil Box buy list (${date})`];
  for (const g of groups) {
    out.push("", `${g.supplier} (${g.lines} item${g.lines === 1 ? "" : "s"}${g.estimate ? `, about ${rs(g.estimate)}` : ""})`);
    g.items.forEach((i, n) => out.push(`${n + 1}. [${i.code}] ${i.name} x ${i.needQty}`));
  }
  return out.join("\n");
}

/** How far through the round the owner is: counts of items ticked, crossed and still to look at. */
export function checkProgress(rows: { status: "ok" | "missing" | null; inRound: boolean }[]): { total: number; ok: number; missing: number; left: number; pct: number } {
  const total = rows.length;
  const ok = rows.filter((r) => r.inRound && r.status === "ok").length;
  // a crossed item stays on the buy list across rounds, so only count it as "done" in this round when it was crossed in it
  const missing = rows.filter((r) => r.status === "missing").length;
  const missingThisRound = rows.filter((r) => r.inRound && r.status === "missing").length;
  const left = total - ok - missingThisRound;
  return { total, ok, missing, left, pct: total ? Math.round(((ok + missingThisRound) / total) * 100) : 0 };
}
