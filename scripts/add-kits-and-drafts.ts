/**
 * 1. School kits and return-gift kits, built from items already in the shop (selling one deducts each item from stock).
 * 2. Draft items the shop does not stock yet (ideas from a competitor's catalogue), with no price and no stock.
 *
 * Everything is created SWITCHED OFF, so nothing appears on the website or the billing screen until you open the
 * Products page, set the price (and stock) and switch it on. A kit's price starts as the sum of its items.
 *
 *   npm run add:kits -- --dry     show what would be created, write nothing
 *   npm run add:kits              create what does not exist yet (matched by English name)
 */
import dotenv from "dotenv";
import mongoose from "mongoose";

dotenv.config({ path: ".env" });
const m = await import("../src/lib/models/index");
const { saveProduct, slugify } = await import("../src/lib/catalog");

const dry = process.argv.includes("--dry");
await mongoose.connect(process.env.MONGODB_URI!);

/* ---------- categories ---------- */
async function ensureCategory(top: string, sub: string, hi: string) {
  const parent = await m.Category.findOne({ name_en: top, parentId: null });
  if (!parent) throw new Error(`Top category "${top}" not found`);
  const found = await m.Category.findOne({ name_en: sub, parentId: parent._id });
  if (found) return String(found._id);
  if (dry) return "DRY-" + sub;
  const created = await m.Category.create({ name_en: sub, name_hi: hi, parentId: parent._id, slug: slugify(`${top}-${sub}`) });
  console.log(`category created: ${top} > ${sub}`);
  return String(created._id);
}
const catId = async (top: string, sub: string) => {
  const parent = await m.Category.findOne({ name_en: top, parentId: null }, "_id").lean();
  const c = parent ? await m.Category.findOne({ name_en: sub, parentId: parent._id }, "_id").lean() : null;
  if (!c) throw new Error(`Category "${top} > ${sub}" not found`);
  return String(c._id);
};
const FANCY = await ensureCategory("Gifts & More", "Fancy & Trending", "फैंसी और ट्रेंडिंग");
const RETURN_GIFT = await ensureCategory("Gifts & More", "Return Gift Kits", "रिटर्न गिफ्ट किट");

/* ---------- kits ---------- */
const prodByName = new Map<string, { _id: unknown; name_en: string }[]>();
for (const p of await m.Product.find({}, "name_en").lean()) prodByName.set(p.name_en, [...(prodByName.get(p.name_en) ?? []), p]);
const variants = await m.Variant.find({ active: true }, "productId label sellPrice costPrice").lean();

/** one active variant: by exact product name, optional variant label, optional price in rupees (to tell same-named items apart) */
function pick(name: string, label?: string, price?: number) {
  for (const p of prodByName.get(name) ?? []) {
    const v = variants.find((x) => String(x.productId) === String(p._id) && (label === undefined || x.label === label) && (price === undefined || x.sellPrice === price * 100));
    if (v) return v;
  }
  return null;
}
type Part = [name: string, qty: number, label?: string, price?: number];
interface Kit { name: string; hi: string; top: string; sub: string; note: string; parts: Part[] }

const SCHOOL: [string, string] = ["School Supplies", "Stationery Kits"];
const GIFT: [string, string] = ["Gifts & More", "Return Gift Kits"];
const KITS: Kit[] = [
  { name: "School Kit - Class 1-2", hi: "स्कूल किट - कक्षा 1-2", top: SCHOOL[0], sub: SCHOOL[1], note: "3 notebooks, pencils, eraser, sharpener, scale, pens.",
    parts: [["Delta Notebook ₹20", 1, "Hindi"], ["Delta Notebook ₹20", 1, "English"], ["Delta Notebook ₹20", 1, "Maths"], ["A1 HB Pencil", 3], ["Eraser (Tyre)", 1], ["621 Sharpener", 1], ["Scale 15 cm (Small)", 1], ["Ball Pen (Standard)", 2, "Blue"]] },
  { name: "School Kit - Class 3-5", hi: "स्कूल किट - कक्षा 3-5", top: SCHOOL[0], sub: SCHOOL[1], note: "3 notebooks, pencils, pens, geometry box, glue stick and the basics.",
    parts: [["Delta Notebook ₹30", 1, "Hindi"], ["Delta Notebook ₹30", 1, "English"], ["Delta Notebook ₹30", 1, "Maths"], ["A1 HB Pencil", 3], ["Ball Pen (Standard)", 2, "Blue"], ["Gel Pen (Standard)", 1, "Blue"], ["Eraser (Tyre)", 1], ["621 Sharpener", 1], ["Scale 15 cm (Small)", 1], ["Geometry Box", 1, undefined, 80], ["Glue Stick", 1, undefined, 10]] },
  { name: "Art & Colour Kit", hi: "आर्ट और कलर किट", top: SCHOOL[0], sub: SCHOOL[1], note: "Drawing notebook, wax colours, sketch pens, colour pencils, poster colours, glue, scissors.",
    parts: [["Drawing Notebook ₹20", 1], ["Wax Colours", 1], ["Sketch Pens", 1, "10 colours"], ["Colour Pencils", 1, "10 shades"], ["Painting Colour (6 colours + brush)", 1], ["Glue Stick", 1, undefined, 10], ["Scissors (Small)", 1]] },
  { name: "Return Gift Kit ~₹30", hi: "रिटर्न गिफ्ट किट ~₹30", top: GIFT[0], sub: GIFT[1], note: "Pencil, eraser, sharpener, scale, stickers, 3 balloons.",
    parts: [["A1 HB Pencil", 1], ["Eraser (Tyre)", 1], ["621 Sharpener", 1], ["Scale 15 cm (Small)", 1], ["Stickers", 1, "Type 1"], ["Balloon (single)", 3]] },
  { name: "Return Gift Kit ~₹50", hi: "रिटर्न गिफ्ट किट ~₹50", top: GIFT[0], sub: GIFT[1], note: "Notebook, 2 pencils, eraser, sharpener, scale, colour pencils, stickers.",
    parts: [["Ankit Notebook ₹10", 1, "Hindi"], ["A1 HB Pencil", 2], ["Eraser (Tyre)", 1], ["621 Sharpener", 1], ["Scale 15 cm (Small)", 1], ["Colour Pencils", 1, "10 shades"], ["Stickers", 1, "Type 1"]] },
  { name: "Return Gift Kit ~₹100", hi: "रिटर्न गिफ्ट किट ~₹100", top: GIFT[0], sub: GIFT[1], note: "Drawing notebook, colour pencils, sketch pens, wax colours, pencils, eraser, sharpener, scale, pouch.",
    parts: [["Drawing Notebook ₹20", 1], ["Colour Pencils", 1, "12 shades"], ["Sketch Pens", 1, "12 colours"], ["Wax Colours", 1], ["A1 HB Pencil", 2], ["Eraser (Tyre)", 1], ["621 Sharpener", 1], ["Scale 15 cm (Small)", 1], ["Pouch (Small)", 1]] },
];

let created = 0;
for (const k of KITS) {
  if (await m.Product.findOne({ name_en: k.name })) { console.log(`kit exists: ${k.name}`); continue; }
  const resolved = k.parts.map(([n, qty, label, price]) => ({ n, qty, v: pick(n, label, price) }));
  const missing = resolved.filter((r) => !r.v).map((r) => r.n);
  if (missing.length) { console.log(`kit SKIPPED (items not found: ${missing.join(", ")}): ${k.name}`); continue; }
  const sell = resolved.reduce((s, r) => s + r.v!.sellPrice * r.qty, 0) / 100;
  const cost = resolved.reduce((s, r) => s + r.v!.costPrice * r.qty, 0) / 100;
  console.log(`kit: ${k.name} | ${resolved.length} items | price Rs ${sell} (cost Rs ${cost}) | profit Rs ${(sell - cost).toFixed(2)}`);
  if (dry) continue;
  await saveProduct({
    name_en: k.name, name_hi: k.hi, categoryId: await catId(k.top, k.sub), active: false, images: [], attributes: {}, tags: ["kit", "school", "return gift"],
    internalNote: `DRAFT kit (${k.note}) Price = sum of the items; change it, then switch the product on. Selling a kit deducts every item from stock.`.slice(0, 500),
    variants: [{ label: "", aliases: [], sellPrice: sell, costPrice: cost, baseUnit: "kit", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: false, active: false, bundleItems: resolved.map((r) => ({ variantId: String(r.v!._id), qty: r.qty })) }],
  });
  created++;
}

/* ---------- draft items (not stocked yet) ---------- */
type Draft = [en: string, hi: string, top: string, sub: string];
const ST = "School Supplies", AC = "Art & Craft", PN = "Pens & Pencils", NB = "Notebooks & Registers", PR = "Printing & Photocopy", GM = "Gifts & More";
const DRAFTS: Draft[] = [
  ["Sticky Notes (3x3)", "स्टिकी नोट्स (3x3)", ST, "Office & Desk"],
  ["Sticky Notes (Colour, Designer)", "स्टिकी नोट्स (रंगीन, डिज़ाइनर)", ST, "Office & Desk"],
  ["Slip Pad", "स्लिप पैड", ST, "Office & Desk"],
  ["Correction Tape", "करेक्शन टेप", ST, "Glue & Whitener"],
  ["Dual Tip Highlighters", "डुअल टिप हाईलाइटर", ST, "Markers"],
  ["Folding Scale", "फोल्डिंग स्केल", ST, "Geometry & Scales"],
  ["Pencil Kit (Set)", "पेंसिल किट (सेट)", ST, "Stationery Kits"],
  ["Poster Colours", "पोस्टर कलर", AC, "Colours"],
  ["Tube Colours", "ट्यूब कलर", AC, "Colours"],
  ["Oil Pastels", "ऑयल पेस्टल", AC, "Colours"],
  ["Acrylic Colours", "एक्रेलिक कलर", AC, "Colours"],
  ["Colour Plate (Paint Palette)", "कलर प्लेट (पैलेट)", AC, "Colours"],
  ["Foam Stickers", "फोम स्टिकर", AC, "Stickers & Cards"],
  ["Pom Poms", "पोम पोम", AC, "Craft Supplies"],
  ["Googly Eyes", "गुगली आइज़", AC, "Craft Supplies"],
  ["Craft Stones & Pearls", "क्राफ्ट स्टोन और मोती", AC, "Craft Supplies"],
  ["Glue Gun", "ग्लू गन", AC, "Craft Supplies"],
  ["Small Motor (science project)", "छोटी मोटर (साइंस प्रोजेक्ट)", AC, "Craft Supplies"],
  ["LED Board (science project)", "एलईडी बोर्ड (साइंस प्रोजेक्ट)", AC, "Craft Supplies"],
  ["Buzzer (science project)", "बज़र (साइंस प्रोजेक्ट)", AC, "Craft Supplies"],
  ["Connector Wire (science project)", "कनेक्टर वायर (साइंस प्रोजेक्ट)", AC, "Craft Supplies"],
  ["Solar Cell (science project)", "सोलर सेल (साइंस प्रोजेक्ट)", AC, "Craft Supplies"],
  ["Scrap Book", "स्क्रैप बुक", NB, "Notebooks"],
  ["A3 Art Book", "A3 आर्ट बुक", NB, "Notebooks"],
  ["Character Diary", "कैरेक्टर डायरी", NB, "Diaries"],
  ["A4 Practical Sheets (Ruled)", "A4 प्रैक्टिकल शीट (लाइन वाली)", PR, "Paper"],
  ["Fancy Eraser (Fruit, Cartoon)", "फैंसी रबर (फल, कार्टून)", GM, "Fancy & Trending"],
  ["Fancy Sharpener", "फैंसी शार्पनर", GM, "Fancy & Trending"],
  ["Novelty Pen (Unicorn, Spinner)", "नॉवेल्टी पेन (यूनिकॉर्न, स्पिनर)", GM, "Fancy & Trending"],
  ["Fancy Pouch (Character)", "फैंसी पाउच (कैरेक्टर)", GM, "Fancy & Trending"],
  ["Magic Slate", "मैजिक स्लेट", GM, "Fancy & Trending"],
  ["Magic Water Book", "मैजिक वॉटर बुक", GM, "Fancy & Trending"],
  ["ABC Mat", "ABC मैट", GM, "Fancy & Trending"],
  ["Magnetic Bookmark", "मैग्नेटिक बुकमार्क", GM, "Fancy & Trending"],
  ["Scratch Pad", "स्क्रैच पैड", GM, "Fancy & Trending"],
  ["Slime (Tube)", "स्लाइम (ट्यूब)", GM, "Fancy & Trending"],
];
let drafted = 0;
for (const [en, hi, top, sub] of DRAFTS) {
  if (await m.Product.findOne({ name_en: new RegExp(`^${en.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") })) { console.log(`draft exists: ${en}`); continue; }
  console.log(`draft: ${en}  (${top} > ${sub})`);
  if (dry) continue;
  await saveProduct({
    name_en: en, name_hi: hi, categoryId: await catId(top, sub), active: false, images: [], attributes: {}, tags: [],
    internalNote: "DRAFT: not stocked yet. Add the price and stock, then switch the product and its item on.",
    variants: [{ label: "", aliases: [], sellPrice: 0, costPrice: 0, baseUnit: "piece", packSize: 1, reorderLevel: 0, quickTap: false, trackStock: true, active: false }],
  });
  drafted++;
}
console.log(dry ? "dry run: nothing written" : `created ${created} kit(s) and ${drafted} draft item(s), all switched OFF`);
await mongoose.disconnect();
