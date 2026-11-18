import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { buildAnalytics, daysBetween } from "@/lib/daybook";
import { loadBillDays, loadTyped, resolveMargin } from "@/lib/daybook-data";
import { setSetting } from "@/lib/settings";
import { addDays, istDate } from "@/lib/reports";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const query = z.object({ from: date.optional(), to: date.optional(), group: z.enum(["day", "week", "month"]).default("day") });

/**
 * Profit picture for a date range (India time): typed daily sales (or POS bills on days nothing was typed),
 * stock bought, expenses, estimated profit, best and slowest days, weekday pattern and wholesaler split.
 * Also loads the same-length period before it so the screen can show "up or down".
 */
export const GET = route(can("analytics"), async (req) => {
  const q = query.parse(Object.fromEntries(new URL(req.url).searchParams));
  const today = istDate(new Date());
  const to = q.to ?? today;
  const from = q.from ?? addDays(to, -29);
  if (from > to) throw new HttpError(400, "'From' is after 'to'");
  const len = daysBetween(from, to).length;
  if (len > 400) throw new HttpError(400, "Please pick 400 days or fewer");

  const loadFrom = addDays(from, -len); // the previous period of the same length, for the comparison
  const [{ entered, costs }, bills, margin] = await Promise.all([loadTyped(loadFrom, to), loadBillDays(loadFrom, to), resolveMargin()]);
  const analytics = buildAnalytics({ entered, bills, costs, from, to, group: q.group, marginPct: margin.pct, today });
  return { ...analytics, margin };
});

/** Set the profit margin used for estimates, or send null to go back to the automatic figure. */
export const PUT = route(can("analytics"), async (req) => {
  const { marginPct } = z.object({ marginPct: z.number().min(0).max(100).nullable() }).parse(await req.json());
  await setSetting("marginPct", marginPct);
  return { ok: true };
});
