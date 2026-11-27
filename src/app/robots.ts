import type { MetadataRoute } from "next";
import { SITE } from "@/lib/shop";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/pos", "/login"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  };
}
