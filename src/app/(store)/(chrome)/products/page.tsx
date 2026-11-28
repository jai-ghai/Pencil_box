import Link from "next/link";
import { formatInr, genericItemName, groupSameProducts, lowestPrice, sortProducts } from "@/lib/browse";
import { cachedCatalog } from "@/lib/public-catalog";
import { pageMeta } from "@/lib/shop";

export const metadata = pageMeta({
  title: "Stationery and toys in Tigri Extension | Pencil Box",
  description: "Browse notebooks, school stationery, chart paper, gifts and toys at Pencil Box, B-92 Tigri Extension, near Sangam Vihar.",
  path: "/products",
});

export default async function ProductsPage() {
  const catalog = await cachedCatalog();
  const products = catalog ? sortProducts(groupSameProducts(catalog.products), "popular") : [];
  const nameOf = new Map((catalog?.categories ?? []).map((category) => [category.id, category.name_en]));
  return (
    <div className="py-3">
      <h1 className="text-lg font-extrabold">All products</h1>
      <p className="mt-2 max-w-3xl text-[15px] leading-relaxed">What is on the shelves at B-92, Tigri Extension. Prices are on each card. Call or WhatsApp if you need a school list packed.</p>
      {products.length > 0 && (
        <ul className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {products.map((product) => {
            const name = genericItemName(product.name_en, product.brand) || product.name_en;
            const price = lowestPrice(product);
            return (
              <li key={product.id}>
                <Link href={product.slug ? `/p/${product.slug}` : "/products"} className="flex items-baseline justify-between gap-3 rounded-[10px] border border-black/10 bg-white px-3 py-2 no-underline">
                  <span className="font-bold text-[#0c1222]">{name}</span>
                  <span className="shrink-0 text-sm text-[#5a6a82]">{nameOf.get(product.categoryId) ?? ""} {price ? formatInr(price) : ""}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
