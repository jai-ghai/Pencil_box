/**
 * Replaces ONLY wrong catch-all stand-in photos with a matching Wikimedia Commons file.
 * Leaves correct category matches (real pencils/erasers/notebooks/glue sticks/etc.) alone.
 *
 *   npx tsx scripts/fix-wrong-images.ts
 */
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

import dns from "node:dns";
import net from "node:net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp from "sharp";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
dotenv.config({ path: ".env" });
const { Product } = await import("../src/lib/models/index");
const { saveProductImage } = await import("../src/lib/storage");

const UA = "PencilBoxCatalogueBot/1.0 (small shop; fix wrong stand-ins)";

/** Wrong stand-ins only. `file` is a Commons filename. Optional `alts` if primary 404s. */
const FIXES: { match: RegExp; file: string; alts?: string[]; label: string }[] = [
  { match: /^Bamboo Sticks$/i, file: "Bamboo Skewers.jpg", label: "Bamboo Sticks" },
  { match: /^Toothpicks$/i, file: "Scan of a wooden toothpick.jpg", alts: ["2023 Wykałaczki (2).jpg"], label: "Toothpicks" },
  { match: /^Straw \(plain/i, file: "A collection of coloured plastic straws.jpg", label: "Straw plain" },
  { match: /^Straw \(designed/i, file: "Colored drinking straws (4273103337).jpg", label: "Straw designed" },
  { match: /^Pipe Cleaners/i, file: "Pipe cleaner white1.jpg", alts: ["Pipe cleaners (AM 604059-1).jpg"], label: "Pipe Cleaners" },
  { match: /^Safety Pin/i, file: "Safety pins.jpg", label: "Safety Pin" },
  { match: /^Multicolour U-Clip/i, file: "Paper-clip.jpg", alts: ["Büroklammern -- 2021 -- 6481.jpg"], label: "U-Clip" },
  { match: /^Multicolour Push Pins/i, file: "Thumbtacks on cork board.jpg", alts: ["Drawing pins.jpg", "Push pins on a bulletin board.jpg"], label: "Push Pins" },
  { match: /^Moti Pin/i, file: "Map pins.jpg", alts: ["Drawing pins.jpg", "Thumbtacks on cork board.jpg"], label: "Moti Pin" },
  { match: /^Craft Glass Mirror/i, file: "Small round mirror.jpg", alts: ["Compact mirror.jpg", "Hand mirror.jpg"], label: "Craft Mirror" },
  { match: /^Motor Fan \(craft\)/i, file: "Computer cooling fan.jpg", alts: ["PC fan.jpg", "Axial fan.jpg"], label: "Motor Fan" },
  { match: /^Ear Cotton Buds$/i, file: "Cotton buds.jpg", alts: ["Cotton swabs.jpg", "Q-tips.jpg"], label: "Cotton Buds" },
  { match: /^Bandage$/i, file: "Band-Aid.jpg", alts: ["Adhesive bandage.jpg", "Bandage.jpg"], label: "Bandage" },
  { match: /^Keychain \(Type 1\)/i, file: "Key ring.jpg", alts: ["Keychain.jpg", "Carabiner keychain.jpg"], label: "Keychain" },
  { match: /^Paper Soap/i, file: "Paper soap.jpg", alts: ["Soap sheets.jpg", "Bar of soap.jpg"], label: "Paper Soap" },
  { match: /^Tree Toys/i, file: "Miniature Christmas tree.jpg", alts: ["Toy trees.jpg", "Model trees.jpg"], label: "Tree Toys" },
  { match: /^Machis Gun Big Colourful$/i, file: "Toy gun.jpg", alts: ["Water gun.jpg", "Plastic toy gun.jpg"], label: "Machis Gun" },
  { match: /^Mini Hand Fan$/i, file: "Handheld fan.jpg", alts: ["Electric hand fan.jpg", "Portable fan.jpg"], label: "Mini Hand Fan" },
  { match: /^Barbie Phone/i, file: "Toy telephone.jpg", alts: ["Play phone.jpg", "Children's toy phone.jpg"], label: "Barbie Phone" },
  { match: /^Water Jelly Balls$/i, file: "Water beads.jpg", alts: ["Orbeez.jpg", "Hydrogel beads.jpg"], label: "Water Jelly" },
  { match: /^Crystal Slime \(24/i, file: "Slime (toy).jpg", alts: ["Slime.jpg", "Homemade slime.jpg"], label: "Crystal Slime" },
  { match: /^Gelly \(Crystal Mud\)/i, file: "Slime (toy).jpg", alts: ["Slime.jpg"], label: "Gelly" },
  { match: /^Battery 9V$/i, file: "9-Volt Battery.jpg", alts: ["9V battery.jpg", "PP3 battery.jpg"], label: "Battery 9V" },
  { match: /^Cell$/i, file: "AA VARTA battery-side PNr°0782.jpg", alts: ["AA battery.jpg", "02 - Single Energizer Battery.jpg"], label: "Cell" },
  { match: /^Magnet ₹/i, file: "Bar magnets.jpg", alts: ["Bar magnet.jpg", "Alnico bar magnet.jpg"], label: "Magnet" },
  { match: /^Mask ₹/i, file: "Surgical face mask.jpg", alts: ["Surgical mask.jpg", "Disposable face mask.jpg"], label: "Mask" },
  {
    match: /Transparent Tape|Cello Tape|Masking Tape|Glitter Tape|Electrical Insulation Tape|Double Side Tape|Extra Width Tape|Multicolour Tape|Designed Paper Tape|Tape Dispenser/i,
    file: "Sticky tape.jpg",
    alts: ["Adhesive tape.jpg", "Scotch tape.jpg", "Duct tape roll.jpg"],
    label: "Tape",
  },
  { match: /Gift Ribbon|Poly Ribbon|^Ribbon \(multicolour/i, file: "Gift ribbon.jpg", alts: ["Ribbon.jpg", "Curling ribbon.jpg"], label: "Ribbon" },
  { match: /^Gift Bag \(Plastic\)$/i, file: "Gift bag.jpg", alts: ["Plastic shopping bag.jpg", "Party gift bag.jpg"], label: "Gift Bag" },
  { match: /^Stapler/i, file: "Stapler office.jpg", alts: ["2017 Zszywacz biurowy.jpg"], label: "Stapler" },
  { match: /^Staples Pin/i, file: "Staples.jpg", alts: ["Office staples.jpg", "Staple (fastener).jpg"], label: "Staples" },
  { match: /^Paper Punch/i, file: "Hole punch.jpg", alts: ["Paper punch.jpg", "Hole puncher.jpg"], label: "Punch" },
  { match: /^Scissors/i, file: "Pair of scissors with black handle, 2015-06-07.jpg", alts: ["Small pair of blue scissors.jpg"], label: "Scissors" },
  { match: /^Cutter/i, file: "Utility knife.jpg", alts: ["Box cutter.jpg", "Cutter knife.jpg"], label: "Cutter" },
  {
    match: /^Geometry Box$|^Geometry Cubic$|^Geometry Pouch$|^Self-centering Compass/i,
    file: "Compass (drawing tool).jpg",
    alts: ["School compass.jpg", "Geometry set.jpg", "Drawing compass.jpg"],
    label: "Geometry",
  },
  { match: /^Scale 15|^Scale 30|^Iron Scale/i, file: "Plastic ruler.jpg", alts: ["Ruler image.jpg", "30 cm ruler.jpg"], label: "Scale" },
  {
    match: /^Cobra Laminated File$|^Report File$|^A4 Ring Report File|^Strip File$|^My Clear Bag|^Document Bag/i,
    file: "Ring binder.jpg",
    alts: ["Document folder.jpg", "Plastic folder.jpg", "File folder.jpg"],
    label: "File",
  },
  { match: /^Painting Colour/i, file: "Watercolor paints.jpg", alts: ["Watercolour set.jpg", "Poster paints.jpg"], label: "Painting Colour" },
  { match: /^School Chalk$|^Chalk$|^Colour Chalk|^Tailor Chalk/i, file: "Chalk sticks.jpg", alts: ["Chalk.jpg", "Colored chalk.jpg"], label: "Chalk" },
  { match: /^Duster \(chalk\)/i, file: "Blackboard eraser.jpg", alts: ["Chalkboard eraser.jpg", "Blackboard duster.jpg"], label: "Chalk Duster" },
  { match: /^Duster \(white board/i, file: "Whiteboard eraser.jpg", alts: ["Whiteboard eraser magnetic.jpg", "Dry erase eraser.jpg"], label: "WB Duster" },
  { match: /^School Kit$|^Kit ₹/i, file: "School supplies.jpg", alts: ["Stationery set.jpg", "School stationery.jpg"], label: "Kit" },
  { match: /^Plastic Rose$/i, file: "Artificial rose.jpg", alts: ["Plastic flower.jpg", "Red rose artificial.jpg"], label: "Plastic Rose" },
  { match: /^Balloon Hand Pump$/i, file: "Balloon pump.jpg", alts: ["Hand balloon pump.jpg", "Air pump balloon.jpg"], label: "Balloon Pump" },
  { match: /^Balloons \(packet\)$|^Balloon \(single\)$/i, file: "Balloon on a children's birthday party.jpg", alts: ["Party balloons.jpg", "Colorful balloons.jpg"], label: "Balloon" },
  { match: /^Rubber Ball|^Plastic Ball|^Smile Ball/i, file: "Rubber ball.jpg", alts: ["Colored rubber ball.jpg", "Playground ball.jpg"], label: "Ball" },
  { match: /^Nylon \/ Plastic Rope$/i, file: "Nylon rope.jpg", alts: ["Plastic rope.jpg", "Coil of rope.jpg"], label: "Rope" },
  { match: /^Black Thread|^White Thread$/i, file: "Spool of thread.jpg", alts: ["Sewing thread.jpg", "Thread spool.jpg"], label: "Thread" },
  { match: /^Pouch \(Small\)$|^Pouch \(Large\)$|^Clothes Pouch|^Cloth Pouch|^Fancy Pouch/i, file: "Pencil case.jpg", alts: ["Zippered pouch.jpg", "Pencil pouch.jpg"], label: "Pouch" },
  { match: /^Wax Kit$/i, file: "Crayons box.jpg", label: "Wax Kit" },
];

/** Only replace these known wrong Commons catch-alls — never wipe distributor photos. */
const BAD_SOURCE =
  /Six colored pencils|Pink Pearl eraser|Liquid paper|Glue stick \(46244472364\)|Red pencil sharpener|Notebooks-rainbow|Crayons box|Whiteboard markers/i;

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function downloadCommons(file: string): Promise<Buffer | null> {
  const url = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(file.replace(/ /g, "_"))}?width=900`;
  for (let a = 0; a < 5; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA }, redirect: "follow" });
      if (r.status === 429 || r.status === 503) {
        await sleep(2500 * (a + 1));
        continue;
      }
      if (r.status === 404) return null;
      if (!r.ok) {
        await sleep(1000 * (a + 1));
        continue;
      }
      const ct = r.headers.get("content-type") || "";
      if (!ct.includes("image")) {
        await sleep(1000 * (a + 1));
        continue;
      }
      return Buffer.from(await r.arrayBuffer());
    } catch {
      await sleep(1000 * (a + 1));
    }
  }
  return null;
}

async function getImage(files: string[]): Promise<{ buf: Buffer; file: string } | null> {
  for (const file of files) {
    const buf = await downloadCommons(file);
    if (buf) return { buf, file };
    await sleep(800);
  }
  return null;
}

await mongoose.connect(process.env.MONGODB_URI!);

let done = 0;
let skipped = 0;
const cache = new Map<string, { url: string; source: string }>();

for (const fix of FIXES) {
  const products = await Product.find({ active: true, name_en: fix.match, imageGeneric: true }, "name_en imageSource images").lean();
  const targets = products.filter((p) => BAD_SOURCE.test(p.imageSource || ""));
  if (!targets.length) {
    skipped++;
    continue;
  }

  const cacheKey = fix.file;
  let packed = cache.get(cacheKey);
  if (!packed) {
    const hit = await getImage([fix.file, ...(fix.alts ?? [])]);
    if (!hit) {
      console.log(`NO HIT  ${fix.label}`);
      await sleep(1200);
      continue;
    }
    let jpeg: Buffer;
    try {
      jpeg = await sharp(hit.buf)
        .rotate()
        .resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 82, mozjpeg: true })
        .toBuffer();
    } catch {
      console.log(`SHARP FAIL  ${fix.label} (${hit.file})`);
      continue;
    }
    const url = await saveProductImage(jpeg);
    const source = `${hit.file} (Wikimedia Commons) https://commons.wikimedia.org/wiki/File:${encodeURIComponent(hit.file.replace(/ /g, "_"))}`.slice(0, 480);
    packed = { url, source };
    cache.set(cacheKey, packed);
    console.log(`GOT  ${fix.label} ← ${hit.file}`);
  }

  const ids = targets.map((p) => p._id);
  await Product.updateMany({ _id: { $in: ids } }, { $set: { images: [packed.url], imageGeneric: true, imageSource: packed.source } });
  done += ids.length;
  console.log(`FIXED ${fix.label}: ${ids.length} → ${targets.map((t) => t.name_en).join(", ")}`);
  await sleep(1500);
}

console.log(`\nDone. Fixed ${done} product(s). Groups with nothing to fix: ${skipped}.`);
await mongoose.disconnect();
