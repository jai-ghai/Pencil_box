import { z } from "zod";
import { route, can } from "@/lib/api";
import { AppError } from "@/lib/errors";
import { audit } from "@/lib/audit";
import { slugify, syncSearchText } from "@/lib/catalog";
import { Category, Product } from "@/lib/models";

const body = z.object({ name_en: z.string().trim().min(1).max(60), name_hi: z.string().trim().max(60).optional() });
const okId = (id: string) => {
  if (!/^[a-f0-9]{24}$/.test(id)) throw new AppError("Bad id");
  return id;
};

/** Rename a category (English and Hindi name). Products inside it keep their place. */
export const PATCH = route(can("setup"), async (req, actor, ctx) => {
  const id = okId((await ctx.params).id);
  const { name_en, name_hi } = body.parse(await req.json());
  const before = await Category.findById(id);
  if (!before) throw new AppError("Category not found", 404);
  const parent = before.parentId ? await Category.findById(before.parentId) : null;
  const slug = slugify(parent ? `${parent.name_en}-${name_en}` : name_en);
  if (await Category.findOne({ _id: { $ne: id }, slug })) throw new AppError("A category with that name already exists here", 409);
  await Category.updateOne({ _id: id }, { name_en, name_hi: name_hi || undefined, slug });
  for (const p of await Product.find({ categoryId: id }, { _id: 1 }).lean()) await syncSearchText(String(p._id));
  await audit(actor.username, "category.edit", "category", `Renamed category "${before.name_en}" to "${name_en}"`, { entityId: id });
  return { ok: true };
});

/** Delete an empty category (no products, no sub-categories). */
export const DELETE = route(can("products:delete"), async (_req, actor, ctx) => {
  const id = okId((await ctx.params).id);
  const cat = await Category.findById(id);
  if (!cat) throw new AppError("Category not found", 404);
  const subs = await Category.countDocuments({ parentId: id });
  if (subs > 0) throw new AppError(`"${cat.name_en}" still has ${subs} sub-categor${subs === 1 ? "y" : "ies"}. Delete those first.`, 409);
  const used = await Product.countDocuments({ categoryId: id });
  if (used > 0) throw new AppError(`${used} product${used === 1 ? "" : "s"} are in "${cat.name_en}". Move them to another category first.`, 409);
  await Category.deleteOne({ _id: id });
  await audit(actor.username, "category.delete", "category", `Deleted category "${cat.name_en}"`, { entityId: id });
  return { ok: true };
});
