/**
 * Buy list = customer/admin request lines for one India-time day.
 * Purchasing from the list can create never-stocked products, then records a normal Purchase.
 *
 * Called from: src/app/api/admin/buy-list/purchase/route.ts (purchaseBuyList),
 * and defaultBuyDate from admin requests APIs / page.
 */
import { z } from "zod";
import { Brand, Category, ItemRequest, Product, StockCheck, Variant } from "./models";
import { saveProduct, toPaise } from "./catalog";
import { createPurchase } from "./purchases";
import { parseQuickAdd, pickCategory } from "./quick-add";
import { AppError } from "./errors";
import { istDate } from "./reports";

const oid = z.string().regex(/^[a-f0-9]{24}$/);

export const buyListPurchaseBody = z.object({
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  supplierId: z.string().length(24).optional(),
  supplierName: z.string().trim().max(80).optional(),
  invoiceNo: z.string().trim().max(40).optional(),
  note: z.string().trim().max(500).optional(),
  lines: z
    .array(
      z.object({
        /** open buy-list / request line, if this came from the list */
        requestId: oid.optional(),
        /** existing catalogue variant — skip product create */
        variantId: oid.optional(),
        /** display / create name when there is no variant yet */
        name: z.string().trim().min(1).max(120),
        qty: z.number().int().min(1).max(1_000_000),
        /** cost per piece, rupees */
        cost: z.number().min(0).max(10_000_000),
        /** sell price per piece, rupees — written onto the product */
        price: z.number().min(0).max(10_000_000),
        /** optional photo (new items, or products still without a picture) */
        imageUrl: z
          .string()
          .trim()
          .max(500)
          .refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "Bad image URL")
          .optional(),
      }),
    )
    .min(1)
    .max(200),
});
export type BuyListPurchaseInput = z.infer<typeof buyListPurchaseBody>;

async function ensureVariant(
  line: BuyListPurchaseInput["lines"][number],
  brands: { _id: unknown; name: string }[],
  cats: { id: string; name: string; parentId: string | null }[],
): Promise<{ variantId: string; productId: string; created: boolean }> {
  if (line.variantId) {
    const v = await Variant.findById(line.variantId, "productId").lean();
    if (!v) throw new AppError(`Item not found: ${line.name}`, 404);
    const productId = String(v.productId);
    if (line.imageUrl) {
      const p = await Product.findById(productId, "images").lean();
      if (p && !(p.images ?? []).length) {
        await Product.updateOne({ _id: productId }, { $set: { images: [line.imageUrl], imageGeneric: false } });
      }
    }
    return { variantId: line.variantId, productId, created: false };
  }

  const draft = parseQuickAdd(
    `${line.name} ${line.price}`,
    brands.map((b) => b.name),
  );
  if (!draft) throw new AppError(`Could not read product name from "${line.name}"`);
  const brand = draft.brand ? brands.find((x) => x.name.toLowerCase() === draft.brand!.toLowerCase()) : null;
  const categoryId = pickCategory(draft.categoryHint, cats);
  if (!categoryId) throw new AppError("No categories yet. Add one under Brands & categories first.");

  const product = await saveProduct({
    name_en: draft.name,
    brandId: brand ? String(brand._id) : "",
    categoryId,
    images: line.imageUrl ? [line.imageUrl] : [],
    attributes: {},
    tags: [],
    active: true,
    variants: [
      {
        label: "",
        sellPrice: line.price,
        costPrice: line.cost,
        baseUnit: "piece",
        packSize: 1,
        reorderLevel: 0,
        quickTap: false,
        trackStock: true,
        active: true,
        aliases: [],
      },
    ],
  });
  const v = await Variant.findOne({ productId: product._id }).lean();
  if (!v) throw new AppError("Product was created but has no variant");
  return { variantId: String(v._id), productId: String(product._id), created: true };
}

/**
 * Buy from the day's list (and optional extras): create missing products, record one Purchase,
 * mark linked request lines in_stock, and clear shop-check "missing" for those variants.
 */
export async function purchaseBuyList(input: BuyListPurchaseInput, by: string) {
  const brands = await Brand.find({}, "name").lean();
  const catsRaw = await Category.find({}, "name_en parentId").lean();
  const cats = catsRaw.map((c) => ({ id: String(c._id), name: c.name_en, parentId: c.parentId ? String(c.parentId) : null }));

  const resolved: { variantId: string; qty: number; cost: number; price: number; requestId?: string }[] = [];
  const seen = new Set<string>();
  for (const line of input.lines) {
    const { variantId } = await ensureVariant(line, brands, cats);
    if (seen.has(variantId)) throw new AppError(`"${line.name}" is listed twice. Combine the quantities into one line.`);
    seen.add(variantId);
    resolved.push({ variantId, qty: line.qty, cost: line.cost, price: line.price, requestId: line.requestId });
  }

  const purchaseDate = new Date(`${input.buyDate}T12:00:00+05:30`);
  const purchase = await createPurchase(
    {
      supplierId: input.supplierId,
      supplierName: input.supplierName,
      invoiceNo: input.invoiceNo,
      note: input.note || `Buy list ${input.buyDate}`,
      date: purchaseDate,
      lines: resolved.map((r) => ({ variantId: r.variantId, qty: r.qty, cost: r.cost, price: r.price })),
    },
    by,
  );

  const requestIds = resolved.map((r) => r.requestId).filter(Boolean) as string[];
  if (requestIds.length) {
    await ItemRequest.updateMany({ _id: { $in: requestIds } }, { $set: { status: "in_stock" } });
  }
  const variantIds = resolved.map((r) => r.variantId);
  await StockCheck.updateMany({ variantId: { $in: variantIds }, status: "missing" }, { $set: { status: "ok", needQty: 1 } });

  return {
    purchase,
    clearedRequests: requestIds.length,
    lines: resolved.length,
    totalPaise: resolved.reduce((s, r) => s + r.qty * toPaise(r.cost), 0),
  };
}

/** Default buy-list date: today in India. */
export function defaultBuyDate(now = new Date()) {
  return istDate(now);
}
