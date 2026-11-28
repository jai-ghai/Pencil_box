"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function atTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

const PIN_MS = 12000;

/**
 * Forward navigations open at the header. The back button is left alone so the
 * browser can restore the place you left.
 *
 * On a phone the finger that tapped the link is still sending touchmove events
 * when the next page opens. Those are not a scroll. A later touch can scroll.
 * The pin also covers the moment the questions text arrives under the products.
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
    // The tap that opened this page is already down. Only a new touch can mean the shopper is scrolling.
    let nextTouch = false;
    const onTouchStart = () => {
      nextTouch = true;
    };
    const onTouchMove = () => {
      if (nextTouch) userMoved = true;
    };
    const onWheel = () => {
      userMoved = true;
    };
    const onKey = (event: KeyboardEvent) => {
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) userMoved = true;
    };
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("wheel", onWheel, { passive: true });
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
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [pathname, search]);

  return null;
}
