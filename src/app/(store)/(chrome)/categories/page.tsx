import Link from "next/link";
import { ShopImage } from "@/components/shop-image";
import { pageMeta } from "@/lib/shop";
import { shopCategories } from "@/lib/shop-category-store";

export const metadata = pageMeta({
  title: "All categories | Pencil Box Stationery",
  description: "School, writing, office, paper, art, gifts and everyday items at Pencil Box Stationery, Tigri Extension.",
  path: "/categories",
});

function art(slug: string, image: string): string {
  return image || `/category/${slug}.svg`;
}

export default async function CategoriesPage() {
  const rows = (await shopCategories()).filter((row) => !row.hidden);
  const parents = rows
    .filter((row) => !row.parent && rows.some((kid) => kid.parent === row.slug))
    .sort((a, b) => (a.groupOrder < 0 ? 99 : a.groupOrder) - (b.groupOrder < 0 ? 99 : b.groupOrder));
  return (
    <div className="py-3">
      <h1 className="text-lg font-extrabold">All categories</h1>
      <div className="mt-4 flex flex-col gap-6">
        {parents.map((parent) => {
          const kids = rows.filter((row) => row.parent === parent.slug).sort((a, b) => a.sortOrder - b.sortOrder);
          if (!kids.length) return null;
          return (
            <section key={parent.slug}>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#153a7a]">{parent.groupLabel || parent.label}</h2>
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {kids.map((kid, i) => (
                  <li key={kid.slug}>
                    <Link href={`/c/${kid.slug}`} className="flex h-full flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white no-underline shadow-[0_1px_2px_rgba(12,18,34,0.08)]">
                      <ShopImage src={art(kid.slug, kid.image)} alt="" priority={i < 6 && parent.slug === "school"} />
                      <span className="px-2 pb-2 text-left text-[11px] font-extrabold uppercase leading-tight text-[#0c1222]">{kid.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </div>
  );
}
