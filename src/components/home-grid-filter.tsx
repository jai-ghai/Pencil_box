"use client";

import { useEffect } from "react";

/** Hides home cards that do not match the header search, without removing the drawings from the first HTML. */
export function HomeGridFilter() {
  useEffect(() => {
    const apply = (raw: string) => {
      const words = raw.toLowerCase().split(/\s+/).filter(Boolean);
      document.querySelectorAll<HTMLElement>("[data-home-card]").forEach((el) => {
        const label = el.dataset.homeCard ?? "";
        el.hidden = words.length > 0 && !words.every((word) => label.includes(word));
      });
      const all = document.querySelector<HTMLElement>("[data-home-all]");
      if (all) all.hidden = words.length > 0 && !words.every((word) => "all categories".includes(word));
    };
    const onSearch = (event: Event) => apply((event as CustomEvent<string>).detail ?? "");
    window.addEventListener("pb-home-q", onSearch);
    return () => window.removeEventListener("pb-home-q", onSearch);
  }, []);
  return null;
}
