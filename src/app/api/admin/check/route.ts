import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { StockCheck, Variant } from "@/lib/models";
import { checkProgress } from "@/lib/shopcheck";
import { getRoundStart, loadCheckItems } from "@/lib/shopcheck-data";

const oid = z.string().regex(/^[a-f0-9]{24}$/);

/** Every shelf item with its tick or cross, and how far through the current round the owner is. */
export const GET = route(can("check"), async () => {
  const [items, roundStart] = await Promise.all([loadCheckItems(), getRoundStart()]);
  return { items, roundStart, progress: checkProgress(items) };
});

const body = z.object({
  variantIds: z.array(oid).min(1).max(300),
  /** ok = ticked (or bought), missing = crossed (goes on the buy list), clear = back to not checked */
  status: z.enum(["ok", "missing", "clear"]),
  /** only for a cross: how many to buy; default is one wholesale pack */
  needQty: z.number().int().min(1).max(100_000).optional(),
});

/** Tick, cross or clear one or more items. Crossing puts them on the buy list; ticking (or marking bought) takes them off. */
export const POST = route(can("check"), async (req, actor) => {
  const b = body.parse(await req.json());
  const ids = [...new Set(b.variantIds)];
  const known = await Variant.find({ _id: { $in: ids } }, "packSize").lean();
  if (known.length !== ids.length) throw new HttpError(404, "One of these items no longer exists");

  if (b.status === "clear") {
    await StockCheck.deleteMany({ variantId: { $in: ids } });
    return { ok: true };
  }
  const now = new Date();
  await StockCheck.bulkWrite(
    known.map((v) => {
      const set: Record<string, unknown> = { status: b.status, checkedAt: now, checkedBy: actor.username };
      if (b.status === "missing" && b.needQty !== undefined) set.needQty = b.needQty;
      // a first cross starts at one wholesale pack; an earlier quantity the owner set is kept
      const insert = b.status === "missing" && b.needQty === undefined ? { $setOnInsert: { needQty: Math.max(1, v.packSize ?? 1) } } : {};
      return { updateOne: { filter: { variantId: v._id }, update: { $set: set, ...insert }, upsert: true } };
    }),
  );
  return { ok: true };
});

/** Change how many to buy for an item that is on the buy list. */
export const PATCH = route(can("check"), async (req) => {
  const b = z.object({ variantId: oid, needQty: z.number().int().min(1).max(100_000) }).parse(await req.json());
  const r = await StockCheck.updateOne({ variantId: b.variantId, status: "missing" }, { $set: { needQty: b.needQty } });
  if (!r.matchedCount) throw new HttpError(404, "That item is not on the buy list");
  return { ok: true };
});
