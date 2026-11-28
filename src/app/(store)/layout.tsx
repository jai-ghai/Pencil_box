import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { ShopFaq, ShopFooter, ShopJsonLd } from "@/components/shop-seo";
import { CatalogueShellSkeleton } from "@/components/store-skeleton";
import { Storefront } from "../storefront";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopJsonLd />
      <Suspense fallback={<CatalogueShellSkeleton />}>
        <AntdRoot accent="sun">
          <Storefront>{children}</Storefront>
        </AntdRoot>
      </Suspense>
      <ShopFaq />
      <ShopFooter />
    </>
  );
}
