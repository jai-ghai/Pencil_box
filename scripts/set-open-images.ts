/**
 * Finds free-to-use pictures (Openverse, CC0 / public domain only, so no credit is needed) for items that still have none,
 * shows them on a contact sheet, and attaches the ones you pick.
 *
 *   npm run images:open                              SEARCH: writes print/image-check/open-candidates.jpg and data/open-candidates.json
 *   npm run images:open -- --pick "Toy Car=2,Rubber Ball=1"   ATTACH candidate numbers (1-6) to those targets
 *
 * Only products that have no picture yet are changed. Pictures are marked "generic" (the site says "picture is for illustration").
 */
import fs from "node:fs";
import path from "node:path";
import dns from "node:dns";
import net from "node:net";
import dotenv from "dotenv";
import mongoose from "mongoose";
import sharp, { type OverlayOptions } from "sharp";

dns.setDefaultResultOrder("ipv4first");
net.setDefaultAutoSelectFamily(false);
dotenv.config({ path: ".env" });
const { Product } = await import("../src/lib/models/index");
const { saveProductImage } = await import("../src/lib/storage");

/** target name, which of our products it is for, and what to search for */
const TARGETS: { name: string; match: RegExp; q: string }[] = [
  { name: "Rubber Ball", match: /^Rubber Ball/, q: "rubber ball" },
  { name: "Plastic Ball", match: /^Plastic Ball/, q: "plastic toy ball" },
  { name: "Smile Ball", match: /^Smile Ball/, q: "smiley face ball" },
  { name: "Toy Car", match: /^Toy Car$/, q: "toy car" },
  { name: "Skipping Rope", match: /^Digital Skipping Rope/, q: "skipping rope" },
  { name: "Water Beads", match: /^Water Jelly Balls/, q: "water beads" },
  { name: "Toy Gun", match: /^Machis Gun Big/, q: "toy gun plastic" },
  { name: "Hand Fan", match: /^Mini Hand Fan/, q: "handheld mini fan" },
  { name: "Toy Phone", match: /^Barbie Phone/, q: "toy mobile phone" },
  { name: "Slime", match: /^Crystal Slime \(24/, q: "slime toy" },
  { name: "Torch", match: /^Torch$/, q: "flashlight torch" },
  { name: "Battery", match: /^Cell$/, q: "AA battery" },
  { name: "Battery 9V", match: /^Battery 9V/, q: "9 volt battery" },
];

interface Cand { title: string; creator: string; license: string; url: string; thumb: string; landing: string }
const UA = "PencilBoxCatalogue/1.0 (small shop catalogue)";
const candFile = "data/open-candidates.json";

interface OvResult { title?: string; creator?: string; license: string; url: string; thumbnail?: string; foreign_landing_url?: string }
async function getJson(url: string): Promise<{ results?: OvResult[] } | null> {
  for (let a = 0; a < 4; a++) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 25000);
      const r = await fetch(url, { headers: { "User-Agent": UA }, signal: ctl.signal });
      clearTimeout(timer);
      if (r.ok) return await r.json();
    } catch { /* retry */ }
    await new Promise((s) => setTimeout(s, 1500 * (a + 1)));
  }
  return null;
}
async function getBuf(url: string): Promise<Buffer | null> {
  for (let a = 0; a < 3; a++) {
    try {
      const r = await fetch(url, { headers: { "User-Agent": UA } });
      if (r.ok) return Buffer.from(await r.arrayBuffer());
    } catch { /* retry */ }
    await new Promise((s) => setTimeout(s, 1000 * (a + 1)));
  }
  return null;
}

const pick = process.argv.includes("--pick") ? process.argv[process.argv.indexOf("--pick") + 1] : null;

if (!pick) {
  const out: Record<string, Cand[]> = {};
  for (const t of TARGETS) {
    const j = await getJson(`https://api.openverse.org/v1/images/?q=${encodeURIComponent(t.q)}&license=cc0,pdm&page_size=6&mature=false&category=photograph`);
    out[t.name] = (j?.results ?? []).map((r) => ({ title: String(r.title ?? "").replace(/<[^>]*>/g, "").slice(0, 80), creator: String(r.creator ?? "unknown"), license: String(r.license), url: r.url, thumb: r.thumbnail ?? r.url, landing: r.foreign_landing_url ?? "" }));
    console.log(`${t.name}: ${out[t.name].length} candidates`);
  }
  fs.writeFileSync(candFile, JSON.stringify(out, null, 1));
  const dir = path.join("print", "image-check");
  fs.mkdirSync(dir, { recursive: true });
  const T = 150, N = 6, LH = 20;
  const esc = (s: string) => s.slice(0, 22).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const layers: OverlayOptions[] = [];
  let row = 0;
  for (const t of TARGETS) {
    const list = out[t.name];
    layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T * N}" height="${LH}"><text x="3" y="15" font-size="14" font-weight="700" font-family="Segoe UI, Arial" fill="#0b1d52">${esc(t.name)}</text></svg>`), left: 0, top: row * (T + LH * 2) });
    for (let i = 0; i < list.length; i++) {
      const buf = await getBuf(list[i].thumb);
      if (!buf) continue;
      try {
        const tile = await sharp(buf).rotate().resize(T - 6, T - 6, { fit: "contain", background: "#fff" }).png().toBuffer();
        layers.push({ input: tile, left: i * T + 3, top: row * (T + LH * 2) + LH });
        layers.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${T}" height="${LH}"><text x="3" y="14" font-size="12" font-family="Segoe UI, Arial" fill="#444">#${i + 1} ${esc(list[i].title)}</text></svg>`), left: i * T, top: row * (T + LH * 2) + LH + T });
      } catch { /* unreadable image: skip */ }
    }
    row++;
  }
  await sharp({ create: { width: T * N, height: row * (T + LH * 2), channels: 3, background: "#ffffff" } }).composite(layers).jpeg({ quality: 80 }).toFile(path.join(dir, "open-candidates.jpg"));
  console.log(`contact sheet: ${dir}/open-candidates.jpg . Choose numbers, then run with --pick "Toy Car=2,Rubber Ball=1"`);
  process.exit(0);
}

/* attach the chosen candidates */
await mongoose.connect(process.env.MONGODB_URI!);
const cands: Record<string, Cand[]> = JSON.parse(fs.readFileSync(candFile, "utf8"));
let done = 0;
for (const part of pick.split(",")) {
  const [name, nStr] = part.split("=").map((s) => s.trim());
  const t = TARGETS.find((x) => x.name === name);
  const c = cands[name]?.[parseInt(nStr, 10) - 1];
  if (!t || !c) { console.log(`skip "${part}": no such target or number`); continue; }
  const buf = (await getBuf(c.url)) ?? (await getBuf(c.thumb));
  if (!buf) { console.log(`could not download ${name} #${nStr}`); continue; }
  const jpeg = await sharp(buf).rotate().resize({ width: 900, height: 900, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  const url = await saveProductImage(jpeg);
  const res = await Product.updateMany({ name_en: t.match, "images.0": { $exists: false } }, { $set: { images: [url], imageGeneric: true, imageSource: `${c.title} by ${c.creator} (${c.license}, Openverse) ${c.landing}`.slice(0, 480) } });
  console.log(`${name}: attached to ${res.modifiedCount} product(s)`);
  done += res.modifiedCount;
}
console.log(`${done} product(s) updated`);
await mongoose.disconnect();
