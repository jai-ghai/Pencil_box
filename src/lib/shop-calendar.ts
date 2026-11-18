/**
 * Shop calendar helpers. Pure functions (no database).
 * Dates are India-time "YYYY-MM-DD". Used for festivals, bills, milestones and stock reminders.
 */
import { addDays } from "./reports";

export const EVENT_TYPES = ["milestone", "bill", "stock", "season", "note"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

export interface CalendarEventInput {
  date: string;
  title: string;
  type: EventType;
  note?: string;
  /** what to stock / put on offer for this day */
  itemsHint?: string;
  /** days before the date to start showing the alert (0 = only on the day) */
  remindDaysBefore?: number;
  /** idempotent seed key, e.g. "season:diwali:2026" */
  templateKey?: string;
}

export interface CalendarEventView extends CalendarEventInput {
  id: string;
  remindDaysBefore: number;
}

export const TYPE_LABEL: Record<EventType, string> = {
  milestone: "Shop milestone",
  bill: "Bill to pay",
  stock: "Stock / items",
  season: "Festival / season",
  note: "Note",
};

/** True when the alert should show on `today` (from remind window through the event day). */
export function isAlertActive(event: { date: string; remindDaysBefore?: number }, today: string): boolean {
  const before = Math.max(0, event.remindDaysBefore ?? 1);
  const start = addDays(event.date, -before);
  return today >= start && today <= event.date;
}

export function alertsFor(events: CalendarEventView[], today: string): CalendarEventView[] {
  return events
    .filter((e) => isAlertActive(e, today))
    .sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

/** Expand a monthly bill into concrete dates for `months` months starting from `from` (YYYY-MM-DD). */
export function expandMonthlyBill(opts: {
  title: string;
  dayOfMonth: number;
  from: string;
  months?: number;
  note?: string;
  itemsHint?: string;
  remindDaysBefore?: number;
}): CalendarEventInput[] {
  const months = opts.months ?? 12;
  const day = Math.min(28, Math.max(1, Math.round(opts.dayOfMonth)));
  const [y0, m0] = opts.from.slice(0, 7).split("-").map(Number);
  const out: CalendarEventInput[] = [];
  // Keep walking months until we have `months` dates on/after `from` (mid-month starts skip this month's day).
  for (let i = 0; out.length < months && i < months + 2; i++) {
    const m = m0 + i;
    const y = y0 + Math.floor((m - 1) / 12);
    const month = ((m - 1) % 12) + 1;
    const date = `${y}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    if (date < opts.from) continue;
    out.push({
      date,
      title: opts.title,
      type: "bill",
      note: opts.note,
      itemsHint: opts.itemsHint,
      remindDaysBefore: opts.remindDaysBefore ?? 1,
      templateKey: `bill:${slug(opts.title)}:${date}`,
    });
  }
  return out;
}

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "bill";

/**
 * Stationery-relevant festivals and seasons for a calendar year.
 * Lunar festival dates are set for that year (edit on the calendar if your local date differs).
 */
export function seasonalPackForYear(year: number): CalendarEventInput[] {
  const lunar: Record<number, { rakhi: string; diwali: string; holi: string }> = {
    2025: { rakhi: "2025-08-09", diwali: "2025-10-20", holi: "2025-03-14" },
    2026: { rakhi: "2026-08-28", diwali: "2026-11-08", holi: "2026-03-03" },
    2027: { rakhi: "2027-08-17", diwali: "2027-10-29", holi: "2027-03-22" },
  };
  const L = lunar[year] ?? { rakhi: `${year}-08-20`, diwali: `${year}-11-01`, holi: `${year}-03-15` };

  const e = (
    date: string,
    title: string,
    itemsHint: string,
    note: string,
    key: string,
    remindDaysBefore = 7,
  ): CalendarEventInput => ({
    date,
    title,
    type: "season",
    itemsHint,
    note,
    remindDaysBefore,
    templateKey: `season:${key}:${year}`,
  });

  return [
    e(`${year}-06-01`, "Back-to-school starts", "Notebooks, pencils, pens, geometry boxes, school bags, name slips, covers", "Parents start buying from June. Keep bundles and offers ready.", "back-to-school-start", 14),
    e(`${year}-06-15`, "Back-to-school peak", "Classmate/Doms sets, registers, colour pencils, lunch boxes", "Peak footfall mid-June to mid-July. Check stock of bestsellers.", "back-to-school-peak", 7),
    e(`${year}-07-15`, "Back-to-school wind-down", "Leftover kits, late admissions stationery", "Clear slow kits with a small offer before exam stock arrives.", "back-to-school-end", 3),
    e(`${year}-09-05`, "Teachers' Day", "Greeting cards, diaries, pens gift sets, return-gift packs", "Teachers' Day — gift sets and cards near the counter.", "teachers-day", 7),
    e(L.rakhi, "Raksha Bandhan", "Rakhi gift wraps, cards, small return gifts, colour pens", "Rakhi week — gift corner visible at the front.", "rakhi", 7),
    e(`${year}-10-01`, "Exam season (Oct)", "Answer sheets, geometry, graph books, pens, highlighters", "School exams — exam packs on the counter.", "exams-oct", 10),
    e(L.diwali, "Diwali", "Gift hampers, wrapping, diaries, art sets, decorative stationery", "Diwali hampers and gift wraps. Bundle slow toys with stationery.", "diwali", 14),
    e(`${year}-12-15`, "New Year planners", "Planners, diaries, calendars, desk organisers", "New Year — diaries and planners face-out near billing.", "new-year-planners", 14),
    e(`${year}-02-01`, "Exam season (Feb–Mar)", "Exam pads, blue/black pens, geometry, rough notebooks", "Board / school exams. Keep pens and pads fully stocked.", "exams-feb", 10),
    e(L.holi, "Holi", "Art / craft leftovers clearance, return gifts", "Light festive traffic — good day for a small clearance offer.", "holi", 5),
  ];
}
