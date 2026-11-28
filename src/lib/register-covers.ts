import fs from "node:fs";
import path from "node:path";
import { codePrefix, nextShortCode, syncSearchText, uniqueSlug } from "./catalog";
import { Category, Product, Setting, Variant } from "./models";
import { adjustStock } from "./stock";
import { saveProductImage, sniffImage } from "./storage";

const FLAG = "catalog.registerCovers.v1";
const URLS = "catalog.registerCoverUrls.v1";
const BACKUP = "catalog.registerCoversBackup.v1";
/** New prices had no count on the shelf. Ten is enough to show them in stock. */
const OPENING_STOCK = 10;

/** One register card at each of these rupee prices. */
export const REGISTER_RUPEES = [20, 30, 40, 50, 60, 70, 80, 90, 100, 110] as const;

export function isRegisterTitle(name: string): boolean {
  const cleaned = name.replace(/\s*(?:₹|Rs\.?)\s*\d+(?:[.,]\d+)?\s*$/i, "").trim();
  return /\bregisters?\b/i.test(cleaned);
}

type CatRow = { _id: unknown; name_en: string; parentId?: unknown };

/** The Registers shelf under notebooks, where those cards already live. */
export function registerCategoryId(categories: CatRow[]): string | null {
  const byId = new Map(categories.map((c) => [String(c._id), c]));
  const named = categories.filter((c) => /^registers$/i.test(c.name_en.trim()));
  const underNotebooks = named.find((c) => {
    const parent = c.parentId ? byId.get(String(c.parentId)) : undefined;
    return !!parent && /notebook/i.test(parent.name_en);
  });
  const chosen = underNotebooks ?? named[0];
  return chosen ? String(chosen._id) : null;
}

function coverBuffer(file: "front.jpg" | "back.jpg"): Buffer {
  const buf = fs.readFileSync(path.join(process.cwd(), "src/lib/register-covers", file));
  if (sniffImage(buf) !== "jpg") throw new Error(`Register cover ${file} is not a JPEG`);
  return buf;
}

type CoverUrls = { front: string; back: string };

async function coverUrls(): Promise<CoverUrls> {
  const saved = await Setting.findById(URLS).lean();
  const value = saved?.value as CoverUrls | undefined;
  if (value?.front && value?.back) return value;
  const urls = { front: await saveProductImage(coverBuffer("front.jpg")), back: await saveProductImage(coverBuffer("back.jpg")) };
  await Setting.updateOne({ _id: URLS }, { $set: { value: urls } }, { upsert: true });
  return urls;
}

/**
 * One Register card for every price from ₹20 to ₹110.
 * Both shop photos (front, then back) go on every register in that shelf.
 * Affected documents are copied into a setting before they are changed.
 */
export async function ensureRegisterCovers(): Promise<{ done: boolean }> {
  if (!process.env.MONGODB_URI || process.env.NEXT_PHASE === "phase-production-build") return { done: false };
  const now = new Date().toISOString();
  const prior = await Setting.findOneAndUpdate(
    { _id: FLAG },
    { $setOnInsert: { value: { status: "running", at: now } } },
    { upsert: true, returnDocument: "before" },
  ).lean();
  const previous = (prior?.value ?? {}) as { status?: string; at?: string };
  if (previous.status === "done") return { done: true };
  if (previous.status) {
    const age = Date.now() - Date.parse(previous.at ?? "");
    if (Number.isFinite(age) && age < 60_000) return { done: false };
    const took = await Setting.updateOne(
      { _id: FLAG, "value.status": previous.status, "value.at": previous.at },
      { $set: { "value.status": "running", "value.at": now } },
    );
    if (took.modifiedCount !== 1) return { done: false };
  }

  const urls = await coverUrls();
  const categories = (await Category.find({}, "name_en parentId").lean()) as unknown as CatRow[];
  const categoryId = registerCategoryId(categories);
  if (!categoryId) throw new Error("Registers category was not found");

  const products = await Product.find({ categoryId, active: { $ne: false } }).lean();
  const registers = products.filter((p) => isRegisterTitle(p.name_en));
  const variants = await Variant.find({ productId: { $in: registers.map((p) => p._id) }, active: { $ne: false } }).lean();
  const byProduct = new Map<string, typeof variants>();
  for (const v of variants) {
    const key = String(v.productId);
    const list = byProduct.get(key) ?? [];
    list.push(v);
    byProduct.set(key, list);
  }

  const backup = await Setting.findById(BACKUP).lean();
  if (!backup) {
    await Setting.create({
      _id: BACKUP,
      value: { at: new Date().toISOString(), products: registers, variants },
    });
  }

  const taken = new Set((await Product.find({ slug: { $nin: [null, ""] } }, "slug").lean()).map((r) => r.slug).filter((s): s is string => !!s));
  const categoryName = categories.find((c) => String(c._id) === categoryId)?.name_en ?? "Registers";
  const prefix = codePrefix(categoryName);
  const report: { rupees: number; slug: string; created: boolean }[] = [];

  for (const rupees of REGISTER_RUPEES) {
    const paise = rupees * 100;
    const matches = registers.filter((p) => {
      const prices = new Set((byProduct.get(String(p._id)) ?? []).map((v) => v.sellPrice));
      return prices.size === 1 && prices.has(paise);
    });
    if (matches.length) {
      const note = "Register covers: photo 1 front, photo 2 back. Brand removed from the title.";
      for (const row of matches) {
        await Product.updateOne(
          { _id: row._id },
          { $unset: { brandId: "" }, $set: { name_en: "Register", images: [urls.front, urls.back], imageGeneric: false, internalNote: note } },
        );
        await syncSearchText(String(row._id));
      }
      const keeper = matches.sort((a, b) => String(a._id).localeCompare(String(b._id)))[0];
      report.push({ rupees, slug: keeper.slug ?? "", created: false });
      continue;
    }

    const slug = uniqueSlug(`register-${rupees}`, taken);
    taken.add(slug);
    const product = await Product.create({
      name_en: "Register",
      name_hi: "रजिस्टर",
      categoryId,
      images: [urls.front, urls.back],
      imageGeneric: false,
      slug,
      active: true,
      internalNote: `Created for the ₹${rupees} register card. Opening stock ${OPENING_STOCK}.`,
    });
    const created = await Variant.create({
      productId: product._id,
      label: "",
      shortCode: await nextShortCode(prefix),
      sellPrice: paise,
      costPrice: 0,
      stockOnHand: 0,
      trackStock: true,
      active: true,
    });
    await adjustStock({ variantId: String(created._id), type: "OPENING", qty: OPENING_STOCK, note: "Register price added" });
    await syncSearchText(String(product._id));
    report.push({ rupees, slug, created: true });
  }

  const listed = new Set<number>(REGISTER_RUPEES.map((rupees) => rupees * 100));
  for (const row of registers) {
    const prices = new Set((byProduct.get(String(row._id)) ?? []).map((v) => v.sellPrice));
    if (prices.size === 1 && listed.has([...prices][0])) continue;
    await Product.updateOne(
      { _id: row._id },
      {
        $unset: { brandId: "" },
        $set: { name_en: "Register", images: [urls.front, urls.back], imageGeneric: false, internalNote: "Register covers: photo 1 front, photo 2 back. Brand removed from the title." },
      },
    );
    await syncSearchText(String(row._id));
  }

  await Setting.updateOne({ _id: FLAG }, { $set: { value: { status: "done", at: new Date().toISOString(), photos: urls, registers: report } } }, { upsert: true });
  console.info(`Register covers: ${report.filter((r) => r.created).length} created, ${report.length} prices`);
  return { done: true };
}
