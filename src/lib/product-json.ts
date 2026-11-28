import { genericItemName } from "./browse";
import { canonicalUrl, SITE } from "./shop";
import { cloudinarySquare } from "./images";
import type { StoreCatalog, StoreProduct } from "./store";

export function rupeeLabel(paise: number): string {
  return paise % 100 === 0 ? String(paise / 100) : (paise / 100).toFixed(2);
}

/** Card title and meta without a brand name. */
export function productSeo(product: Pick<StoreProduct, "name_en" | "brand" | "variants">): { name: string; title: string; description: string; low: number; high: number } {
  const name = genericItemName(product.name_en, product.brand) || product.name_en;
  const prices = product.variants.map((variant) => variant.price);
  const low = prices.length ? Math.min(...prices) : 0;
  const high = prices.length ? Math.max(...prices) : 0;
  const price = `₹${rupeeLabel(low)}`;
  const title = `${name} ${price} – Pencil Box, Tigri Extension`;
  const description = low === high
    ? `${name} for ${price} at Pencil Box Stationery, B-92 Tigri Extension, near Sangam Vihar, Khanpur and Devli. Open daily 7 AM–9:30 PM.`
    : `${name} from ${price} at Pencil Box Stationery, B-92 Tigri Extension, near Sangam Vihar. Open daily 7 AM–9:30 PM.`;
  return { name, title, description, low, high };
}

export function inrAmount(paise: number): string {
  return (paise / 100).toFixed(paise % 100 ? 2 : 0);
}

export function productJsonLd(p: StoreProduct) {
  const seo = productSeo(p);
  const image = (p.images.length ? p.images : p.image ? [p.image] : []).map((url) => (url.startsWith("http") ? url : `${SITE}${url}`));
  const offer = seo.low === seo.high
    ? {
        "@type": "Offer",
        priceCurrency: "INR",
        price: inrAmount(seo.low),
        availability: "https://schema.org/InStock",
        url: canonicalUrl(`/p/${p.slug}`),
      }
    : {
        "@type": "AggregateOffer",
        priceCurrency: "INR",
        lowPrice: inrAmount(seo.low),
        highPrice: inrAmount(seo.high),
        offerCount: p.variants.length,
        availability: "https://schema.org/InStock",
        url: canonicalUrl(`/p/${p.slug}`),
      };
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: seo.name,
    sku: p.variants[0]?.code,
    url: canonicalUrl(`/p/${p.slug}`),
    ...(image.length ? { image } : {}),
    offers: offer,
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
      name: genericItemName(p.name_en, p.brand) || p.name_en,
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
