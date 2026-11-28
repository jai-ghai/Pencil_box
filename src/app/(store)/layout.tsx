import { ShopFaq, ShopFooter, ShopJsonLd } from "@/components/shop-seo";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopJsonLd />
      {children}
      <ShopFaq />
      <ShopFooter />
    </>
  );
}
