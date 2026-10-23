// Generates the app icons (PNG) with no dependencies: a sprout mark on dusty rose.
// Run with: node scripts/generate-icons.mjs
//
// The same geometry is drawn as SVG in src/components/Icons.tsx (SproutMark)
// and src/app/icon.svg, so all three stay visually identical.

import { writeFileSync, mkdirSync } from "node:fs";
import { deflateSync } from "node:zlib";

const BG = [0x9c, 0x4f, 0x6b]; // rose-deep
const FG = [0xfa, 0xf5, 0xf3]; // paper

// Geometry in a 100×100 box.
const STEM = { x: 50, y1: 50, y2: 76, r: 3.2 };
const LEAVES = [
  { from: [50, 54], to: [27, 36], halfWidth: 8.5 },
  { from: [50, 47], to: [74, 25], halfWidth: 10 },
];

function leafTest({ from, to, halfWidth }) {
  // A leaf is the intersection of two circles (a vesica).
  const [x1, y1] = from;
  const [x2, y2] = to;
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const len = Math.hypot(x2 - x1, y2 - y1);
  const nx = -(y2 - y1) / len;
  const ny = (x2 - x1) / len;
  const h = halfWidth;
  const R = (len * len) / 4 / (2 * h) + h / 2;
  const off = R - h;
  const c1 = [mx + nx * off, my + ny * off];
  const c2 = [mx - nx * off, my - ny * off];
  return (x, y) =>
    Math.hypot(x - c1[0], y - c1[1]) <= R && Math.hypot(x - c2[0], y - c2[1]) <= R;
}

const leafTests = LEAVES.map(leafTest);

function inMark(x, y) {
  // Stem: a vertical capsule.
  const cy = Math.min(Math.max(y, STEM.y1), STEM.y2);
  if (Math.hypot(x - STEM.x, y - cy) <= STEM.r) return true;
  return leafTests.some((t) => t(x, y));
}

function render(size, { scale = 1 } = {}) {
  const SS = 4; // supersampling for anti-aliasing
  const px = Buffer.alloc(size * size * 4);
  for (let j = 0; j < size; j++) {
    for (let i = 0; i < size; i++) {
      let hits = 0;
      for (let sj = 0; sj < SS; sj++) {
        for (let si = 0; si < SS; si++) {
          // Map pixel to the 100-unit box, scaled around the centre.
          const u = ((i + (si + 0.5) / SS) / size) * 100;
          const v = ((j + (sj + 0.5) / SS) / size) * 100;
          const x = 50 + (u - 50) / scale;
          const y = 50 + (v - 50) / scale + 0; // mark is already optically centred
          if (inMark(x, y)) hits++;
        }
      }
      const a = hits / (SS * SS);
      const o = (j * size + i) * 4;
      for (let k = 0; k < 3; k++) px[o + k] = Math.round(BG[k] * (1 - a) + FG[k] * a);
      px[o + 3] = 255;
    }
  }
  return encodePNG(size, size, px);
}

function crc32(buf) {
  let c = ~0;
  for (const b of buf) {
    c ^= b;
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function encodePNG(w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) {
    raw[y * (w * 4 + 1)] = 0;
    rgba.copy(raw, y * (w * 4 + 1) + 1, y * w * 4, (y + 1) * w * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

mkdirSync("public/icons", { recursive: true });
writeFileSync("public/icons/icon-192.png", render(192));
writeFileSync("public/icons/icon-512.png", render(512));
// Maskable icons get cropped to a circle; shrink the mark into the safe zone.
writeFileSync("public/icons/icon-maskable-512.png", render(512, { scale: 0.78 }));
// iOS Home Screen icon (iOS rounds the corners itself).
writeFileSync("src/app/apple-icon.png", render(180));
console.log("Icons written.");
