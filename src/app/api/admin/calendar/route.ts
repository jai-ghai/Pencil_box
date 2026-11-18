import { z } from "zod";
import { route, can } from "@/lib/api";
import { ShopEvent, SHOP_EVENT_TYPES } from "@/lib/models";
import { expandMonthlyBill, seasonalPackForYear, type CalendarEventInput } from "@/lib/shop-calendar";
import { addDays, istDate } from "@/lib/reports";

const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Not a real date");

const eventBody = z.object({
  date,
  title: z.string().trim().min(1).max(120),
  type: z.enum(SHOP_EVENT_TYPES),
  note: z.string().trim().max(500).optional(),
  itemsHint: z.string().trim().max(400).optional(),
  remindDaysBefore: z.number().int().min(0).max(30).default(1),
});

function mapEvent(e: { _id: unknown; date: string; title: string; type: string; note?: string | null; itemsHint?: string | null; remindDaysBefore?: number; templateKey?: string | null }) {
  return {
    id: String(e._id),
    date: e.date,
    title: e.title,
    type: e.type,
    note: e.note ?? "",
    itemsHint: e.itemsHint ?? "",
    remindDaysBefore: e.remindDaysBefore ?? 1,
    templateKey: e.templateKey ?? undefined,
  };
}

/** Events in a month (default: current India month), for the calendar page. */
export const GET = route(can("calendar"), async (req) => {
  const q = z.object({ month: z.string().regex(/^\d{4}-\d{2}$/).optional() }).parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = istDate(new Date());
  const month = q.month ?? today.slice(0, 7);
  const from = `${month}-01`;
  const [y, m] = month.split("-").map(Number);
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  const last = addDays(next, -1);

  const events = await ShopEvent.find({ date: { $gte: from, $lte: last } }).sort({ date: 1, title: 1 }).lean();
  return { month, range: { from, to: last }, events: events.map(mapEvent) };
});

/** Add one event. */
export const POST = route(can("calendar"), async (req, actor) => {
  const b = eventBody.parse(await req.json());
  const row = await ShopEvent.create({ ...b, by: actor.username });
  return { event: mapEvent(row) };
});

const seedBody = z.discriminatedUnion("action", [
  z.object({ action: z.literal("seasonal"), year: z.number().int().min(2024).max(2035).optional() }),
  z.object({
    action: z.literal("monthly-bill"),
    title: z.string().trim().min(1).max(120),
    dayOfMonth: z.number().int().min(1).max(28),
    months: z.number().int().min(1).max(24).default(12),
    note: z.string().trim().max(500).optional(),
    remindDaysBefore: z.number().int().min(0).max(30).default(1),
  }),
  z.object({
    action: z.literal("milestone"),
    date,
    title: z.string().trim().min(1).max(120).default("Pencil Box opened"),
    note: z.string().trim().max(500).optional(),
  }),
]);

/** Seed seasonal pack, monthly rent/power bills, or shop-start milestone (skips duplicates by templateKey). */
export const PUT = route(can("calendar"), async (req, actor) => {
  const b = seedBody.parse(await req.json());
  const today = istDate(new Date());
  let rows: CalendarEventInput[] = [];

  if (b.action === "seasonal") {
    rows = seasonalPackForYear(b.year ?? Number(today.slice(0, 4)));
  } else if (b.action === "monthly-bill") {
    rows = expandMonthlyBill({
      title: b.title,
      dayOfMonth: b.dayOfMonth,
      from: today,
      months: b.months,
      note: b.note,
      remindDaysBefore: b.remindDaysBefore,
    });
  } else {
    rows = [
      {
        date: b.date,
        title: b.title,
        type: "milestone",
        note: b.note,
        remindDaysBefore: 0,
        templateKey: `milestone:opened:${b.date}`,
      },
    ];
  }

  const keys = rows.map((r) => r.templateKey).filter(Boolean) as string[];
  const existing = keys.length ? new Set((await ShopEvent.find({ templateKey: { $in: keys } }, "templateKey").lean()).map((e) => e.templateKey)) : new Set<string>();
  const fresh = rows.filter((r) => !r.templateKey || !existing.has(r.templateKey));
  if (fresh.length) {
    await ShopEvent.insertMany(
      fresh.map((r) => ({
        date: r.date,
        title: r.title,
        type: r.type,
        note: r.note ?? "",
        itemsHint: r.itemsHint ?? "",
        remindDaysBefore: r.remindDaysBefore ?? 1,
        templateKey: r.templateKey,
        by: actor.username,
      })),
      { ordered: false },
    ).catch((e: { code?: number }) => {
      if (e?.code !== 11000) throw e;
    });
  }
  return { ok: true, attempted: rows.length, inserted: fresh.length };
});
