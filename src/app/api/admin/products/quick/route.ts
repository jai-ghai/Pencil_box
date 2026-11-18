import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { Brand, Category, ItemRequest, Variant } from "@/lib/models";
import { saveProduct } from "@/lib/catalog";
import { parseQuickAdd, pickCategory } from "@/lib/quick-add";

const body = z.object({
  line: z.string().trim().min(1).max(200),
  /** optional override if the owner picks a category in the UI */
  categoryId: z.string().length(24).optional(),
  /** optional override / confirmation of the sell price in rupees */
  price: z.number().min(0).max(10_000_000).optional(),
  /** Cloudinary or /uploads URL from the shared upload endpoint */
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "Bad image URL")
    .optional(),
  /** when set, that customer request is marked in_stock (drops off the open list) */
  requestId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
});

/**
 * One-line product create: "Natraj HB pencil 5" + optional photo.
 * Resolves brand and category from the shop's existing lists, then calls the normal saveProduct path
 * so item codes, search text and opening stock rules stay consistent.
 */
export const POST = route(can("products"), async (req) => {
  const b = body.parse(await req.json());
  const brands = await Brand.find({}, "name").lean();
  const draft = parseQuickAdd(
    b.line,
    brands.map((x) => x.name),
  );
  if (!draft) throw new HttpError(400, "Could not read a product name from that line");

  const brand = draft.brand ? brands.find((x) => x.name.toLowerCase() === draft.brand.toLowerCase()) : null;
  const cats = await Category.find({}, "name_en parentId").lean();
  const categoryId =
    b.categoryId ??
    pickCategory(
      draft.categoryHint,
      cats.map((c) => ({ id: String(c._id), name: c.name_en, parentId: c.parentId ? String(c.parentId) : null })),
    );
  if (!categoryId) throw new HttpError(400, "No categories yet. Add one under Brands & categories first.");

  const price = b.price ?? draft.price;
  if (price === undefined) throw new HttpError(400, "Add a price at the end, e.g. \"Natraj HB pencil 5\"");

  const product = await saveProduct({
    name_en: draft.name,
    brandId: brand ? String(brand._id) : "",
    categoryId,
    images: b.imageUrl ? [b.imageUrl] : [],
    attributes: {},
    tags: [],
    active: true,
    variants: [{ label: "", sellPrice: price, costPrice: 0, baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: true, aliases: [] }],
  });

  let requestCleared = false;
  if (b.requestId) {
    const reqDoc = await ItemRequest.findByIdAndUpdate(b.requestId, { status: "in_stock" }).lean();
    requestCleared = !!reqDoc;
  }

  const variants = await Variant.find({ productId: product._id }).lean();
  return {
    product,
    variants,
    draft: { brand: draft.brand, name: draft.name, price, categoryHint: draft.categoryHint, categoryId },
    requestCleared,
  };
});
