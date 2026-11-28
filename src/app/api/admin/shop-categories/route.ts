import { z } from "zod";
import { route, can, HttpError, ADMINS } from "@/lib/api";
import { slugify } from "@/lib/catalog";
import { audit } from "@/lib/audit";
import { Category, ShopCategory } from "@/lib/models";
import { adminShopCategories, refreshShopCategories, seedShopCategories } from "@/lib/shop-category-store";

export const GET = route(ADMINS, async (_req, actor) => {
  if (!actor.permissions.includes("setup") && !actor.permissions.includes("products")) throw new HttpError(403, "You do not have access to this");
  return { categories: await adminShopCategories() };
});

const createBody = z.object({
  label: z.string().trim().min(1).max(80),
  parent: z.string().trim().max(80).default(""),
  subtitle: z.string().trim().max(120).default(""),
  about: z.string().trim().max(4000).default(""),
  home: z.boolean().default(false),
});

export const POST = route(can("setup"), async (req, actor) => {
  const data = createBody.parse(await req.json());
  await seedShopCategories();
  if (data.parent && !(await ShopCategory.exists({ slug: data.parent }))) throw new HttpError(400, "Choose a group that exists");
  const slug = await freeSlug(slugify(data.label));
  const parent = data.parent ? await ShopCategory.findOne({ slug: data.parent }).lean() : null;
  const catalogue = (await Category.findOne({ slug })) ?? (await Category.create({
    name_en: data.label,
    slug,
    parentId: parent?.catalogCategoryId ?? null,
  }));
  const sortOrder = (await ShopCategory.countDocuments({ parent: data.parent })) + 1;
  await ShopCategory.create({
    slug,
    label: data.label,
    groupLabel: data.label,
    groupOrder: -1,
    nav: data.label,
    parent: data.parent,
    home: data.home,
    subtitle: data.subtitle,
    about: data.about,
    faqs: [],
    sortOrder,
    listOrder: -1,
    hidden: false,
    image: "",
    match: "",
    title: "",
    h1: "",
    description: "",
    lede: "",
    listing: false,
    catalogCategoryId: catalogue._id,
  });
  await audit(actor.username, "category.add", "category", `Added shop category "${data.label}"`, { entityId: slug });
  refreshShopCategories();
  return { categories: await adminShopCategories() };
});

async function freeSlug(base: string): Promise<string> {
  let slug = base || "category";
  let n = 2;
  while (await ShopCategory.exists({ slug })) {
    slug = `${base}-${n}`;
    n += 1;
  }
  return slug;
}
