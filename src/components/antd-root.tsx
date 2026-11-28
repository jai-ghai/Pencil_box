"use client";

import { PwaBootstrap } from "@/components/pwa";
import { Providers } from "@/app/providers";

/**
 * Ant Design reads Math.random() while building the theme. With Cache Components that has to
 * sit inside a Suspense boundary (see each layout), or the prerender fails and the static
 * shell stays empty. Shop copy that must be in the first HTML stays outside this wrapper.
 */
export function AntdRoot({
  accent = "navy",
  inlineCss = true,
  fill = true,
  children,
}: {
  accent?: "navy" | "sun";
  inlineCss?: boolean;
  /** Home keeps the category grid outside this shell, so the shell must not stretch to the screen. */
  fill?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Providers accent={accent} inlineCss={inlineCss} fill={fill}>
      {children}
      <PwaBootstrap />
    </Providers>
  );
}
