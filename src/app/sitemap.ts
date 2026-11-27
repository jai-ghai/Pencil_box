import type { MetadataRoute } from "next";
import { COLLECTIONS, canonicalUrl } from "@/lib/shop";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: canonicalUrl("/"), changeFrequency: "daily", priority: 1 },
    ...COLLECTIONS.map((c) => ({
      url: canonicalUrl(`/c/${c.slug}`),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
