import type { Metadata } from "next";
import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import { Suspense } from "react";
import { WishButton } from "@/components/desktop-actions";
import { ProductBuy } from "@/components/product-buy";
import { ProductGallery } from "@/components/product-gallery";
import { cleanItemName, groupSameProducts } from "@/lib/browse";
import { cloudinarySquare, cloudinarySrcSet } from "@/lib/images";
import { breadcrumbJsonLd, productJsonLd, productSeo, productsInCollection } from "@/lib/product-json";
import { cachedCatalog } from "@/lib/public-catalog";
import { retiredProductSlug } from "@/lib/retired-product";
import { collectionByMatch, jsonLdScript, pageMeta } from "@/lib/shop";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const catalog = await cachedCatalog();
  const product = catalog?.products.find((item) => item.slug === slug);
  if (!product) return { title: "Not found", robots: { index: false, follow: false } };
  const seo = productSeo(product);
  return pageMeta({ title: seo.title, description: seo.description, path: `/p/${slug}` });
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
  const title = productSeo(product).name || cleanItemName(product.name_en) || product.name_en;
  const crumbs = [
    { name: "Home", path: "/" },
    ...(collection ? [{ name: collection.nav, path: `/c/${collection.slug}` }] : []),
    { name: title, path: `/p/${product.slug}` },
  ];
  const related = groupSameProducts(productsInCollection(catalog, top?.name_en ?? "").filter((p) => p.id !== product.id)).filter((p) => p.slug).slice(0, 4);
  const photos = product.images.length ? product.images : product.image ? [product.image] : [];
  return (
    <article className="py-3">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(productJsonLd(product)) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      <nav aria-label="Breadcrumb" className="mb-3 text-sm">
        <Link href="/" className="font-semibold underline">Home</Link>
        {collection && <> <span aria-hidden> › </span> <Link href={`/c/${collection.slug}`} className="font-semibold underline">{collection.nav}</Link></>}
        <span aria-hidden> › </span> <span>{title}</span>
      </nav>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-[12px] border border-black/10 bg-[#f3f5f8] p-4">
          <ProductGallery photos={photos} alt={title} />
        </div>
        <div>
          {product.brand && <p className="text-sm font-semibold text-[#5a6a82]">{product.brand}</p>}
          <h1 className="text-2xl font-extrabold leading-tight">{title}</h1>
          {product.description_en && <p className="mt-2 text-[15px] leading-relaxed">{product.description_en}</p>}
          <ProductBuy product={product} whatsapp={catalog.whatsapp} />
          <WishButton id={product.id} label={title} />
        </div>
      </div>
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

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const catalog = await cachedCatalog();
  const product = catalog?.products.find((item) => item.slug === slug);
  if (catalog && !product) {
    const next = await retiredProductSlug(slug);
    if (next) permanentRedirect(`/p/${next}`);
    notFound();
  }
  const photo = product?.images[0] || product?.image || "";
  const href = photo ? cloudinarySquare(photo, 800) : "";
  const srcSet = photo ? cloudinarySrcSet(photo, [400, 800, 1200]) : undefined;
  return (
    <>
      {href && <link rel="preload" as="image" href={href} imageSrcSet={srcSet} imageSizes="(max-width: 640px) 100vw, 480px" fetchPriority="high" />}
      <Suspense fallback={<p className="mx-auto max-w-6xl px-4 py-6 text-sm">Loading item…</p>}>
        <ProductRoute params={params} />
      </Suspense>
    </>
  );
}
