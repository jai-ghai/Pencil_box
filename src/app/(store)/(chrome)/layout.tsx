import { Suspense } from "react";
import { AntdRoot } from "@/components/antd-root";
import { StorefrontWithMenu } from "@/components/storefront-menu";

/** Header is the client shell. Page copy, including the H1, stays outside it so it is in the first HTML. */
export default function ChromeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col pb-[calc(76px+env(safe-area-inset-bottom,0px))]" style={{ background: "#f0f3f8" }}>
      <Suspense fallback={<div aria-hidden className="shrink-0 xl:hidden" style={{ height: 116, background: "#153a7a" }} />}>
        <AntdRoot accent="sun" fill={false}>
          <StorefrontWithMenu shell="chrome" />
        </AntdRoot>
      </Suspense>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-3">{children}</main>
    </div>
  );
}
