import Link from "next/link";
import { DesktopActions } from "@/components/desktop-actions";
import { SearchBar } from "@/components/search-bar";
import { PHONE_DISPLAY, PHONE_TEL } from "@/lib/shop";

/** White desktop shop header. Hidden on phones, where the navy bar stays. */
export function DesktopChrome() {
  return (
    <div className="hidden border-b border-black/10 bg-white xl:block">
      <div className="bg-[#eef2f8] text-[13px] text-[#153a7a]">
        <div className="mx-auto flex h-9 max-w-[1440px] items-center justify-end gap-5 px-6">
          <a className="font-semibold no-underline hover:underline" href={`tel:${PHONE_TEL}`}>Help line {PHONE_DISPLAY}</a>
          <Link className="font-semibold no-underline hover:underline" href="/login">Login</Link>
          <Link className="font-semibold no-underline hover:underline" href="/orders">Orders</Link>
        </div>
      </div>
      <div className="mx-auto flex h-[84px] max-w-[1440px] items-center gap-6 px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5 no-underline">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/icons/icon-192.png" alt="" width={48} height={48} className="h-12 w-12 rounded-[12px]" />
          <span>
            <span className="block text-[22px] font-extrabold leading-none tracking-tight text-[#153a7a]">Pencil Box</span>
            <span className="mt-1 block text-[11px] font-bold uppercase tracking-[0.14em] text-[#b8860b]">Stationery</span>
          </span>
        </Link>
        <SearchBar tone="desktop" />
        <DesktopActions />
      </div>
    </div>
  );
}
