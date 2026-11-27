import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductBuy } from "@/components/product-buy";
import { cloudinarySquare } from "@/lib/images";
import { breadcrumbJsonLd, productJsonLd, productsInCollection } from "@/lib/product-json";
import { cachedCatalog } from "@/lib/public-catalog";
import { collectionByMatch, jsonLdScript, pageMeta } from "@/lib/shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const title = `${slug.replace(/-/g, " ")} | Pencil Box Stationery`;
  return pageMeta({ title, description: "Item at Pencil Box Stationery, Tigri Extension, New Delhi.", path: `/p/${slug}` });
}

async function ProductRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await cachedCatalog();
  if (!catalog) return <p className="mx-auto max-w-6xl px-4 py-8 text-sm">The item list is loading in the shop below.</p>;
  const product = catalog.products.find((p) => p.slug === slug);
  if (!product) notFound();
  const category = catalog.categories.find((c) => c.id === product.categoryId);
  const top = category?.parentId ? catalog.categories.find((c) => c.id === category.parentId) : category;
  const collection = top ? collectionByMatch(top.name_en) : undefined;
  const crumbs = [
    { name: "Home", path: "/" },
    ...(collection ? [{ name: collection.nav, path: `/c/${collection.slug}` }] : []),
    { name: product.name_en, path: `/p/${product.slug}` },
  ];
  const related = productsInCollection(catalog, top?.name_en ?? "").filter((p) => p.id !== product.id && p.slug).slice(0, 4);
  const photos = product.images.length ? product.images : product.image ? [product.image] : [];
  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-4">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm">
        <Link href="/" className="font-semibold underline">Home</Link>
        {collection && <> <span aria-hidden> › </span> <Link href={`/c/${collection.slug}`} className="font-semibold underline">{collection.nav}</Link></>}
        <span aria-hidden> › </span> <span>{product.name_en}</span>
      </nav>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex aspect-square items-center justify-center rounded-[12px] border border-black/10 bg-white p-4">
          {photos[0] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cloudinarySquare(photos[0])} alt={`${product.brand ? `${product.brand} ` : ""}${product.name_en}`} className="h-full w-full object-contain" />
          ) : <span className="text-sm text-[#5a6a82]">No photo yet</span>}
        </div>
        <div>
          {product.brand && <p className="text-sm font-semibold text-[#5a6a82]">{product.brand}</p>}
          <h1 className="text-2xl font-extrabold leading-tight">{product.name_en}</h1>
          {product.description_en && <p className="mt-2 text-[15px] leading-relaxed">{product.description_en}</p>}
          <ProductBuy product={product} whatsapp={catalog.whatsapp} />
        </div>
      </div>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2">
          {photos.slice(1, 5).map((url) => (
            <li key={url} className="h-16 w-16 overflow-hidden rounded-[8px] border bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={cloudinarySquare(url, 200)} alt="" className="h-full w-full object-contain" />
            </li>
          ))}
        </ul>
      )}
      {related.length > 0 && (
        <section className="mt-6">
          <h2 className="text-lg font-extrabold">More in this category</h2>
          <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {related.map((p) => (
              <li key={p.id}>
                <Link href={`/p/${p.slug}`} className="block rounded-[10px] border border-black/10 bg-white p-2 no-underline">
                  <span className="block text-sm font-bold leading-snug text-[#0c1222]">{p.name_en}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}

export default function Page({ params }: { params: Promise<{ slug: string }> }) {
  return (
    <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading item…</p>}>
      <ProductRoute params={params} />
    </Suspense>
  );
}
