const UNDER_20 = ["", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve", "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen"];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function under100(n: number): string {
  if (n < 20) return UNDER_20[n];
  const ten = TENS[Math.floor(n / 10)];
  const one = n % 10;
  return one ? `${ten} ${UNDER_20[one]}` : ten;
}

function under1000(n: number): string {
  if (n < 100) return under100(n);
  const hundred = Math.floor(n / 100);
  const rest = n % 100;
  return `${UNDER_20[hundred]} hundred${rest ? ` ${under100(rest)}` : ""}`;
}

/** Indian grouping: crore, lakh, thousand. */
function indian(n: number): string {
  if (n === 0) return "zero";
  const parts: string[] = [];
  const crore = Math.floor(n / 10_000_000);
  const lakh = Math.floor((n % 10_000_000) / 100_000);
  const thousand = Math.floor((n % 100_000) / 1000);
  const rest = n % 1000;
  if (crore) parts.push(`${under1000(crore)} crore`);
  if (lakh) parts.push(`${under100(lakh)} lakh`);
  if (thousand) parts.push(`${under1000(thousand)} thousand`);
  if (rest) parts.push(under1000(rest));
  return parts.join(" ");
}

function capitalise(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

/** "One hundred forty rupees only" for an integer paise amount. */
export function rupeesInWords(paise: number): string {
  const abs = Math.abs(Math.round(paise));
  const rupees = Math.floor(abs / 100);
  const coins = abs % 100;
  const rupeePart = rupees ? `${indian(rupees)} rupee${rupees === 1 ? "" : "s"}` : "";
  const paisePart = coins ? `${under100(coins)} paise` : "";
  const body = [rupeePart, paisePart].filter(Boolean).join(" and ") || "zero rupees";
  return capitalise(`${paise < 0 ? "minus " : ""}${body} only`);
}
