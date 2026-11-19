import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { ItemRequest, Product, Variant } from "@/lib/models";
import { defaultBuyDate } from "@/lib/buy-list";
import { istDate } from "@/lib/reports";

/**
 * Buy-list lines for a day (customer + admin + check).
 * `?date=YYYY-MM-DD` — that day's open lines (and undated open lines when date is today).
 * `?open=1` — all open lines (daybook).
 * Default: today's open lines.
 */
export const GET = route(can("products"), async (req) => {
  const sp = new URL(req.url).searchParams;
  const open = sp.get("open") === "1";
  const date = sp.get("date") || defaultBuyDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, "Bad date");

  const filter = open
    ? { status: { $in: ["new", "ordered"] } }
    : {
        status: { $in: ["new", "ordered"] },
        $or:
          date === defaultBuyDate()
            ? [{ buyDate: date }, { buyDate: { $exists: false } }, { buyDate: null }]
            : [{ buyDate: date }],
      };

  const requests = await ItemRequest.find(filter).sort({ createdAt: -1 }).limit(300).lean();
  const variantIds = requests.map((r) => r.variantId).filter(Boolean);
  const variants = variantIds.length
    ? await Variant.find({ _id: { $in: variantIds } }, "productId sellPrice costPrice shortCode stockOnHand").lean()
    : [];
  const products = variants.length
    ? await Product.find({ _id: { $in: variants.map((v) => v.productId) } }, "name_en images").lean()
    : [];
  const vMap = new Map(variants.map((v) => [String(v._id), v]));
  const pMap = new Map(products.map((p) => [String(p._id), p]));

  return {
    date,
    today: defaultBuyDate(),
    requests: requests.map((r) => {
      const v = r.variantId ? vMap.get(String(r.variantId)) : undefined;
      const p = v ? pMap.get(String(v.productId)) : undefined;
      return {
        ...r,
        _id: String(r._id),
        variantId: r.variantId ? String(r.variantId) : undefined,
        buyDate: r.buyDate || null,
        qty: r.qty ?? 1,
        source: r.source || "customer",
        known: v
          ? {
              code: (v.shortCode || "").toUpperCase(),
              sellPrice: v.sellPrice,
              costPrice: v.costPrice,
              stockOnHand: v.stockOnHand,
              hasImage: !!(p?.images ?? []).length,
              productName: p?.name_en,
            }
          : null,
      };
    }),
  };
});

const addBody = z.object({
  name: z.string().trim().min(2).max(120),
  note: z.string().trim().max(300).optional(),
  phone: z.string().trim().regex(/^[0-9+\-\s]{10,15}$/).optional(),
  qty: z.number().int().min(1).max(10_000).optional(),
  buyDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  variantId: z.string().regex(/^[a-f0-9]{24}$/).optional(),
  imageUrl: z
    .string()
    .trim()
    .max(500)
    .refine((u) => u.startsWith("/uploads/") || /^https:\/\//i.test(u), "Bad image URL")
    .optional(),
  source: z.enum(["admin", "check"]).optional(),
});

/** Admin (or shop-check) adds a line to a day's buy list — same shape as a customer ask. */
export const POST = route(can("products"), async (req) => {
  const b = addBody.parse(await req.json());
  const buyDate = b.buyDate || defaultBuyDate();
  if (b.variantId) {
    const v = await Variant.findById(b.variantId).lean();
    if (!v) throw new HttpError(404, "Item not found");
  }
  const doc = await ItemRequest.create({
    name: b.name,
    note: b.note,
    phone: b.phone,
    qty: b.qty ?? 1,
    buyDate,
    variantId: b.variantId,
    imageUrl: b.imageUrl,
    source: b.source ?? "admin",
    status: "new",
  });
  return { request: { ...doc.toObject(), _id: String(doc._id) }, buyDate, today: istDate(new Date()) };
});
