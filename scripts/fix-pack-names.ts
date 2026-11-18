/**
 * Fix product / variant names where we sell one piece but the name still says
 * "patta", "packet" or "pack" (wholesale wording). Run: npx tsx scripts/fix-pack-names.ts
 * Dry run by default; pass --apply to write.
 */
import dotenv from "dotenv";
import mongoose from "mongoose";
dotenv.config({ path: ".env" });
const { Product, Variant } = await import("../src/lib/models/index");

const apply = process.argv.includes("--apply");

/** Exact product name_en → new name_en (customer-facing, single-item wording). */
const PRODUCT_RENAMES: Record<string, string> = {
  "Gift Packet (Plastic)": "Gift Bag (Plastic)",
  "Eraser Packet": "Eraser Set",
  "Groove Pack": "Groove",
  "AAA Cell Nippo (20 Pcs Patta)": "AAA Cell (Nippo)",
  "Cube Patta (20 Pcs)": "Cube Toy",
  "Cheating Pen (12 Pcs Patta)": "Cheating Pen",
  "Kaala Jadoo China (20 Pcs Patta)": "Kaala Jadoo China",
  "Towel Goli Patta": "Towel Goli",
  "Lattu Patta (20 Pcs)": "Lattu",
  "Shoot Gun Patta 8288": "Shoot Gun 8288",
  "Magnetic 123 Patta": "Magnetic 123 Set",
  "Magnetic ABC Patta": "Magnetic ABC Set",
  "JCB Patta Dlx": "JCB Toy Dlx",
  "Nails Patta (24 Pcs)": "Nail Toy Set (24 Pcs)",
  "Patta Clay Small 25 MRP": "Clay (small) ₹25",
  "Doms Patta Clay 60 MRP": "Doms Clay ₹60",
  "Kitchen Patta Water Filter": "Kitchen Toy Water Filter",
  "A4 Sheet Packet": "A4 Sheets",
  "A4 Colour Sheet Packet": "A4 Colour Sheets",
  "Balloon (packet)": "Balloons (packet)",
  "Paper Soap (pack of 2)": "Paper Soap (set of 2)",
};

const VARIANT_LABEL_RENAMES: Record<string, string> = {
  "₹10 pack": "₹10",
  "₹20 pack": "₹20",
};

await mongoose.connect(process.env.MONGODB_URI!);

let pCount = 0;
for (const [from, to] of Object.entries(PRODUCT_RENAMES)) {
  const hit = await Product.find({ name_en: from }).lean();
  if (!hit.length) {
    console.log(`skip product (not found): ${from}`);
    continue;
  }
  console.log(`${apply ? "RENAME" : "would rename"} product: "${from}" → "${to}" (${hit.length})`);
  if (apply) {
    await Product.updateMany({ name_en: from }, { $set: { name_en: to } });
    pCount += hit.length;
  }
}

let vCount = 0;
for (const [from, to] of Object.entries(VARIANT_LABEL_RENAMES)) {
  const hit = await Variant.find({ label: from }).lean();
  if (!hit.length) {
    console.log(`skip variant label (not found): ${from}`);
    continue;
  }
  console.log(`${apply ? "RENAME" : "would rename"} variant label: "${from}" → "${to}" (${hit.length})`);
  if (apply) {
    await Variant.updateMany({ label: from }, { $set: { label: to } });
    vCount += hit.length;
  }
}

console.log(apply ? `Done. Products ${pCount}, variants ${vCount}.` : "Dry run only. Pass --apply to write.");
await mongoose.disconnect();
