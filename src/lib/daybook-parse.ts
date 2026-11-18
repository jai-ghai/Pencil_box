/**
 * Turns a free-form daybook note (the kind the owner types in WhatsApp) into structured
 * cash / UPI / purchase / expense rows. Pure function, no database.
 *
 * Money in the note is rupees (with optional ₹, commas, decimals). Output is integer paise.
 *
 * Recognised cues (English, case-insensitive):
 *   cash / in cash                          → sales cash
 *   upi / gpay / phonepe / paytm / online   → sales UPI
 *   sold / sale / sales / total             → sales (split by cash/upi cues on the same clause)
 *   bought / purchase / stock / from X      → purchase (party = X when present)
 *   expense / rent / light / power /
 *   electricity / bill / salary / helper /
 *   pay / wages                             → expense (party = the cue or a trailing name)
 *
 * A clause with an amount and no cue is left in `unknown` so the owner can assign it.
 */
export interface ParsedSales {
  cash: number;
  upi: number;
}
export interface ParsedCost {
  kind: "purchase" | "expense";
  amount: number;
  party: string;
}
export interface ParseResult {
  sales: ParsedSales;
  costs: ParsedCost[];
  /** clauses that had an amount but no clear cue — shown back so the owner can fix them */
  unknown: { text: string; amount: number }[];
  /** true when at least one amount was recognised */
  matched: boolean;
}

const SALE_UPI = /\b(upi|gpay|g-pay|phonepe|phone\s*pe|paytm|online)\b/i;
const SALE_CASH = /\b(cash|in\s*cash)\b/i;
const SALE_ANY = /\b(sold|sale|sales|total|takings)\b/i;
const BUY = /\b(bought|buy|purchase|purchased|stock|from)\b/i;
const EXPENSE =
  /\b(expense|expenses|rent|light|power|electricity|bill|bills|salary|salaries|helper|pay|wages|petrol|diesel|transport|repair|repairs)\b/i;

/** Split a note into clauses on ., ;, newlines and "and" between amounts. */
function clauses(text: string): string[] {
  return text
    .split(/(?:\r?\n+|[.;]+|\band\b)/i)
    .map((c) => c.trim())
    .filter(Boolean);
}

/**
 * Find rupee amounts in a clause. Accepts 4200, 4,200, ₹4200, 4200.50.
 * Returns paise.
 */
export function findAmounts(text: string): number[] {
  const out: number[] = [];
  const re = /(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const whole = m[1].replace(/,/g, "");
    const frac = (m[2] ?? "").padEnd(2, "0").slice(0, 2);
    const paise = parseInt(whole, 10) * 100 + (frac ? parseInt(frac, 10) : 0);
    if (paise > 0) out.push(paise);
  }
  return out;
}

/** Pull a party name after "from X", or the leftover words once cues and amounts are stripped. */
function partyOf(clause: string, kind: "purchase" | "expense"): string {
  // Stop before the amount so "from Balaji 3200" yields "Balaji", not "Balaji 3200".
  const from = /\bfrom\s+([A-Za-z][A-Za-z .&'-]{0,40}?)(?=\s*(?:₹|\d)|$)/i.exec(clause);
  if (from) return cleanParty(from[1]);
  // Cue regexes are not /g; strip repeatedly so "Light bill" loses both words.
  let leftover = clause;
  for (const re of [SALE_UPI, SALE_CASH, SALE_ANY, BUY, EXPENSE]) {
    leftover = leftover.replace(new RegExp(re.source, "gi"), " ");
  }
  leftover = leftover
    .replace(/(?:₹\s*)?(?:\d{1,3}(?:,\d{2,3})+|\d+)(?:\.\d{1,2})?/g, " ")
    .replace(/\b(rs|inr|rupees?|for|of|the|a|an|to|on|at|by)\b/gi, " ")
    .replace(/[^A-Za-z .&'-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!leftover) return "";
  void kind;
  return cleanParty(leftover);
}

function cleanParty(s: string): string {
  return s.replace(/\s+/g, " ").trim().slice(0, 80);
}

function classify(clause: string): "cash" | "upi" | "sales" | "purchase" | "expense" | "unknown" {
  const hasBuy = BUY.test(clause);
  const hasExp = EXPENSE.test(clause);
  const hasUpi = SALE_UPI.test(clause);
  const hasCash = SALE_CASH.test(clause);
  const hasSale = SALE_ANY.test(clause);
  if (hasBuy && !hasExp) return "purchase";
  if (hasExp) return "expense";
  if (hasUpi && !hasCash) return "upi";
  if (hasCash && !hasUpi) return "cash";
  if (hasCash && hasUpi) return "sales";
  if (hasSale) return "sales";
  return "unknown";
}

/**
 * When a clause mentions both cash and UPI ("4200 cash 1800 upi"), pair each amount with the
 * nearest cue. Falls back to first→cash, second→upi when cues are present but pairing is ambiguous.
 */
function splitCashUpi(clause: string, amounts: number[]): { cash: number; upi: number } {
  if (amounts.length === 0) return { cash: 0, upi: 0 };
  if (amounts.length === 1) {
    if (SALE_UPI.test(clause) && !SALE_CASH.test(clause)) return { cash: 0, upi: amounts[0] };
    if (SALE_CASH.test(clause) && !SALE_UPI.test(clause)) return { cash: amounts[0], upi: 0 };
    return { cash: amounts[0], upi: 0 };
  }
  const pairs: { amount: number; kind: "cash" | "upi" | null }[] = [];
  const re = /(?:₹\s*)?(\d{1,3}(?:,\d{2,3})+|\d+)(?:\.(\d{1,2}))?\s*(cash|upi|gpay|g-pay|phonepe|phone\s*pe|paytm|online)?/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(clause))) {
    const whole = m[1].replace(/,/g, "");
    const frac = (m[2] ?? "").padEnd(2, "0").slice(0, 2);
    const amount = parseInt(whole, 10) * 100 + (frac ? parseInt(frac, 10) : 0);
    const cue = (m[3] ?? "").toLowerCase();
    const kind = !cue ? null : /cash/.test(cue) ? "cash" : "upi";
    pairs.push({ amount, kind });
  }
  let cash = 0;
  let upi = 0;
  const unused = pairs.filter((p) => !p.kind).map((p) => p.amount);
  for (const p of pairs) {
    if (p.kind === "cash") cash += p.amount;
    else if (p.kind === "upi") upi += p.amount;
  }
  unused.forEach((a, i) => {
    if (i === 1 && upi === 0) upi += a;
    else cash += a;
  });
  if (cash === 0 && upi === 0 && amounts.length >= 2) return { cash: amounts[0], upi: amounts[1] };
  return { cash, upi };
}

export function parseDaybookText(text: string): ParseResult {
  const result: ParseResult = { sales: { cash: 0, upi: 0 }, costs: [], unknown: [], matched: false };
  if (!text || !text.trim()) return result;

  for (const clause of clauses(text)) {
    const amounts = findAmounts(clause);
    if (!amounts.length) continue;
    result.matched = true;
    const kind = classify(clause);

    if (kind === "cash") {
      result.sales.cash += amounts.reduce((s, a) => s + a, 0);
      continue;
    }
    if (kind === "upi") {
      result.sales.upi += amounts.reduce((s, a) => s + a, 0);
      continue;
    }
    if (kind === "sales") {
      const split = splitCashUpi(clause, amounts);
      result.sales.cash += split.cash;
      result.sales.upi += split.upi;
      continue;
    }
    if (kind === "purchase" || kind === "expense") {
      const party = partyOf(clause, kind);
      for (const amount of amounts) result.costs.push({ kind, amount, party });
      continue;
    }
    result.unknown.push({ text: clause, amount: amounts[0] });
  }
  return result;
}
