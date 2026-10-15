/**
 * Imports data/balaji-stock.ts: categories (from the poster), brands, supplier "Balaji", products/variants,
 * and one PURCHASE (stock goes up through the ledger, linked to the purchase record).
 *
 *   npm run import:stock -- --replace    wipes the catalogue + sales first (staff logins are kept), then imports
 *   npm run import:stock                 refuses if products already exist
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const m = await import("../src/lib/models/index");
const { saveProduct, slugify } = await import("../src/lib/catalog");
const { recordMovement, withStockTransaction, verifyLedger } = await import("../src/lib/stock");
// The real stock file (supplier and costs) is git-ignored; fall back to the published sample when it is missing.
let stockModule: typeof import("../data/stock.example") | undefined;
for (const file of ["../data/balaji-stock", "../data/stock.example"]) {
  try {
    stockModule = await import(file);
    console.log(`using ${file.replace("../", "")}.ts`);
    break;
  } catch {
    /* try the next one */
  }
}
if (!stockModule) throw new Error("No stock file found in data/");
const { SUPPLIER, CATEGORIES, PRODUCTS } = stockModule;

const uri = process.env.MONGODB_URI;
if (!uri || uri.startsWith("YOUR_")) throw new Error("Set MONGODB_URI in .env first");
await mongoose.connect(uri);

const replace = process.argv.includes("--replace");
const existing = await m.Product.countDocuments();
if (existing > 0 && !replace) {
  console.log(`${existing} products already exist. Re-run with --replace to wipe the catalogue and sales first.`);
  await mongoose.disconnect();
  process.exit(1);
}
if (replace) {
  const counts = {
    products: await m.Product.countDocuments(), variants: await m.Variant.countDocuments(), movements: await m.StockMovement.countDocuments(),
    sales: await m.Sale.countDocuments(), offers: await m.OfferModel.countDocuments(), categories: await m.Category.countDocuments(), brands: await m.Brand.countDocuments(),
  };
  console.log("wiping:", JSON.stringify(counts));
  await Promise.all([
    m.Product.deleteMany({}), m.Variant.deleteMany({}), m.StockMovement.deleteMany({}), m.Sale.deleteMany({}), m.OfferModel.deleteMany({}),
    m.Category.deleteMany({}), m.Brand.deleteMany({}), m.Purchase.deleteMany({}), m.Supplier.deleteMany({}), m.Counter.deleteMany({}),
  ]);
}

/* categories: top level + children */
const catId = new Map<string, string>();
let order = 0;
for (const [top, def] of Object.entries(CATEGORIES)) {
  const t = await m.Category.create({ name_en: top, name_hi: def.hi, slug: slugify(top), sortOrder: order++ });
  catId.set(top, String(t._id));
  let child = 0;
  for (const [name, hi] of Object.entries(def.children)) {
    const c = await m.Category.create({ name_en: name, name_hi: hi, parentId: t._id, slug: slugify(`${top}-${name}`), sortOrder: child++ });
    catId.set(`${top}/${name}`, String(c._id));
  }
}

/* brands */
const brandId = new Map<string, string>();
for (const name of new Set(PRODUCTS.map((p) => p.brand).filter((b): b is string => !!b))) {
  brandId.set(name, String((await m.Brand.create({ name }))._id));
}

const supplier = await m.Supplier.create(SUPPLIER);

/* products (stock added afterwards through the purchase) */
const lines: { variantId: string; name: string; qty: number; unitCost: number }[] = [];
for (const p of PRODUCTS) {
  const product = await saveProduct({
    name_en: p.name,
    brandId: p.brand ? brandId.get(p.brand) : "",
    categoryId: catId.get(`${p.cat[0]}/${p.cat[1]}`)!,
    supplierId: String(supplier._id),
    internalNote: p.note,
    images: [],
    attributes: {},
    tags: p.tags ?? [],
    active: true,
    variants: p.variants.map((v) => ({
      label: v.label, aliases: [], sellPrice: v.price ?? p.price, maxPrice: v.maxPrice ?? (v.price === undefined ? p.maxPrice : undefined), costPrice: v.cost ?? p.cost,
      baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: !!v.quick, trackStock: true, active: true,
    })),
  });
  const saved = await m.Variant.find({ productId: product._id }).lean();
  for (const v of p.variants) {
    const doc = saved.find((s) => s.label === v.label);
    if (!doc) throw new Error(`variant not found: ${p.name} / ${v.label}`);
    lines.push({ variantId: String(doc._id), name: [p.name, v.label].filter(Boolean).join(" "), qty: v.qty, unitCost: Math.round((v.cost ?? p.cost) * 100) });
  }
}

/* one purchase from Balaji; stock goes up via the ledger */
const total = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);
const purchase = await m.Purchase.create({
  supplierId: supplier._id,
  note: "Opening stock package (50 lots) from the handwritten sheet. Bill amount written differs from qty x cost on two lots (see product notes).",
  items: lines.map((l) => ({ ...l, lineTotal: l.qty * l.unitCost })),
  total,
  date: new Date(),
});
await withStockTransaction(async (session) => {
  for (const l of lines) await recordMovement({ variantId: l.variantId, type: "PURCHASE", qty: l.qty, unitCost: l.unitCost, refId: purchase._id, note: "Balaji opening package", by: "import" }, session);
});

/* sample offer, created switched OFF so it never discounts a bill by surprise */
await m.OfferModel.create({
  type: "BUY_X_GET_Y", buyQty: 6, freeQty: 1, active: false,
  scope: { categoryIds: [catId.get("Notebooks & Registers/Notebooks")!, catId.get("Notebooks & Registers/Registers")!] },
  label_en: "Buy 6 Get 1 Free", label_hi: "6 खरीदें 1 फ्री पाएं",
});

// photocopy and printing (per page) are not part of the wholesale package, so they are added here
const { ensureServices } = await import("../src/lib/seed-services");
const services = await ensureServices();
console.log(`services: ${services.created} added`);

const pieces = lines.reduce((s, l) => s + l.qty, 0);
console.log(`imported: ${PRODUCTS.length} products, ${lines.length} variants, ${pieces} pieces, supplier "${SUPPLIER.name}"`);
console.log(`purchase total (qty x cost): Rs ${(total / 100).toFixed(2)}`);
console.log(`ledger drift: ${(await verifyLedger()).length} items`);
await mongoose.disconnect();
