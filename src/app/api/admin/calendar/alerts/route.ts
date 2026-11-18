import { route, can } from "@/lib/api";
import { ShopEvent } from "@/lib/models";
import { alertsFor } from "@/lib/shop-calendar";
import { addDays, istDate } from "@/lib/reports";

/**
 * Events that should ping the owner today: anything whose remind window covers today
 * (default: the day before + the day itself). Used by the admin top notification bar.
 */
export const GET = route(can("calendar"), async () => {
  const today = istDate(new Date());
  // Load a generous window so long seasonal reminds (14 days) are included.
  const from = addDays(today, -1);
  const to = addDays(today, 30);
  const rows = await ShopEvent.find({ date: { $gte: from, $lte: to } }).sort({ date: 1 }).lean();
  const events = alertsFor(
    rows.map((e) => ({
      id: String(e._id),
      date: e.date,
      title: e.title,
      type: e.type as "milestone" | "bill" | "stock" | "season" | "note",
      note: e.note ?? "",
      itemsHint: e.itemsHint ?? "",
      remindDaysBefore: e.remindDaysBefore ?? 1,
    })),
    today,
  );
  return { today, events };
});
