"use client";

import { createCache, extractStyle, StyleProvider } from "@ant-design/cssinjs";
import { useServerInsertedHTML } from "next/navigation";
import { useState, type ReactNode } from "react";

/**
 * Same registry Ant Design ships, with the option to skip the inline `<style>`.
 * Collection pages load `antd-store.css` instead, so that block is not sitting
 * in front of the first product photo.
 */
export function ShopAntdRegistry({
  children,
  inline = true,
  layer = false,
}: {
  children: ReactNode;
  inline?: boolean;
  layer?: boolean;
}) {
  const [cache] = useState(() => createCache());
  useServerInsertedHTML(() => {
    if (!inline) return null;
    const styleText = extractStyle(cache, { plain: true, once: true });
    if (styleText.includes('.data-ant-cssinjs-cache-path{content:"";}')) return null;
    return <style id="antd-cssinjs" data-rc-order="prepend" data-rc-priority="-1000" dangerouslySetInnerHTML={{ __html: styleText }} />;
  });
  return (
    <StyleProvider cache={cache} layer={layer}>
      {children}
    </StyleProvider>
  );
}
