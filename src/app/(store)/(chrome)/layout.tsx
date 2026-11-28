import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { CatalogueShellSkeleton } from "@/components/store-skeleton";
import { Storefront } from "../../storefront";

/** Home, product, and the other shop routes. The catalogue is filled in the browser. */
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={<CatalogueShellSkeleton />}>
      <AntdRoot accent="sun">
        <Storefront>{children}</Storefront>
      </AntdRoot>
    </Suspense>
  );
}
