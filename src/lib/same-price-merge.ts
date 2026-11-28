import mongoose, { type ClientSession } from "mongoose";
import { genericItemName } from "./browse";
import { Brand, Product, Setting, Variant } from "./models";
import { recordMovement } from "./stock";

const FLAG = "catalog.samePriceMerge.v1";
const BACKUP = "catalog.samePriceBackup.v1";
const STALE_MS = 45 * 1000;
const BUDGET_MS = 4000;

type ProductRow = {
  _id: mongoose.Types.ObjectId;
  name_en: string;
  brandId?: mongoose.Types.ObjectId | null;
  categoryId: mongoose.Types.ObjectId;
  images?: string[];
  imageGeneric?: boolean;
  internalNote?: string;
  slug?: string;
  createdAt?: Date;
  active?: boolean;
};

type VariantRow = {
  _id: mongoose.Types.ObjectId;
  productId: mongoose.Types.ObjectId;
  label?: string;
  sellPrice: number;
  stockOnHand?: number;
  aliases?: string[];
  active?: boolean;
  createdAt?: Date;
};

export interface MergeGroupReport {
  categoryId: string;
  pricePaise: number;
  title: string;
  keeperId: string;
  keeperSlug: string;
  foldedIds: string[];
  foldedNames: string[];
}

function normImage(url: string): string {
  return url.replace(/\/upload\/[^/]+\//, "/upload/").split("?")[0];
}

function solePrice(variants: VariantRow[]): number | null {
  const prices = new Set(variants.map((v) => v.sellPrice));
  return prices.size === 1 ? [...prices][0] : null;
}

/**
 * Fold active products that share a category and a single sell price into one product.
 * Runs once. Affected documents are copied into a setting before anything is changed.
 * Folded products stay in the database, marked inactive, so the change can be reversed.
 */
function flagValue(doc: { value?: unknown } | null): { status?: string; at?: string; groups?: MergeGroupReport[]; skip?: string[] } {
  return (doc?.value ?? {}) as { status?: string; at?: string; groups?: MergeGroupReport[]; skip?: string[] };
}

export async function mergeSamePriceOnce(): Promise<{ done: boolean; groups: MergeGroupReport[] }> {
  if (!process.env.MONGODB_URI) return { done: false, groups: [] };
  const now = new Date().toISOString();
  const prior = await Setting.findOneAndUpdate(
    { _id: FLAG },
    { $setOnInsert: { value: { status: "running", at: now, groups: [] } } },
    { upsert: true, returnDocument: "before" },
  ).lean();
  const previous = flagValue(prior);
  if (previous.status === "done") return { done: true, groups: previous.groups ?? [] };
  if (previous.status) {
    const age = Date.now() - Date.parse(previous.at ?? "");
    const wait = previous.status === "partial" ? 1000 : STALE_MS;
    if (Number.isFinite(age) && age < wait) return { done: false, groups: previous.groups ?? [] };
    const took = await Setting.updateOne(
      { _id: FLAG, "value.status": previous.status, "value.at": previous.at },
      { $set: { "value.status": "running", "value.at": now } },
    );
    if (took.modifiedCount !== 1) return { done: false, groups: [] };
  }

  const products = (await Product.find({ active: { $ne: false } }).lean()) as unknown as ProductRow[];
  const variants = (await Variant.find({ productId: { $in: products.map((p) => p._id) }, active: { $ne: false } }).lean()) as unknown as VariantRow[];
  const brands = await Brand.find().lean();
  const brandName = new Map(brands.map((b) => [String(b._id), b.name]));
  const byProduct = new Map<string, VariantRow[]>();
  for (const v of variants) {
    const key = String(v.productId);
    const list = byProduct.get(key) ?? [];
    list.push(v);
    byProduct.set(key, list);
  }

  const freq = new Map<string, number>();
  for (const p of products) {
    for (const url of p.images ?? []) {
      if (!url) continue;
      const key = normImage(url);
      freq.set(key, (freq.get(key) ?? 0) + 1);
    }
  }

  const buckets = new Map<string, ProductRow[]>();
  for (const p of products) {
    const price = solePrice(byProduct.get(String(p._id)) ?? []);
    if (price === null) continue;
    const key = `${String(p.categoryId)}|${price}`;
    const list = buckets.get(key) ?? [];
    list.push(p);
    buckets.set(key, list);
  }
  const skip = new Set(previous.skip ?? []);
  const groups = [...buckets.entries()].filter(([, rows]) => rows.length > 1 && rows.some((p) => !skip.has(String(p._id))));
  if (!groups.length) {
    await Setting.updateOne(
      { _id: FLAG },
      { $set: { value: { status: "done", at: new Date().toISOString(), groups: previous.groups ?? [], skip: [...skip] } } },
      { upsert: true },
    );
    return { done: true, groups: previous.groups ?? [] };
  }

  const affectedIds = new Set(groups.flatMap(([, rows]) => rows.map((p) => String(p._id))));
  const backup = await Setting.findById(BACKUP).lean();
  if (!backup) {
    await Setting.create({
      _id: BACKUP,
      value: {
        at: new Date().toISOString(),
        products: products.filter((p) => affectedIds.has(String(p._id))),
        variants: variants.filter((v) => affectedIds.has(String(v.productId))),
      },
    });
  }

  const report: MergeGroupReport[] = [];
  const started = Date.now();
  let index = 0;
  for (; index < groups.length; index++) {
    if (Date.now() - started > BUDGET_MS) break;
    const [key, rows] = groups[index];
    try {
      report.push(await foldGroup(key, rows, byProduct, brandName, freq));
    } catch (error) {
      for (const row of rows) skip.add(String(row._id));
      console.error("Same-price group skipped:", error instanceof Error ? error.message : "unknown");
    }
  }

  const finished = index >= groups.length;
  const saved = [...(previous.groups ?? []), ...report];
  await Setting.updateOne(
    { _id: FLAG },
    { $set: { value: { status: finished ? "done" : "partial", at: new Date().toISOString(), groups: saved, skip: [...skip] } } },
    { upsert: true },
  );
  console.info(`Same-price merge: ${report.length} groups this pass, ${finished ? "done" : "continuing"}`);
  return { done: finished, groups: saved };
}

async function foldGroup(
  key: string,
  rows: ProductRow[],
  byProduct: Map<string, VariantRow[]>,
  brandName: Map<string, string>,
  freq: Map<string, number>,
): Promise<MergeGroupReport> {
  const price = Number(key.split("|")[1]);
  const names = new Map<string, number>();
  for (const p of rows) {
    const title = genericItemName(p.name_en, brandName.get(String(p.brandId)) ?? "");
    names.set(title, (names.get(title) ?? 0) + 1);
  }
  const title = [...names.entries()].sort((a, b) => b[1] - a[1] || a[0].length - b[0].length)[0][0];
  const keeper = [...rows].sort((a, b) => (byProduct.get(String(b._id))?.length ?? 0) - (byProduct.get(String(a._id))?.length ?? 0) || String(a._id).localeCompare(String(b._id)))[0];
  let image = "";
  let best = 0;
  for (const p of rows) {
    for (const url of p.images ?? []) {
      if (!url) continue;
      const n = freq.get(normImage(url)) ?? 1;
      if (n >= 8) continue;
      const score = 1000 / n + (p.imageGeneric ? 0 : 2);
      if (score > best) {
        best = score;
        image = url;
      }
    }
  }
  const brandList = [...new Set(rows.map((p) => brandName.get(String(p.brandId)) || "").filter(Boolean))];
  const owned = rows.flatMap((p) => byProduct.get(String(p._id)) ?? []);
  const labelBuckets = new Map<string, VariantRow[]>();
  for (const v of owned) {
    const bucket = `${(v.label || "").trim().toLowerCase()}|${v.sellPrice}`;
    const list = labelBuckets.get(bucket) ?? [];
    list.push(v);
    labelBuckets.set(bucket, list);
  }
  const stockMoves: { primary: string; extra: string; qty: number }[] = [];
  const deactivate: string[] = [];
  for (const dupes of labelBuckets.values()) {
    if (dupes.length < 2) continue;
    const [primary, ...rest] = [...dupes].sort((a, b) => (b.stockOnHand ?? 0) - (a.stockOnHand ?? 0) || String(a._id).localeCompare(String(b._id)));
    for (const extra of rest) {
      const qty = extra.stockOnHand ?? 0;
      if (qty > 0) stockMoves.push({ primary: String(primary._id), extra: String(extra._id), qty });
      deactivate.push(String(extra._id));
    }
  }

  const apply = async (session?: ClientSession) => {
    const opts = session ? { session } : {};
    await Product.updateOne(
      { _id: keeper._id },
      {
        $unset: { brandId: "" },
        $set: {
          name_en: title,
          images: image ? [image] : [],
          internalNote: `Same-price merge. Brands: ${brandList.join(", ") || "none"}. Was: ${rows.map((p) => p.name_en).join(" | ")}`,
        },
      },
      opts,
    );
    for (const other of rows) {
      if (String(other._id) === String(keeper._id)) continue;
      await Variant.updateMany({ productId: other._id }, { $set: { productId: keeper._id } }, opts);
      await Product.updateOne(
        { _id: other._id },
        { $set: { active: false, internalNote: `Merged into ${String(keeper._id)} (${keeper.slug ?? ""}) on ${new Date().toISOString().slice(0, 10)}. Left in the database.` } },
        opts,
      );
    }
    for (const move of stockMoves) {
      await recordMovement({ variantId: move.primary, type: "ADJUSTMENT", qty: move.qty, note: "Same-price merge: stock combined" }, session!);
      await recordMovement({ variantId: move.extra, type: "ADJUSTMENT", qty: -move.qty, note: "Same-price merge: stock moved" }, session!);
    }
    if (deactivate.length) {
      await Variant.updateMany({ _id: { $in: deactivate } }, { $set: { active: false }, $addToSet: { aliases: `merged-into:${String(keeper._id)}` } }, opts);
    }
  };

  if (stockMoves.length) {
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(() => apply(session));
    } finally {
      await session.endSession();
    }
  } else {
    await apply();
  }

  return {
    categoryId: String(keeper.categoryId),
    pricePaise: price,
    title,
    keeperId: String(keeper._id),
    keeperSlug: keeper.slug ?? "",
    foldedIds: rows.filter((p) => String(p._id) !== String(keeper._id)).map((p) => String(p._id)),
    foldedNames: rows.map((p) => p.name_en),
  };
}
