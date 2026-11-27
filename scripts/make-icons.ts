/**
 * Crisp Pencil Box mark: pencils in a yellow cup, centered on brand navy,
 * with the artwork inside the middle 64% so a maskable crop (inner ~80%) stays intact.
 */
import { writeFileSync } from "node:fs";
import sharp from "sharp";

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#153a7a"/>
  <g transform="translate(256 268)">
    <rect x="-28" y="-118" width="22" height="150" rx="6" fill="#e23d3d"/>
    <rect x="-28" y="-130" width="22" height="16" rx="3" fill="#f3c1c1"/>
    <polygon points="-28,-118 -6,-118 -17,-148" fill="#f4d35e"/>
    <rect x="-6" y="-148" width="22" height="168" rx="6" fill="#2f6fe4"/>
    <rect x="-6" y="-162" width="22" height="18" rx="3" fill="#f6c7c7"/>
    <polygon points="-6,-148 16,-148 5,-186" fill="#f4d35e"/>
    <rect x="22" y="-102" width="22" height="136" rx="6" fill="#1f9d55"/>
    <rect x="22" y="-114" width="22" height="16" rx="3" fill="#f3c1c1"/>
    <polygon points="22,-102 44,-102 33,-132" fill="#f4d35e"/>
    <rect x="-78" y="8" width="156" height="92" rx="16" fill="#ecc233"/>
    <rect x="-78" y="8" width="156" height="18" rx="8" fill="#f6e7a0"/>
    <rect x="-62" y="36" width="124" height="8" rx="3" fill="#153a7a" opacity="0.18"/>
  </g>
</svg>`;

const sizes: [string, number][] = [
  ["public/icons/icon-192.png", 192],
  ["public/icons/icon-512.png", 512],
  ["public/icons/icon-192-maskable.png", 192],
  ["public/icons/icon-512-maskable.png", 512],
  ["public/icons/apple-touch-icon.png", 180],
  ["src/app/icon.png", 512],
  ["src/app/apple-icon.png", 180],
];

const input = Buffer.from(svg);
for (const [file, size] of sizes) {
  const png = await sharp(input, { density: 384 }).resize(size, size).png().toBuffer();
  writeFileSync(file, png);
  console.log(file, png.length);
}
