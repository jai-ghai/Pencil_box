/**
 * Gives products a general picture of what the item is (a stand-in, not the exact brand), using free pictures
 * chosen in data/product-images.json (CC0 / public domain, so no credit is needed). Each picture is resized, uploaded to
 * your Cloudinary account, and attached to the matching products, marked "generic" so the website says
 * "picture is for illustration". Your own photos are never overwritten.
 *
 *   npm run images              fills products that have no picture yet
 *   npm run images -- --force   also replaces earlier stand-in pictures
 */
import dns from "node:dns";
import net from "node:net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp from "sharp";
import data from "../data/product-images.json" with { type: "json" };

dns.setDefaultResultOrder("ipv4first"); // some networks have no working IPv6 route to Wikimedia
net.setDefaultAutoSelectFamily(false);
dotenv.config({ path: ".env" });
const { Product } = await import("../src/lib/models/index");
const { saveProductImage } = await import("../src/lib/storage");

const UA = "PencilBoxCatalogueBot/1.0 (small shop catalogue; https://github.com/jai-ghai/Pencil_box)";
const force = process.argv.includes("--force");

/** Which picture a product gets, from its name. First match wins. */
const RULES: [RegExp, keyof typeof data][] = [
  [/^colour pencils|color pencils/i, "colour-pencils"],
  [/glue stick/i, "glue-stick"],
  [/fevi kwik|fevi glue|myglue|^gum\b|m-seal/i, "glue-bottle"],
  [/long wax|oil pastel/i, "oil-pastel"],
  [/wax colour|wax crayon|crayon|colour chalk|\bchalk\b|wax kit/i, "wax-colours"],
  [/sketch pen/i, "sketch-pens"],
  [/whitener|correction/i, "whitener"],
  [/white board marker|whiteboard marker|duster \(white board/i, "marker-board"],
  [/permanent marker|cd \/ dvd|broad marker|marker/i, "marker-permanent"],
  [/gel pen|glitter pen|liquid gel|pilot v|infinity pen|current pen|cheating pen/i, "gel-pen"],
  [/ball pen|multicolour ball pen|pen set|fountain pen|brush pen|pen ₹/i, "ball-pen"],
  [/eraser/i, "eraser"],
  [/sharpener/i, "sharpener"],
  [/slate pencil|non-sharpening|^pencil\b|pencil ₹|^groove$/i, "pencil"],
  [/pencil$/i, "pencil"],
  [/notebook|diary|exercise book|graph notebook|drawing notebook|sketch notebook|cursive writing|scrap book|art book|dictionary|translation book/i, "notebook"],
  [/register|delta a4/i, "register"],
  // New categories below reuse proven Commons URLs already in product-images.json
  // (extra keys that 404 are avoided — stand-ins are marked generic on the site).
  // Do NOT catch-all unrelated items onto pencil/eraser/glue/notebook photos —
  // use scripts/fix-wrong-images.ts (Commons) for those categories instead.
  [/envelope|wish card|shagun|stamp ticket|stamp pad|a4 paper|paper ream|photocopy|printout|^sheet\b|sticky notes|name slip|book cover/i, "colour-paper"],
  [/chart paper|colour sheet|a4 sheet|origami|glaze paper|rajasthani paper|blank sticker|sticker/i, "colour-paper"],
  [/^map\b|map \(/i, "map"],
];

async function download(url: string): Promise<Buffer> {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch {
      /* retry */
    }
    await new Promise((res) => setTimeout(res, 1500 * (attempt + 1)));
  }
  throw new Error(`could not download ${url}`);
}

const uri = process.env.MONGODB_URI;
if (!uri || uri.startsWith("YOUR_")) throw new Error("Set MONGODB_URI in .env first");
if (!process.env.CLOUDINARY_URL || process.env.CLOUDINARY_URL.startsWith("YOUR_")) throw new Error("Set CLOUDINARY_URL in .env first (pictures are stored there)");
await mongoose.connect(uri);

const products = await Product.find({}, "name_en images imageGeneric").lean();
const wanted = new Map<keyof typeof data, string[]>();
const untouched: string[] = [];
const owned: string[] = [];
for (const p of products) {
  const hasOwn = p.images.length > 0 && !p.imageGeneric;
  if (hasOwn) {
    owned.push(p.name_en);
    continue;
  }
  if (p.images.length > 0 && p.imageGeneric && !force) continue;
  const rule = RULES.find(([re]) => re.test(p.name_en.trim()));
  if (!rule) {
    untouched.push(p.name_en);
    continue;
  }
  wanted.set(rule[1], [...(wanted.get(rule[1]) ?? []), String(p._id)]);
}

let done = 0;
const failed: string[] = [];
for (const [type, ids] of wanted) {
  const src = data[type];
  try {
    const original = await download(src.url).catch(() => download(src.thumb));
    const jpeg = await sharp(original).rotate().resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
    const url = await saveProductImage(jpeg);
    const source = `${src.title} by ${src.creator || "unknown"} (${src.license}) ${src.landing}`.slice(0, 480);
    await Product.updateMany({ _id: { $in: ids } }, { $set: { images: [url], imageGeneric: true, imageSource: source } });
    done += ids.length;
    console.log(`${type.padEnd(17)} -> ${ids.length} product(s)  (${Math.round(jpeg.length / 1024)} KB, ${src.license})`);
  } catch (e) {
    failed.push(`${type} (${ids.length}): ${(e as Error).message}`);
    console.warn(`SKIP ${type}: ${(e as Error).message}`);
  }
}
console.log(`\n${done} product(s) now have a general picture.`);
if (owned.length) console.log(`kept your own photos on ${owned.length} product(s).`);
if (failed.length) console.log(`failed types:\n  ${failed.join("\n  ")}`);
console.log(`${untouched.length} product(s) have no suitable picture and keep the empty block:\n  ${untouched.join("\n  ")}`);
await mongoose.disconnect();
