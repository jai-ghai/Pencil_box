/**
 * Cuts the brand artwork out of the shop poster: wordmark, mascot and the six category icons, with transparent
 * backgrounds. The poster itself and its phone number are NOT copied into the project.
 *
 *   node scripts/make-brand-assets.mjs path/to/poster.jpg
 *
 * The poster is small (853 px wide), so these are fine for screens but too soft for large print. For print, use the
 * designer's original logo file.
 */
import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error("Usage: node scripts/make-brand-assets.mjs path/to/poster.jpg");
  process.exit(1);
}
const out = path.join("public", "brand");
fs.mkdirSync(out, { recursive: true });

const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const px = (x, y) => [data[(y * W + x) * 3], data[(y * W + x) * 3 + 1], data[(y * W + x) * 3 + 2]];

/** The poster background is a vertical gradient: estimate it per row from the empty left and right margins. */
function rowBackground(y) {
  const samples = [];
  for (let x = 4; x < 36; x++) samples.push(px(x, y));
  for (let x = W - 36; x < W - 4; x++) samples.push(px(x, y));
  return [0, 1, 2].map((c) => samples.reduce((s, p) => s + p[c], 0) / samples.length);
}
const smooth = (a, b, v) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Cut a rectangle and make the gradient background transparent (distance from the row's background colour). */
async function keyed(name, left, top, width, height, lo, hi, scale = 2) {
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    const bg = rowBackground(top + y);
    for (let x = 0; x < width; x++) {
      const p = px(left + x, top + y);
      const d = Math.hypot(p[0] - bg[0], p[1] - bg[1], p[2] - bg[2]);
      const i = (y * width + x) * 4;
      rgba[i] = p[0]; rgba[i + 1] = p[1]; rgba[i + 2] = p[2];
      rgba[i + 3] = Math.round(255 * smooth(lo, hi, d));
    }
  }
  await sharp(rgba, { raw: { width, height, channels: 4 } }).resize(width * scale, height * scale, { kernel: "lanczos3" }).png({ compressionLevel: 9 }).toFile(path.join(out, name));
}

/** Cut a circle (the category icons are coloured discs). Resize first, then mask at the final size. */
async function disc(name, cx, cy, r, size = 192) {
  const base = await sharp(src).extract({ left: cx - r, top: cy - r, width: r * 2, height: r * 2 }).resize(size, size, { kernel: "lanczos3" }).ensureAlpha().png().toBuffer();
  const mask = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1}" fill="#fff"/></svg>`);
  await sharp(base).composite([{ input: mask, blend: "dest-in" }]).png({ compressionLevel: 9 }).toFile(path.join(out, name));
}

await keyed("wordmark.png", 62, 340, 735, 128, 28, 70);
await keyed("mascot.png", 238, 4, 372, 350, 48, 85);

const ICONS = { notebooks: [115, 685], pens: [502, 685], art: [115, 842], school: [502, 842], gifts: [115, 998], printing: [502, 998] };
for (const [k, [cx, cy]] of Object.entries(ICONS)) await disc(`cat-${k}.png`, cx, cy, 46);

// The colour strip under each category tile on the poster (used as the tile accent)
const accents = {};
const tileBottom = { notebooks: [232, 753], pens: [620, 753], art: [232, 910], school: [620, 910], gifts: [232, 1066], printing: [620, 1066] };
for (const [k, [x, y]] of Object.entries(tileBottom)) {
  const [r, g, b] = px(x, y);
  accents[k] = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
}
fs.writeFileSync(path.join(out, "accents.json"), JSON.stringify(accents, null, 2) + "\n");

// Sampled navy at the top of the poster, to keep the app header in step with the logo
const navy = px(30, 30);
fs.writeFileSync(path.join(out, "poster-navy.txt"), "#" + navy.map((v) => v.toString(16).padStart(2, "0")).join("") + "\n");

// Favicon and app icon: the mascot on the brand navy
const navyHex = { r: 18, g: 41, b: 107 };
const mascot = await sharp(path.join(out, "mascot.png")).toBuffer();
for (const [file, size] of [["src/app/icon.png", 192], ["src/app/apple-icon.png", 180]]) {
  const inner = Math.round(size * 0.82);
  const m = await sharp(mascot).resize(inner, inner, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { ...navyHex, alpha: 1 } } })
    .composite([{ input: m, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(file);
}
console.log("written to public/brand and src/app (icon.png, apple-icon.png)");
console.log("tile accents:", JSON.stringify(accents));
