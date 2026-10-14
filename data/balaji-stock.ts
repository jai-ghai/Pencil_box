/**
 * Opening stock from the handwritten sheets: one wholesale package from supplier "Balaji" (50 lots).
 * Prices are rupees; "cost" is per piece. Where the sheet was unclear, the reading used is explained in `note`
 * (admin-only, shown on the Products page) so it can be corrected there.
 */

export interface StockVariant {
  label: string;
  qty: number;
  cost?: number;
  price?: number;
  /** shop may sell at any price from `price` up to this */
  maxPrice?: number;
  quick?: boolean;
}
export interface StockProduct {
  name: string;
  brand?: string;
  /** [top-level category, sub-category] */
  cat: [string, string];
  cost: number;
  price: number;
  maxPrice?: number;
  variants: StockVariant[];
  tags?: string[];
  note?: string;
}

export const SUPPLIER = { name: "Balaji", notes: "Wholesaler. Opening stock package of 50 lots." };

/** Category tree taken from the shop poster. */
export const CATEGORIES: Record<string, { hi: string; children: Record<string, string> }> = {
  "Notebooks & Registers": { hi: "नोटबुक और रजिस्टर", children: { Notebooks: "नोटबुक", Registers: "रजिस्टर" } },
  "Pens & Pencils": { hi: "पेन और पेंसिल", children: { "Ball Pens": "बॉल पेन", "Gel Pens": "जेल पेन", Pencils: "पेंसिल", Erasers: "रबर", Sharpeners: "शार्पनर" } },
  "Art & Craft": { hi: "आर्ट और क्राफ्ट", children: { Colours: "रंग", "Chart Paper": "चार्ट पेपर" } },
  "School Supplies": { hi: "स्कूल सामान", children: { "Glue & Whitener": "गोंद और व्हाइटनर", Markers: "मार्कर", "Covers & Name Slips": "कवर और नेम स्लिप", Maps: "नक्शे" } },
  "Gifts & More": { hi: "उपहार और बहुत कुछ", children: {} },
  "Printing & Photocopy": { hi: "प्रिंटिंग और फोटोकॉपी", children: { Paper: "कागज़" } },
};

export const PRODUCTS: StockProduct[] = [
  /* ---------- Pens ---------- */
  { name: "Ball Pen (Economy)", brand: "Paras", cat: ["Pens & Pencils", "Ball Pens"], cost: 2.25, price: 3, tags: ["pen", "ballpen"],
    note: "Brand matched to the colour in the order written on the sheet (Blue-Paras, Black-Versatile, Red-Bosley). Fix if wrong.",
    variants: [{ label: "Blue", qty: 20 }] },
  { name: "Ball Pen (Economy)", brand: "Versatile", cat: ["Pens & Pencils", "Ball Pens"], cost: 2.25, price: 3, tags: ["pen", "ballpen"],
    note: "Brand matched to the colour in the order written on the sheet (Blue-Paras, Black-Versatile, Red-Bosley). Fix if wrong.",
    variants: [{ label: "Black", qty: 20 }] },
  { name: "Ball Pen (Economy)", brand: "Bosley", cat: ["Pens & Pencils", "Ball Pens"], cost: 2.25, price: 3, tags: ["pen", "ballpen"],
    note: "Brand matched to the colour in the order written on the sheet (Blue-Paras, Black-Versatile, Red-Bosley). Fix if wrong.",
    variants: [{ label: "Red", qty: 20 }] },
  { name: "Ball Pen (Standard)", cat: ["Pens & Pencils", "Ball Pens"], cost: 3.8, price: 5, tags: ["pen", "ballpen"],
    variants: [{ label: "Blue", qty: 30, quick: true }, { label: "Black", qty: 15, quick: true }, { label: "Red", qty: 5 }] },
  { name: "Gel Pen (Standard)", cat: ["Pens & Pencils", "Gel Pens"], cost: 4, price: 5, tags: ["pen", "gelpen"],
    note: "Colour split written as ditto of the ball pen lot (30 blue, 15 black, 5 red). Please confirm.",
    variants: [{ label: "Blue", qty: 30, quick: true }, { label: "Black", qty: 15 }, { label: "Red", qty: 5 }] },
  { name: "Ball Pen (Premium)", cat: ["Pens & Pencils", "Ball Pens"], cost: 7, price: 10, tags: ["pen", "ballpen"],
    note: "Lot 4 is 10 blue ball, 10 blue gel, 10 black ball, 10 black gel at the same price. Split into two products.",
    variants: [{ label: "Blue", qty: 10 }, { label: "Black", qty: 10 }] },
  { name: "Gel Pen (Premium)", cat: ["Pens & Pencils", "Gel Pens"], cost: 7, price: 10, tags: ["pen", "gelpen"],
    variants: [{ label: "Blue", qty: 10 }, { label: "Black", qty: 10 }] },

  /* ---------- Pencils ---------- */
  { name: "621 Bold Pencil", brand: "Nataraj", cat: ["Pens & Pencils", "Pencils"], cost: 3, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 30, quick: true }] },
  { name: "A1 HB Pencil", brand: "Doms", cat: ["Pens & Pencils", "Pencils"], cost: 3, price: 5, tags: ["pencil"],
    note: 'Written "A1 HB" (handwriting unclear).', variants: [{ label: "HB", qty: 20, quick: true }] },
  { name: "X1 Pencil", brand: "Doms", cat: ["Pens & Pencils", "Pencils"], cost: 4, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 10 }] },
  { name: "Groove Pencil", brand: "Doms", cat: ["Pens & Pencils", "Pencils"], cost: 4, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 10 }] },
  { name: "Zoom Pencil", brand: "Doms", cat: ["Pens & Pencils", "Pencils"], cost: 4, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 10 }] },
  { name: "Apsara Pencil", brand: "Apsara", cat: ["Pens & Pencils", "Pencils"], cost: 4, price: 5, tags: ["pencil"],
    note: 'Sheet says only "Apsara -" with no model name. Add the model name.', variants: [{ label: "", qty: 10 }] },
  { name: "Neon Pencil", brand: "Doms", cat: ["Pens & Pencils", "Pencils"], cost: 4, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 10 }] },

  /* ---------- Erasers & sharpeners ---------- */
  { name: "Dust Free Eraser", brand: "Doms", cat: ["Pens & Pencils", "Erasers"], cost: 2, price: 3, tags: ["rubber", "eraser"], variants: [{ label: "", qty: 20, quick: true }] },
  { name: "Extra Long Eraser", brand: "Doms", cat: ["Pens & Pencils", "Erasers"], cost: 3.75, price: 5, tags: ["rubber", "eraser"],
    note: 'Lot 8 first said "Nataraj 621" but that was crossed out; Doms Extra Long used.', variants: [{ label: "", qty: 20 }] },
  { name: "621 Sharpener", brand: "Nataraj", cat: ["Pens & Pencils", "Sharpeners"], cost: 2, price: 3, tags: ["sharpner", "sharpener"], variants: [{ label: "", qty: 20, quick: true }] },
  { name: "Extra Large Sharpener", brand: "Doms", cat: ["Pens & Pencils", "Sharpeners"], cost: 3.75, price: 5, tags: ["sharpner", "sharpener"],
    note: "Bill amount on sheet is 70 but 20 x 3.75 = 75. Cost kept at 3.75.", variants: [{ label: "", qty: 20 }] },

  /* ---------- Notebooks ---------- */
  { name: "Ankit Notebook ₹10", brand: "Ankit", cat: ["Notebooks & Registers", "Notebooks"], cost: 7, price: 10, tags: ["copy", "notebook"],
    note: "Page counts and sizes are not on the sheet. Rename with the real size.",
    variants: [{ label: "Hindi", qty: 10 }, { label: "English", qty: 10 }, { label: "Maths", qty: 10 }, { label: "3 in 1", qty: 10 }] },
  { name: "Alfa + Notebook ₹20", brand: "Alfa +", cat: ["Notebooks & Registers", "Notebooks"], cost: 13, price: 20, tags: ["copy", "notebook"],
    variants: [{ label: "Hindi", qty: 12 }, { label: "English", qty: 12 }, { label: "All in one", qty: 12 }] },
  { name: "Akash Notebook ₹20", brand: "Akash", cat: ["Notebooks & Registers", "Notebooks"], cost: 13, price: 20, tags: ["copy", "notebook"], variants: [{ label: "Maths", qty: 6 }] },
  { name: "Chinu Notebook ₹20", brand: "Chinu", cat: ["Notebooks & Registers", "Notebooks"], cost: 13, price: 20, tags: ["copy", "notebook"],
    variants: [{ label: "Science", qty: 6 }] },
  { name: "Akash Notebook ₹30", brand: "Akash", cat: ["Notebooks & Registers", "Notebooks"], cost: 20, price: 30, tags: ["copy", "notebook"],
    variants: [{ label: "Hindi", qty: 10 }, { label: "All in one", qty: 10 }, { label: "Science", qty: 5 }] },
  { name: "Alfa + Notebook ₹30", brand: "Alfa +", cat: ["Notebooks & Registers", "Notebooks"], cost: 20, price: 30, tags: ["copy", "notebook"],
    variants: [{ label: "English", qty: 10 }, { label: "Maths", qty: 5 }] },
  { name: "Alfa + Notebook ₹40", brand: "Alfa +", cat: ["Notebooks & Registers", "Notebooks"], cost: 27, price: 40, tags: ["copy", "notebook"],
    variants: [{ label: "Hindi", qty: 10 }, { label: "3 in 1", qty: 6 }, { label: "English", qty: 9 }] },
  { name: "Akash Notebook ₹40", brand: "Akash", cat: ["Notebooks & Registers", "Notebooks"], cost: 27, price: 40, tags: ["copy", "notebook"], variants: [{ label: "Maths", qty: 5 }] },
  { name: "Alfa + Notebook ₹50", brand: "Alfa +", cat: ["Notebooks & Registers", "Notebooks"], cost: 38, price: 50, tags: ["copy", "notebook"],
    note: 'Sheet also says "(Return) 4 English, Science" which is unclear. Stock is the 10 purchased.',
    variants: [{ label: "3 in 1", qty: 4 }, { label: "Hindi", qty: 2 }, { label: "English", qty: 2 }, { label: "Maths", qty: 2 }] },

  /* ---------- Registers ---------- */
  ...([
    [20, 15, 15], [30, 21, 10], [40, 28, 10], [50, 35, 10], [60, 43, 10],
  ] as const).map(([price, cost, qty], i): StockProduct => ({
    name: `Register ₹${price}`, cat: ["Notebooks & Registers", "Registers"], cost, price, tags: ["register", "ledger"],
    note: "Page count not on the sheet. Rename with pages (e.g. 172 pages).", variants: [{ label: "", qty, quick: price === 20 }],
  })),

  /* ---------- Art & craft ---------- */
  { name: "Chart Paper (Light Colours)", cat: ["Art & Craft", "Chart Paper"], cost: 6.25, price: 10, tags: ["chart"],
    variants: [{ label: "Pink", qty: 12 }, { label: "Yellow", qty: 12 }, { label: "White", qty: 12 }, { label: "Blue", qty: 12 }, { label: "Green", qty: 12 }] },
  { name: "Chart Paper (Dark Colours)", cat: ["Art & Craft", "Chart Paper"], cost: 7, price: 10, tags: ["chart"],
    variants: [{ label: "Red", qty: 12 }, { label: "Green", qty: 12 }, { label: "Orange", qty: 12 }, { label: "Blue", qty: 12 }] },
  { name: "Wax Colours", brand: "Doms", cat: ["Art & Craft", "Colours"], cost: 7, price: 10, tags: ["crayon", "color", "colour"], variants: [{ label: "", qty: 10 }] },
  { name: "Long Wax Crayons", brand: "Doms", cat: ["Art & Craft", "Colours"], cost: 16, price: 20, tags: ["crayon", "color", "colour"], variants: [{ label: "", qty: 5 }] },
  { name: "Sketch Pens", brand: "Doms", cat: ["Art & Craft", "Colours"], cost: 8.5, price: 10, tags: ["sketch", "color", "colour"],
    variants: [{ label: "10 colours", qty: 6 }, { label: "12 colours", qty: 6, cost: 10.5, price: 15 }, { label: "14 shades (large)", qty: 6, cost: 28, price: 35 }] },
  { name: "Colour Pencils", brand: "Doms", cat: ["Art & Craft", "Colours"], cost: 8, price: 10, tags: ["color", "colour", "pencil"],
    variants: [{ label: "10 shades", qty: 10 }, { label: "12 shades", qty: 5, cost: 15, price: 20 }, { label: "12 shades (large)", qty: 5, cost: 22, price: 25 }, { label: "12 shades (extra large)", qty: 3, cost: 45, price: 55 }] },

  /* ---------- School supplies ---------- */
  { name: "Glue Stick", brand: "Figo", cat: ["School Supplies", "Glue & Whitener"], cost: 7.5, price: 10, tags: ["gluestick", "glue"], variants: [{ label: "", qty: 10 }] },
  { name: "Glue Stick", brand: "Doms", cat: ["School Supplies", "Glue & Whitener"], cost: 16, price: 20, tags: ["gluestick", "glue"], variants: [{ label: "", qty: 5 }] },
  { name: "MyGlue", brand: "MyGlue", cat: ["School Supplies", "Glue & Whitener"], cost: 3.5, price: 5, tags: ["fevi glue", "fevicol", "glue"], variants: [{ label: "", qty: 10 }] },
  { name: "Fevi Glue", brand: "Doms", cat: ["School Supplies", "Glue & Whitener"], cost: 6.5, price: 10, tags: ["fevi glue", "fevicol", "glue"],
    note: 'Pack sizes not on the sheet; labelled by price. Rename (e.g. "Small", "Large").',
    variants: [{ label: "₹10 pack", qty: 10 }, { label: "₹20 pack", qty: 5, cost: 13, price: 20 }] },
  { name: "Whitener (Correction Pen)", brand: "Infinity", cat: ["School Supplies", "Glue & Whitener"], cost: 7.5, price: 10, tags: ["whitener", "correction"],
    note: 'Sizes not on the sheet; labelled by price. Rename (e.g. "Pen", "Bottle").',
    variants: [{ label: "₹10 size", qty: 12 }, { label: "₹20 size", qty: 6, cost: 15, price: 20 }] },
  { name: "CD / DVD / OHP Marker", brand: "Doms", cat: ["School Supplies", "Markers"], cost: 7, price: 10, tags: ["marker"],
    variants: [{ label: "Black", qty: 6 }, { label: "Blue", qty: 2 }, { label: "Red", qty: 2 }] },
  { name: "Permanent Marker", brand: "Doms", cat: ["School Supplies", "Markers"], cost: 12, price: 20, tags: ["marker"],
    variants: [{ label: "Black", qty: 8 }, { label: "Blue", qty: 1 }, { label: "Red", qty: 1 }] },
  { name: "White Board Marker", brand: "Doms", cat: ["School Supplies", "Markers"], cost: 14, price: 20, tags: ["marker", "whiteboard"], variants: [{ label: "", qty: 10 }] },
  { name: "Name Slip", cat: ["School Supplies", "Covers & Name Slips"], cost: 3, price: 5, tags: ["label", "sticker"], variants: [{ label: "", qty: 40 }] },
  { name: "Colour Book Cover (Type 1)", cat: ["School Supplies", "Covers & Name Slips"], cost: 1.8, price: 3, tags: ["cover"],
    note: 'Sheet says "(not available)" next to this lot. Check whether it was actually received.', variants: [{ label: "", qty: 120 }] },
  { name: "Colour Book Cover (Type 2)", cat: ["School Supplies", "Covers & Name Slips"], cost: 2, price: 5, tags: ["cover"],
    note: "Type name above the number is unclear (may say BIS). Rename it.", variants: [{ label: "", qty: 120 }] },
  { name: "Transparent Book Cover", cat: ["School Supplies", "Covers & Name Slips"], cost: 2.5, price: 5, tags: ["cover"], variants: [{ label: "", qty: 100 }] },
  { name: "Cover Roll", cat: ["School Supplies", "Covers & Name Slips"], cost: 15, price: 20, tags: ["cover", "roll"], variants: [{ label: "", qty: 10 }] },
  { name: "Map", cat: ["School Supplies", "Maps"], cost: 0.4, price: 2, tags: ["map", "naksha"],
    variants: [{ label: "Physical India", qty: 100 }, { label: "Political India", qty: 100 }, { label: "World Physical", qty: 100 }, { label: "World Political", qty: 100 }] },

  /* ---------- Printing & photocopy: paper ---------- */
  { name: "A4 Sheet Packet", brand: "Chanu", cat: ["Printing & Photocopy", "Paper"], cost: 19, price: 30, tags: ["paper", "a4"],
    note: 'Brand written "Chanu" (unclear). Sheets per packet not on the sheet.',
    variants: [{ label: "Plain white", qty: 5 }, { label: "One side line", qty: 5 }, { label: "Two side line", qty: 5 }] },
  { name: "A4 Colour Sheet Packet", brand: "Chanu", cat: ["Printing & Photocopy", "Paper"], cost: 20, price: 30, tags: ["paper", "a4", "colour"],
    variants: [{ label: "Mix colours, plain", qty: 5 }, { label: "Single colour, plain", qty: 5 }, { label: "Mix colours, one side line", qty: 5 }] },
  { name: "A4 Paper Ream (500 sheets)", brand: "Century", cat: ["Printing & Photocopy", "Paper"], cost: 225, price: 240, tags: ["paper", "a4", "ream"], variants: [{ label: "", qty: 1 }] },
  { name: "A4 Paper Ream (500 sheets)", brand: "Silverton", cat: ["Printing & Photocopy", "Paper"], cost: 180, price: 190, tags: ["paper", "a4", "ream"], variants: [{ label: "", qty: 1 }] },
];
