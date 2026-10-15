/**
 * Builds the WhatsApp order message and link. Pure functions, used by the storefront.
 * No customer data is collected: the customer's own WhatsApp shows the shop who is ordering.
 */

export interface OrderLine {
  code: string;
  name: string;
  qty: number;
  freeUnits: number;
  /** paise */
  lineTotal: number;
}

/** Digits only, India default: 10 digits -> 91 + number; 0 + 10 digits -> 91 + number. Returns null if it can't be a phone number. */
export function normalizeWhatsappNumber(raw: string | undefined | null): string | null {
  let d = (raw ?? "").replace(/\D/g, "");
  if (d.length === 11 && d.startsWith("0")) d = d.slice(1);
  if (d.length === 10) d = `91${d}`;
  return d.length >= 11 && d.length <= 15 ? d : null;
}

const rs = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: paise % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const MAX_LINES = 50;

export function buildOrderMessage(lines: OrderLine[], total: number, opts: { lang: "en" | "hi"; hasPriceRange: boolean }): string {
  const hi = opts.lang === "hi";
  const body = lines.slice(0, MAX_LINES).map((l, i) => {
    const qty = l.freeUnits > 0 ? `${l.qty} (${l.freeUnits} ${hi ? "फ्री" : "free"})` : `${l.qty}`;
    return `${i + 1}. [${l.code.toUpperCase()}] ${l.name} x ${qty} = ${rs(l.lineTotal)}`;
  });
  if (lines.length > MAX_LINES) body.push(`+ ${lines.length - MAX_LINES} more items`);
  return [
    hi ? "नमस्ते Pencil Box, मैं ये सामान लेना चाहता/चाहती हूँ:" : "Hello Pencil Box, I would like to order:",
    "",
    ...body,
    "",
    `${hi ? "अनुमानित कुल" : "Estimated total"}: ${rs(total)}${opts.hasPriceRange ? (hi ? " (कुछ आइटम के दो रेट हैं)" : " (some items have two possible prices)") : ""}`,
    hi ? "कृपया उपलब्धता और अंतिम कीमत बताएं। मैं दुकान से ले जाऊंगा/जाऊंगी।" : "Please confirm availability and final price. I will pick up from the shop.",
  ].join("\n");
}

export function whatsappUrl(number: string, text: string): string {
  return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
}

/**
 * Reads a customer's WhatsApp order back into item codes and quantities. Understands the lines this website writes
 * ("1. [BP-02] Ball Pen Blue x 5 = ₹25", with or without "(1 free)") and plain "BP-02 x 5". The quantity is the LAST
 * "x <number>" on the line, so product names like "Doms X1 Pencil" are not mistaken for a quantity.
 */
export function parseOrderText(text: string): { code: string; qty: number }[] {
  const merged = new Map<string, number>();
  for (const line of text.split(/\r?\n/)) {
    const code = /\b([A-Za-z]{2,4}-\d{1,4})\b/.exec(line)?.[1];
    if (!code) continue;
    const qtys = [...line.matchAll(/\s[x×]\s+(\d{1,5})\b/gi)];
    const qty = qtys.length ? parseInt(qtys[qtys.length - 1][1], 10) : 0;
    if (qty < 1) continue;
    const key = code.toUpperCase();
    merged.set(key, (merged.get(key) ?? 0) + qty);
  }
  return [...merged].map(([code, qty]) => ({ code, qty }));
}
