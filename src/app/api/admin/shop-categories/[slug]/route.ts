import { z } from "zod";
import { route, can } from "@/lib/api";
import { HttpError } from "@/lib/api";
import { slugify } from "@/lib/catalog";
import { audit } from "@/lib/audit";
import { Category, Product, ShopCategory } from "@/lib/models";
import { adminShopCategories, refreshShopCategories } from "@/lib/shop-category-store";

const patchBody = z.object({
  label: z.string().trim().min(1).max(80).optional(),
  parent: z.string().trim().max(80).optional(),
  subtitle: z.string().trim().max(120).optional(),
  about: z.string().trim().max(4000).optional(),
  home: z.boolean().optional(),
  hidden: z.boolean().optional(),
  image: z.string().trim().max(500).optional(),
  direction: z.enum(["up", "down"]).optional(),
});

const deleteBody = z.object({
  reassignTo: z.string().trim().optional(),
});

export const PATCH = route(can("setup"), async (req, actor, ctx) => {
  const slug = (await ctx.params).slug;
  const row = await ShopCategory.findOne({ slug });
  if (!row) throw new HttpError(404, "Category not found");
  const data = patchBody.parse(await req.json());
  if (data.direction) {
    await move(row.slug, row.parent || "", data.direction);
  } else {
    if (data.parent !== undefined && data.parent && data.parent !== row.parent) {
      if (data.parent === row.slug) throw new HttpError(400, "A category cannot sit inside itself");
      if (!(await ShopCategory.exists({ slug: data.parent }))) throw new HttpError(400, "Choose a group that exists");
      const kids = await ShopCategory.countDocuments({ parent: row.slug });
      if (kids > 0) throw new HttpError(400, "Move the categories inside this group first");
    }
    const label = data.label?.trim() || row.label;
    let nextSlug = row.slug;
    if (data.label && slugify(data.label) !== row.slug && !row.listing) {
      const wanted = slugify(data.label);
      if (wanted && wanted !== row.slug) {
        if (await ShopCategory.exists({ slug: wanted })) throw new HttpError(409, "Another category already uses that name");
        nextSlug = wanted;
      }
    }
    await ShopCategory.updateOne(
      { slug },
      {
        label,
        slug: nextSlug,
        parent: data.parent ?? row.parent,
        subtitle: data.subtitle ?? row.subtitle,
        about: data.about ?? row.about,
        home: data.home ?? row.home,
        hidden: data.hidden ?? row.hidden,
        image: data.image ?? row.image,
        ...(data.label && !row.nav ? { nav: label } : {}),
      },
    );
    if (row.catalogCategoryId && data.label && !row.match) {
      await Category.updateOne({ _id: row.catalogCategoryId }, { name_en: label, slug: nextSlug });
    }
  }
  await audit(actor.username, "category.edit", "category", `Updated shop category "${row.label}"`, { entityId: slug });
  refreshShopCategories();
  return { categories: await adminShopCategories() };
});

export const DELETE = route(can("products:delete"), async (req, actor, ctx) => {
  const slug = (await ctx.params).slug;
  const row = await ShopCategory.findOne({ slug });
  if (!row) throw new HttpError(404, "Category not found");
  const kids = await ShopCategory.countDocuments({ parent: slug });
  if (kids > 0) throw new HttpError(409, `"${row.label}" still has ${kids} categories inside it. Move or delete those first.`);
  const body = deleteBody.parse(await req.json().catch(() => ({})));
  const used = row.catalogCategoryId ? await Product.countDocuments({ categoryId: row.catalogCategoryId }) : 0;
  if (used > 0) {
    if (!body.reassignTo) {
      throw new HttpError(409, `${used} product${used === 1 ? "" : "s"} ${used === 1 ? "is" : "are"} in "${row.label}". Choose another category for them first.`);
    }
    const target = await ShopCategory.findOne({ slug: body.reassignTo });
    if (!target?.catalogCategoryId) throw new HttpError(400, "Choose a category that can hold products");
    if (target.slug === row.slug) throw new HttpError(400, "Choose a different category");
    await Product.updateMany({ categoryId: row.catalogCategoryId }, { categoryId: target.catalogCategoryId });
  }
  await ShopCategory.deleteOne({ slug });
  await audit(actor.username, "category.delete", "category", `Deleted shop category "${row.label}"`, { entityId: slug });
  refreshShopCategories();
  return { categories: await adminShopCategories() };
});

async function move(slug: string, parent: string, direction: "up" | "down") {
  const siblings = await ShopCategory.find(parent ? { parent } : { home: true, parent: "" }).sort({ sortOrder: 1, label: 1 }).lean();
  const index = siblings.findIndex((row) => row.slug === slug);
  const next = index + (direction === "up" ? -1 : 1);
  if (index < 0 || next < 0 || next >= siblings.length) return;
  const order = siblings.map((row) => row.slug);
  [order[index], order[next]] = [order[next], order[index]];
  await Promise.all(order.map((item, position) => ShopCategory.updateOne({ slug: item }, { sortOrder: position })));
}
