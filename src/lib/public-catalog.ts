import { cacheLife } from "next/cache";
import { connectDb } from "./db";
import { mergeSamePriceOnce } from "./same-price-merge";
import { buildStoreCatalog, type StoreCatalog } from "./store";

let mergeFinished = false;

/**
 * The one-time fold sits outside the catalogue cache.
 * A cached catalogue would otherwise run the fold once per minute and then keep serving the old list.
 */
async function continueSamePriceMerge(): Promise<void> {
  if (mergeFinished || !process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return;
  try {
    await connectDb();
    const result = await mergeSamePriceOnce();
    if (result.done) mergeFinished = true;
  } catch (error) {
    console.error("Same-price merge skipped:", error instanceof Error ? error.message : "unknown");
  }
}

async function readCatalog(): Promise<StoreCatalog | null> {
  "use cache";
  cacheLife("minutes");
  if (!process.env.MONGODB_URI) return null;
  try {
    await connectDb();
    return await buildStoreCatalog();
  } catch {
    return null;
  }
}

/**
 * Catalogue for a page that already opted into request-time rendering.
 * Unlike `cachedCatalog`, this is not called during `next build`, so it does not
 * store an empty result that later requests keep reusing.
 */
export async function liveCatalog(): Promise<StoreCatalog | null> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await continueSamePriceMerge();
  return readCatalog();
}

/** Shared catalogue for server pages. Empty when the database is not reachable, so a build still finishes. */
export async function cachedCatalog(): Promise<StoreCatalog | null> {
  // The production build must not open MongoDB. The list is filled on the first real request.
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return null;
  await continueSamePriceMerge();
  return readCatalog();
}
