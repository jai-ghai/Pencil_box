import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { CatalogueShellSkeleton } from "@/components/store-skeleton";
import { StorefrontWithMenu } from "@/components/storefront-menu";

/** Home, product, and the other shop routes. The catalogue is filled in the browser. */
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CatalogueShellSkeleton />}>
      <AntdRoot accent="sun">
        <StorefrontWithMenu>{children}</StorefrontWithMenu>
      </AntdRoot>
    </Suspense>
  );
}
