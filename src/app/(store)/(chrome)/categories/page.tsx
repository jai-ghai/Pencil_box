import { CategoryTile } from "@/components/category-tile";
import { pageMeta } from "@/lib/shop";
import { shopCategories } from "@/lib/shop-category-store";

export const metadata = pageMeta({
  title: "All categories | Pencil Box Stationery",
  description: "School, writing, office, paper, art, gifts and everyday items at Pencil Box Stationery, Tigri Extension.",
  path: "/categories",
});

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
                    <CategoryTile href={`/c/${kid.slug}`} label={kid.label} slug={kid.slug} image={kid.image} subtitle={kid.subtitle} priority={i < 3 && parent.slug === "school"} />
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
