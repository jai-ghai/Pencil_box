import { COLLECTION_COPY } from "./collection-copy";
import { DEPARTMENT_PARENTS, DEPARTMENTS, HOME_LINKS, PARENT_LABEL, type DepartmentFaq } from "./departments";
import { COLLECTIONS } from "./shop";

/** One shop shelf. The public site is seeded from the current hardcoded lists. */
export interface ShopCategoryRow {
  slug: string;
  /** Home card and department heading. */
  label: string;
  /** Heading on the all-categories page. Empty means use the label. */
  groupLabel: string;
  /** Order of groups on the all-categories page. -1 when this group has no children. */
  groupOrder: number;
  /** Collection heading and footer. Empty means use the label. */
  nav: string;
  parent: string;
  home: boolean;
  subtitle: string;
  about: string;
  faqs: DepartmentFaq[];
  sortOrder: number;
  /** Order of the six product collections in the footer. -1 when this is not one of them. */
  listOrder: number;
  hidden: boolean;
  /** Cloudinary photo. Empty keeps the built-in drawing. */
  image: string;
  /** Catalogue category `name_en` whose products belong on this shelf. */
  match: string;
  title: string;
  h1: string;
  description: string;
  lede: string;
  listing: boolean;
}

/**
 * The shelves the shop shows today.
 * A child that reuses its parent's slug (the Toys card under Toys) is skipped:
 * one address can only be one shelf.
 */
export function builtinShopCategories(): ShopCategoryRow[] {
  const rows: ShopCategoryRow[] = [];
  const seen = new Set<string>();
  HOME_LINKS.forEach((link, index) => {
    const collection = COLLECTIONS.find((c) => c.slug === link.slug);
    const dept = DEPARTMENTS.find((d) => d.slug === link.slug);
    const copy = COLLECTION_COPY[link.slug];
    seen.add(link.slug);
    rows.push({
      slug: link.slug,
      label: link.label,
      groupLabel: PARENT_LABEL[link.slug] ?? link.label,
      groupOrder: (DEPARTMENT_PARENTS as readonly string[]).indexOf(link.slug),
      nav: collection?.nav ?? link.label,
      parent: "",
      home: true,
      subtitle: "",
      about: copy?.about || dept?.about || "",
      faqs: copy?.faqs ?? dept?.faqs ?? [],
      sortOrder: index,
      listOrder: collection ? COLLECTIONS.findIndex((c) => c.slug === link.slug) : -1,
      hidden: false,
      image: "",
      match: collection?.match ?? "",
      title: collection?.title ?? "",
      h1: collection?.h1 ?? "",
      description: collection?.description ?? "",
      lede: collection?.lede ?? "",
      listing: Boolean(collection),
    });
  });
  let order = rows.length;
  for (const dept of DEPARTMENTS) {
    if (seen.has(dept.slug)) continue;
    seen.add(dept.slug);
    rows.push({
      slug: dept.slug,
      label: dept.label,
      groupLabel: "",
      groupOrder: -1,
      nav: dept.label,
      parent: dept.parent,
      home: false,
      subtitle: "",
      about: dept.about,
      faqs: dept.faqs,
      sortOrder: order,
      listOrder: -1,
      hidden: false,
      image: "",
      match: "",
      title: "",
      h1: "",
      description: "",
      lede: "",
      listing: false,
    });
    order += 1;
  }
  return rows;
}

export function homeShopCategories(rows: ShopCategoryRow[]): ShopCategoryRow[] {
  return rows.filter((row) => row.home && !row.hidden).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}

export function childShopCategories(rows: ShopCategoryRow[], parent: string): ShopCategoryRow[] {
  return rows.filter((row) => row.parent === parent && !row.hidden).sort((a, b) => a.sortOrder - b.sortOrder || a.label.localeCompare(b.label));
}
