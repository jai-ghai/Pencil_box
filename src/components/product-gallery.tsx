"use client";

import { useState } from "react";
import { ShopImage } from "@/components/shop-image";

/** Square photo, thumbnails, and a closer look. */
export function ProductGallery({ photos, alt }: { photos: string[]; alt: string }) {
  const [active, setActive] = useState(0);
  const [open, setOpen] = useState(false);
  const src = photos[active] ?? "";
  if (!src) return <span className="text-sm text-[#5a6a82]">No photo yet</span>;
  return (
    <div>
      <button type="button" className="block w-full" aria-label="Look closer" onClick={() => setOpen(true)}>
        <ShopImage src={src} alt={alt} width={1200} priority sizes="(max-width: 640px) 100vw, 480px" />
      </button>
      {photos.length > 1 && (
        <ul className="mt-3 flex gap-2">
          {photos.slice(0, 5).map((url, index) => (
            <li key={url}>
              <button type="button" className={`h-16 w-16 overflow-hidden rounded-[8px] border bg-[#f3f5f8] ${index === active ? "border-[#153a7a]" : "border-black/10"}`} aria-label={`Photo ${index + 1}`} onClick={() => setActive(index)}>
                <ShopImage src={url} alt="" width={200} sizes="64px" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-[#0c1222]/80 p-4" role="dialog" aria-modal="true" aria-label="Closer look">
          <button type="button" className="absolute right-4 top-4 rounded-full bg-white px-3 py-1 text-sm font-bold" onClick={() => setOpen(false)}>Close</button>
          <div className="max-h-[90vh] w-full max-w-3xl">
            <ShopImage src={src} alt={alt} width={1600} priority sizes="90vw" />
          </div>
        </div>
      )}
    </div>
  );
}
