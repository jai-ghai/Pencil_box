import Papa from "papaparse";
import { z } from "zod";
import { route, can, HttpError } from "@/lib/api";
import { Brand, Category, Product } from "@/lib/models";
import { saveProduct, slugify } from "@/lib/catalog";
import { escapeRegex } from "@/lib/search";

/**
 * CSV columns (header row required):
 * name_en, name_hi, brand, category, label, sell_price, cost_price, pack_size, opening_stock, short_code, aliases, image_url
 * Rows with the same name_en + brand become ONE product with several variants (e.g. HB, 2B).
 * Prices are in rupees. aliases are separated by "|".
 */
// A blank cell means "not given" (never 0), so a missing sell_price is an error and a missing pack_size defaults to 1.
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);
const row = z.object({
  name_en: z.string().trim().min(1),
  name_hi: z.string().optional(),
  brand: z.string().optional(),
  category: z.string().trim().min(1),
  label: z.string().optional(),
  sell_price: z.preprocess(blankToUndefined, z.coerce.number("sell_price is required and must be a number").min(0)),
  cost_price: z.preprocess(blankToUndefined, z.coerce.number().min(0).optional()),
  pack_size: z.preprocess(blankToUndefined, z.coerce.number().int().min(1).optional()),
  opening_stock: z.preprocess(blankToUndefined, z.coerce.number().int().min(0).optional()),
  short_code: z.string().optional(),
  aliases: z.string().optional(),
  image_url: z.string().optional(),
});

const clean = (s?: string) => (s ?? "").trim();

export const POST = route(can("import"), async (req) => {
  const text = await req.text();
  if (text.length > 2_000_000) throw new HttpError(413, "CSV too large (max about 2 MB)");
  const parsed = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true, transformHeader: (h) => h.trim().toLowerCase() });
  if (!parsed.data.length) throw new HttpError(400, "CSV has no rows");

  const errors: { line: number; message: string }[] = [];
  const groups = new Map<string, { first: z.infer<typeof row>; rows: z.infer<typeof row>[]; line: number }>();
  parsed.data.forEach((raw, i) => {
    const r = row.safeParse(raw);
    if (!r.success) return errors.push({ line: i + 2, message: r.error.issues.map((x) => `${x.path.join(".")}: ${x.message}`).join("; ") });
    const key = `${clean(r.data.name_en).toLowerCase()}|${clean(r.data.brand).toLowerCase()}`;
    const g = groups.get(key);
    if (g) g.rows.push(r.data);
    else groups.set(key, { first: r.data, rows: [r.data], line: i + 2 });
  });

  let created = 0;
  let skipped = 0;
  for (const { first, rows, line } of groups.values()) {
    try {
      const brandName = clean(first.brand);
      let brandId = "";
      if (brandName) {
        const b = (await Brand.findOne({ name: new RegExp(`^${escapeRegex(brandName)}$`, "i") })) ?? (await Brand.create({ name: brandName }));
        brandId = String(b._id);
      }
      const catName = clean(first.category);
      const slug = slugify(catName);
      const cat = (await Category.findOne({ slug })) ?? (await Category.create({ name_en: catName, slug }));

      const dup = await Product.findOne({ name_en: new RegExp(`^${escapeRegex(clean(first.name_en))}$`, "i"), brandId: brandId || undefined, categoryId: cat._id });
      if (dup) {
        skipped++;
        continue; // re-importing the same file never duplicates items
      }
      await saveProduct({
        name_en: clean(first.name_en),
        name_hi: clean(first.name_hi) || undefined,
        brandId,
        categoryId: String(cat._id),
        images: first.image_url ? [clean(first.image_url)] : [],
        attributes: {},
        tags: [],
        active: true,
        variants: rows.map((r) => ({
          label: clean(r.label),
          shortCode: clean(r.short_code) || undefined,
          aliases: clean(r.aliases).split("|").map((a) => a.trim()).filter(Boolean),
          sellPrice: r.sell_price,
          costPrice: r.cost_price ?? 0,
          baseUnit: "piece",
          packSize: r.pack_size ?? 1,
          reorderLevel: 0,
          quickTap: false,
          trackStock: !/^(photocopy|print|printing|service)/i.test(clean(first.category)),
          active: true,
          openingStock: r.opening_stock,
        })),
      });
      created++;
    } catch (e) {
      errors.push({ line, message: e instanceof Error ? e.message : "failed" });
    }
  }
  return { created, skipped, errors };
});
