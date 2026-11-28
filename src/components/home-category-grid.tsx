import Link from "next/link";
import { HOME_DRAWING } from "@/components/home-drawings";
import { cloudinarySquare, isCloudinary } from "@/lib/images";
import { homeShopCategories } from "@/lib/shop-category-data";
import { shopCategories } from "@/lib/shop-category-store";

function cardArt(slug: string, image: string): string {
  if (!image) return HOME_DRAWING[slug] ?? `/category/${slug}.svg`;
  return isCloudinary(image) ? cloudinarySquare(image, 400) : image;
}

/**
 * Category drawings in the first HTML. These are local files, not photos,
 * so they paint immediately. Real product photos keep the shimmer.
 */
export async function HomeCategoryGrid() {
  const cards = homeShopCategories(await shopCategories());
  return (
    <ul className="mb-1 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label="Categories">
      {cards.map((card, i) => (
        <li key={card.slug} data-home-card={card.label.toLowerCase()}>
          <Link href={`/c/${card.slug}`} className="flex h-full flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white no-underline shadow-[0_1px_2px_rgba(12,18,34,0.08)]">
            <span className="block aspect-square bg-[#eceff3]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardArt(card.slug, card.image)}
                alt=""
                width={400}
                height={400}
                loading={i < 3 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : "auto"}
                decoding="async"
                className="h-full w-full object-contain"
              />
            </span>
            <span className="px-2 pb-2 text-left text-[11px] font-extrabold uppercase leading-[1.15] tracking-wide text-[#0c1222] sm:text-xs">{card.label}</span>
          </Link>
        </li>
      ))}
      <li data-home-all="">
        <Link href="/categories" className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-[10px] border border-black/10 bg-[#153a7a] px-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white no-underline sm:text-xs">
          All categories
        </Link>
      </li>
    </ul>
  );
}
