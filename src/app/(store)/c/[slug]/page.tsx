import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FaqAccordion } from "@/components/faq-accordion";
import { CategoryTile } from "@/components/category-tile";
import { groupSameProducts, sortProducts } from "@/lib/browse";
import { breadcrumbJsonLd, itemListJsonLd, productsInCollection } from "@/lib/product-json";
import { cachedCatalog } from "@/lib/public-catalog";
import { allDepartmentSlugs } from "@/lib/departments";
import { COLLECTIONS, PHONE_TEL, collectionBySlug, faqJsonLd, jsonLdScript, pageMeta, shelfMeta } from "@/lib/shop";
import { childShopCategories } from "@/lib/shop-category-data";
import { shopCategories, shopCategoryBySlug } from "@/lib/shop-category-store";

function askLink(label: string): string {
  return `https://wa.me/${PHONE_TEL.replace(/\D/g, "")}?text=${encodeURIComponent(`Hello, do you have ${label}?`)}`;
}

export function generateStaticParams() {
  const slugs = new Set([...COLLECTIONS.map((c) => c.slug), ...allDepartmentSlugs()]);
  return [...slugs].map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  if (collection) return pageMeta({ title: collection.title, description: collection.description, path: `/c/${collection.slug}` });
  const shelf = await shopCategoryBySlug(slug);
  if (shelf) {
    const seo = shelfMeta(shelf.slug, shelf.h1 || shelf.label, shelf.description || shelf.about);
    return pageMeta({ title: seo.title, description: seo.description, path: `/c/${shelf.slug}` });
  }
  return { title: "Not found", robots: { index: false, follow: false } };
}

async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await shopCategories();
  const shelf = rows.find((row) => row.slug === slug);
  const fallback = collectionBySlug(slug);
  if (!shelf && !fallback) notFound();
  if (shelf?.hidden) notFound();
  const kids = childShopCategories(rows, slug);
  if (shelf && !shelf.listing) {
    const parent = shelf.parent ? rows.find((row) => row.slug === shelf.parent) : undefined;
    return (
      <>
        <div className="pt-3">
          <nav aria-label="Breadcrumb" className="text-sm">
            <Link href="/" className="font-semibold underline">Home</Link>
            <span aria-hidden> › </span>
            {parent ? <Link href={`/c/${parent.slug}`} className="font-semibold underline">{parent.groupLabel || parent.label}</Link> : <Link href="/categories" className="font-semibold underline">Categories</Link>}
            <span aria-hidden> › </span>
            <span>{shelf.label}</span>
          </nav>
          <h1 className="mt-1 text-lg font-extrabold leading-snug">{shelf.label}</h1>
          {shelf.subtitle ? <p className="mt-1 text-sm text-[#5a6a82]">{shelf.subtitle}</p> : null}
          {kids.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {kids.map((kid) => (
                <li key={kid.slug}>
                  <CategoryTile href={`/c/${kid.slug}`} label={kid.label} slug={kid.slug} image={kid.image} subtitle={kid.subtitle} />
                </li>
              ))}
            </ul>
          )}
          <a className="mt-4 inline-flex rounded-[10px] bg-[#153a7a] px-4 py-2 text-sm font-bold text-white no-underline" href={askLink(shelf.label)}>Ask on WhatsApp</a>
        </div>
        <section className="mt-6 max-w-3xl">
          <h2 className="text-lg font-extrabold">About this shelf</h2>
          <p className="mt-2 text-[15px] leading-relaxed">{shelf.about}</p>
          {shelf.faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(shelf.faqs)) }} />}
          {shelf.faqs.length > 0 && <FaqAccordion items={shelf.faqs} title="Questions" id={`faq-${shelf.slug}`} heading="h3" bare />}
        </section>
      </>
    );
  }
  const nav = shelf?.nav || fallback?.nav || slug;
  const match = shelf?.match || fallback?.match || "";
  const lede = fallback?.lede || shelf?.lede || "";
  const about = shelf?.about || "";
  const faqs = shelf?.faqs ?? [];
  const catalog = await cachedCatalog();
  const products = catalog && match ? sortProducts(groupSameProducts(productsInCollection(catalog, match)), "popular") : [];
  const crumbs = [
    { name: "Home", path: "/" },
    { name: nav, path: `/c/${slug}` },
  ];
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(breadcrumbJsonLd(crumbs)) }} />
      {products.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(itemListJsonLd(products.slice(0, 24))) }} />}
      {faqs.length > 0 && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript(faqJsonLd(faqs)) }} />}
      <div className="order-1 pt-3">
        <nav aria-label="Breadcrumb" className="text-sm">
          <Link href="/" className="font-semibold underline">Home</Link>
          <span aria-hidden> › </span>
          <span>{nav}</span>
        </nav>
        {kids.length > 0 && (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {kids.map((kid) => (
              <li key={kid.slug}>
                <CategoryTile href={`/c/${kid.slug}`} label={kid.label} slug={kid.slug} image={kid.image} subtitle={kid.subtitle} />
              </li>
            ))}
          </ul>
        )}
        {catalog && products.length === 0 && <a className="mt-3 inline-flex rounded-[10px] bg-[#153a7a] px-4 py-2 text-sm font-bold text-white no-underline" href={askLink(nav)}>Ask on WhatsApp</a>}
      </div>
      {(lede || about) && (
        <section className="order-3 mt-6 max-w-3xl">
          <h2 className="text-lg font-extrabold">About this shelf</h2>
          {lede ? <p className="mt-2 text-[15px] leading-relaxed">{lede}</p> : null}
          {about ? <p className="mt-2 text-[15px] leading-relaxed">{about}</p> : null}
          {faqs.length > 0 && <FaqAccordion items={faqs} title="Questions" id={`faq-${slug}`} heading="h3" bare />}
        </section>
      )}
    </>
  );
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const rows = await shopCategories();
  const shelf = rows.find((row) => row.slug === slug);
  const fallback = collectionBySlug(slug);
  if ((!shelf && !fallback) || shelf?.hidden) notFound();
  return (
    <>
      {/* Keeps Next from scrolling the questions block into view. A fixed mark is already on screen, so the late shelf text is not treated as the navigation target. */}
      <span aria-hidden="true" className="pointer-events-none fixed left-0 top-0 h-px w-px" />
      <Suspense fallback={<div className="min-h-[70vh] pt-3 text-sm">Loading shelf…</div>}>
        <CollectionPage params={params} />
      </Suspense>
    </>
  );
}
