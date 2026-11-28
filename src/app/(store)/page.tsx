import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { HomeCategoryGrid } from "@/components/home-category-grid";
import { HomeGridFilter } from "@/components/home-grid-filter";
import { ShopHero } from "@/components/shop-seo";
import { HOME_DESCRIPTION, HOME_H1, HOME_TITLE, canonicalUrl, pageMeta } from "@/lib/shop";
import { Storefront } from "../storefront";

export const metadata = pageMeta({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });

/** Matches the shop header (menu row, search field, padding) so the grid does not jump. */
const HEADER_PX = 116;

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))]" style={{ background: "#f0f3f8" }}>
      <link rel="canonical" href={canonicalUrl("/")} />
      <link rel="preload" as="image" href="/category/notebooks.svg" fetchPriority="high" />
      <Suspense fallback={<div aria-hidden className="shrink-0" style={{ height: HEADER_PX, background: "#153a7a" }} />}>
        <AntdRoot accent="sun" fill={false}>
          <Storefront shell="home" />
        </AntdRoot>
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3">
        <ShopHero title={HOME_H1} hideTitle />
        <HomeGridFilter />
        <HomeCategoryGrid />
      </main>
    </div>
  );
}
