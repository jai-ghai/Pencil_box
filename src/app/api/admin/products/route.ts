import { route, can } from "@/lib/api";
import { Product, Variant } from "@/lib/models";
import { productInput, saveProduct } from "@/lib/catalog";
import { escapeRegex } from "@/lib/search";

export const GET = route(can("products"), async (req) => {
  const url = new URL(req.url);
  const q = url.searchParams.get("q")?.trim();
  const categoryId = url.searchParams.get("categoryId");
  const filter: Record<string, unknown> = {};
  if (q) filter.name_en = new RegExp(escapeRegex(q), "i");
  if (categoryId) filter.categoryId = categoryId;
  filter.active = url.searchParams.get("archived") === "1" ? false : { $ne: false };
  const products = await Product.find(filter).sort({ createdAt: -1 }).limit(200).populate("brandId", "name").populate("categoryId", "name_en").lean();
  const variants = await Variant.find({ productId: { $in: products.map((p) => p._id) } }).lean();
  return { products: products.map((p) => ({ ...p, variants: variants.filter((v) => String(v.productId) === String(p._id)) })) };
});

export const POST = route(can("products"), async (req) => {
  const input = productInput.parse(await req.json());
  const product = await saveProduct(input);
  return { product, variants: await Variant.find({ productId: product._id }).lean() };
});
