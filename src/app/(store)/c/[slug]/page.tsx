import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ShopHero } from "@/components/shop-seo";
import { COLLECTIONS, collectionBySlug, pageMeta } from "@/lib/shop";

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
  return <ShopHero title={collection.h1} lede={collection.lede} current={collection.slug} />;
}
