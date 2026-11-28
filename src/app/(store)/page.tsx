import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { HomeCategoryGrid } from "@/components/home-category-grid";
import { HomeGridFilter } from "@/components/home-grid-filter";
import Link from "next/link";
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
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))] xl:block xl:min-h-0 xl:pb-0" style={{ background: "#f0f3f8" }}>
      <Suspense fallback={<div aria-hidden className="order-1 shrink-0 xl:hidden" style={{ height: HEADER_PX, background: "#153a7a" }} />}>
        <div className="order-1 xl:hidden">
          <AntdRoot accent="sun" fill={false}>
            <StorefrontWithMenu shell="home" />
          </AntdRoot>
        </div>
      </Suspense>
      <section className="order-2 mx-auto w-full max-w-6xl px-4 pt-4 xl:px-6">
        <h1 className="text-xl font-extrabold leading-snug text-[#0c1222]">{HOME_H1}</h1>
        <p className="mt-2 max-w-3xl text-[15px] leading-relaxed text-[#243044]">
          School stationery, notebooks, chart paper and photocopy at B-92, near Sangam Vihar, Khanpur and Devli. Kids’ toys and birthday return gifts are on the same counter. Open every day, 7 AM to 9:30 PM.
        </p>
        <p className="mt-2 text-sm leading-relaxed">
          <Link href="/c/notebooks" className="font-bold text-[#153a7a]">Notebooks and registers</Link>
          {" · "}
          <Link href="/c/art" className="font-bold text-[#153a7a]">Chart paper</Link>
          {" · "}
          <Link href="/c/printing" className="font-bold text-[#153a7a]">Photocopy</Link>
          {" · "}
          <Link href="/c/toys" className="font-bold text-[#153a7a]">Toys</Link>
          {" · "}
          <Link href="/c/gifts" className="font-bold text-[#153a7a]">Return gifts</Link>
        </p>
      </section>
      <main className="order-3 mx-auto w-full max-w-6xl flex-1 px-4 py-3 xl:hidden">
        <HomeGridFilter />
        <HomeCategoryGrid />
      </main>
    </div>
    <DesktopHome />
    <ShopFaq />
    </>
  );
}
