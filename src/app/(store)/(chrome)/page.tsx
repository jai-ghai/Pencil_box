import { ShopHero } from "@/components/shop-seo";
import { HOME_DESCRIPTION, HOME_H1, HOME_TITLE, canonicalUrl, pageMeta } from "@/lib/shop";

export const metadata = pageMeta({ title: HOME_TITLE, description: HOME_DESCRIPTION, path: "/" });

export default function HomePage() {
  return (
    <>
      <link rel="canonical" href={canonicalUrl("/")} />
      <ShopHero title={HOME_H1} hideTitle />
    </>
  );
}
