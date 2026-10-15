import { route, can } from "@/lib/api";
import { QrScan } from "@/lib/models";
import { addDays, istDate } from "@/lib/reports";

/** How many times each QR placement has been scanned: today, the last 7 days, and in total. */
export const GET = route(can("qr"), async () => {
  const today = istDate(new Date());
  const weekStart = addDays(today, -6);
  const rows = await QrScan.find().lean();
  const by = new Map<string, { src: string; today: number; week: number; total: number }>();
  for (const r of rows) {
    const e = by.get(r.src ?? "") ?? { src: r.src ?? "", today: 0, week: 0, total: 0 };
    e.total += r.count ?? 0;
    if ((r.day ?? "") >= weekStart) e.week += r.count ?? 0;
    if (r.day === today) e.today += r.count ?? 0;
    by.set(e.src, e);
  }
  return { rows: [...by.values()].sort((a, b) => b.total - a.total) };
});
