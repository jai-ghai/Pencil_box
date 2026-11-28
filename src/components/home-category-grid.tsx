import { CategoryTile } from "@/components/category-tile";
import Link from "next/link";
import { homeShopCategories } from "@/lib/shop-category-data";
import { shopCategories } from "@/lib/shop-category-store";

/** Category drawings in the first HTML. An uploaded photo replaces the drawing. */
export async function HomeCategoryGrid() {
  const cards = homeShopCategories(await shopCategories());
  return (
    <ul className="mb-1 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6" aria-label="Categories">
      {cards.map((card, i) => (
        <li key={card.slug} data-home-card={card.label.toLowerCase()}>
          <CategoryTile href={`/c/${card.slug}`} label={card.label} slug={card.slug} image={card.image} subtitle={card.subtitle} priority={i < 3} />
        </li>
      ))}
      <li data-home-all="">
        <Link href="/categories" className="flex h-full min-h-[148px] flex-col items-center justify-center rounded-[14px] border border-black/10 bg-[#153a7a] px-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white no-underline transition hover:-translate-y-1">
          All categories
        </Link>
      </li>
    </ul>
  );
}
