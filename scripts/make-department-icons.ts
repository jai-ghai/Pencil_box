import { writeFileSync } from "node:fs";
import { DEPARTMENTS, HOME_LINKS } from "../src/lib/departments";

const slugs = [...new Set([...DEPARTMENTS.map((d) => d.slug), ...HOME_LINKS.map((h) => h.slug)])];

function hash(s: string): number {
  return [...s].reduce((n, c) => n + c.charCodeAt(0), 0);
}

function svg(slug: string): string {
  const n = hash(slug);
  const fills = ["#153a7a", "#e23d3d", "#2f6fe4", "#1f9d55", "#ecc233", "#f3a6b8", "#e7c4a0"];
  const a = fills[n % fills.length];
  const b = fills[(n + 3) % fills.length];
  const kind = n % 6;
  const shape =
    kind === 0 ? `<rect x="48" y="46" width="104" height="108" rx="16" fill="${a}"/><rect x="68" y="66" width="64" height="12" rx="4" fill="${b}"/>`
    : kind === 1 ? `<rect x="70" y="36" width="28" height="128" rx="8" fill="${a}"/><polygon points="70,164 98,164 84,184" fill="${b}"/>`
    : kind === 2 ? `<circle cx="100" cy="100" r="58" fill="${a}"/><rect x="72" y="88" width="56" height="24" rx="8" fill="${b}"/>`
    : kind === 3 ? `<rect x="40" y="70" width="120" height="70" rx="10" fill="${a}"/><rect x="58" y="48" width="84" height="28" rx="8" fill="${b}"/>`
    : kind === 4 ? `<rect x="46" y="40" width="108" height="120" rx="8" fill="${a}"/><rect x="62" y="58" width="76" height="8" fill="${b}"/><rect x="62" y="78" width="76" height="8" fill="${b}"/>`
    : `<rect x="36" y="90" width="128" height="28" rx="8" fill="${a}"/><circle cx="64" cy="104" r="16" fill="${b}"/><circle cx="136" cy="104" r="16" fill="${b}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#ffffff"/>${shape}</svg>\n`;
}

for (const slug of slugs) {
  writeFileSync(`public/category/${slug}.svg`, svg(slug));
  console.log(slug);
}
