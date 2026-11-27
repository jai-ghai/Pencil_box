import Link from "next/link";
import { DEPARTMENTS, PARENT_LABEL, DEPARTMENT_PARENTS } from "@/lib/departments";
import { loadDepartmentPrefs } from "@/lib/department-prefs";
import { pageMeta } from "@/lib/shop";

export const metadata = pageMeta({
  title: "All categories | Pencil Box Stationery",
  description: "School, writing, office, paper, art, gifts and everyday items at Pencil Box Stationery, Tigri Extension.",
  path: "/categories",
});

export default async function CategoriesPage() {
  const prefs = await loadDepartmentPrefs();
  const hidden = new Set(prefs.hidden);
  return (
    <div className="py-3">
      <h1 className="text-lg font-extrabold">All categories</h1>
      <div className="mt-4 flex flex-col gap-6">
        {DEPARTMENT_PARENTS.map((parent) => {
          const kids = DEPARTMENTS.filter((d) => d.parent === parent && !hidden.has(d.slug));
          if (!kids.length) return null;
          return (
            <section key={parent}>
              <h2 className="text-sm font-extrabold uppercase tracking-wide text-[#153a7a]">{PARENT_LABEL[parent]}</h2>
              <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
                {kids.map((kid) => (
                  <li key={kid.slug}>
                    <Link href={`/c/${kid.slug}`} className="flex h-full flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white no-underline shadow-[0_1px_2px_rgba(12,18,34,0.08)]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={`/category/${kid.slug}.svg`} alt="" className="aspect-square w-full object-contain" />
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
