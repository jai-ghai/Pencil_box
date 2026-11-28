import { cacheLife } from "next/cache";
import { connectDb } from "./db";
import { ensureRegisterCovers } from "./register-covers";
import { mergeSamePriceOnce } from "./same-price-merge";
import { buildStoreCatalog, type StoreCatalog } from "./store";

/**
 * Catalogue for a page that already opted into request-time rendering.
 * Unlike `cachedCatalog`, this is not called during `next build`, so it does not
 * store an empty result that later requests keep reusing.
 */
export async function liveCatalog(): Promise<StoreCatalog | null> {
  "use cache";
  cacheLife("minutes");
  if (!process.env.MONGODB_URI) return null;
  try {
    await connectDb();
    await mergeSamePriceOnce().catch((error) => {
      console.error("Same-price merge skipped:", error instanceof Error ? error.message : "unknown");
    });
    await ensureRegisterCovers().catch((error) => {
      console.error("Register covers skipped:", error instanceof Error ? error.message : "unknown");
    });
    return await buildStoreCatalog();
  } catch {
    return null;
  }
}

/** Shared catalogue for server pages. Empty when the database is not reachable, so a build still finishes. */
export async function cachedCatalog(): Promise<StoreCatalog | null> {
  "use cache";
  cacheLife("minutes");
  // The production build must not open MongoDB. The list is filled on the first real request.
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  try {
    await connectDb();
    await mergeSamePriceOnce().catch((error) => {
      console.error("Same-price merge skipped:", error instanceof Error ? error.message : "unknown");
    });
    await ensureRegisterCovers().catch((error) => {
      console.error("Register covers skipped:", error instanceof Error ? error.message : "unknown");
    });
    return await buildStoreCatalog();
  } catch {
    return null;
  }
}
