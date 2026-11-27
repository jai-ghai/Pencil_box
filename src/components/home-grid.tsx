"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { EMPTY_PREFS, orderedHomeLinks, type DepartmentPrefs } from "@/lib/departments";

/** The short home grid, plus All categories. Hidden departments stay off this grid. */
export function HomeGrid({ query = "" }: { query?: string }) {
  const [prefs, setPrefs] = useState<DepartmentPrefs>(EMPTY_PREFS);
  useEffect(() => {
    let live = true;
    fetch("/api/store/departments")
      .then((r) => (r.ok ? r.json() : EMPTY_PREFS))
      .then((data) => live && setPrefs(data))
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const cards = orderedHomeLinks(prefs).filter((card) => {
    if (!words.length) return true;
    return words.every((w) => card.label.toLowerCase().includes(w));
  });
  const showAll = !words.length || words.every((w) => "all categories".includes(w));
  if (!cards.length && !showAll) return <p className="m-0 text-sm text-[#5a6a82]">No category matches. Try another word, or clear the search.</p>;
  return (
    <ul className="mb-1 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6" aria-label="Categories">
      {cards.map((card) => (
        <li key={card.slug}>
          <Link href={card.href} className="flex h-full flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white no-underline shadow-[0_1px_2px_rgba(12,18,34,0.08)]">
            <span className="flex aspect-square items-center justify-center bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={prefs.images[card.slug] || `/category/${card.slug}.svg`} alt="" className="h-[92%] w-[92%] object-contain" />
            </span>
            <span className="px-2 pb-2 text-left text-[11px] font-extrabold uppercase leading-[1.15] tracking-wide text-[#0c1222] sm:text-xs">{card.label}</span>
          </Link>
        </li>
      ))}
      {showAll && (
        <li>
          <Link href="/categories" className="flex h-full min-h-[120px] flex-col items-center justify-center rounded-[10px] border border-black/10 bg-[#153a7a] px-2 text-center text-[11px] font-extrabold uppercase leading-tight tracking-wide text-white no-underline sm:text-xs">
            All categories
          </Link>
        </li>
      )}
    </ul>
  );
}
