/**
 * SAMPLE stock file (safe to publish). The real file, `data/balaji-stock.ts`, holds your supplier and wholesale
 * costs, so it is git-ignored and stays on your computer. `npm run import:stock` uses the real file when it exists
 * and falls back to this one.
 *
 * Copy this file to `data/balaji-stock.ts` and replace the items with your own. Prices are rupees; `cost` is per piece.
 */

export interface StockVariant {
  label: string;
  qty: number;
  cost?: number;
  price?: number;
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
  /** private note, only the owner sees it on the Products page */
  note?: string;
}

export const SUPPLIER = { name: "Your supplier", notes: "Wholesaler" };

/** Category tree used by the website (matches the shop poster). */
export const CATEGORIES: Record<string, { hi: string; children: Record<string, string> }> = {
  "Notebooks & Registers": { hi: "नोटबुक और रजिस्टर", children: { Notebooks: "नोटबुक", Registers: "रजिस्टर" } },
  "Pens & Pencils": { hi: "पेन और पेंसिल", children: { "Ball Pens": "बॉल पेन", "Gel Pens": "जेल पेन", Pencils: "पेंसिल", Erasers: "रबर", Sharpeners: "शार्पनर" } },
  "Art & Craft": { hi: "आर्ट और क्राफ्ट", children: { Colours: "रंग", "Chart Paper": "चार्ट पेपर" } },
  "School Supplies": { hi: "स्कूल सामान", children: { "Glue & Whitener": "गोंद और व्हाइटनर", Markers: "मार्कर", "Covers & Name Slips": "कवर और नेम स्लिप", Maps: "नक्शे" } },
  "Gifts & More": { hi: "उपहार और बहुत कुछ", children: {} },
  "Printing & Photocopy": { hi: "प्रिंटिंग और फोटोकॉपी", children: { Paper: "कागज़" } },
};

export const PRODUCTS: StockProduct[] = [
  { name: "Ball Pen", cat: ["Pens & Pencils", "Ball Pens"], cost: 3, price: 5, tags: ["pen"], variants: [{ label: "Blue", qty: 50, quick: true }, { label: "Black", qty: 30 }] },
  { name: "HB Pencil", brand: "Example Brand", cat: ["Pens & Pencils", "Pencils"], cost: 3, price: 5, tags: ["pencil"], variants: [{ label: "", qty: 100, quick: true }] },
  { name: "Notebook", cat: ["Notebooks & Registers", "Notebooks"], cost: 20, price: 30, tags: ["copy", "notebook"], variants: [{ label: "Hindi", qty: 10 }, { label: "English", qty: 10 }] },
  { name: "Glue Stick", cat: ["School Supplies", "Glue & Whitener"], cost: 7, price: 10, tags: ["glue"], variants: [{ label: "", qty: 20 }] },
];
