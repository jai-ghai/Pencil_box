import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { groupSameProducts, sortProducts } from "@/lib/browse";
import { COLLECTION_COPY } from "@/lib/collection-copy";
import { breadcrumbJsonLd, itemListJsonLd, productsInCollection } from "@/lib/product-json";
import { cachedCatalog } from "@/lib/public-catalog";
import { COLLECTIONS, collectionBySlug, jsonLdScript, pageMeta } from "@/lib/shop";

export function generateStaticParams() {
  return COLLECTIONS.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) return {};
  return pageMeta({ title: collection.title, description: collection.description, path: `/c/${collection.slug}` });
}

async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) notFound();
  const catalog = await cachedCatalog();
  const products = catalog ? sortProducts(groupSameProducts(productsInCollection(catalog, collection.match)), "popular") : [];
  const copy = COLLECTION_COPY[collection.slug];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: collection.nav, path: `/c/${collection.slug}` },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      {products.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(products.slice(0, 24))) }} />}
      <div className="order-1 pt-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/" className="font-semibold underline">Home</Link>
          <span aria-hidden> › </span>
          <span>{collection.nav}</span>
        </nav>
        <h1 className="mt-1 text-lg font-extrabold leading-snug">{collection.nav}</h1>
        {catalog && <p className="mt-1 text-sm font-semibold">{products.length} {products.length === 1 ? "item" : "items"}</p>}
      </div>
      {(collection.lede || copy) && (
        <section className="order-3 mt-6 max-w-3xl">
          <h2 className="text-lg font-extrabold">About this shelf</h2>
          {collection.lede && <p className="mt-2 text-[15px] leading-relaxed">{collection.lede}</p>}
          {copy && <p className="mt-2 text-[15px] leading-relaxed">{copy.about}</p>}
          {copy && (
            <>
              <h3 className="mt-4 font-extrabold">Questions</h3>
              <dl className="mt-2 flex flex-col gap-3">
                {copy.faqs.map((f) => (
                  <div key={f.q}>
                    <dt className="font-bold">{f.q}</dt>
                    <dd className="text-[15px] leading-relaxed text-[#5a6a82]">{f.a}</dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </section>
      )}
    </>
  );
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="pt-3 text-sm">Loading shelf…</p>}>
      <CollectionPage params={params} />
    </Suspense>
  );
}
