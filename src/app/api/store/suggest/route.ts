import { NextResponse } from "next/server";
import { allow, clientKey } from "@/lib/ratelimit";
import { inr } from "@/lib/client";
import { cloudinarySquare } from "@/lib/images";
import { liveCatalog } from "@/lib/public-catalog";
import { suggest } from "@/lib/search-match";
import { shopCategories } from "@/lib/shop-category-store";

export async function GET(req: Request) {
  if (!allow(clientKey(req, "suggest"), 80, 60_000)) return NextResponse.json({ error: "Too many requests. Please wait a moment." }, { status: 429 });
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 60) ?? "";
  if (q.length < 2) return NextResponse.json({ hits: [] });
  const [catalog, shelves] = await Promise.all([liveCatalog().catch(() => null), shopCategories()]);
  const hits = suggest(q, {
    categories: shelves.filter((row) => !row.hidden).map((row) => ({
      label: row.label,
      href: `/c/${row.slug}`,
      image: row.image ? cloudinarySquare(row.image, 80) : `/category/${row.slug}.svg`,
    })),
    products: (catalog?.products ?? []).filter((product) => product.slug).map((product) => ({
      name: product.name_en,
      href: `/p/${product.slug}`,
      image: product.image ? cloudinarySquare(product.image, 80) : "",
      price: product.variants[0] ? inr(product.variants[0].price) : "",
      brand: product.brand,
    })),
  });
  return NextResponse.json({ hits });
}
