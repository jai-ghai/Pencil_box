"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function atTop() {
  window.scrollTo({ top: 0, left: 0, behavior: "auto" });
}

/**
 * Forward navigations open at the header. The back button is left alone so the
 * browser can restore the place you left.
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const popped = useRef(false);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useLayoutEffect(() => {
    if (popped.current) {
      popped.current = false;
      return;
    }
    atTop();
  }, [pathname, search]);

  return null;
}
