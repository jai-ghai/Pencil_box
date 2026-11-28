import { Suspense } from "react";
import "@/styles/antd-store.css";
import { AntdRoot } from "@/components/antd-root";
import { CollectionShelf } from "@/components/collection-shelf";
import { PAGE_SIZE, groupSameProducts, sortProducts } from "@/lib/browse";
import { cloudinarySquare, cloudinarySrcSet } from "@/lib/images";
import { productsInCollection } from "@/lib/product-json";
import { liveCatalog } from "@/lib/public-catalog";
import { COLLECTIONS, collectionBySlug } from "@/lib/shop";
import type { StoreCatalog } from "@/lib/store";
import { StorefrontWithMenu } from "@/components/storefront-menu";
import { shopCategoryBySlug } from "@/lib/shop-category-store";

/** The first screen only. The browser still loads the full list a moment later. */
function firstScreen(catalog: StoreCatalog, match: string): StoreCatalog {
  if (!match) return catalog;
  const products = sortProducts(groupSameProducts(productsInCollection(catalog, match)), "popular").slice(0, PAGE_SIZE);
  return { ...catalog, products };
}

export default async function CollectionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const shelf = await shopCategoryBySlug(slug);
  const isCollection = shelf ? shelf.listing : COLLECTIONS.some((c) => c.slug === slug);
  if (!isCollection) {
    return (
      <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))]" style={{ background: "#f0f3f8" }}>
        <Suspense fallback={<div aria-hidden className="shrink-0 xl:hidden" style={{ height: 116, background: "#153a7a" }} />}>
          <AntdRoot accent="sun" inlineCss={false} fill={false}>
            <StorefrontWithMenu shell="chrome" />
          </AntdRoot>
        </Suspense>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3">{children}</main>
      </div>
    );
  }
  const full = await liveCatalog();
  const collection = shelf?.listing
    ? { slug: shelf.slug, match: shelf.match, nav: shelf.nav, title: shelf.title, h1: shelf.h1, description: shelf.description, lede: shelf.lede }
    : collectionBySlug(slug);
  const initialCatalog = full ? firstScreen(full, collection?.match ?? "") : null;
  const first = initialCatalog && collection ? sortProducts(groupSameProducts(productsInCollection(initialCatalog, collection.match)), "popular")[0] : undefined;
  const href = first?.image ? cloudinarySquare(first.image, 400) : undefined;
  const srcSet = first?.image ? cloudinarySrcSet(first.image) : undefined;
  const collectionName = collection?.nav || shelf?.nav || slug;
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))] xl:pb-0" style={{ background: "#f0f3f8" }}>
      {href && <link rel="preload" as="image" href={href} imageSrcSet={srcSet} imageSizes="(max-width: 640px) 45vw, 220px" fetchPriority="high" />}
      <div className="xl:hidden">
      <Suspense fallback={<div aria-hidden className="shrink-0" style={{ height: 116, background: "#153a7a" }} />}>
        <AntdRoot accent="sun" inlineCss={false} fill={false}>
          <StorefrontWithMenu shell="collection" initialCatalog={initialCatalog} />
        </AntdRoot>
      </Suspense>
      </div>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3">
        <h1 className="text-lg font-extrabold leading-snug">{collectionName}</h1>
        {initialCatalog && <p className="mt-1 text-sm font-semibold">{initialCatalog.products.length} {initialCatalog.products.length === 1 ? "item" : "items"}</p>}
        <div className="mt-3">
          <CollectionShelf products={initialCatalog?.products ?? []} />
        </div>
        {children}
      </main>
    </div>
  );
}
