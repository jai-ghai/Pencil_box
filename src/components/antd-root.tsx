"use client";

import { PwaBootstrap } from "@/components/pwa";
import { Providers } from "@/app/providers";

/**
 * Ant Design reads Math.random() while building the theme. With Cache Components that has to
 * sit inside a Suspense boundary (see each layout), or the prerender fails and the static
 * shell stays empty. Shop copy that must be in the first HTML stays outside this wrapper.
 */
export function AntdRoot({ accent = "navy", children }: { accent?: "navy" | "sun"; children: React.ReactNode }) {
  return (
    <Providers accent={accent}>
      {children}
      <PwaBootstrap />
    </Providers>
  );
}
