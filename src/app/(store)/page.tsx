import { Suspense } from "react";
import "@/styles/antd-store.css";
import { AntdRoot } from "@/components/antd-root";
import { HomeCategoryGrid } from "@/components/home-category-grid";
import { HomeGridFilter } from "@/components/home-grid-filter";
import { ShopFaq } from "@/components/shop-seo";
import { HOME_DESCRIPTION, HOME_H1, HOME_TITLE, canonicalUrl, faqJsonLd, jsonLdScript, pageMeta } from "@/lib/shop";
import { DesktopHome } from "@/components/desktop-home";
import { StorefrontWithMenu } from "@/components/storefront-menu";

export const metadata = pageMeta({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });

/** Matches the shop header (menu row, search field, padding) so the grid does not jump. */
const HEADER_PX = 116;

export default function HomePage() {
  return (
    <>
    <link rel="canonical" href={canonicalUrl("/")} />
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd()) }} />
    <h1 className="pb-sr-only">{HOME_H1}<span lang="hi">. तिगरी एक्सटेंशन में स्टेशनरी की दुकान</span></h1>
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))] xl:hidden" style={{ background: "#f0f3f8" }}>
      <Suspense fallback={<div aria-hidden className="shrink-0" style={{ height: HEADER_PX, background: "#153a7a" }} />}>
        <AntdRoot accent="sun" inlineCss={false} fill={false}>
          <StorefrontWithMenu shell="home" />
        </AntdRoot>
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3">
        <HomeGridFilter />
        <HomeCategoryGrid />
      </main>
    </div>
    <DesktopHome />
    <ShopFaq />
    </>
  );
}
