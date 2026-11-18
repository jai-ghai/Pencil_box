/**
 * Quick-add: turn one line of text into a product draft. Pure functions, no database.
 *
 * Examples the owner will type:
 *   "Natraj HB pencil 5"
 *   "Classmate notebook 200 pages 40"
 *   "₹25 eraser"
 *   "Doms colour pencils 12 shades 60"
 *
 * Trailing (or leading) rupee amount = sell price. Leading brand matched against the shop's
 * brand list. Category is guessed from keywords in the name (pencil → Pencils, etc.).
 */

export interface QuickDraft {
  /** brand name as typed / matched; empty when none */
  brand: string;
  name: string;
  /** rupees; undefined when the line had no price */
  price: number | undefined;
  /** keyword used to look up a category, e.g. "pencil" / "notebook" */
  categoryHint: string | null;
}

/** keyword (matched in the name) → preferred category name fragment to look up in the DB */
export const CATEGORY_HINTS: { re: RegExp; hint: string }[] = [
  { re: /\bpencils?\b/i, hint: "Pencil" },
  { re: /\bball\s*pens?\b/i, hint: "Ball Pen" },
  { re: /\bgel\s*pens?\b/i, hint: "Gel Pen" },
  { re: /\bpens?\b/i, hint: "Pen" },
  { re: /\bnotebooks?\b|\bnote\s*books?\b|\bregisters?\b|\bdair(?:y|ies)\b/i, hint: "Notebook" },
  { re: /\berasers?\b/i, hint: "Eraser" },
  { re: /\bsharpeners?\b/i, hint: "Sharpener" },
  { re: /\bscales?\b|\brulers?\b/i, hint: "Scale" },
  { re: /\bmarkers?\b|\bhighlighters?\b/i, hint: "Marker" },
  { re: /\bcrayons?\b|\bcolours?\b|\bcolors?\b|\bpaints?\b|\bsketches?\b/i, hint: "Art" },
  { re: /\bglue\b|\bfevicol\b|\btape\b|\bstickers?\b/i, hint: "Glue" },
  { re: /\bfiles?\b|\bfolders?\b|\bcovers?\b/i, hint: "File" },
  { re: /\btoys?\b|\bdolls?\b/i, hint: "Toy" },
  { re: /\bgifts?\b|\bhamper\b|\breturn\s*gift\b/i, hint: "Gift" },
  { re: /\bbags?\b|\bbottles?\b|\bbox(?:es)?\b/i, hint: "School" },
];

const PRICE_TRAIL = /(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?\s*(?:rs|inr|rupees?)?\s*$/i;
const PRICE_LEAD = /^(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?\s*(?:rs|inr|rupees?)?\b\s*/i;

function toRupees(whole: string, frac?: string): number {
  const w = parseInt(whole.replace(/,/g, ""), 10);
  const f = frac ? parseInt(frac.padEnd(2, "0").slice(0, 2), 10) / 100 : 0;
  return w + f;
}

/** Longest brand name that the line starts with (case-insensitive). */
export function matchBrand(line: string, brands: string[]): { brand: string; rest: string } | null {
  const sorted = [...brands].filter(Boolean).sort((a, b) => b.length - a.length);
  const lower = line.toLowerCase();
  for (const b of sorted) {
    const bl = b.toLowerCase();
    if (lower === bl || lower.startsWith(bl + " ") || lower.startsWith(bl + "-")) {
      return { brand: b, rest: line.slice(b.length).replace(/^[\s\-–]+/, "").trim() };
    }
  }
  return null;
}

export function guessCategoryHint(name: string): string | null {
  for (const h of CATEGORY_HINTS) if (h.re.test(name)) return h.hint;
  return null;
}

/**
 * Parse one line into a draft. `brands` is the shop's brand list (e.g. ["Natraj","Doms","Classmate"]).
 * Returns null when the line is empty or has no usable name.
 */
export function parseQuickAdd(line: string, brands: string[] = []): QuickDraft | null {
  let text = line.replace(/\s+/g, " ").trim();
  if (!text) return null;

  let price: number | undefined;
  const trail = PRICE_TRAIL.exec(text);
  if (trail && trail.index !== undefined && trail.index > 0) {
    price = toRupees(trail[1], trail[2]);
    text = text.slice(0, trail.index).trim();
  } else {
    const lead = PRICE_LEAD.exec(text);
    if (lead) {
      price = toRupees(lead[1], lead[2]);
      text = text.slice(lead[0].length).trim();
    }
  }
  if (!text) return null;

  const brandHit = matchBrand(text, brands);
  const brand = brandHit?.brand ?? "";
  const name = (brandHit?.rest || text).trim();
  if (!name) return null;

  return { brand, name, price, categoryHint: guessCategoryHint(`${brand} ${name}`) };
}

/**
 * Pick the best category id from a list, given a hint like "Pencil".
 * Prefers a child category whose name contains the hint; else a top-level; else the first category.
 */
export function pickCategory(
  hint: string | null,
  categories: { id: string; name: string; parentId: string | null }[],
): string | null {
  if (!categories.length) return null;
  if (hint) {
    const h = hint.toLowerCase();
    const kids = categories.filter((c) => c.parentId && c.name.toLowerCase().includes(h));
    if (kids.length) return kids.sort((a, b) => a.name.length - b.name.length)[0].id;
    const tops = categories.filter((c) => !c.parentId && c.name.toLowerCase().includes(h));
    if (tops.length) return tops[0].id;
  }
  return categories.find((c) => c.parentId)?.id ?? categories[0].id;
}
