import { DesktopChrome } from "@/components/desktop-chrome";
import { DesktopSidebar } from "@/components/desktop-sidebar";
import { ShopFaq, ShopFooter, ShopJsonLd } from "@/components/shop-seo";

export default function StoreLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ShopJsonLd />
      <DesktopChrome />
      <div className="xl:mx-auto xl:grid xl:max-w-[1440px] xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start xl:gap-6 xl:px-6 xl:py-6">
        <div className="hidden xl:block">
          <DesktopSidebar />
        </div>
        <div className="min-w-0">{children}</div>
      </div>
      <ShopFaq />
      <ShopFooter />
    </>
  );
}
