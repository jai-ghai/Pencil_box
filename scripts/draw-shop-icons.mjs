/**
 * Original flat-duotone drawings for the shop shelves.
 * Navy and yellow, rounded shapes, a small highlight. No copied artwork.
 */
import { writeFileSync, mkdirSync } from "node:fs";

const HOME = ["notebooks", "pens", "school", "writing", "office", "paper", "art", "tapes", "gifts", "toys", "printing"];

const N = "#153a7a";
const D = "#0e2c5c";
const Y = "#ecc233";
const Y2 = "#f6e7a0";
const P = "#f7f4ee";
const K = "#1c2433";
const C = "#e36b5a";
const T = "#1f7a6b";
const W = "#ffffff";

const r = (x, y, w, h, rx, fill, extra = "") => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" ${extra}/>`;
const c = (cx, cy, rad, fill) => `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${fill}"/>`;
const e = (cx, cy, rx, ry, fill) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"/>`;
const p = (d, fill) => `<path d="${d}" fill="${fill}"/>`;
const hi = (x, y, w, h) => r(x, y, w, h, 3, W, 'opacity="0.45"');

function svg(title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" fill="none"><title>${title}</title>${body}</svg>\n`;
}

const icons = {
  notebooks: svg("notebooks", [
    r(58, 46, 92, 118, 8, D),
    r(66, 40, 84, 122, 8, N),
    ...[58, 74, 90, 106, 122].map((y) => c(62, y, 4, Y)),
    r(78, 58, 58, 8, 3, Y2),
    r(78, 76, 50, 6, 2, P),
    r(78, 92, 58, 6, 2, P),
    r(78, 108, 40, 6, 2, P),
    hi(74, 48, 18, 70),
  ].join("")),
  pens: svg("pens", [
    `<g transform="rotate(-28 78 110)">`,
    r(62, 36, 22, 108, 8, N),
    r(62, 36, 22, 22, 8, Y),
    p("M62 144h22l-11 24z", D),
    hi(68, 62, 6, 50),
    `</g><g transform="rotate(24 128 108)">`,
    r(116, 44, 18, 96, 7, C),
    r(116, 44, 18, 16, 6, Y2),
    p("M116 140h18l-9 18z", D),
    `</g>`,
  ].join("")),
  school: svg("school", [
    p("M46 96h108l10 16v46a12 12 0 0 1-12 12H48a12 12 0 0 1-12-12v-46z", N),
    p("M52 96c10-36 86-36 96 0", D),
    r(86, 78, 28, 22, 6, Y),
    r(96, 84, 8, 10, 2, D),
    r(64, 124, 72, 22, 6, Y2),
    hi(58, 112, 16, 28),
  ].join("")),
  writing: svg("writing", [
    `<g transform="rotate(-38 92 112)">`,
    r(78, 34, 28, 112, 8, Y),
    r(78, 34, 28, 22, 8, D),
    p("M78 146h28l-14 28z", N),
    r(86, 62, 12, 8, 2, W, 'opacity="0.7"'),
    `</g>`,
    r(128, 118, 36, 22, 6, C),
    hi(134, 122, 16, 6),
  ].join("")),
  office: svg("office", [
    r(34, 58, 86, 98, 8, Y),
    r(46, 72, 62, 8, 2, W, 'opacity="0.8"'),
    r(46, 88, 48, 6, 2, D),
    r(46, 102, 54, 6, 2, N),
    r(108, 96, 62, 36, 8, N),
    r(122, 86, 28, 16, 4, D),
    c(154, 112, 5, Y),
    hi(116, 104, 22, 6),
  ].join("")),
  paper: svg("paper", [
    r(78, 40, 70, 96, 4, "#d5deea"),
    r(64, 52, 70, 96, 4, P),
    r(50, 64, 70, 96, 4, W),
    r(62, 82, 44, 5, 2, N),
    r(62, 96, 38, 5, 2, "#c5d0e0"),
    r(62, 110, 44, 5, 2, "#c5d0e0"),
    hi(56, 72, 12, 60),
  ].join("")),
  art: svg("art", [
    e(78, 124, 36, 28, Y),
    c(64, 116, 8, C),
    c(86, 112, 8, T),
    c(74, 132, 8, N),
    c(96, 128, 7, "#7c4dbe"),
    `<g transform="rotate(32 132 80)">`,
    r(124, 36, 12, 78, 4, D),
    r(124, 36, 12, 16, 4, C),
    `</g>`,
    `<g transform="rotate(18 150 96)">`,
    r(144, 48, 10, 70, 4, N),
    r(144, 48, 10, 14, 4, Y),
    `</g>`,
  ].join("")),
  tapes: svg("tapes", [
    c(78, 108, 42, N),
    c(78, 108, 24, Y),
    c(78, 108, 10, P),
    p("M110 92h46a8 8 0 0 1 8 8v28a8 8 0 0 1-8 8h-28z", Y2),
    r(124, 70, 22, 28, 6, C),
    hi(130, 76, 8, 14),
  ].join("")),
  gifts: svg("gifts", [
    r(44, 92, 112, 68, 8, N),
    r(36, 74, 128, 26, 6, Y),
    r(92, 74, 16, 86, 2, C),
    p("M100 74c-18-30-46-18-30 0 8 8 30 0 30 0s18 10 30 0c14-18-14-30-30 0z", D),
    hi(52, 100, 22, 10),
  ].join("")),
  toys: svg("toys", [
    c(62, 62, 16, Y),
    c(138, 62, 16, Y),
    e(100, 108, 48, 42, N),
    e(100, 118, 22, 16, Y2),
    c(84, 102, 5, K),
    c(116, 102, 5, K),
    p("M92 118h16l-8 8z", C),
    r(58, 124, 18, 28, 8, D),
    r(124, 124, 18, 28, 8, D),
    e(78, 156, 14, 10, Y),
    e(122, 156, 14, 10, Y),
  ].join("")),
  printing: svg("printing", [
    r(62, 36, 76, 34, 4, P),
    r(48, 66, 104, 58, 12, N),
    r(66, 112, 68, 46, 3, W),
    r(74, 122, 40, 4, 2, "#c5d0e0"),
    r(74, 132, 32, 4, 2, "#c5d0e0"),
    c(132, 90, 7, Y),
    hi(58, 76, 20, 10),
  ].join("")),
  "pencil-box": svg("pencil-box", [
    r(40, 70, 120, 78, 10, N),
    r(40, 70, 120, 22, 8, Y),
    r(88, 76, 24, 10, 3, D),
    r(58, 108, 84, 8, 3, Y2),
    hi(50, 96, 18, 30),
  ].join("")),
  "pencil-pouch": svg("pencil-pouch", [
    r(46, 64, 108, 86, 16, N),
    r(46, 64, 108, 18, 8, Y),
    p("M58 82h84", N),
    r(70, 96, 60, 8, 3, Y2),
    c(100, 118, 6, C),
  ].join("")),
  "geometry-box": svg("geometry-box", [
    r(36, 78, 128, 70, 8, N),
    r(36, 78, 128, 16, 6, Y),
    p("M58 150l46-58 8 6-46 58z", P),
    p("M112 96l28 40h-22z", C),
    hi(46, 100, 16, 24),
  ].join("")),
  "scale-ruler": svg("scale-ruler", [
    `<g transform="rotate(-28 100 100)">`,
    r(36, 86, 128, 28, 6, Y),
    r(36, 86, 128, 8, 4, N),
    ...[52, 68, 84, 100, 116, 132].map((x) => r(x, 98, 3, x % 32 === 4 ? 12 : 8, 1, D)),
    `</g>`,
  ].join("")),
  "exam-pad": svg("exam-pad", [
    r(48, 36, 104, 132, 10, N),
    r(60, 52, 80, 100, 4, P),
    c(100, 44, 8, Y),
    r(72, 68, 56, 5, 2, "#c5d0e0"),
    r(72, 82, 48, 5, 2, "#c5d0e0"),
    r(72, 96, 56, 5, 2, "#c5d0e0"),
  ].join("")),
  "bottle-lunch": svg("bottle-lunch", [
    r(40, 70, 52, 78, 12, T),
    r(52, 52, 28, 22, 6, N),
    hi(48, 84, 10, 36),
    r(104, 78, 58, 70, 10, Y),
    r(104, 78, 58, 16, 6, N),
    hi(112, 102, 16, 24),
  ].join("")),
  "slate-duster": svg("slate-duster", [
    r(36, 48, 92, 104, 6, D),
    r(46, 58, 72, 84, 4, "#24344a"),
    r(56, 78, 40, 4, 2, Y2),
    r(118, 96, 46, 28, 6, Y),
    r(124, 88, 10, 16, 3, N),
  ].join("")),
  highlighter: svg("highlighter", [
    `<g transform="rotate(-36 100 110)">`,
    r(78, 36, 40, 100, 10, Y),
    r(78, 36, 40, 28, 8, N),
    p("M78 136h40l-20 28z", D),
    hi(86, 70, 10, 40),
    `</g>`,
  ].join("")),
  marker: svg("marker", [
    `<g transform="rotate(-20 80 110)">`,
    r(68, 40, 24, 100, 8, N),
    r(68, 124, 24, 18, 4, K),
    `</g><g transform="rotate(16 126 108)">`,
    r(114, 46, 22, 92, 8, C),
    r(114, 122, 22, 16, 4, K),
    `</g>`,
  ].join("")),
  "sketch-pens": svg("sketch-pens", [
    ...[["#e36b5a", 48], ["#ecc233", 78], ["#1f7a6b", 108], ["#153a7a", 138]].map(([fill, x]) => r(x, 40, 16, 112, 6, fill) + r(x, 136, 16, 16, 3, K)),
  ].join("")),
  "correction-tape": svg("correction-tape", [
    r(40, 78, 120, 52, 26, P),
    r(40, 78, 120, 52, 26, N, 'fill-opacity="0" stroke="#153a7a" stroke-width="0"'),
    p("M40 90h120v28a26 26 0 0 1-26 26H66a26 26 0 0 1-26-26z", N),
    c(70, 104, 16, Y),
    c(130, 104, 16, Y2),
    r(88, 98, 24, 8, 3, W),
  ].join("")),
  calculator: svg("calculator", [
    r(52, 32, 96, 136, 12, N),
    r(64, 46, 72, 28, 4, Y2),
    ...[0, 1, 2].flatMap((row) => [0, 1, 2].map((col) => r(66 + col * 26, 86 + row * 24, 18, 16, 3, row === 2 && col === 2 ? Y : P))),
  ].join("")),
  "files-folders": svg("files-folders", [
    p("M36 78h48l12 14h68v62a8 8 0 0 1-8 8H44a8 8 0 0 1-8-8z", Y),
    p("M52 64h44l10 14h62v58a8 8 0 0 1-8 8H60a8 8 0 0 1-8-8z", N),
    hi(64, 96, 20, 10),
  ].join("")),
  "sticky-notes": svg("sticky-notes", [
    r(70, 48, 78, 78, 4, Y2),
    r(56, 62, 78, 78, 4, Y),
    r(42, 76, 78, 78, 4, N),
    p("M96 154h24v-24z", D),
    r(54, 92, 40, 5, 2, Y2),
  ].join("")),
  "pins-clips": svg("pins-clips", [
    c(72, 78, 16, C),
    r(68, 78, 8, 62, 3, N),
    p("M118 70h36v28a18 18 0 0 1-36 0z", Y),
    r(130, 58, 12, 20, 3, D),
    r(124, 98, 24, 8, 3, N),
  ].join("")),
  stapler: svg("stapler", [
    p("M40 118h112a8 8 0 0 1 8 8v16H40z", D),
    p("M48 70h96a12 12 0 0 1 12 12v36H48z", N),
    r(56, 82, 70, 10, 4, Y),
    hi(64, 96, 28, 6),
  ].join("")),
  "office-diary": svg("office-diary", [
    r(48, 36, 104, 132, 8, N),
    r(64, 36, 88, 132, 6, P),
    r(48, 36, 16, 132, 6, Y),
    r(78, 58, 58, 6, 2, "#c5d0e0"),
    r(78, 74, 46, 6, 2, "#c5d0e0"),
    r(148, 70, 8, 36, 2, C),
  ].join("")),
  "pen-stand": svg("pen-stand", [
    p("M58 96h84l-8 58a8 8 0 0 1-8 6H74a8 8 0 0 1-8-6z", N),
    r(70, 40, 10, 62, 3, Y),
    r(92, 32, 10, 70, 3, C),
    r(114, 48, 10, 54, 3, T),
    hi(66, 110, 14, 28),
  ].join("")),
  "cutter-scissors": svg("cutter-scissors", [
    c(62, 78, 16, N),
    c(62, 78, 6, P),
    c(98, 78, 16, N),
    c(98, 78, 6, P),
    p("M70 90l48 52 10-8-46-54z", Y),
    p("M90 90l-36 54 10 8 38-52z", D),
  ].join("")),
  "lcd-tablet": svg("lcd-tablet", [
    r(40, 48, 120, 96, 12, N),
    r(52, 60, 96, 72, 6, "#d7efe4"),
    p("M70 110c16-28 28-8 40-20 8 16 4 28-8 36-16 8-28 0-32-16z", T),
    r(118, 150, 8, 18, 3, D),
  ].join("")),
  "cello-tape": svg("cello-tape", [
    c(100, 104, 48, Y),
    c(100, 104, 28, N),
    c(100, 104, 12, P),
    p("M140 96h28v20h-20z", Y2),
    hi(70, 78, 16, 10),
  ].join("")),
  "glue-gun": svg("glue-gun", [
    r(36, 96, 36, 14, 4, Y2),
    p("M68 86h70a16 16 0 0 1 16 16v8H78a16 16 0 0 1-16-16z", N),
    r(120, 110, 28, 22, 6, D),
    p("M132 132v22l10 8v-30z", C),
    hi(84, 94, 24, 6),
  ].join("")),
  "a4-paper": svg("a4-paper", [
    r(58, 28, 84, 144, 4, W),
    r(58, 28, 84, 144, 4, "none"),
    p("M58 28h84v144H58z", P),
    r(72, 52, 56, 6, 2, N),
    r(72, 68, 48, 5, 2, "#c5d0e0"),
    r(72, 82, 56, 5, 2, "#c5d0e0"),
    r(72, 96, 40, 5, 2, "#c5d0e0"),
    hi(66, 40, 12, 80),
  ].join("")),
  "craft-card": svg("craft-card", [
    r(46, 40, 108, 120, 8, C),
    c(78, 72, 6, Y),
    c(120, 64, 5, Y2),
    c(108, 100, 7, W),
    c(84, 118, 4, Y),
    p("M70 132h60", W),
  ].join("")),
  "drawing-book": svg("drawing-book", [
    r(36, 48, 128, 104, 8, N),
    r(48, 60, 104, 80, 4, P),
    p("M70 120c20-30 30-8 48-24", T),
    c(86, 84, 8, Y),
    c(118, 96, 6, C),
  ].join("")),
  "colouring-book": svg("colouring-book", [
    r(48, 36, 104, 128, 8, Y),
    r(64, 52, 72, 96, 4, P),
    c(88, 88, 10, C),
    c(112, 96, 10, T),
    c(96, 116, 8, N),
    r(150, 70, 12, 64, 4, D),
  ].join("")),
  "gift-wrap": svg("gift-wrap", [
    `<g transform="rotate(-20 100 110)">`,
    r(70, 40, 48, 120, 24, C),
    r(86, 40, 16, 120, 6, Y),
    `</g>`,
    p("M40 140h50l8-16", N),
  ].join("")),
  "paint-brushes": svg("paint-brushes", [
    r(48, 36, 14, 100, 4, N),
    p("M44 128h22l-4 28h-14z", C),
    r(88, 28, 12, 108, 4, D),
    p("M84 128h20l-4 32h-12z", Y),
    r(124, 44, 12, 92, 4, T),
    p("M120 128h20l-4 24h-12z", N),
  ].join("")),
  "modelling-clay": svg("modelling-clay", [
    e(70, 120, 28, 18, C),
    e(112, 108, 26, 16, Y),
    e(132, 132, 24, 14, T),
    c(64, 108, 8, "#f0998c"),
  ].join("")),
  "craft-stickers": svg("craft-stickers", [
    r(40, 44, 120, 112, 8, P),
    c(78, 86, 16, Y),
    c(118, 80, 14, C),
    e(104, 120, 18, 12, T),
    p("M132 120l16 8-16 8z", N),
  ].join("")),
  "ice-cream-sticks": svg("ice-cream-sticks", [
    ...[0, 1, 2, 3, 4].map((i) => `<g transform="rotate(${-20 + i * 10} 100 110)">${r(92, 36, 16, 120, 6, i % 2 ? Y : N)}</g>`),
  ].join("")),
  "craft-thread": svg("craft-thread", [
    r(78, 40, 44, 16, 4, D),
    e(100, 100, 40, 48, C),
    e(100, 100, 16, 48, Y),
    r(78, 140, 44, 16, 4, D),
    p("M140 100c20 8 20 28 4 36", N),
  ].join("")),
  "science-kits": svg("science-kits", [
    p("M78 40h44v28l28 70a16 16 0 0 1-15 22H65a16 16 0 0 1-15-22l28-70z", N),
    p("M86 78h28l20 52H66z", T),
    c(92, 118, 6, Y),
    c(110, 132, 5, C),
    r(70, 36, 60, 8, 3, D),
  ].join("")),
  "fancy-diary": svg("fancy-diary", [
    r(48, 36, 108, 132, 10, C),
    r(64, 36, 92, 132, 8, P),
    r(48, 36, 18, 132, 8, Y),
    c(118, 100, 14, N),
    c(118, 100, 6, Y),
    r(150, 64, 8, 40, 2, D),
  ].join("")),
  "gift-sets": svg("gift-sets", [
    r(36, 100, 70, 52, 6, N),
    r(30, 86, 80, 18, 4, Y),
    r(66, 86, 10, 66, 2, C),
    r(100, 78, 64, 48, 6, C),
    r(96, 66, 72, 16, 4, Y2),
    r(126, 66, 10, 60, 2, N),
  ].join("")),
  balloons: svg("balloons", [
    e(78, 78, 26, 32, C),
    e(118, 70, 24, 30, Y),
    e(100, 108, 22, 28, N),
    p("M78 110c-4 16 8 20 4 32", D),
    p("M118 100c6 16-2 24 2 34", D),
    p("M100 136v28", D),
  ].join("")),
  keychains: svg("keychains", [
    c(78, 88, 28, Y),
    c(78, 88, 12, P),
    r(96, 84, 62, 12, 4, N),
    c(150, 120, 16, C),
    c(150, 120, 6, Y2),
    r(144, 100, 8, 16, 2, D),
  ].join("")),
  slime: svg("slime", [
    r(62, 48, 76, 28, 6, T),
    p("M58 90h84v36c0 28-20 40-42 40s-42-12-42-40z", "#7ddea0"),
    c(86, 118, 6, W, ),
    e(112, 124, 10, 6, "#b6f3c8"),
    hi(74, 104, 14, 10),
  ].join("")),
  puzzles: svg("puzzles", [
    p("M48 48h48v18a16 16 0 1 0 0 32V116H48z", N),
    p("M104 48h48v68h-18a16 16 0 1 1 0-32h-14V48z", Y),
    p("M48 124h36a16 16 0 1 0 32 0h36v28H48z", C),
  ].join("")),
  sports: svg("sports", [
    c(78, 110, 36, N),
    p("M54 96c16 8 32 8 48 0M58 124c14-8 30-8 46 0M78 74v72", Y),
    e(140, 86, 22, 10, C),
    p("M150 86c16 20 8 48-6 60", D),
  ].join("")),
  locks: svg("locks", [
    p("M70 88V70a30 30 0 0 1 60 0v18", N),
    r(58, 88, 84, 68, 10, Y),
    c(100, 118, 8, N),
    r(96, 118, 8, 18, 2, D),
  ].join("")),
  "nail-cutter": svg("nail-cutter", [
    `<g transform="rotate(-20 100 110)">`,
    r(40, 90, 120, 16, 6, N),
    r(40, 108, 120, 12, 4, D),
    c(150, 98, 10, Y),
    r(70, 78, 8, 22, 2, C),
    `</g>`,
  ].join("")),
  pencil: svg("pencil", [
    `<g transform="rotate(-40 100 108)">`,
    r(84, 28, 32, 120, 6, Y),
    r(84, 28, 32, 24, 6, C),
    p("M84 148h32l-16 28z", P),
    p("M92 168h16l-8 12z", K),
    hi(90, 60, 8, 50),
    `</g>`,
  ].join("")),
  pen: svg("pen", [
    `<g transform="rotate(-40 100 108)">`,
    r(88, 24, 24, 124, 8, N),
    r(88, 24, 24, 28, 8, Y),
    p("M88 148h24l-12 26z", D),
    hi(94, 60, 6, 48),
    `</g>`,
  ].join("")),
  notebook: svg("notebook", [
    r(52, 40, 100, 124, 6, N),
    r(68, 40, 84, 124, 4, P),
    ...[56, 78, 100, 122, 144].map((y) => c(60, y, 4, Y)),
    r(82, 62, 54, 6, 2, "#c5d0e0"),
    r(82, 80, 46, 6, 2, "#c5d0e0"),
  ].join("")),
  eraser: svg("eraser", [
    `<g transform="rotate(-18 100 110)">`,
    r(48, 78, 108, 40, 8, C),
    r(48, 78, 36, 40, 8, Y2),
    hi(90, 86, 40, 8),
    `</g>`,
  ].join("")),
  sharpener: svg("sharpener", [
    r(48, 70, 104, 64, 10, N),
    p("M70 70l30-28 30 28z", Y),
    r(86, 88, 28, 28, 4, P),
    hi(60, 84, 16, 10),
  ].join("")),
  colours: svg("colours", [
    c(70, 110, 22, C),
    c(108, 86, 22, Y),
    c(132, 120, 22, T),
    c(96, 136, 18, N),
    r(40, 150, 120, 12, 6, D),
  ].join("")),
  chart: svg("chart", [
    r(40, 36, 120, 128, 4, Y2),
    r(52, 48, 96, 104, 2, W),
    r(64, 64, 72, 8, 2, C),
    r(64, 84, 48, 8, 2, N),
    r(64, 104, 60, 8, 2, T),
  ].join("")),
  glue: svg("glue", [
    r(78, 36, 44, 28, 8, Y),
    p("M70 64h60l8 88a10 10 0 0 1-10 10H72a10 10 0 0 1-10-10z", N),
    hi(82, 80, 12, 40),
    r(86, 112, 28, 16, 4, Y2),
  ].join("")),
  geometry: svg("geometry", [
    r(36, 86, 128, 64, 8, N),
    p("M56 136l40-40 10 8-40 40z", Y),
    c(128, 108, 16, P),
    c(128, 108, 6, D),
  ].join("")),
  diary: svg("diary", [
    r(46, 32, 108, 136, 8, D),
    r(62, 32, 92, 136, 6, P),
    r(46, 32, 18, 136, 6, C),
    r(80, 56, 56, 6, 2, "#c5d0e0"),
    r(80, 74, 40, 6, 2, "#c5d0e0"),
    r(146, 60, 8, 28, 2, Y),
  ].join("")),
};

mkdirSync("public/category", { recursive: true });
for (const [slug, body] of Object.entries(icons)) {
  writeFileSync(`public/category/${slug}.svg`, body);
}

const home = HOME.map((slug) => {
  const raw = icons[slug];
  if (!raw) throw new Error(`missing home icon ${slug}`);
  const uri = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(raw.trim());
  return `  ${JSON.stringify(slug)}: ${JSON.stringify(uri)},`;
});
writeFileSync(
  "src/components/home-drawings.ts",
  `/** Inlined so the homepage drawings do not need a second request. */\nexport const HOME_DRAWING: Record<string, string> = {\n${home.join("\n")}\n};\n`,
);
console.log(`wrote ${Object.keys(icons).length} icons`);
