import { z } from "zod";
import { route, STAFF } from "@/lib/api";
import { Sale } from "@/lib/models";
import { startOfDayIST } from "@/lib/time";

interface BillItem {
  name?: string | null;
  qty?: number | null;
  freeUnits?: number | null;
  unitPrice?: number | null;
  lineTotal?: number | null;
  offerLabel?: string | null;
}

const DAY_MS = 24 * 3600 * 1000;
const query = z.object({ date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() });

/**
 * Bills for one day (India time). Every bill made on the billing screen is an order record.
 * The cashier sees today only; the owner can look at any day. Cost prices are never included.
 */
export const GET = route(STAFF, async (req, session) => {
  const { date } = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const day = date && session.role === "owner" ? startOfDayIST(new Date(`${date}T12:00:00+05:30`)) : startOfDayIST();
  const bills = await Sale.find({ at: { $gte: day, $lt: new Date(day.getTime() + DAY_MS) }, voided: false }).sort({ at: -1 }).limit(500).lean();
  const sum = (f: (b: (typeof bills)[number]) => number) => bills.reduce((s, b) => s + f(b), 0);
  return {
    date: new Date(day.getTime() + 5.5 * 3600 * 1000).toISOString().slice(0, 10),
    summary: { bills: bills.length, total: sum((b) => b.total ?? 0), cash: sum((b) => b.payments?.cash ?? 0), upi: sum((b) => b.payments?.upi ?? 0), discount: sum((b) => b.discount ?? 0) },
    bills: bills.map((b) => ({
      id: String(b._id),
      billNo: b.billNo,
      at: b.at,
      cashier: b.cashierId,
      total: b.total,
      discount: b.discount,
      payments: { cash: b.payments?.cash ?? 0, upi: b.payments?.upi ?? 0 },
      items: (b.items as BillItem[]).map((i) => ({ name: i.name, qty: i.qty, freeUnits: i.freeUnits ?? 0, unitPrice: i.unitPrice, lineTotal: i.lineTotal, offer: i.offerLabel ?? "" })),
    })),
  };
});
