/**
 * Adds photocopy and printing as items (per page): Photocopy Rs 2, Printout B&W Rs 5, Printout Colour Rs 10.
 * Safe to run again; it skips anything that already exists.    npm run services
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const { ensureServices } = await import("../src/lib/seed-services");

const uri = process.env.MONGODB_URI;
if (!uri || uri.startsWith("YOUR_")) throw new Error("Set MONGODB_URI in .env first");
await mongoose.connect(uri);
const r = await ensureServices();
console.log(`services: ${r.created} added, ${r.skipped} already there`);
await mongoose.disconnect();
