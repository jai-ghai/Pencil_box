import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { audit } from "@/lib/audit";
import { DayCost, DaySales, COST_KINDS } from "@/lib/models";
import { loadBillDays } from "@/lib/daybook-data";
import { addDays, istDate } from "@/lib/reports";

const MAX_PAISE = 100_000_000_00; // Rs 10 crore: far above any real day, stops typing mistakes
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Not a real date");
const notFuture = (d: string) => {
  if (d > istDate(new Date())) throw new HttpError(400, "That date is in the future");
  return d;
};
const paise = z.number().int().min(0).max(MAX_PAISE);

const range = z.object({ from: date.optional(), to: date.optional() });
const photoUrl = z
  .string()
  .trim()
  .min(1)
  .max(500)
  .refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "Bad photo URL");
const salesBody = z.object({
  date,
  cash: paise,
  upi: paise,
  note: z.string().trim().max(300).optional(),
  /** replace the day's photo list; omit to leave photos alone */
  photos: z.array(photoUrl).max(12).optional(),
});
const costBody = z.object({
  date,
  kind: z.enum(COST_KINDS),
  amount: z.number().int().min(1).max(MAX_PAISE),
  party: z.string().trim().max(80).optional(),
  note: z.string().trim().max(300).optional(),
});
/** One-tap save from the "Add today" box: sales + costs + optional photo, in one request. */
const applyBody = z.object({
  apply: z.literal(true),
  date,
  cash: paise.optional(),
  upi: paise.optional(),
  note: z.string().trim().max(300).optional(),
  photo: photoUrl.optional(),
  costs: z
    .array(
      z.object({
        kind: z.enum(COST_KINDS),
        amount: z.number().int().min(1).max(MAX_PAISE),
        party: z.string().trim().max(80).optional(),
      }),
    )
    .max(20)
    .default([]),
});

/**
 * The typed daily totals and the money-out entries for a date range (India time, default: last 31 days),
 * plus, for each day, what the POS bills added up to, so the screen can offer it as a starting figure.
 */
export const GET = route(can("daybook"), async (req) => {
  const q = range.parse(Object.fromEntries(new URL(req.url).searchParams));
  const to = q.to ?? istDate(new Date());
  const from = q.from ?? addDays(to, -30);
  if (from > to) throw new HttpError(400, "'From' is after 'to'");

  const [sales, costs, bills] = await Promise.all([
    DaySales.find({ _id: { $gte: from, $lte: to } }).sort({ _id: 1 }).lean(),
    DayCost.find({ date: { $gte: from, $lte: to } }).sort({ date: -1, createdAt: -1 }).limit(5000).lean(),
    loadBillDays(from, to),
  ]);

  return {
    range: { from, to },
    sales: sales.map((s) => ({ date: String(s._id), cash: s.cash ?? 0, upi: s.upi ?? 0, note: s.note ?? "", photos: s.photos ?? [] })),
    costs: costs.map((c) => ({ id: String(c._id), date: c.date, kind: c.kind, amount: c.amount, party: c.party ?? "", note: c.note ?? "" })),
    bills,
  };
});

/** Type (or change) the total sold on one day. Saving the same day again replaces it. */
export const PUT = route(can("daybook"), async (req, actor) => {
  const b = salesBody.parse(await req.json());
  notFuture(b.date);
  const $set: Record<string, unknown> = { cash: b.cash, upi: b.upi, note: b.note ?? "", by: actor.username };
  if (b.photos) $set.photos = b.photos;
  await DaySales.updateOne({ _id: b.date }, { $set }, { upsert: true });
  return { ok: true };
});

/** Remove a typed day total (the day then falls back to POS bills, if there are any). */
export const DELETE = route(can("daybook"), async (req, actor) => {
  const { date: d } = z.object({ date }).parse(Object.fromEntries(new URL(req.url).searchParams));
  const old = await DaySales.findByIdAndDelete(d).lean();
  if (!old) throw new HttpError(404, "No total was saved for that day");
  await audit(actor.username, "daybook.sales.delete", "daybook", `Removed the typed sales total for ${d} (Rs ${((old.cash ?? 0) + (old.upi ?? 0)) / 100})`, { entityId: d, meta: old });
  return { ok: true };
});

/**
 * Two shapes:
 *  - `{ apply: true, date, cash?, upi?, costs?, photo?, note? }` — one-tap save from the Add-today box
 *  - `{ date, kind, amount, party?, note? }` — add a single purchase or expense (unchanged)
 */
export const POST = route(can("daybook"), async (req, actor) => {
  const raw = await req.json();
  if (raw && typeof raw === "object" && (raw as { apply?: unknown }).apply === true) {
    const b = applyBody.parse(raw);
    notFuture(b.date);
    const hasSales = b.cash !== undefined || b.upi !== undefined;
    if (!hasSales && !b.costs.length && !b.photo) throw new HttpError(400, "Nothing to save");

    if (hasSales || b.note !== undefined || b.photo) {
      const $set: Record<string, unknown> = { by: actor.username };
      if (hasSales) {
        $set.cash = b.cash ?? 0;
        $set.upi = b.upi ?? 0;
      }
      if (b.note !== undefined) $set.note = b.note;
      const update: Record<string, unknown> = { $set };
      if (b.photo) update.$addToSet = { photos: b.photo };
      // If only a photo is being added and the day has no sales row yet, seed cash/upi at 0.
      if (!hasSales && b.photo) {
        await DaySales.updateOne({ _id: b.date }, { ...update, $setOnInsert: { cash: 0, upi: 0 } }, { upsert: true });
      } else {
        await DaySales.updateOne({ _id: b.date }, update, { upsert: true });
      }
    }
    if (b.costs.length) {
      await DayCost.insertMany(b.costs.map((c) => ({ date: b.date, kind: c.kind, amount: c.amount, party: c.party ?? "", by: actor.username })));
    }
    return { ok: true, costsAdded: b.costs.length };
  }

  const b = costBody.parse(raw);
  notFuture(b.date);
  const row = await DayCost.create({ ...b, by: actor.username });
  return { id: String(row._id) };
});
