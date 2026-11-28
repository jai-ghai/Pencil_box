import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { cachedCatalog } from "@/lib/public-catalog";
import { canonicalUrl } from "@/lib/shop";
import { shopCategories } from "@/lib/shop-category-store";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [catalog, shelves] = await Promise.all([cachedCatalog(), shopCategories()]);
  const pages = new Map<string, MetadataRoute.Sitemap[number]>();
  const add = (path: string, entry: Omit<MetadataRoute.Sitemap[number], "url">) => {
    pages.set(canonicalUrl(path), { url: canonicalUrl(path), ...entry });
  };
  add("/", { changeFrequency: "daily", priority: 1 });
  add("/categories", { changeFrequency: "weekly", priority: 0.7 });
  add("/products", { changeFrequency: "daily", priority: 0.7 });
  for (const shelf of shelves) {
    if (shelf.hidden) continue;
    add(`/c/${shelf.slug}`, { changeFrequency: "weekly", priority: shelf.listing ? 0.8 : 0.6 });
  }
  for (const product of catalog?.products ?? []) {
    if (!product.slug) continue;
    add(`/p/${product.slug}`, {
      changeFrequency: "weekly",
      priority: 0.6,
      lastModified: product.createdAt ? new Date(product.createdAt) : undefined,
    });
  }
  return [...pages.values()];
}
