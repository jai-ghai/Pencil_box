/**
 * Adds a purchase from a wholesaler without touching what is already in the shop:
 * the supplier, missing categories and brands are created, new products are added, and ONE purchase record raises the stock through the ledger.
 * A product that already exists (same name, brand and category) is not changed: its stock is topped up for the variants that match by label.
 * An item marked `hidden` is added switched off (not on the website or the billing screen) until the owner checks it.
 *
 *   npm run add:purchase -- data/purchase-2026-10-15.ts --dry     show what would happen, write nothing
 *   npm run add:purchase -- data/purchase-2026-10-15.ts           do it (refuses to run the same purchase twice)
 */
import path from "node:path";
import { pathToFileURL } from "node:url";
import dotenv from "dotenv";
import type { StockProduct } from "../data/balaji-stock";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const m = await import("../src/lib/models/index");
const { saveProduct, slugify } = await import("../src/lib/catalog");
const { recordMovement, withStockTransaction, verifyLedger } = await import("../src/lib/stock");

const file = process.argv.slice(2).find((a) => !a.startsWith("--"));
if (!file) throw new Error("Give the purchase file, e.g. data/purchase-2026-10-15.ts");
const dry = process.argv.includes("--dry");
// the purchase file is local only (git-ignored), so its shape is declared here instead of imported
type PurchaseProduct = StockProduct & { hidden?: boolean };
interface PurchaseFile { PRODUCTS: PurchaseProduct[]; NEW_CATEGORIES: { top: string; name: string; hi: string }[]; PURCHASE_NOTE: string; SUPPLIER?: { name: string; notes?: string } }
const { PRODUCTS, NEW_CATEGORIES, PURCHASE_NOTE, SUPPLIER = { name: "Balaji" } } = (await import(pathToFileURL(path.resolve(file)).href)) as PurchaseFile;

const uri = process.env.MONGODB_URI;
if (!uri || uri.startsWith("YOUR_")) throw new Error("Set MONGODB_URI in .env first");
await mongoose.connect(uri);

if (await m.Purchase.findOne({ note: PURCHASE_NOTE })) {
  console.log("This purchase was already added. Nothing done.");
  await mongoose.disconnect();
  process.exit(0);
}
const supplier = (await m.Supplier.findOne({ name: SUPPLIER.name })) ?? (dry ? ({ _id: "dry" } as never) : await m.Supplier.create({ name: SUPPLIER.name, notes: SUPPLIER.notes }));

/* categories */
const catId = new Map<string, string>();
const tops = await m.Category.find({ parentId: null }).lean();
const all = await m.Category.find({}).lean();
for (const t of tops) {
  catId.set(t.name_en, String(t._id));
  for (const c of all.filter((x) => String(x.parentId) === String(t._id))) catId.set(`${t.name_en}/${c.name_en}`, String(c._id));
}
let newCats = 0;
for (const nc of NEW_CATEGORIES) {
  const key = `${nc.top}/${nc.name}`;
  if (catId.has(key)) continue;
  const parent = catId.get(nc.top);
  if (!parent) throw new Error(`Top category missing: ${nc.top}`);
  newCats++;
  if (dry) { catId.set(key, "dry"); continue; }
  const sort = await m.Category.countDocuments({ parentId: parent });
  catId.set(key, String((await m.Category.create({ name_en: nc.name, name_hi: nc.hi, parentId: parent, slug: slugify(key), sortOrder: sort }))._id));
}

/* brands */
const brandId = new Map<string, string>();
for (const b of await m.Brand.find({}).lean()) brandId.set(b.name.toLowerCase(), String(b._id));
let newBrands = 0;
for (const name of new Set(PRODUCTS.map((p) => p.brand).filter((b): b is string => !!b))) {
  if (brandId.has(name.toLowerCase())) continue;
  newBrands++;
  brandId.set(name.toLowerCase(), dry ? "dry" : String((await m.Brand.create({ name }))._id));
}

/* products */
const lines: { variantId: string; name: string; qty: number; unitCost: number }[] = [];
let toppedUp = 0;
let added = 0;
for (const p of PRODUCTS) {
  const cid = catId.get(`${p.cat[0]}/${p.cat[1]}`);
  if (!cid) throw new Error(`Category missing: ${p.cat.join("/")}`);
  const bid = p.brand ? brandId.get(p.brand.toLowerCase()) : undefined;
  const existing = cid === "dry" || bid === "dry" ? null : await m.Product.findOne({ name_en: p.name, categoryId: cid, brandId: bid ?? null });
  if (existing) {
    const saved = await m.Variant.find({ productId: existing._id }).lean();
    for (const v of p.variants) {
      const doc = saved.find((s) => s.label.toLowerCase() === v.label.toLowerCase());
      if (!doc) { console.log(`WARNING: no variant "${v.label}" on existing ${p.name}; not added`); continue; }
      if (!dry) lines.push({ variantId: String(doc._id), name: [p.name, v.label].filter(Boolean).join(" "), qty: v.qty, unitCost: Math.round((v.cost ?? p.cost) * 100) });
    }
    console.log(`topped up existing: ${p.brand ?? ""} ${p.name}`);
    toppedUp++;
    continue;
  }
  added++;
  if (dry) continue;
  const product = await saveProduct({
    name_en: p.name,
    brandId: bid ?? "",
    categoryId: cid,
    supplierId: String(supplier._id),
    internalNote: p.note,
    images: [],
    attributes: {},
    tags: p.tags ?? [],
    active: !p.hidden,
    variants: p.variants.map((v) => ({
      label: v.label, aliases: [], sellPrice: v.price ?? p.price, costPrice: v.cost ?? p.cost,
      baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: !p.hidden,
    })),
  });
  const saved = await m.Variant.find({ productId: product._id }).lean();
  for (const v of p.variants) {
    const doc = saved.find((s) => s.label === v.label);
    if (!doc) throw new Error(`variant not found: ${p.name} / ${v.label}`);
    lines.push({ variantId: String(doc._id), name: [p.name, v.label].filter(Boolean).join(" "), qty: v.qty, unitCost: Math.round((v.cost ?? p.cost) * 100) });
  }
}

const pieces = PRODUCTS.reduce((s, p) => s + p.variants.reduce((a, v) => a + v.qty, 0), 0);
const worth = PRODUCTS.reduce((s, p) => s + p.variants.reduce((a, v) => a + v.qty * (v.cost ?? p.cost), 0), 0);
console.log(`${dry ? "DRY RUN" : "done"}: ${added} new products, ${toppedUp} topped up, ${newCats} new categories, ${newBrands} new brands, ${pieces} pieces, cost Rs ${worth.toFixed(2)}`);

if (!dry && lines.length) {
  const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
  const purchase = await m.Purchase.create({ supplierId: supplier._id, note: PURCHASE_NOTE, items: lines.map((l) => ({ ...l, lineTotal: l.qty * l.unitCost })), total, date: new Date() });
  await withStockTransaction(async (session) => {
    for (const l of lines) await recordMovement({ variantId: l.variantId, type: "PURCHASE", qty: l.qty, unitCost: l.unitCost, refId: purchase._id, note: PURCHASE_NOTE, by: "import" }, session);
  });
  console.log(`purchase recorded: Rs ${(total / 100).toFixed(2)}`);
  console.log(`ledger drift: ${(await verifyLedger()).length} items`);
}
await mongoose.disconnect();
