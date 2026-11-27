import Link from "next/link";
import { COLLECTIONS, pageMeta } from "@/lib/shop";

export const metadata = pageMeta({
  title: "All categories | Pencil Box Stationery",
  description: "School stationery, pens, art, gifts and photocopy at Pencil Box Stationery, Tigri Extension.",
  path: "/categories",
});

export default function CategoriesPage() {
  return (
    <div className="py-3">
      <h1 className="text-lg font-extrabold">All categories</h1>
      <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {COLLECTIONS.map((c) => (
          <li key={c.slug}>
            <Link href={`/c/${c.slug}`} className="flex h-full items-end rounded-[10px] border border-black/10 bg-white p-3 text-left text-[11px] font-extrabold uppercase leading-tight tracking-wide text-[#0c1222] no-underline shadow-[0_1px_2px_rgba(12,18,34,0.08)] sm:text-xs">
              {c.nav}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
