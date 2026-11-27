import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { ShopFaq, ShopFooter, ShopJsonLd } from "@/components/shop-seo";
import { Storefront } from "../storefront";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopJsonLd />
      {children}
      <Suspense fallback={<p className="pb-seo-muted mx-auto w-full max-w-6xl px-4 py-6 text-sm">Loading the catalogue…</p>}>
        <AntdRoot accent="sun">
          <Storefront />
        </AntdRoot>
      </Suspense>
      <ShopFaq />
      <ShopFooter />
    </>
  );
}
