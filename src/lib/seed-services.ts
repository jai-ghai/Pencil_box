import { Category, Product } from "./models";
import { saveProduct, slugify } from "./catalog";
import { escapeRegex } from "./search";

/** Services sold per page. They hold no stock, so they never run out and never show a low-stock warning. */
export const SERVICES = [
  { name_en: "Photocopy", name_hi: "फोटोकॉपी", price: 2, tags: ["xerox", "photocopy", "copy"] },
  { name_en: "Printout (Black & White)", name_hi: "प्रिंटआउट (ब्लैक एंड व्हाइट)", price: 5, tags: ["print", "printing", "bw", "b&w"] },
  { name_en: "Printout (Colour)", name_hi: "प्रिंटआउट (रंगीन)", price: 10, tags: ["print", "printing", "colour", "color"] },
] as const;

const TOP = "Printing & Photocopy";
const NOTE = "Service, price per page. Enter your cost per page (paper + toner) so profit reports are accurate.";

/** Adds the photocopy and printing items if they are not there yet. Safe to run again. */
export async function ensureServices(): Promise<{ created: number; skipped: number }> {
  const top = (await Category.findOne({ slug: slugify(TOP) })) ?? (await Category.create({ name_en: TOP, name_hi: "प्रिंटिंग और फोटोकॉपी", slug: slugify(TOP) }));
  const sub =
    (await Category.findOne({ parentId: top._id, name_en: "Services" })) ??
    (await Category.create({ name_en: "Services", name_hi: "सेवाएं", parentId: top._id, slug: slugify(`${TOP}-Services`) }));

  let created = 0;
  let skipped = 0;
  for (const s of SERVICES) {
    if (await Product.findOne({ name_en: new RegExp(`^${escapeRegex(s.name_en)}$`, "i"), categoryId: sub._id })) {
      skipped++;
      continue;
    }
    await saveProduct({
      name_en: s.name_en,
      name_hi: s.name_hi,
      categoryId: String(sub._id),
      internalNote: NOTE,
      images: [],
      attributes: {},
      tags: [...s.tags],
      active: true,
      variants: [{ label: "per page", aliases: [], sellPrice: s.price, costPrice: 0, baseUnit: "page", packSize: 1, reorderLevel: 0, quickTap: true, trackStock: false, active: true }],
    });
    created++;
  }
  return { created, skipped };
}
