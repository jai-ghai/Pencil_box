/**
 * Gives products a picture taken from the distributor's own online catalogue (used with the owner's permission).
 * Each of our items is matched, by the hand-written rules below, to the nearest item in data/competitor-products.json
 * (names and picture links read from the distributor's website). Pictures are resized, uploaded to your Cloudinary
 * account, and attached to the matching products, marked "generic" so the website says "picture is for illustration"
 * (the picture shows the distributor's pack, not necessarily the exact brand you stock).
 * Products that already have a picture are never touched. Items with no rule keep the empty picture block.
 *
 *   npm run images:distributor                 DRY RUN: downloads, writes contact sheets to print/image-check/, changes nothing
 *   npm run images:distributor -- --apply      uploads and attaches the pictures
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import dns from "node:dns";
import net from "node:net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp, { type OverlayOptions } from "sharp";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
dotenv.config({ path: ".env" });
const { Product } = await import("../src/lib/models/index");
const { saveProductImage } = await import("../src/lib/storage");

const apply = process.argv.includes("--apply");
const UA = "PencilBoxCatalogueBot/1.0 (own-shop catalogue; pictures used with the distributor's permission)";

interface Row { cat: string; name: string; href: string; img: string; source: string }
const load = (file: string, source: string, origin: string, bigger?: (u: string) => string): Row[] => {
  if (!fs.existsSync(file)) return [];
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return (Array.isArray(raw) ? raw : raw.result)
    .filter((r: Row) => r.img)
    .map((r: Row) => ({ ...r, source, href: r.href.startsWith("http") ? r.href : origin + r.href, img: bigger ? bigger(r.img) : r.img, name: r.name.replace(/\s+/g, " ").trim() }));
};
const theirs: Row[] = [
  ...load("data/competitor-products.json", "amitguptaandsons.com catalogue, used with the owner's permission", "https://www.amitguptaandsons.com"),
  // Krishna Toys is the shop's own wholesaler; its catalogue serves a 1000 px version of each picture
  ...load("data/wholesaler-products.json", "ktoys.catalog.to (Krishna Toys, the shop's wholesaler) catalogue", "https://ktoys.catalog.to", (u) => u.replace(/\/products_\d+\//, "/products_1000/")),
];

/** [our product name, their product name]. First rule that matches a product wins; the first of their items that matches is used. */
const RULES: [RegExp, RegExp][] = [
  // pens
  [/^Ball Pen \(Economy\)/, /^cira ball pen 100p$/i],
  [/^Ball Pen \(Standard\)/, /^reynolds aeroslim 200p$/i],
  [/^Ball Pen \(Premium\)/, /^reynolds 045 50p/i],
  [/^Gel Pen \(Standard\)/, /^flair gel pen 7 200p$/i],
  [/^Gel Pen \(Premium\)/, /^flair gel pen 10 100p$/i],
  [/^Pen ₹20/, /^flair v2 gel 20p$/i],
  [/^Pilot Pen$/, /^blue pilot pen/i],
  [/^Fountain Pen$/, /^fountain pen 100 10p$/i],
  [/^Brush Pen$/, /^flair brush pen/i],
  [/^Pastel Brush Pens$/, /^doms brush pen 26 shades 5p$/i],
  // pencils, erasers
  [/^621 Bold Pencil/, /^nataraj 621 pencil/i],
  [/^A1 HB Pencil/, /^doms A1 pencil/i],
  [/^X1 Pencil/, /^X1 pencil doms/i],
  [/^Groove Pencil/, /^doms groove/i],
  [/^Zoom Pencil/, /^doms zoom triangle/i],
  [/^Neon Pencil/, /^doms neon pencil/i],
  [/^Mechanical Pencil/, /^move mechenic pencil/i],
  [/^Pencil Lead/, /^0 7 tube led/i],
  [/^Dust Free Eraser/, /^dons dust free eraser/i],
  [/^Eraser \(Tyre\)/, /^doms tyre eraser/i],
  // colours
  [/^Colour Pencils/, /^doms pencil color 60/i],
  [/^Wax Colours/, /^doms wax cryons 12shade/i],
  [/^Long Wax Crayons/, /^comet bold wax cryons/i],
  [/^Sketch Pens/, /^comet 10shade sketch/i],
  [/^Painting Colour \(6 colours/, /^poster color 6 shade/i],
  [/^Painting Colour \(12 colours/, /^poster color 12shade/i],
  [/^Rangoli Colours/, /^rangoli plain bottel/i],
  // notebooks, registers, books
  [/^Ankit Notebook ₹10/, /^10 copy 3 in1 72p/i],
  [/^(Alfa \+|Akash|Chinu|Delta) Notebook ₹20/, /^20 copy 3 in1 36p medium/i],
  [/^(Alfa \+|Akash|Chinu|Delta) Notebook ₹30/, /^30 copy 3in1 36p 40mrp/i],
  [/^(Alfa \+|Akash|Chinu|Delta) Notebook ₹40/, /^40 3in1 copy 50mrp/i],
  [/^(Alfa \+|Akash|Chinu|Delta) Notebook ₹50/, /^50 copy 3in1/i],
  [/Register ₹/, /^A4 register 60mrp/i],
  [/^Drawing Notebook/, /^30mrp drawing book 48p/i],
  [/^Colouring Book$/, /^coloring book big/i],
  [/^Spiral Diary/, /^spiral dairy/i],
  [/^Writing Book \(3 in 1\)/, /^20 3in1 copy bdiya/i],
  [/^(Rhymes Book|Bal Pothi)/, /^all in 1 medium 50p/i],
  // paper
  [/^Chart Paper \(Light/, /^white chart 12mrp/i],
  [/^Chart Paper \(Dark/, /^red chart 12mrp/i],
  [/^A4 Sheet Packet/, /^A4 plain sheet 25p/i],
  [/^A4 Colour Sheet/, /^plain A4 color sheet 25p/i],
  [/^A3 Sheets/, /^A3 sheet white/i],
  [/^Glitter Sheet/, /^glitter sheet mix color/i],
  [/^Design Paper/, /^designer sheet 20p/i],
  [/^Cardboard \(Type 1\)/, /^sanmaika cardboard A4 15p/i],
  [/^Cardboard \(Type 2\)/, /^pictures cardboard A4 20p/i],
  [/^Cardboard \(Type 3/, /^transparent board 12p/i],
  [/^Cardboard \(Type 4\)/, /^comfirt royal/i],
  [/^Cover Roll/, /^20 lamination roll 50p/i],
  // markers
  [/^CD \/ DVD/, /^CD marker 100p/i],
  [/^White Board Marker/, /^doms whiteboard marker/i],
  [/^Permanent Marker/, /^permanent marker black 20p/i],
  [/^Highlighter/, /^dual tip highlighters 24p/i],
  // geometry, scales
  [/^Geometry Box/, /^doms 90 geometry 20p/i],
  [/^Protector Scale/, /^super D protector/i],
  [/^Scale 15 cm/, /^doms scale 6 100p/i],
  [/^Scale 30 cm/, /^doms scale 12 100p/i],
  [/^Stencil/, /^15mm stendil ABC/i],
  // craft
  [/^Clay \(Local\)/, /^bucket clay medium/i],
  [/^Painting Brush Set \(6/, /^painting brush 7p 6 packs/i],
  [/^Painting Brush Set ₹15/, /^round brush small 7p/i],
  [/^Painting Brush \(12/, /^round brush 84p/i],
  [/^Painting Brush$/, /^flat brush medium 7p/i],
  [/^Ice Cream Sticks/, /^ic cream stick color 10p/i],
  [/^Pipe Cleaners/, /^craft pipe 36p/i],
  [/^Glitter Flake/, /^glitter mix powder/i],
  [/^LED Light/, /^loose led bulb/i],
  // gifts, toys, office, bags
  [/^Keychain \(Type 1\)/, /^metal key chain 60p/i],
  [/^Keychain \(Type 2\)/, /^silicon key chain character 36p/i],
  [/^Water Jelly/, /^water ball 100p/i],
  [/^Calculator \(large\)/, /^CT 912 calculator full size/i],
  [/^Pocket Calculator/, /^medium calculator 6p/i],
  [/^Calculator$/, /^amigo premiums/i],
  [/^Calculator \(Cospat/, /^ct 512 calculator/i],
  [/^Pouch \(Large\)/, /^jumbo pouch cloth/i],
  [/^Pouch \(Small\)/, /^eva pouch 12p/i],
  // draft items added by add:kits
  [/^Sticky Notes \(3x3\)/, /^sticky note 3 cut 24p/i],
  [/^Sticky Notes \(Colour/, /^color sticky note 12p/i],
  [/^Slip Pad/, /^33no slip pad/i],
  [/^Correction Tape/, /^correction tape 48p/i],
  [/^Dual Tip Highlighters/, /^dual tip highlighters 24p/i],
  [/^Folding Scale/, /^folding scale 40p/i],
  [/^Pencil Kit/, /^doms 15 pencil kit/i],
  [/^Poster Colours/, /^poster color 12shade/i],
  [/^Tube Colours/, /^doms tube color 20p/i],
  [/^Oil Pastels/, /^oil paster color 12shade/i],
  [/^Acrylic Colours/, /^doms acrylic color/i],
  [/^Colour Plate/, /^color plate medium 10p/i],
  [/^Foam Stickers/, /^fom sticker big 48p/i],
  [/^Pom Poms/, /^pom pom 60p/i],
  [/^Googly Eyes/, /^goggly eyes 60p/i],
  [/^Craft Stones/, /^craft stone 20p/i],
  [/^Glue Gun/, /^glue gun 60w/i],
  [/^Small Motor/, /^gear motor 6p/i],
  [/^LED Board/, /^led patta 24p/i],
  [/^Buzzer/, /^buzzer 12p/i],
  [/^Connector Wire/, /^connector tree/i],
  [/^Solar Cell/, /^solar cell with switch/i],
  [/^Scrap Book/, /^scrap book plain/i],
  [/^A3 Art Book/, /^A3 art book/i],
  [/^Character Diary/, /^BTS dairy big/i],
  [/^A4 Practical Sheets/, /^practicle A4 sheet 25p/i],
  [/^Fancy Eraser/, /^fruit eraser 30p/i],
  [/^Fancy Sharpener/, /^candy sharpner/i],
  [/^Novelty Pen/, /^unicorn water pen 24p/i],
  [/^Fancy Pouch/, /^jumbo pouch cloth/i],
  [/^Magic Slate/, /^magic slate 6p/i],
  [/^Magic Water Book/, /^water magic book 10p/i],
  [/^ABC Mat/, /^ABC mat 10p/i],
  [/^Magnetic Bookmark/, /^magnetic book mark/i],
  [/^Scratch Pad/, /^scrach pad 10p/i],
  // Krishna Toys (the shop's wholesaler)
  [/^Stationery Kit$/, /^Doms Kit MRP 149/i],
  [/^Kit 100$/, /^Doms Fun Fista Kit MRP 100/i],
  [/^Kit 2$/, /^Doms Kit MRP 199/i],
  [/^Clay$/, /^Foam Clay/i],
  [/^Slime \(Tube\)/, /^Crystal Slime Small/i],
  // same item, spelled differently on the wholesaler's catalogue
  [/^Cube Patta/, /^Cube Patta$/i],
  [/^Nail Art Kit Small/, /^Nail Art Small/i],
  [/^Panda Soft Toy/, /^Panda 1 No\./i],
  [/^Teddy Soft Toy/, /^Teddy 1 No\./i],
  [/^Gatling Bubble Gun/, /^Gattling Bubble Gun Dlx Chanak/i],
  [/^Dil Mukka/, /^Dil Mukka 20pcs/i],
  [/^Miss World Eco/, /^Miss World$/i],
  [/^Nails Patta/, /^Colourful Nails Patta/i],
  [/^Karaoke Speaker/, /^Karoke Speaker with Mike/i],
  [/^Snake \(12/, /^Snake 12pcs pkt/i],
  [/^Colourful Anda Ball Big/, /^Colourfull Anda Ball Big/i],
  [/^8 in 1 Magnetic Game/, /^8 in1 Magnetic Game/i],
  [/^Durbin Box/, /^Durbin Box/i],
  // your older toys: the same kind of item from the Krishna Toys catalogue (shown as "picture is for illustration")
  [/^Chess$/, /^Chess 12"/i],
  [/^Ludo ₹20/, /^Ludo Small/i],
  [/^Ludo ₹40/, /^Ludo 12"/i],
  [/^Ludo Goti/, /^Ludo Goti Super/i],
  [/^Business Game/, /^BUSINESS MEDIUM/i],
  [/^Uno Cards \(Normal\)/, /^UNO Card$/i],
  [/^Uno Cards \(No Mercy\)/, /^Uno No Mercy China/i],
  [/^Pokemon Playing Cards/, /^POKEMON CARDS 36/i],
  [/^Naruto Playing Cards/, /^Naruto Card 36/i],
  [/^Playing Cards 555/, /^Lancer Plastic Taash/i],
  [/^Playing Cards in Plastic Case/, /^Metro Plastic Taash/i],
  [/^Tennis Ball$/, /^Puma Tennis Ball Fresh/i],
  [/^Tennis Ball \(Local\)/, /^Vicky Tennis Ball/i],
  [/^Spinner$/, /^Plastic Spinner 12 Pcs/i],
  [/^Whistle$/, /^Football Sitti/i],
  [/^Animal Toys/, /^Wild Animal 12 Pcs Set Small/i],
  [/^Shuttlecock$/, /^Ymox Shuttle Cock 6 Pcs/i],
  [/^Play Currency Notes/, /^Fake Dollar Currency/i],
  [/^Cricket Bat Grip/, /^BAT GRIP PLAIN/i],
  [/^Jumbo Dumper/, /^Light Dumper Big/i],
];

/** Matches that were checked by eye on the contact sheets and rejected (cropped catalogue scans, wrong item, blank, or showing the distributor's own brand). */
const REJECTED = [
  /^(A1 HB|X1|Groove|Zoom|Neon) Pencil/, /^Ankit Notebook/, /Register ₹/, /^Wax Colours/, /^Painting Colour/, /^Pouch \(/, /^Fancy Pouch/,
  /^Drawing Notebook/, /^Keychain \(Type 1\)/, /^Geometry Box/, /^Sticky Notes \(3x3\)/, /^(Tube|Poster) Colours/, /^Colour Plate/,
  /^(Scrap Book|A3 Art Book)/, /^Pipe Cleaners/, /^Water Jelly/, /^Scale (15|30) cm/,
];

const products = await (async () => {
  await mongoose.connect(process.env.MONGODB_URI!);
  return Product.find({}, "name_en images supplierId").lean();
})();

/* Items bought from Krishna Toys are matched to its own catalogue by name (same wholesaler, same item names). */
const { Supplier } = await import("../src/lib/models/index");
const ktSupplier = await Supplier.findOne({ name: "Krishna Toys" }, "_id").lean();
const ktRows = theirs.filter((r) => r.source.startsWith("ktoys"));
const STOP = new Set(["pcs", "pkt", "pc", "no", "set", "box", "of", "and", "with", "the", "a", "new", "china", "dlx", "deluxe", "mrp"]);
const tokens = (s: string) => new Set(s.toLowerCase().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").split(" ").filter((t) => t && !STOP.has(t)));
/** the catalogue item whose name shares the most words with ours (at least 2 shared, 70% overlap), or undefined */
function nearestByName(name: string): Row | undefined {
  const a = tokens(name);
  let best: Row | undefined, bestScore = 0;
  for (const r of ktRows) {
    const b = tokens(r.name);
    const shared = [...a].filter((t) => b.has(t)).length;
    const score = shared / (a.size + b.size - shared || 1);
    if (shared >= 2 && score > bestScore) { best = r; bestScore = score; }
  }
  return bestScore >= 0.7 ? best : undefined;
}

/** for Krishna Toys items with no match: the nearest catalogue name, only to help choosing rules by hand */
const closest: string[] = [];
function closestName(name: string): string {
  const a = tokens(name);
  let best = "", bestScore = 0;
  for (const r of ktRows) {
    const b = tokens(r.name);
    const shared = [...a].filter((t) => b.has(t)).length;
    const score = shared / (a.size + b.size - shared || 1);
    if (score > bestScore) { best = r.name; bestScore = score; }
  }
  return bestScore >= 0.3 ? `${best} (${bestScore.toFixed(2)})` : "-";
}

const plan: { id: string; ours: string; theirs: Row }[] = [];
const unmatchedRule: string[] = [];
const noTheirs: string[] = [];
let hasOwn = 0;
for (const p of products) {
  if (p.images?.length) { hasOwn++; continue; }
  const rule = REJECTED.some((r) => r.test(p.name_en)) ? undefined : RULES.find(([o]) => o.test(p.name_en));
  if (!rule) {
    const rejected = REJECTED.some((r) => r.test(p.name_en));
    const near = !rejected && ktSupplier && String(p.supplierId) === String(ktSupplier._id) ? nearestByName(p.name_en) : undefined;
    if (near) plan.push({ id: String(p._id), ours: p.name_en, theirs: near });
    else {
      unmatchedRule.push(p.name_en);
      if (ktSupplier && String(p.supplierId) === String(ktSupplier._id)) closest.push(`${p.name_en}  ~  ${closestName(p.name_en)}`);
    }
    continue;
  }
  const t = theirs.find((r) => rule[1].test(r.name));
  if (!t) { noTheirs.push(`${p.name_en}  <- rule found no item`); continue; }
  plan.push({ id: String(p._id), ours: p.name_en, theirs: t });
}

/* download each distinct picture once */
const cache = path.join(os.tmpdir(), "pb-distributor-images");
fs.mkdirSync(cache, { recursive: true });
const files = new Map<string, string>();
const uniq = [...new Map(plan.map((x) => [x.theirs.img, x.theirs])).values()];
async function fetchOne(r: Row) {
  const f = path.join(cache, Buffer.from(r.img).toString("base64url").slice(-40) + ".img");
  if (!fs.existsSync(f)) {
    for (let a = 0; a < 3; a++) {
      try {
        const res = await fetch(r.img, { headers: { "User-Agent": UA } });
        if (res.ok) { fs.writeFileSync(f, Buffer.from(await res.arrayBuffer())); break; }
      } catch { /* retry */ }
      await new Promise((s) => setTimeout(s, 1000 * (a + 1)));
    }
  }
  if (fs.existsSync(f)) files.set(r.img, f);
}
for (let i = 0; i < uniq.length; i += 6) await Promise.all(uniq.slice(i, i + 6).map(fetchOne));

const ready = plan.filter((x) => files.has(x.theirs.img));
console.log(`products: ${products.length} | already have a picture: ${hasOwn} | matched: ${plan.length} | downloaded OK: ${ready.length} | no rule (stay empty): ${unmatchedRule.length}`);
if (noTheirs.length) console.log("rules that found nothing:\n  " + noTheirs.join("\n  "));
if (!apply && closest.length) console.log("Krishna Toys items with no match (ours ~ nearest catalogue name):\n  " + closest.join("\n  "));

if (!apply) {
  /* contact sheets: our name over their name, 5 x 6 tiles per sheet, to check every match by eye */
  const out = path.join("print", "image-check");
  fs.mkdirSync(out, { recursive: true });
  const esc = (s: string) => s.slice(0, 34).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const T = 190, COLS = 5, ROWS = 6, LH = 44;
  for (let s = 0; s * COLS * ROWS < ready.length; s++) {
    const chunk = ready.slice(s * COLS * ROWS, (s + 1) * COLS * ROWS);
    const layers: OverlayOptions[] = [];
    for (let i = 0; i < chunk.length; i++) {
      const x = (i % COLS) * T, y = Math.floor(i / COLS) * (T + LH);
      const tile = await sharp(files.get(chunk[i].theirs.img)!).rotate().resize(T - 6, T - 6, { fit: "contain", background: "#fff" }).png().toBuffer();
      layers.push({ input: tile, left: x + 3, top: y + 3 });
      layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${LH}"><text x="3" y="15" font-size="13" font-weight="700" font-family="Segoe UI, Arial" fill="#0b1d52">${esc(chunk[i].ours)}</text><text x="3" y="33" font-size="11" font-family="Segoe UI, Arial" fill="#666">← ${esc(chunk[i].theirs.name)}</text></svg>`), left: x, top: y + T });
    }
    const rows = Math.ceil(chunk.length / COLS);
    await sharp({ create: { width: T * COLS, height: rows * (T + LH), channels: 3, background: "#ffffff" } }).composite(layers).jpeg({ quality: 80 }).toFile(path.join(out, `sheet-${s + 1}.jpg`));
  }
  console.log(`dry run: contact sheets in ${out}/ . Nothing was uploaded or changed. Check them, then run with --apply.`);
  await mongoose.disconnect();
  process.exit(0);
}

/* apply: resize, upload once per picture, attach to every matching product */
const uploaded = new Map<string, string>();
let attached = 0;
for (const x of ready) {
  let url = uploaded.get(x.theirs.img);
  if (!url) {
    const jpeg = await sharp(files.get(x.theirs.img)!).rotate().resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    url = await saveProductImage(jpeg);
    uploaded.set(x.theirs.img, url);
  }
  const res = await Product.updateOne({ _id: x.id, "images.0": { $exists: false } }, { $set: { images: [url], imageGeneric: true, imageSource: `${x.theirs.source}: ${x.theirs.href}`.slice(0, 480) } });
  attached += res.modifiedCount;
}
console.log(`${uploaded.size} picture(s) uploaded, attached to ${attached} product(s), all marked "picture is for illustration".`);
await mongoose.disconnect();
