"use client";

import { useEffect, useState } from "react";
import { cloudinaryBlur, cloudinarySquare, cloudinarySrcSet } from "@/lib/images";

const FALLBACK = "/category/pencil.svg";

/**
 * Square picture with a grey shimmer until the file arrives, then a short fade.
 * A failed photo falls back to a plain drawing so the slot is never blank.
 */
export function ShopImage({
  src,
  alt,
  width = 400,
  priority = false,
  fallback = FALLBACK,
  sizes = "(max-width: 640px) 45vw, 220px",
  className = "",
}: {
  src: string;
  alt: string;
  width?: number;
  priority?: boolean;
  fallback?: string;
  sizes?: string;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const [ready, setReady] = useState(false);
  const shown = failed ? fallback : cloudinarySquare(src, width);
  const set = failed ? undefined : cloudinarySrcSet(src);
  const blur = failed ? undefined : cloudinaryBlur(src);

  useEffect(() => {
    setFailed(false);
    setReady(false);
  }, [src]);

  return (
    <span className={`pb-photo ${className}`} style={blur ? { backgroundImage: `url(${blur})` } : undefined}>
      {!ready && <span className="pb-shimmer" aria-hidden />}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={shown}
        srcSet={set}
        sizes={set ? sizes : undefined}
        alt={alt}
        width={width}
        height={width}
        loading={priority ? "eager" : "lazy"}
        fetchPriority={priority ? "high" : "auto"}
        decoding="async"
        className={ready ? "is-ready" : ""}
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth > 0) setReady(true);
        }}
        onError={() => {
          if (!failed) setFailed(true);
          else setReady(true);
        }}
      />
    </span>
  );
}
