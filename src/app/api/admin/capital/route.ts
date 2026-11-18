import { z } from "zod";
import { route, can } from "@/lib/api";
import { buildCapital } from "@/lib/capital";
import { loadCapitalSources, todayIST } from "@/lib/capital-data";
import { setSetting } from "@/lib/settings";

const MAX_PAISE = 100_000_000_00; // Rs 10 crore: higher than any realistic shop capital, stops typing mistakes

/**
 * "Since you started" — capital against cash recovered, shelf value, and capital stuck in dead stock.
 * Reads existing data only (typed daybook, POS bills, DayCost, Purchase, Variant, StockMovement).
 */
export const GET = route(can("capital"), async () => {
  const src = await loadCapitalSources();
  return buildCapital({ ...src, today: todayIST() });
});

const putBody = z
  .object({
    capitalStart: z.number().int().min(0).max(MAX_PAISE).optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)) && new Date(`${d}T00:00:00Z`).toISOString().startsWith(d), "Not a real date")
      .nullable()
      .optional(),
    deadStockDays: z.number().int().min(14).max(365).optional(),
  })
  .refine((v) => v.capitalStart !== undefined || v.startDate !== undefined || v.deadStockDays !== undefined, "Nothing to update");

/** Update any of the three settings behind the capital summary. Omitted fields are left alone. */
export const PUT = route(can("capital"), async (req) => {
  const b = putBody.parse(await req.json());
  if (b.capitalStart !== undefined) await setSetting("capitalStart", b.capitalStart);
  if (b.startDate !== undefined) await setSetting("capitalStartDate", b.startDate);
  if (b.deadStockDays !== undefined) await setSetting("deadStockDays", b.deadStockDays);
  return { ok: true };
});
