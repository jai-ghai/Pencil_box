import { Suspense } from "react";
import { connection } from "next/server";
import { AntdRoot } from "@/components/antd-root";
import { CatalogueShellSkeleton } from "@/components/store-skeleton";
import { PAGE_SIZE, groupSameProducts, sortProducts } from "@/lib/browse";
import { cloudinarySquare, cloudinarySrcSet } from "@/lib/images";
import { productsInCollection } from "@/lib/product-json";
import { liveCatalog } from "@/lib/public-catalog";
import { COLLECTIONS, collectionBySlug } from "@/lib/shop";
import type { StoreCatalog } from "@/lib/store";
import { Storefront } from "../../../storefront";

/** The first screen only. The browser still loads the full list a moment later. */
function firstScreen(catalog: StoreCatalog, slug: string): StoreCatalog {
  const collection = collectionBySlug(slug);
  if (!collection) return catalog;
  const products = sortProducts(groupSameProducts(productsInCollection(catalog, collection.match)), "popular").slice(0, PAGE_SIZE);
  return { ...catalog, products };
}

async function CollectionFrame({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const isCollection = COLLECTIONS.some((c) => c.slug === slug);
  // Render the product photos in this response. A build-time shell has no database,
  // so the list is read when the page is actually requested.
  if (isCollection) await connection();
  const initialCatalog = isCollection ? await liveCatalog() : null;
  const collection = collectionBySlug(slug);
  const first = initialCatalog && collection ? sortProducts(groupSameProducts(productsInCollection(initialCatalog, collection.match)), "popular")[0] : undefined;
  const href = first?.image ? cloudinarySquare(first.image, 400) : undefined;
  const srcSet = first?.image ? cloudinarySrcSet(first.image) : undefined;
  return (
    <>
      {href && <link rel="preload" as="image" href={href} imageSrcSet={srcSet} imageSizes="(max-width: 640px) 45vw, 220px" fetchPriority="high" />}
      <AntdRoot accent="sun">
        <Storefront initialCatalog={initialCatalog ? firstScreen(initialCatalog, slug) : null}>{children}</Storefront>
      </AntdRoot>
    </>
  );
}

export default function CollectionLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<CatalogueShellSkeleton />}>
      <CollectionFrame params={params}>{children}</CollectionFrame>
    </Suspense>
  );
}
