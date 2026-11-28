import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { FaqAccordion } from "@/components/faq-accordion";
import { ShopImage } from "@/components/shop-image";
import { groupSameProducts, sortProducts } from "@/lib/browse";
import { COLLECTION_COPY } from "@/lib/collection-copy";
import { breadcrumbJsonLd, itemListJsonLd, productsInCollection } from "@/lib/product-json";
import { cachedCatalog } from "@/lib/public-catalog";
import { PARENT_LABEL, allDepartmentSlugs, childDepartments, departmentBySlug } from "@/lib/departments";
import { loadDepartmentPrefs } from "@/lib/department-prefs";
import { COLLECTIONS, PHONE_TEL, collectionBySlug, jsonLdScript, pageMeta } from "@/lib/shop";

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
  const dept = departmentBySlug(slug);
  if (!dept) return {};
  return {
    ...pageMeta({ title: `${dept.label} | Pencil Box Stationery`, description: dept.about.slice(0, 160), path: `/c/${dept.slug}` }),
    ...(dept.parent ? { robots: { index: false, follow: true } } : {}),
  };
}

async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const collection = collectionBySlug(slug);
  const dept = departmentBySlug(slug);
  if (!collection && !dept) notFound();
  const hidden = new Set((await loadDepartmentPrefs()).hidden);
  if (dept && hidden.has(dept.slug)) notFound();
  if (!collection && dept) {
    const kids = childDepartments(dept.slug).filter((kid) => !hidden.has(kid.slug));
    return (
      <>
        <div className="pt-3">
          <nav aria-label="Breadcrumb" className="text-sm">
            <Link href="/" className="font-semibold underline">Home</Link>
            <span aria-hidden> › </span>
            {dept.parent ? <Link href={`/c/${dept.parent}`} className="font-semibold underline">{PARENT_LABEL[dept.parent] ?? dept.parent}</Link> : <Link href="/categories" className="font-semibold underline">Categories</Link>}
            <span aria-hidden> › </span>
            <span>{dept.label}</span>
          </nav>
          <h1 className="mt-1 text-lg font-extrabold leading-snug">{dept.label}</h1>
          {kids.length > 0 && (
            <ul className="mt-3 grid grid-cols-3 gap-2">
              {kids.map((kid) => (
                <li key={kid.slug}>
                  <Link href={`/c/${kid.slug}`} className="block rounded-[10px] border border-black/10 bg-white p-2 no-underline">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <ShopImage src={`/category/${kid.slug}.svg`} alt="" />
                    <span className="mt-1 block text-left text-[11px] font-extrabold uppercase leading-tight text-[#0c1222]">{kid.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <a className="mt-4 inline-flex rounded-[10px] bg-[#153a7a] px-4 py-2 text-sm font-bold text-white no-underline" href={askLink(dept.label)}>Ask on WhatsApp</a>
        </div>
        <section className="mt-6 max-w-3xl">
          <h2 className="text-lg font-extrabold">About this shelf</h2>
          <p className="mt-2 text-[15px] leading-relaxed">{dept.about}</p>
          <FaqAccordion items={dept.faqs} title="Questions" id={`faq-${dept.slug}`} heading="h3" bare />
        </section>
      </>
    );
  }
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
        {childDepartments(collection.slug).some((kid) => !hidden.has(kid.slug)) && (
          <ul className="mt-3 grid grid-cols-3 gap-2">
            {childDepartments(collection.slug).filter((kid) => !hidden.has(kid.slug)).map((kid) => (
              <li key={kid.slug}>
                <Link href={`/c/${kid.slug}`} className="block rounded-[10px] border border-black/10 bg-white p-2 no-underline">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <ShopImage src={`/category/${kid.slug}.svg`} alt="" />
                  <span className="mt-1 block text-[11px] font-extrabold uppercase leading-tight text-[#0c1222]">{kid.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {catalog && products.length === 0 && <a className="mt-3 inline-flex rounded-[10px] bg-[#153a7a] px-4 py-2 text-sm font-bold text-white no-underline" href={askLink(collection.nav)}>Ask on WhatsApp</a>}
      </div>
      {(collection.lede || copy) && (
        <section className="order-3 mt-6 max-w-3xl">
          <h2 className="text-lg font-extrabold">About this shelf</h2>
          {collection.lede && <p className="mt-2 text-[15px] leading-relaxed">{collection.lede}</p>}
          {copy && <p className="mt-2 text-[15px] leading-relaxed">{copy.about}</p>}
          {copy && (
            <>
              <FaqAccordion items={copy.faqs} title="Questions" id={`faq-${collection.slug}`} heading="h3" bare />
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
