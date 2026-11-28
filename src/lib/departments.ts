/**
 * Generic departments. Labels never include a brand. Prices are not stated.
 * Children are the extra shelves; the home grid is the short list of main departments.
 */

export interface DepartmentFaq {
  q: string;
  a: string;
}

export interface Department {
  slug: string;
  label: string;
  /** Parent slug. Empty for a main department. */
  parent: string;
  home: boolean;
  about: string;
  faqs: DepartmentFaq[];
}

const PLACE = "Pencil Box Stationery, B-92, Tigri Extension (near Sangam Vihar, Khanpur and Devli). The shop is open every day. Call or WhatsApp to ask what is in stock, then pick it up from the counter. Schools and offices can send a list. This page does not quote a price; the counter confirms the rate.";

function about(label: string, extra: string): string {
  return `${label} is available to ask for at ${PLACE} ${extra}`;
}

function faqs(label: string): DepartmentFaq[] {
  return [
    { q: `${label} milta hai?`, a: `Ask at Pencil Box Stationery in Tigri Extension. If it is not on the shelf today, the staff will say so.` },
    { q: "Order kaise karein?", a: "WhatsApp or call the shop and collect from B-92, Tigri Extension. The shop is open daily, including Sunday." },
  ];
}

function child(slug: string, label: string, parent: string, extra: string): Department {
  return { slug, label, parent, home: false, about: about(label, extra), faqs: faqs(label) };
}

function main(slug: string, label: string, extra: string): Department {
  return { slug, label, parent: "", home: true, about: about(label, extra), faqs: faqs(label) };
}

export const DEPARTMENTS: Department[] = [
  main("writing", "Writing", "Highlighters, markers, sketch pens and correction tape sit with the other writing tools."),
  main("office", "Office", "Files, calculators, staplers and desk tools are kept for home offices and school offices."),
  main("tapes", "Tapes & glue", "Cello tape, foam tape and glue-gun sticks are asked for with craft and office jobs."),
  main("paper", "Paper", "A4 sheets, colour paper, drawing books and gift wrap are kept with the paper shelf."),
  main("toys", "Toys & daily use", "Small toys, puzzles, locks and everyday items are asked for at the same counter as stationery."),

  child("pencil-box", "Pencil box", "school", "A plain pencil box for the school list."),
  child("pencil-pouch", "Pencil pouch", "school", "A zipper pouch for pens and pencils."),
  child("geometry-box", "Geometry box", "school", "A geometry box for maths class."),
  child("scale-ruler", "Scale", "school", "A scale or ruler for the school list."),
  child("exam-pad", "Exam pad", "school", "An exam pad or writing board for tests."),
  child("bottle-lunch", "Water bottle & lunch box", "school", "A water bottle or lunch box for school."),
  child("slate-duster", "Slate & duster", "school", "A slate and duster for younger classes."),

  child("highlighter", "Highlighter", "writing", "A highlighter for notes and textbooks."),
  child("marker", "Marker", "writing", "Markers for charts, whiteboards and labels."),
  child("sketch-pens", "Sketch pens", "writing", "Sketch pens for school projects."),
  child("correction-tape", "Correction tape", "writing", "Correction tape or whitener for written work."),

  child("calculator", "Calculator", "office", "A simple calculator for school or a small office."),
  child("files-folders", "Files & folders", "office", "Files and folders for homework and office papers."),
  child("sticky-notes", "Sticky notes", "office", "Sticky notes for reminders."),
  child("pins-clips", "Pins & clips", "office", "Pins and clips for papers."),
  child("stapler", "Stapler", "office", "A stapler and staples."),
  child("office-diary", "Office diary", "office", "An office diary or planner."),
  child("pen-stand", "Pen stand", "office", "A pen stand or desk organiser."),
  child("cutter-scissors", "Cutter & scissors", "office", "A cutter or a pair of scissors."),
  child("lcd-tablet", "LCD writing tablet", "office", "A small LCD writing tablet."),

  child("cello-tape", "Cello tape", "tapes", "Cello tape and foam tape."),
  child("glue-gun", "Glue gun", "tapes", "A glue gun and glue sticks. Ask the counter before you buy one."),

  child("a4-paper", "A4 paper", "paper", "A4 sheets and colour paper."),
  child("craft-card", "Craft card", "paper", "Craft card, including glitter card when it is in stock."),
  child("drawing-book", "Drawing book", "paper", "A drawing book for art class."),
  child("colouring-book", "Colouring book", "paper", "A colouring book."),
  child("gift-wrap", "Gift wrapping paper", "paper", "Gift wrapping paper."),

  child("paint-brushes", "Paint brushes", "art", "Paint brushes for school art."),
  child("modelling-clay", "Modelling clay", "art", "Modelling clay for craft."),
  child("craft-stickers", "Craft stickers", "art", "Craft stickers and decorative stones."),
  child("ice-cream-sticks", "Ice cream sticks", "art", "Ice cream sticks for school models."),
  child("craft-thread", "Craft thread", "art", "Craft thread and ribbon."),
  child("science-kits", "Science project kits", "art", "A simple science-project kit. Ask what is in stock."),

  child("fancy-diary", "Fancy diary", "gifts", "A fancy diary for a gift."),
  child("gift-sets", "Gift sets", "gifts", "A ready gift set. Designs change, so ask what is on the shelf."),
  child("balloons", "Balloons", "gifts", "Balloons and party decoration."),
  child("keychains", "Keychains", "gifts", "Keychains."),

  child("toys", "Toys", "toys", "Small toys. The shelf changes, so ask what is in today."),
  child("slime", "Slime", "toys", "Slime, when it is in stock."),
  child("puzzles", "Puzzles", "toys", "Puzzles and card games."),
  child("sports", "Sports items", "toys", "Small sports items such as a ball or a skipping rope."),
  child("locks", "Locks", "toys", "A small lock for a bag or a drawer."),
  child("nail-cutter", "Nail cutter", "toys", "A nail cutter."),
];

/** Existing collection pages that stay on the home grid, in display order. */
export const HOME_LINKS: { slug: string; label: string; href: string }[] = [
  { slug: "notebooks", label: "Notebooks", href: "/c/notebooks" },
  { slug: "pens", label: "Pens", href: "/c/pens" },
  { slug: "school", label: "School", href: "/c/school" },
  { slug: "writing", label: "Writing", href: "/c/writing" },
  { slug: "office", label: "Office", href: "/c/office" },
  { slug: "paper", label: "Paper", href: "/c/paper" },
  { slug: "art", label: "Art & craft", href: "/c/art" },
  { slug: "tapes", label: "Tapes & glue", href: "/c/tapes" },
  { slug: "gifts", label: "Gifts", href: "/c/gifts" },
  { slug: "toys", label: "Toys", href: "/c/toys" },
  { slug: "printing", label: "Printing", href: "/c/printing" },
];

export const DEPARTMENT_PARENTS = ["school", "writing", "office", "tapes", "paper", "art", "gifts", "toys"] as const;

export const PARENT_LABEL: Record<string, string> = {
  school: "School",
  writing: "Writing",
  office: "Office",
  tapes: "Tapes & glue",
  paper: "Paper",
  art: "Art & craft",
  gifts: "Gifts & decoration",
  toys: "Toys & daily use",
};

export function departmentBySlug(slug: string): Department | undefined {
  return DEPARTMENTS.find((d) => d.slug === slug);
}

export function childDepartments(parent: string): Department[] {
  return DEPARTMENTS.filter((d) => d.parent === parent);
}

export function allDepartmentSlugs(): string[] {
  return DEPARTMENTS.map((d) => d.slug);
}

export interface DepartmentPrefs {
  hidden: string[];
  order: string[];
  images: Record<string, string>;
}

export const EMPTY_PREFS: DepartmentPrefs = { hidden: [], order: [], images: {} };

export function normalisePrefs(input: Partial<DepartmentPrefs> | null | undefined): DepartmentPrefs {
  const known = new Set(allDepartmentSlugs().concat(HOME_LINKS.map((h) => h.slug)));
  const hidden = (input?.hidden ?? []).filter((s) => known.has(s));
  const order = (input?.order ?? []).filter((s) => HOME_LINKS.some((h) => h.slug === s));
  const images: Record<string, string> = {};
  for (const [key, value] of Object.entries(input?.images ?? {})) {
    if (!known.has(key) || typeof value !== "string") continue;
    const url = value.trim();
    if (!url || /^https:\/\/.{4,400}$/.test(url)) images[key] = url;
  }
  return { hidden, order, images };
}

export function orderedHomeLinks(prefs: DepartmentPrefs = EMPTY_PREFS) {
  const rank = new Map(prefs.order.map((slug, i) => [slug, i]));
  return [...HOME_LINKS]
    .filter((item) => !prefs.hidden.includes(item.slug))
    .sort((a, b) => (rank.get(a.slug) ?? 1000) - (rank.get(b.slug) ?? 1000) || HOME_LINKS.findIndex((h) => h.slug === a.slug) - HOME_LINKS.findIndex((h) => h.slug === b.slug));
}
