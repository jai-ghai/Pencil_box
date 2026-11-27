import { canonicalUrl, SITE } from "./shop";
import { cloudinarySquare } from "./images";
import type { StoreCatalog, StoreProduct } from "./store";

export function inrAmount(paise: number): string {
  return (paise / 100).toFixed(paise % 100 ? 2 : 0);
}

export function productJsonLd(p: StoreProduct) {
  const price = Math.min(...p.variants.map((v) => v.price));
  const image = (p.images.length ? p.images : p.image ? [p.image] : []).map((url) => (url.startsWith("http") ? url : `${SITE}${url}`));
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name_en,
    sku: p.variants[0]?.code,
    url: canonicalUrl(`/p/${p.slug}`),
    ...(p.brand ? { brand: { "@type": "Brand", name: p.brand } } : {}),
    ...(p.description_en ? { description: p.description_en } : {}),
    ...(image.length ? { image } : {}),
    offers: {
      "@type": "Offer",
      priceCurrency: "INR",
      price: inrAmount(price),
      availability: "https://schema.org/InStock",
      url: canonicalUrl(`/p/${p.slug}`),
    },
  };
}

export function breadcrumbJsonLd(crumbs: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: canonicalUrl(c.path),
    })),
  };
}

export function itemListJsonLd(products: StoreProduct[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: products.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: p.brand ? `${p.brand} ${p.name_en}` : p.name_en,
      url: p.slug ? canonicalUrl(`/p/${p.slug}`) : undefined,
      image: p.image ? cloudinarySquare(p.image.startsWith("http") ? p.image : `${SITE}${p.image}`) : undefined,
    })),
  };
}

export function productsInCollection(catalog: StoreCatalog, categoryName: string): StoreProduct[] {
  const top = catalog.categories.find((c) => !c.parentId && c.name_en === categoryName);
  if (!top) return [];
  const ids = new Set([top.id, ...catalog.categories.filter((c) => c.parentId === top.id).map((c) => c.id)]);
  return catalog.products.filter((p) => ids.has(p.categoryId));
}
