/**
 * Print-ready QR codes + A4 posters for Pencil Box.
 *
 *   npm run qr -- https://YOUR-DOMAIN.in/q [--phone "98xxx xxxxx"] [--out print]
 *
 * One QR per placement (shop front, counter, bag, bill). Each adds ?src=<placement> so the dashboard can later show
 * which placement gets scanned. Every PNG is decoded again before it is written, so a bad code can never be printed.
 *
 * IMPORTANT: a printed QR cannot be changed. Use your final domain (ideally a short path like /q that the website
 * redirects to the shop page, so the destination can change later without reprinting).
 */
import fs from "node:fs";
import os from "node:os";
import { execFileSync } from "node:child_process";
import path from "node:path";
import QRCode from "qrcode";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import jsQR from "jsqr";

const NAVY = "#12296b";
const NAVY_DARK = "#0b1d52";
const YELLOW = "#ffd500";
const CREAM = "#f7f3ea";
const QR_INK = "#0b1d52";

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const positional: string[] = [];
for (let i = 0; i < args.length; i++) (args[i].startsWith("--") ? i++ : positional.push(args[i]));
const base = positional[0];
const phone = flag("phone");
const outDir = flag("out") ?? "print";

if (!base || base.startsWith("--")) {
  console.error('Usage: npm run qr -- https://YOUR-DOMAIN.in/q [--phone "..."] [--out print]');
  process.exit(1);
}
let baseUrl: URL;
try {
  baseUrl = new URL(base);
} catch {
  console.error(`"${base}" is not a valid URL. Include https://`);
  process.exit(1);
}
if (baseUrl.protocol !== "https:") {
  console.error("Use an https:// address.");
  process.exit(1);
}
if (/^(localhost|127\.|10\.|192\.168\.|0\.0\.0\.0)/.test(baseUrl.hostname)) {
  console.error("That address only works on your own computer. A printed QR must use the public website address.");
  process.exit(1);
}
if (/\.vercel\.app$/.test(baseUrl.hostname)) console.warn("Warning: a vercel.app address can change. Use your own domain for anything you print.");

const PLACEMENTS = [
  { key: "front", title: "Shop front", poster: true },
  { key: "counter", title: "Counter", poster: true },
  { key: "bag", title: "Carry bag", poster: false },
  { key: "bill", title: "Bill / receipt", poster: false },
] as const;

const urlFor = (key: string) => {
  const u = new URL(baseUrl);
  u.searchParams.set("src", key);
  return u.toString();
};
const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Vector QR: one path, quiet zone of 4 modules (the standard minimum) included. */
function qrPath(text: string): { d: string; size: number } {
  const qr = QRCode.create(text, { errorCorrectionLevel: "Q" });
  const n = qr.modules.size;
  const quiet = 4;
  let d = "";
  for (let y = 0; y < n; y++) {
    let x = 0;
    while (x < n) {
      if (!qr.modules.get(x, y)) { x++; continue; }
      let run = 1;
      while (x + run < n && qr.modules.get(x + run, y)) run++;
      d += `M${x + quiet} ${y + quiet}h${run}v1h-${run}z`;
      x += run;
    }
  }
  return { d, size: n + quiet * 2 };
}

function plainQrSvg(text: string): string {
  const { d, size } = qrPath(text);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path d="${d}" fill="${QR_INK}"/></svg>`;
}

const FONT = "Segoe UI, Arial, sans-serif";
/** Hindi runs use ONE Devanagari font so letters and matras are shaped together (mixed fallback garbles words). */
const HINDI = "Nirmala UI, Mangal, sans-serif";

function posterSvg(text: string, placementTitle: string): string {
  const { d, size } = qrPath(text);
  const W = 2100, H = 2970;
  const qrBox = 1100;
  const scale = qrBox / size;
  const qx = (W - qrBox) / 2, qy = 1010;
  const cats = ["Notebooks & Registers", "Pens & Pencils", "Art & Craft", "School Supplies", "Gifts & More", "Printing & Photocopy"];
  const chips = cats
    .map((c, i) => {
      const col = i % 3, row = Math.floor(i / 3);
      const cw = 600, gap = 40, x0 = (W - (cw * 3 + gap * 2)) / 2;
      const x = x0 + col * (cw + gap), y = 2480 + row * 130;
      return `<rect x="${x}" y="${y}" width="${cw}" height="110" rx="26" fill="${CREAM}"/><text x="${x + cw / 2}" y="${y + 72}" text-anchor="middle" font-size="40" font-weight="800" fill="${NAVY}">${esc(c)}</text>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" font-family="${FONT}">
  <rect width="${W}" height="${H}" fill="${NAVY}"/>
  <circle cx="${W / 2}" cy="620" r="900" fill="${NAVY_DARK}" opacity="0.35"/>
  <!-- wordmark -->
  <text x="${W / 2}" y="470" text-anchor="middle" font-size="330" font-weight="900" letter-spacing="6" fill="#fff" stroke="${NAVY_DARK}" stroke-width="10" paint-order="stroke"><tspan>PENCIL </tspan><tspan fill="${YELLOW}">BOX</tspan></text>
  <text x="${W / 2}" y="600" text-anchor="middle" font-size="72" font-style="italic" fill="#fff">Write  •  Create  •  Learn  •  Grow</text>
  <rect x="${W / 2 - 430}" y="670" width="860" height="130" rx="65" fill="${YELLOW}"/>
  <text x="${W / 2}" y="760" text-anchor="middle" font-size="64" font-weight="800" letter-spacing="4" fill="${NAVY_DARK}">STATIONERY &amp; MORE</text>
  <!-- call to action -->
  <text x="${W / 2}" y="930" text-anchor="middle" font-size="86" font-weight="900" fill="#fff">SCAN TO SEE OUR PRODUCTS</text>
  <text x="${W / 2}" y="1000" text-anchor="middle" font-size="58" font-family="${HINDI}" fill="${YELLOW}">सभी सामान देखने के लिए स्कैन करें</text>
  <!-- QR card -->
  <rect x="${qx - 70}" y="${qy + 10}" width="${qrBox + 140}" height="${qrBox + 140}" rx="70" fill="${YELLOW}"/>
  <rect x="${qx - 40}" y="${qy + 40}" width="${qrBox + 80}" height="${qrBox + 80}" rx="50" fill="#fff"/>
  <g transform="translate(${qx} ${qy + 80}) scale(${scale})" shape-rendering="crispEdges"><path d="${d}" fill="${QR_INK}"/></g>
  <text x="${W / 2}" y="${qy + qrBox + 250}" text-anchor="middle" font-size="60" font-weight="800" fill="#fff">Pick the items you want. Pay and collect in store.</text>
  <text x="${W / 2}" y="${qy + qrBox + 320}" text-anchor="middle" font-size="50" font-family="${HINDI}" fill="${YELLOW}">आइटम चुनें और दुकान से ले जाएं</text>
  ${chips}
  <!-- footer -->
  <rect y="2790" width="${W}" height="180" fill="${YELLOW}"/>
  <text x="${W / 2}" y="${phone ? 2865 : 2905}" text-anchor="middle" font-size="62" font-weight="900" fill="${NAVY_DARK}">Notebooks · Pens · Art · Gifts · Printing &amp; Photocopy</text>
  ${phone ? `<text x="${W / 2}" y="2935" text-anchor="middle" font-size="64" font-weight="900" fill="${NAVY_DARK}">CALL NOW  ${esc(phone)}</text>` : ""}
  <text x="40" y="${H - 14}" font-size="1" fill="${YELLOW}">${esc(placementTitle)}</text>
</svg>`;
}

function render(svg: string, widthPx: number): Buffer {
  const r = new Resvg(svg, { fitTo: { mode: "width", value: widthPx }, background: "#ffffff", font: { loadSystemFonts: true, defaultFontFamily: "Segoe UI" } });
  return r.render().asPng();
}

/**
 * Posters contain Hindi, which needs a real text-shaping engine. The built-in rasteriser mangles some Devanagari
 * words, so posters are rendered by an installed Edge/Chrome. Returns null if none is found.
 */
function findBrowser(): string | null {
  const c = [
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/usr/bin/microsoft-edge",
  ];
  return c.find((p) => fs.existsSync(p)) ?? null;
}

function renderPosterPng(svg: string, w: number, h: number): Buffer | null {
  const browser = findBrowser();
  if (!browser) return null;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pb-poster-"));
  const html = path.join(dir, "p.html");
  const png = path.join(dir, "p.png");
  fs.writeFileSync(html, `<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff">${svg.replace("<svg ", `<svg width="${w}" height="${h}" style="display:block" `)}</body>`);
  try {
    execFileSync(browser, ["--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1", `--window-size=${w},${h}`, `--screenshot=${png}`, "file:///" + html.split(path.sep).join("/")], { stdio: "ignore", timeout: 60000 });
    return fs.readFileSync(png);
  } catch {
    return null;
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

/** Decode a PNG with an independent QR reader and return the text, or null. */
function decode(png: Buffer): string | null {
  const img = PNG.sync.read(png);
  return jsQR(new Uint8ClampedArray(img.data), img.width, img.height)?.data ?? null;
}

fs.mkdirSync(outDir, { recursive: true });
const report: string[] = [];
for (const p of PLACEMENTS) {
  const url = urlFor(p.key);

  const plain = plainQrSvg(url);
  const plainPng = render(plain, 1600);
  if (decode(plainPng) !== url) throw new Error(`QR self-check FAILED for ${p.key}. Nothing was written for it.`);
  fs.writeFileSync(path.join(outDir, `qr-${p.key}.svg`), plain);
  fs.writeFileSync(path.join(outDir, `qr-${p.key}.png`), plainPng);
  report.push(`qr-${p.key}.svg / .png`);

  if (p.poster) {
    const svg = posterSvg(url, p.title);
    const png = renderPosterPng(svg, 2480, 3507); // A4 at about 300 dpi
    if (png && decode(png) !== url) throw new Error(`Poster self-check FAILED for ${p.key}. Nothing was written for it.`);
    fs.writeFileSync(path.join(outDir, `poster-${p.key}-A4.svg`), svg);
    if (png) fs.writeFileSync(path.join(outDir, `poster-${p.key}-A4.png`), png);
    else console.warn(`No Edge/Chrome found: wrote poster-${p.key}-A4.svg only (open it in a browser and Print to PDF).`);
    report.push(`poster-${p.key}-A4.svg${png ? " / .png" : ""}`);
  }
}
console.log(`Written to ./${outDir} (every file decoded back to its URL successfully):`);
for (const r of report) console.log("  " + r);
console.log(`Each QR opens: ${baseUrl.toString()}?src=front | counter | bag | bill`);
