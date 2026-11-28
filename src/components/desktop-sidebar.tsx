import Link from "next/link";
import { orderedHomeLinks } from "@/lib/departments";

/** Category list beside the desktop page. */
export function DesktopSidebar() {
  const cards = orderedHomeLinks();
  return (
    <aside className="sticky top-4 rounded-[14px] border border-black/10 bg-white p-3 shadow-[0_8px_24px_rgba(12,18,34,0.04)]">
      <div className="mb-2 flex items-center justify-between px-1">
        <p className="text-sm font-extrabold text-[#0c1222]">Categories</p>
        <Link href="/categories" className="text-xs font-bold text-[#153a7a] no-underline">See all &gt;</Link>
      </div>
      <ul className="flex flex-col">
        {cards.map((card) => (
          <li key={card.slug}>
            <Link href={card.href} className="flex items-center gap-2 rounded-[8px] px-1.5 py-1.5 text-sm font-semibold text-[#0c1222] no-underline hover:bg-[#f0f3f8]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/category/${card.slug}.svg`} alt="" width={28} height={28} className="h-7 w-7 object-contain" />
              {card.label}
            </Link>
          </li>
        ))}
      </ul>
    </aside>
  );
}
