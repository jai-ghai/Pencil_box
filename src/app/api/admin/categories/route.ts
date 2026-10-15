import { z } from "zod";
import { route, can, STAFF, HttpError } from "@/lib/api";
import { Category, Product } from "@/lib/models";
import { slugify } from "@/lib/catalog";

export const GET = route(STAFF, async () => {
  const counts = new Map((await Product.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$categoryId", n: { $sum: 1 } } }])).map((c) => [String(c._id), c.n]));
  const categories = await Category.find().sort({ sortOrder: 1, name_en: 1 }).lean();
  return { categories: categories.map((c) => ({ ...c, products: counts.get(String(c._id)) ?? 0 })) };
});

const body = z.object({
  name_en: z.string().min(1).max(60),
  name_hi: z.string().max(60).optional(),
  parentId: z.string().length(24).nullable().optional(),
  attributeTemplate: z.array(z.string().max(30)).max(10).default([]),
});

export const POST = route(can("setup"), async (req) => {
  const data = body.parse(await req.json());
  const slug = slugify(data.name_en);
  if (await Category.findOne({ slug })) throw new HttpError(409, "Category already exists");
  return { category: await Category.create({ ...data, parentId: data.parentId ?? null, slug }) };
});
