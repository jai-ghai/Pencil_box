import { z } from "zod";
import { route, can, STAFF, HttpError } from "@/lib/api";
import { Brand, Product } from "@/lib/models";

export const GET = route(STAFF, async () => {
  const counts = new Map((await Product.aggregate<{ _id: unknown; n: number }>([{ $group: { _id: "$brandId", n: { $sum: 1 } } }])).map((c) => [String(c._id), c.n]));
  const brands = await Brand.find().sort({ name: 1 }).lean();
  return { brands: brands.map((b) => ({ ...b, products: counts.get(String(b._id)) ?? 0 })) };
});

const body = z.object({ name: z.string().min(1).max(60), logoUrl: z.string().max(300).optional(), website: z.string().max(200).optional() });

export const POST = route(can("setup"), async (req) => {
  const data = body.parse(await req.json());
  if (await Brand.findOne({ name: new RegExp(`^${data.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) throw new HttpError(409, "Brand already exists");
  return { brand: await Brand.create(data) };
});
