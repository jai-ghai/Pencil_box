import type { MetadataRoute } from "next";
import { cachedCatalog } from "@/lib/public-catalog";
import { DEPARTMENTS } from "@/lib/departments";
import { COLLECTIONS, canonicalUrl } from "@/lib/shop";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: canonicalUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: canonicalUrl("/categories"), changeFrequency: "weekly", priority: 0.7 },
    { url: canonicalUrl("/products"), changeFrequency: "daily", priority: 0.7 },
    ...DEPARTMENTS.filter((d) => !d.parent).map((d) => ({
      url: canonicalUrl(`/c/${d.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    })),
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
