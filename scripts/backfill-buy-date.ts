/**
 * One-time migration: old ItemRequest rows have no buyDate — set it from createdAt (India time)
 * so every request shows on a day's buy list. Safe to run twice.
 *
 *   npx tsx scripts/backfill-buy-date.ts
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config({ path: ".env" });
const { ItemRequest } = await import("../src/lib/models/index");
const { istDate } = await import("../src/lib/reports");

await mongoose.connect(process.env.MONGODB_URI!);

const legacy = await ItemRequest.find({ $or: [{ buyDate: { $exists: false } }, { buyDate: null }] }, "_id createdAt").lean();
let updated = 0;
for (const r of legacy) {
  const buyDate = istDate(r.createdAt ? new Date(r.createdAt) : new Date());
  await ItemRequest.updateOne({ _id: r._id }, { $set: { buyDate } });
  updated++;
}
console.log(`Backfilled buyDate on ${updated} request(s).`);
await mongoose.disconnect();
