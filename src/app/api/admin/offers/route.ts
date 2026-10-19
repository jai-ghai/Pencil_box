import { route, can, HttpError } from "@/lib/api";
import { Brand, OfferModel, Product, Variant } from "@/lib/models";
import { offerBody, offerFields } from "@/lib/offers-input";
import { profitShare } from "@/lib/offer-margin";

/**
 * All offers, each with the items it names directly and a profit check: the lowest profit share across the items it covers
 * (cost vs the price the customer pays under the offer) and how many covered items would sell at a loss.
 */
export const GET = route(can("offers"), async () => {
  const offers = await OfferModel.find().sort({ createdAt: -1 }).lean();
  const [variants, products, brands] = await Promise.all([
    Variant.find({ active: true }).lean(),
    Product.find({}, "name_en brandId categoryId").lean(),
    Brand.find({}, "name").lean(),
  ]);
  const prod = new Map(products.map((p) => [String(p._id), p]));
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));
  const rows = variants.flatMap((v) => {
    const p = prod.get(String(v.productId));
    if (!p) return [];
    const brand = p.brandId ? String(p.brandId) : "";
    return [{ id: String(v._id), cat: String(p.categoryId), brand, price: v.sellPrice, cost: v.costPrice, title: [brand ? brandName.get(brand) : "", p.name_en, v.label].filter(Boolean).join(" ") }];
  });
  const label = new Map(rows.map((r) => [r.id, r.title]));

  return {
    offers: offers.map((o) => {
      const s: { variantIds?: string[]; categoryIds?: string[]; brandIds?: string[] } = o.scope ?? {};
      const covered = rows.filter((r) => s.variantIds?.includes(r.id) || s.categoryIds?.includes(r.cat) || (r.brand && s.brandIds?.includes(r.brand)));
      const shares = covered.flatMap((r) => {
        const x = profitShare(o, r.price, r.cost);
        return x === null ? [] : [x];
      });
      return {
        ...o,
        scopeItems: (s.variantIds ?? []).map((id) => ({ value: id, label: label.get(id) ?? "(removed item)" })),
        coveredCount: covered.length,
        lowestProfit: shares.length ? Math.min(...shares) : null,
        losing: shares.filter((x) => x < 0).length,
      };
    }),
  };
});

/** New offers start switched OFF; the owner turns them on when ready. */
export const POST = route(can("offers"), async (req) => {
  const b = offerBody.parse(await req.json());
  if (!b.variantIds.length && !b.categoryIds.length && !b.brandIds.length) throw new HttpError(400, "Pick at least one item, category or brand for the offer");
  return { offer: await OfferModel.create({ ...offerFields(b), active: false }) };
});
