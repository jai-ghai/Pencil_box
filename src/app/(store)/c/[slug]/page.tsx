import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ShopHero } from "@/components/shop-seo";
import { formatInr } from "@/lib/browse";
import { COLLECTION_COPY } from "@/lib/collection-copy";
import { cloudinarySquare } from "@/lib/images";
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

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (!collection) notFound();
  const catalog = await cachedCatalog();
  const products = catalog ? productsInCollection(catalog, collection.match) : [];
  const copy = COLLECTION_COPY[collection.slug];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: collection.nav, path: `/c/${collection.slug}` },
  ];
  return (
    <>
      <ShopHero title={collection.h1} lede={collection.lede} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      {products.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(products.slice(0, 24))) }} />}
      <div className="mx-auto w-full max-w-6xl px-4 pt-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/" className="font-semibold underline">Home</Link>
          <span aria-hidden> › </span>
          <span>{collection.nav}</span>
        </nav>
        {catalog && <p className="mt-1 text-sm font-semibold">{products.length} {products.length === 1 ? "item" : "items"}</p>}
        {products.length > 0 && (
          <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {products.slice(0, 24).map((p) => {
              const price = Math.min(...p.variants.map((v) => v.price));
              const alt = `${p.brand ? `${p.brand} ` : ""}${p.name_en}`.trim();
              return (
                <li key={p.id} className="rounded-[10px] border border-black/10 bg-white p-2">
                  <Link href={p.slug ? `/p/${p.slug}` : `/c/${collection.slug}`} className="no-underline">
                    <span className="flex aspect-square items-center justify-center bg-white">
                      {p.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={cloudinarySquare(p.image)} alt={alt} className="h-full w-full object-contain p-2" />
                      ) : <span className="pb-sr-only">{alt}</span>}
                    </span>
                    {p.brand && <span className="mt-1 block text-[11px] font-semibold text-[#5a6a82]">{p.brand}</span>}
                    <span className="block text-sm font-extrabold leading-snug text-[#0c1222]">{p.name_en}</span>
                    <span className="mt-1 block text-sm font-extrabold text-[#0c1222]">{formatInr(price)}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
        {copy && (
          <section className="mt-6 max-w-3xl">
            <h2 className="text-lg font-extrabold">About this shelf</h2>
            <p className="mt-2 text-[15px] leading-relaxed">{copy.about}</p>
            <h3 className="mt-4 font-extrabold">Questions</h3>
            <dl className="mt-2 flex flex-col gap-3">
              {copy.faqs.map((f) => (
                <div key={f.q}>
                  <dt className="font-bold">{f.q}</dt>
                  <dd className="text-[15px] leading-relaxed text-[#5a6a82]">{f.a}</dd>
                </div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
