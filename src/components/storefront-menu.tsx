import { Storefront } from "@/app/storefront";
import { homeShopCategories } from "@/lib/shop-category-data";
import { shopCategories } from "@/lib/shop-category-store";
import type { StoreCatalog } from "@/lib/store";

/** Shop header with the category list from the database, falling back to the built-in shelves. */
export async function StorefrontWithMenu({
  children,
  initialCatalog = null,
  shell,
}: {
  children?: React.ReactNode;
  initialCatalog?: StoreCatalog | null;
  shell?: "home" | "collection";
}) {
  const menuLinks = homeShopCategories(await shopCategories()).map((row) => ({
    slug: row.slug,
    label: row.label,
    href: `/c/${row.slug}`,
  }));
  return (
    <Storefront initialCatalog={initialCatalog} shell={shell} menuLinks={menuLinks}>
      {children}
    </Storefront>
  );
}
