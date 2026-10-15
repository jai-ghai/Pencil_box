/**
 * Print-ready QR codes + A4 posters for Pencil Box, from the command line.
 * (The same files can be made in the browser at /qr-generator, which is easier.)
 *
 *   npm run qr -- https://YOUR-DOMAIN.in/q [--phone "98xxx xxxxx"] [--out print]
 *
 * One QR per placement (shop front, counter, bag, bill). Each adds ?src=<placement> so the QR generator can show
 * which placement gets scanned. Every PNG is decoded again before it is written, so a bad code can never be printed.
 *
 * A printed QR cannot be changed, so it points at the short address /q. Where /q leads (the homepage by default)
 * is a setting in the QR generator and can be changed any time without reprinting.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Resvg } from "@resvg/resvg-js";
import { PNG } from "pngjs";
import jsQR from "jsqr";
import { plainQrSvg, posterSvg, POSTER_H, POSTER_W } from "../src/lib/qr";

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

if (!base) {
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
    try {
      fs.rmSync(dir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
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
    const svg = posterSvg(url, { phone });
    const png = renderPosterPng(svg, 2480, Math.round((2480 * POSTER_H) / POSTER_W)); // A4 at about 300 dpi
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
