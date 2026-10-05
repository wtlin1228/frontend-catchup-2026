// Generates the gallery's raster images (three widths each) and src/data/gallery.json.
// Pure Node: a procedural landscape painter plus a minimal PNG encoder (zlib + CRC32).
// It stands in for the image pipeline that meta-frameworks ship (next/image, astro:assets, @nuxt/image).
// Runs automatically before `dev` and `build`; skips if the files already exist. `--force` regenerates.
import { deflateSync } from 'node:zlib';
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public/images');
const dataFile = resolve(root, 'src/data/gallery.json');
const COUNT = 24;
const WIDTHS = [400, 800, 1200];
const RATIO = 3 / 4;
const force = process.argv.includes('--force');

const haveLandscapes =
  !force &&
  existsSync(dataFile) &&
  existsSync(outDir) &&
  readdirSync(outDir).filter((f) => f.endsWith('.png')).length >= COUNT * WIDTHS.length;
mkdirSync(outDir, { recursive: true });
mkdirSync(dirname(dataFile), { recursive: true });

// --- PNG encoder (8-bit RGB, filter 0, one IDAT) ---
const CRC_TABLE = new Uint32Array(256).map((_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typed = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typed));
  return Buffer.concat([len, typed, crc]);
}
function encodePNG(width, height, rgb) {
  const stride = width * 3;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter type: none
    rgb.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type: RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- procedural landscapes ---
function mulberry32(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function hsl(h, s, l) {
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [f(0), f(8), f(4)].map((v) => Math.round(v * 255));
}
const toHex = (rgb) => '#' + rgb.map((v) => v.toString(16).padStart(2, '0')).join('');

function scene(seed) {
  const rnd = mulberry32(seed);
  const hue = rnd() * 360;
  const night = rnd() < 0.25;
  return {
    night,
    skyTop: hsl(hue, 0.55, night ? 0.12 : 0.62),
    skyBottom: hsl((hue + 40) % 360, 0.7, night ? 0.3 : 0.82),
    sun: {
      x: 0.15 + rnd() * 0.7,
      y: 0.15 + rnd() * 0.35,
      r: 0.04 + rnd() * 0.07,
      color: night ? [236, 236, 222] : hsl((hue + 30) % 360, 0.9, 0.85),
    },
    ridges: [0, 1, 2].map((i) => ({
      base: 0.45 + i * 0.14 + rnd() * 0.05,
      amp: 0.05 + rnd() * 0.08,
      freq: 2 + rnd() * 5,
      phase: rnd() * 6.28,
      color: hsl((hue + 180 + i * 15) % 360, 0.35, (night ? 0.08 : 0.2) + i * 0.1),
    })),
    ground: hsl((hue + 200) % 360, 0.3, night ? 0.06 : 0.14),
  };
}
function paint(w, h, s) {
  const buf = Buffer.alloc(w * h * 3);
  const ridgeY = s.ridges.map((r) => {
    const ys = new Float32Array(w);
    for (let x = 0; x < w; x++) {
      const u = x / w;
      ys[x] = (r.base + r.amp * Math.sin(u * r.freq + r.phase) + r.amp * 0.5 * Math.sin(u * r.freq * 2.7 + r.phase * 1.3)) * h;
    }
    return ys;
  });
  const sunX = s.sun.x * w, sunY = s.sun.y * h, sunR2 = (s.sun.r * w) ** 2;
  for (let y = 0; y < h; y++) {
    const t = y / h;
    const sky = [0, 1, 2].map((c) => Math.round(s.skyTop[c] + (s.skyBottom[c] - s.skyTop[c]) * t));
    for (let x = 0; x < w; x++) {
      let px = sky;
      const dx = x - sunX, dy = y - sunY;
      if (dx * dx + dy * dy < sunR2) px = s.sun.color;
      for (let i = 0; i < 3; i++) if (y > ridgeY[i][x]) px = s.ridges[i].color;
      if (y > h * 0.9) px = s.ground;
      const o = (y * w + x) * 3;
      buf[o] = px[0];
      buf[o + 1] = px[1];
      buf[o + 2] = px[2];
    }
  }
  return buf;
}

// --- app icons for the web app manifest (offline pattern) ---
for (const size of [192, 512]) {
  const file = resolve(root, `public/icon-${size}.png`);
  if (existsSync(file) && !force) continue;
  const buf = Buffer.alloc(size * size * 3);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const bar = (y > size * 0.62 && y < size * 0.72 && x > size * 0.25 && x < size * 0.75) || (y > size * 0.3 && y < size * 0.4 && x > size * 0.25 && x < size * 0.56);
      const o = (y * size + x) * 3;
      buf[o] = bar ? 255 : 0xe7;
      buf[o + 1] = bar ? 255 : 0x61;
      buf[o + 2] = bar ? 255 : 0x25;
    }
  }
  writeFileSync(file, encodePNG(size, size, buf));
}
if (haveLandscapes) process.exit(0);

const TIMES = ['Dawn', 'Morning', 'Noon', 'Dusk'];
const PLACES = ['over the ridge', 'at Hex Bay', 'above the dunes', 'on the plateau', 'past the inlet', 'near the saddle', 'by the quarry'];
const items = [];
for (let i = 1; i <= COUNT; i++) {
  const s = scene(1000 + i * 7919);
  const id = `photo-${String(i).padStart(2, '0')}`;
  const src = {};
  for (const w of WIDTHS) {
    const h = Math.round(w * RATIO);
    writeFileSync(resolve(outDir, `${id}-${w}.png`), encodePNG(w, h, paint(w, h, s)));
    src[w] = `/images/${id}-${w}.png`;
  }
  const title = `${s.night ? 'Clear night' : TIMES[i % TIMES.length]} ${PLACES[i % PLACES.length]}`;
  items.push({
    id,
    title,
    alt: `Procedural landscape: ${title.toLowerCase()}. Generated image ${i} of ${COUNT}.`,
    color: toHex(s.skyBottom),
    width: 1200,
    height: 900,
    src,
  });
}
writeFileSync(dataFile, JSON.stringify(items, null, 2) + '\n');
console.log(`[gen-images] wrote ${COUNT * WIDTHS.length} images to ${relative(root, outDir)}/ and ${relative(root, dataFile)}`);
