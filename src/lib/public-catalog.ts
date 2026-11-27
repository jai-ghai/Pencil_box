import { cacheLife } from "next/cache";
import { connectDb } from "./db";
import { buildStoreCatalog, type StoreCatalog } from "./store";

/** Shared catalogue for server pages. Empty when the database is not reachable, so a build still finishes. */
export async function cachedCatalog(): Promise<StoreCatalog | null> {
  "use cache";
  cacheLife("minutes");
  // The production build must not open MongoDB. The list is filled on the first real request.
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  try {
    await connectDb();
    return await buildStoreCatalog();
  } catch {
    return null;
  }
}
