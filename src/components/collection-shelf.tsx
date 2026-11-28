import Link from "next/link";
import { QuickAdd } from "@/components/quick-add";
import { cleanItemName, discountPercent, formatInr, lowestPrice } from "@/lib/browse";
import { cloudinarySquare, cloudinarySrcSet } from "@/lib/images";
import type { StoreProduct } from "@/lib/store";

/** Product photos in the open HTML, ahead of the shop script. */
export function CollectionShelf({ products }: { products: StoreProduct[] }) {
  if (!products.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {products.map((product, index) => {
        const name = cleanItemName(product.name_en) || product.name_en;
        const single = product.variants.length === 1 ? product.variants[0] : null;
        const prices = product.variants.map((variant) => variant.price);
        const low = prices.length ? Math.min(...prices) : 0;
        const alt = product.imageGeneric ? `Illustration of ${[product.brand, product.name_en].filter(Boolean).join(" ")}` : [product.brand, product.name_en].filter(Boolean).join(" ") || "Stationery item";
        const src = product.image ? cloudinarySquare(product.image, 400) : "";
        const srcSet = product.image ? cloudinarySrcSet(product.image) : undefined;
        const off = single ? discountPercent(single.price, single.mrp) : 0;
        return (
          <li key={product.id} className="flex flex-col overflow-hidden rounded-[10px] border border-black/10 bg-white">
            <span className="block aspect-square min-h-[42vw] bg-[#f3f5f8] sm:min-h-0">
              {src ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={src}
                  srcSet={srcSet}
                  sizes="(max-width: 640px) 45vw, 220px"
                  alt={alt}
                  width={400}
                  height={400}
                  loading={index < 4 ? "eager" : "lazy"}
                  fetchPriority={index === 0 ? "high" : "auto"}
                  decoding="async"
                  className="h-full w-full object-contain"
                />
              ) : null}
            </span>
            <div className="flex flex-1 flex-col gap-1 p-3 pt-2">
              {product.brand && <span className="text-xs text-[#5a6a82]">{product.brand}</span>}
              {product.slug ? (
                <Link href={`/p/${product.slug}`} className="line-clamp-2 font-extrabold leading-tight text-[#0c1222] no-underline">{name}</Link>
              ) : (
                <span className="line-clamp-2 font-extrabold leading-tight">{name}</span>
              )}
              <span className="mt-auto text-[17px] font-extrabold">
                {off > 0 && single && <span className="mr-1 text-xs font-semibold text-[#5a6a82] line-through">{formatInr(single.mrp)}</span>}
                {single ? formatInr(single.price) : formatInr(low || lowestPrice(product))}
              </span>
              {single ? <QuickAdd id={single.id} label={name} /> : product.slug ? <Link href={`/p/${product.slug}`} className="mt-1 block rounded-[10px] border border-black/10 py-2 text-center text-sm font-extrabold text-[#0c1222] no-underline">{product.variants.length} options</Link> : null}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
