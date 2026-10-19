import QRCode from "qrcode";

/**
 * QR code and A4 poster artwork as SVG. Runs in the browser (the QR generator page) and in Node (`npm run qr`).
 */
const NAVY = "#12296b";
const NAVY_DARK = "#0b1d52";
const YELLOW = "#ffd500";
const CREAM = "#f7f3ea";
export const QR_INK = "#0b1d52";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Vector QR as one path, with the standard 4-module quiet zone included. Level Q survives a scuffed wall poster. */
export function qrPath(text: string): { d: string; size: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  const quiet = 4;
  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.modules.get(x, y)) {
        x++;
        continue;
      }
      let run = 1;
      while (x + run < n && qr.modules.get(x + run, y)) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { d, size: n + quiet * 2 };
}

/** Plain QR on white, for stickers, bags and bills. */
export function plainQrSvg(text: string): string {
  const { d, size } = qrPath(text);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="${QR_INK}"/></svg>`;
}

const FONT = "Segoe UI, Arial, sans-serif";
/** Hindi runs use ONE Devanagari font so letters and matras are shaped together (mixed fallback garbles words). */
const HINDI = "Nirmala UI, Mangal, sans-serif";

export const POSTER_W = 2100;
export const POSTER_H = 2970;

/** A4 poster (2100 x 2970 units): shop name, "scan for products and today's offers" in English and Hindi, the QR, the six categories. */
export function posterSvg(url: string, opts: { phone?: string } = {}): string {
  const { phone } = opts;
  const { d, size } = qrPath(url);
  const W = POSTER_W;
  const H = POSTER_H;
  const qrBox = 1100;
  const scale = qrBox / size;
  const qx = (W - qrBox) / 2;
  const qy = 1010;
  const cats = ["Notebooks & Registers", "Pens & Pencils", "Art & Craft", "School Supplies", "Gifts & More", "Printing & Photocopy"];
  const chips = cats
    .map((c, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const cw = 600;
      const gap = 40;
      const x0 = (W - (cw * 3 + gap * 2)) / 2;
      const x = x0 + col * (cw + gap);
      const y = 2480 + row * 130;
      return `<rect x="${x}" y="${y}" width="${cw}" height="110" rx="26" fill="${CREAM}"/><text x="${x + cw / 2}" y="${y + 72}" text-anchor="middle" font-size="40" font-weight="800" fill="${NAVY}">${esc(c)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="${NAVY}"/>
  <circle cx="${W / 2}" cy="620" r="900" fill="${NAVY_DARK}" opacity="0.35"/>
  <text x="${W / 2}" y="470" text-anchor="middle" font-size="330" font-weight="900" letter-spacing="6" fill="#fff" stroke="${NAVY_DARK}" stroke-width="10" paint-order="stroke"><tspan>PENCIL </tspan><tspan fill="${YELLOW}">BOX</tspan></text>
  <text x="${W / 2}" y="600" text-anchor="middle" font-size="72" font-style="italic" fill="#fff">Write  •  Create  •  Learn  •  Grow</text>
  <rect x="${W / 2 - 430}" y="670" width="860" height="130" rx="65" fill="${YELLOW}"/>
  <text x="${W / 2}" y="760" text-anchor="middle" font-size="64" font-weight="800" letter-spacing="4" fill="${NAVY_DARK}">STATIONERY &amp; MORE</text>
  <text x="${W / 2}" y="910" text-anchor="middle" font-size="86" font-weight="900" fill="#fff">SCAN FOR PRODUCTS &amp; TODAY'S OFFERS</text>
  <text x="${W / 2}" y="985" text-anchor="middle" font-size="56" font-family="${HINDI}" fill="${YELLOW}">सामान और आज के ऑफ़र देखने के लिए स्कैन करें</text>
  <rect x="${qx - 70}" y="${qy + 10}" width="${qrBox + 140}" height="${qrBox + 140}" rx="70" fill="${YELLOW}"/>
  <rect x="${qx - 40}" y="${qy + 40}" width="${qrBox + 80}" height="${qrBox + 80}" rx="50" fill="#fff"/>
  <g transform="translate(${qx} ${qy + 80}) scale(${scale})" shape-rendering="crispEdges"><path d="${d}" fill="${QR_INK}"/></g>
  <text x="${W / 2}" y="${qy + qrBox + 250}" text-anchor="middle" font-size="60" font-weight="800" fill="#fff">Pick the items you want. Pay and collect in store.</text>
  <text x="${W / 2}" y="${qy + qrBox + 320}" text-anchor="middle" font-size="50" font-family="${HINDI}" fill="${YELLOW}">आइटम चुनें और दुकान से ले जाएं</text>
  ${chips}
  <rect y="2790" width="${W}" height="180" fill="${YELLOW}"/>
  <text x="${W / 2}" y="${phone ? 2865 : 2905}" text-anchor="middle" font-size="62" font-weight="900" fill="${NAVY_DARK}">Notebooks · Pens · Art · Gifts · Printing &amp; Photocopy</text>
  ${phone ? `<text x="${W / 2}" y="2935" text-anchor="middle" font-size="64" font-weight="900" fill="${NAVY_DARK}">CALL NOW  ${esc(phone)}</text>` : ""}
</svg>`;
}
