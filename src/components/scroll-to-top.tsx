"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function atTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const PIN_MS = 4000;

/**
 * Forward navigations open at the header. The back button is left alone so the
 * browser can restore the place you left.
 *
 * On collection pages the product shelf lives in the layout, and the page
 * segment under it (the about text) arrives a moment later. Next then scrolls
 * that segment into view, which lands on the footer. Hold the top until that
 * settles, unless the shopper starts scrolling themselves.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const popped = useRef(false);
  const seen = useRef<string | null>(null);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    const key = `${pathname}?${search}`;
    const changed = seen.current !== null && seen.current !== key;
    seen.current = key;
    if (!changed) return;
    if (popped.current) {
      popped.current = false;
      return;
    }
    if (window.location.hash) return;

    let userMoved = false;
    const mark = () => {
      userMoved = true;
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) userMoved = true;
    };
    window.addEventListener("wheel", mark, { passive: true });
    window.addEventListener("touchmove", mark, { passive: true });
    window.addEventListener("keydown", onKey);

    const started = performance.now();
    let frame = 0;
    const pin = () => {
      if (popped.current || userMoved) return;
      if (window.scrollY !== 0) atTop();
      if (performance.now() - started < PIN_MS) frame = requestAnimationFrame(pin);
    };
    atTop();
    frame = requestAnimationFrame(pin);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", onKey);
    };
  }, [pathname, search]);

  return null;
}
