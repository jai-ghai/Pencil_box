"use client";

import { useRef, type ReactNode } from "react";

/** Scrolls the server-rendered slides. The pictures themselves are already in the HTML. */
export function HeroFrame({ children }: { children: ReactNode }) {
  const scroller = useRef<HTMLDivElement>(null);
  const move = (dir: number) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };
  return (
    <div className="relative overflow-hidden rounded-[16px] bg-[#153a7a]">
      <div ref={scroller} className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {children}
      </div>
      <button type="button" aria-label="Previous slide" onClick={() => move(-1)} className="absolute left-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg font-bold text-[#153a7a]">‹</button>
      <button type="button" aria-label="Next slide" onClick={() => move(1)} className="absolute right-3 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-full bg-white/90 text-lg font-bold text-[#153a7a]">›</button>
    </div>
  );
}
