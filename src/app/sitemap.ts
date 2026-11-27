import type { MetadataRoute } from "next";
import { cachedCatalog } from "@/lib/public-catalog";
import { COLLECTIONS, canonicalUrl } from "@/lib/shop";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/"), changeFrequency: "daily", priority: 1 },
    ...COLLECTIONS.map((c) => ({
      url: canonicalUrl(`/c/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
  const catalog = await cachedCatalog();
  if (!catalog) return pages;
  return [
    ...pages,
    ...catalog.products.filter((p) => p.slug).map((p) => ({
      url: canonicalUrl(`/p/${p.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
  ];
}
