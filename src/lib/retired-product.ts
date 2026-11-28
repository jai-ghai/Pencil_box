import { connectDb } from "./db";
import { Product } from "./models";

/**
 * Slug of the card a folded product now lives on.
 * The merge leaves the old row in the database and writes "Merged into <id> (<slug>)".
 */
export async function retiredProductSlug(slug: string): Promise<string | null> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await connectDb();
  const row = await Product.findOne({ slug, active: false }, "internalNote").lean();
  const note = row?.internalNote ?? "";
  const match = /Merged into [a-f0-9]{24} \(([^)]+)\)/i.exec(note);
  const next = match?.[1]?.trim();
  if (!next || next === slug) return null;
  const live = await Product.findOne({ slug: next, active: { $ne: false } }, "_id").lean();
  return live ? next : null;
}
