import { NextResponse } from "next/server";
import { publicRoute } from "@/lib/api";
import { buildStoreCatalog } from "@/lib/store";

/** Public catalogue for the website: in-stock items only, no costs and no exact stock counts. */
export const GET = publicRoute({ bucket: "store-products", limit: 120 }, async () =>
  NextResponse.json(await buildStoreCatalog(), { headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=300" } }),
);
