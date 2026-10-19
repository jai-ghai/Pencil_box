/**
 * Creates a ready-made list of offers, all switched OFF, so the owner can switch on / edit the ones wanted on the Offers page.
 * Every offer is checked against the shop's own costs: an item whose profit would fall below MIN_MARGIN under the offer is left out of it.
 * Offers count units of the SAME item (the billing engine prices each bill line on its own).
 *
 *   npm run add:offers -- --dry     show the list and margins, write nothing
 *   npm run add:offers              create the ones that do not exist yet (matched by English label)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const m = await import("../src/lib/models/index");

const MIN_MARGIN = 0.15; // keep at least 15% of the selling price as profit after the offer
const dry = process.argv.includes("--dry");
await mongoose.connect(process.env.MONGODB_URI!);

interface V { id: string; name: string; cat: string; catId: string; price: number; cost: number }
const prods = new Map((await m.Product.find({ active: true }).populate("categoryId", "name_en").lean()).map((p) => [String(p._id), p]));
const all: V[] = (await m.Variant.find({ active: true }).lean()).flatMap((v) => {
  const p = prods.get(String(v.productId));
  const c = p?.categoryId as unknown as { _id: unknown; name_en: string } | undefined;
  return p && c ? [{ id: String(v._id), name: p.name_en, cat: c.name_en, catId: String(c._id), price: v.sellPrice, cost: v.costPrice }] : [];
});
const byName = (...names: string[]) => all.filter((v) => names.includes(v.name));
const inCat = (cat: string, f: (v: V) => boolean) => all.filter((v) => v.cat === cat && f(v));

type Rule =
  | { type: "BUY_X_GET_Y"; buyQty: number; freeQty: number }
  | { type: "BUNDLE"; bundleQty: number; bundlePrice: number } // paise
  | { type: "SLAB"; slabMinQty: number; slabPrice: number } // paise
  | { type: "PERCENT"; percent: number };
interface Spec { en: string; hi: string; rule: Rule; items: V[]; categoryScope?: string[]; note?: string }

const unitRevenue = (r: Rule, price: number) =>
  r.type === "BUY_X_GET_Y" ? (price * r.buyQty) / (r.buyQty + r.freeQty) : r.type === "BUNDLE" ? r.bundlePrice / r.bundleQty : r.type === "SLAB" ? r.slabPrice : price * (1 - r.percent / 100);

const partyCat = (await m.Category.findOne({ name_en: "Party & Gifts" }).lean())?._id;
const SPECS: Spec[] = [
  { en: "Maps: 5 or more at ₹1.50 each", hi: "नक्शे: 5 या ज़्यादा, ₹1.50 में एक", rule: { type: "SLAB", slabMinQty: 5, slabPrice: 150 }, items: inCat("Maps", (v) => v.name === "Map") },
  { en: "Book covers: buy 10, get 1 free", hi: "बुक कवर: 10 लें, 1 फ्री पाएं", rule: { type: "BUY_X_GET_Y", buyQty: 10, freeQty: 1 }, items: all.filter((v) => /^(Colour Book Cover|Transparent Book Cover)/.test(v.name)) },
  { en: "Pencils: 10 for ₹45", hi: "पेंसिल: 10 सिर्फ ₹45 में", rule: { type: "BUNDLE", bundleQty: 10, bundlePrice: 4500 }, items: byName("621 Bold Pencil", "A1 HB Pencil") },
  { en: "Notebook ₹10: 10 for ₹90", hi: "नोटबुक ₹10: 10 सिर्फ ₹90 में", rule: { type: "BUNDLE", bundleQty: 10, bundlePrice: 9000 }, items: inCat("Notebooks", (v) => v.price === 1000) },
  { en: "Notebook ₹20: 5 or more at ₹19 each", hi: "नोटबुक ₹20: 5 या ज़्यादा, ₹19 में एक", rule: { type: "SLAB", slabMinQty: 5, slabPrice: 1900 }, items: inCat("Notebooks", (v) => v.price === 2000) },
  { en: "Notebook ₹30: 5 or more at ₹28 each", hi: "नोटबुक ₹30: 5 या ज़्यादा, ₹28 में एक", rule: { type: "SLAB", slabMinQty: 5, slabPrice: 2800 }, items: inCat("Notebooks", (v) => v.price === 3000) },
  { en: "Notebook ₹40: 5 or more at ₹38 each", hi: "नोटबुक ₹40: 5 या ज़्यादा, ₹38 में एक", rule: { type: "SLAB", slabMinQty: 5, slabPrice: 3800 }, items: inCat("Notebooks", (v) => v.price === 4000) },
  { en: "Chart paper: 5 for ₹45", hi: "चार्ट पेपर: 5 सिर्फ ₹45 में", rule: { type: "BUNDLE", bundleQty: 5, bundlePrice: 4500 }, items: inCat("Chart Paper", (v) => v.price === 1000) },
  { en: "Keychain / Smile ball: 2 for ₹35", hi: "कीचेन / स्माइल बॉल: 2 सिर्फ ₹35 में", rule: { type: "BUNDLE", bundleQty: 2, bundlePrice: 3500 }, items: byName("Keychain (Type 1)", "Keychain (Type 2)", "Smile Ball") },
  { en: "Gift packets: 5 for ₹20", hi: "गिफ्ट पैकेट: 5 सिर्फ ₹20 में", rule: { type: "BUNDLE", bundleQty: 5, bundlePrice: 2000 }, items: byName("Gift Packet (Plastic)") },
  { en: "Envelopes: 10 for ₹15", hi: "लिफाफे: 10 सिर्फ ₹15 में", rule: { type: "BUNDLE", bundleQty: 10, bundlePrice: 1500 }, items: byName("Envelope (White)") },
  { en: "Balloons: 10 for ₹15", hi: "गुब्बारे: 10 सिर्फ ₹15 में", rule: { type: "BUNDLE", bundleQty: 10, bundlePrice: 1500 }, items: byName("Balloon (single)") },
  { en: "Festival: 10% off gifts and party items", hi: "त्योहार: गिफ्ट और पार्टी आइटम पर 10% छूट", rule: { type: "PERCENT", percent: 10 }, items: all.filter((v) => v.cat === "Party & Gifts"), categoryScope: partyCat ? [String(partyCat)] : [] },
  { en: "Photocopy: 50 or more pages at ₹1.50", hi: "फोटोकॉपी: 50 या ज़्यादा पेज, ₹1.50 प्रति पेज", rule: { type: "SLAB", slabMinQty: 50, slabPrice: 150 }, items: byName("Photocopy"), note: "Cost per page is not entered in the system, so profit is not checked. Enter it on the Products page." },
  { en: "Printout (B&W): 20 or more pages at ₹4", hi: "प्रिंटआउट (B&W): 20 या ज़्यादा पेज, ₹4 प्रति पेज", rule: { type: "SLAB", slabMinQty: 20, slabPrice: 400 }, items: byName("Printout (Black & White)"), note: "Cost per page is not entered in the system, so profit is not checked." },
  { en: "Printout (Colour): 10 or more pages at ₹8", hi: "प्रिंटआउट (रंगीन): 10 या ज़्यादा पेज, ₹8 प्रति पेज", rule: { type: "SLAB", slabMinQty: 10, slabPrice: 800 }, items: byName("Printout (Colour)"), note: "Cost per page is not entered in the system, so profit is not checked." },
];

let created = 0;
for (const s of SPECS) {
  const rows = s.items.map((v) => {
    const rev = unitRevenue(s.rule, v.price);
    return { v, ok: v.cost === 0 || (rev - v.cost) / rev >= MIN_MARGIN, margin: v.cost === 0 ? null : (rev - v.cost) / rev };
  });
  const keep = rows.filter((r) => r.ok && r.v.price > (s.rule.type === "SLAB" ? s.rule.slabPrice : 0));
  const dropped = rows.length - keep.length;
  const margins = keep.flatMap((r) => (r.margin === null ? [] : [r.margin]));
  const worst = margins.length ? `${Math.round(Math.min(...margins) * 100)}%` : "n/a";
  console.log(`${keep.length ? "OK  " : "SKIP"} ${s.en} | ${keep.length} items${dropped ? ` (${dropped} left out: too thin)` : ""} | lowest profit ${worst}`);
  if (!keep.length || dry) continue;
  if (await m.OfferModel.findOne({ label_en: s.en })) { console.log("     already exists"); continue; }
  const r = s.rule;
  await m.OfferModel.create({
    type: r.type, active: false, label_en: s.en, label_hi: s.hi,
    scope: { variantIds: s.categoryScope ? [] : keep.map((k) => k.v.id), categoryIds: s.categoryScope ?? [], brandIds: [] },
    ...(r.type === "BUY_X_GET_Y" ? { buyQty: r.buyQty, freeQty: r.freeQty } : {}),
    ...(r.type === "BUNDLE" ? { bundleQty: r.bundleQty, bundlePrice: r.bundlePrice } : {}),
    ...(r.type === "SLAB" ? { slabMinQty: r.slabMinQty, slabPrice: r.slabPrice } : {}),
    ...(r.type === "PERCENT" ? { percent: r.percent } : {}),
  });
  created++;
}
console.log(dry ? "dry run: nothing written" : `created ${created} offers (all switched OFF)`);
await mongoose.disconnect();
