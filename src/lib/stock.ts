import mongoose, { type ClientSession } from "mongoose";
import { StockMovement, Variant, type MovementType } from "./models";
import { HARD_STOCK_BLOCK } from "./flags";
import { AppError } from "./errors";

export interface MovementInput {
  variantId: string;
  type: MovementType;
  /** signed base units: + adds stock, - removes */
  qty: number;
  unitCost?: number;
  refId?: mongoose.Types.ObjectId;
  note?: string;
  by?: string;
}

/**
 * Write a ledger row and update the cached stockOnHand in the same transaction.
 * Never change variants.stockOnHand anywhere else.
 *
 * When ENFORCE_STOCK_LIMITS is on, a negative movement is an atomic conditional update:
 * the sale (or damage) fails inside the transaction if the shelf would go below zero —
 * two people cannot sell the same last piece at once.
 */
export async function recordMovement(m: MovementInput, session: ClientSession): Promise<void> {
  if (!Number.isFinite(m.qty) || m.qty === 0) throw new Error("Movement qty must be a non-zero number");
  const enforce = HARD_STOCK_BLOCK && m.qty < 0;
  const updated = await Variant.findOneAndUpdate(
    enforce ? { _id: m.variantId, stockOnHand: { $gte: -m.qty } } : { _id: m.variantId },
    { $inc: { stockOnHand: m.qty } },
    { session, returnDocument: "after" },
  );
  if (!updated) {
    if (enforce) throw new AppError("Not enough stock for this sale. Check the count and try again.", 409);
    throw new Error(`Variant ${m.variantId} not found`);
  }
  await StockMovement.create(
    [{ variantId: m.variantId, type: m.type, qty: m.qty, unitCost: m.unitCost ?? 0, refId: m.refId, note: m.note, by: m.by, at: new Date() }],
    { session },
  );
}

/** Run one or more movements atomically. */
export async function withStockTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
  const session = await mongoose.startSession();
  try {
    return await session.withTransaction(fn);
  } finally {
    await session.endSession();
  }
}

export async function adjustStock(m: MovementInput): Promise<void> {
  await withStockTransaction((s) => recordMovement(m, s));
}

/**
 * Nightly integrity check: for every variant, the ledger sum must equal stockOnHand.
 * Returns the variants that drifted.
 */
export async function verifyLedger(): Promise<{ variantId: string; cached: number; ledger: number }[]> {
  const sums = await StockMovement.aggregate<{ _id: mongoose.Types.ObjectId; total: number }>([
    { $group: { _id: "$variantId", total: { $sum: "$qty" } } },
  ]);
  const ledger = new Map(sums.map((s) => [String(s._id), s.total]));
  const variants = await Variant.find({}, { stockOnHand: 1 }).lean();
  const drift: { variantId: string; cached: number; ledger: number }[] = [];
  for (const v of variants) {
    const l = ledger.get(String(v._id)) ?? 0;
    if (l !== v.stockOnHand) drift.push({ variantId: String(v._id), cached: v.stockOnHand, ledger: l });
  }
  return drift;
}
