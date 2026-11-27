import { cacheLife } from "next/cache";
import { connectDb } from "./db";
import { buildStoreCatalog, type StoreCatalog } from "./store";

/** Shared catalogue for server pages. Empty when the database is not reachable, so a build still finishes. */
export async function cachedCatalog(): Promise<StoreCatalog | null> {
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
