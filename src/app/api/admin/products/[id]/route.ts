import { route, can, HttpError } from "@/lib/api";
import { Product, Variant } from "@/lib/models";
import { productInput, saveProduct } from "@/lib/catalog";

const idOf = async (ctx: { params: Promise<Record<string, string>> }) => {
  const { id } = await ctx.params;
  if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(400, "Bad id");
  return id;
};

export const GET = route(can("products"), async (_req, _s, ctx) => {
  const id = await idOf(ctx);
  const product = await Product.findById(id).lean();
  if (!product) throw new HttpError(404, "Not found");
  return { product, variants: await Variant.find({ productId: id }).lean() };
});

export const PATCH = route(can("products"), async (req, _s, ctx) => {
  const id = await idOf(ctx);
  const input = productInput.parse(await req.json());
  const product = await saveProduct(input, id);
  return { product, variants: await Variant.find({ productId: product._id }).lean() };
});
