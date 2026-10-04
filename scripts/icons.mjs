// Draws the Clockwork Spire app icon with a tiny pure-JS rasterizer and encodes PNGs.
// Nothing here is written to src/ or public/; the Vite plugin emits the bytes into the build output only.
import { deflateSync } from 'node:zlib';

const SS = 3; // supersampling per axis, for anti-aliasing
const BG = [23, 17, 12];
const BRASS = [209, 166, 74];
const BRASS_DARK = [138, 106, 42];
const FACE = [241, 227, 198];
const INK = [37, 27, 19];
const LAMP = [255, 210, 122];
const EAR = [196, 112, 63];
const EAR_IN = [241, 190, 150];

/** Point in triangle test. */
function inTri(px, py, a, b, c) {
  const s = (p, q, r) => (p[0] - r[0]) * (q[1] - r[1]) - (q[0] - r[0]) * (p[1] - r[1]);
  const p = [px, py];
  const d1 = s(p, a, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, a);
  const neg = d1 < 0 || d2 < 0 || d3 < 0;
  const pos = d1 > 0 || d2 > 0 || d3 > 0;
  return !(neg && pos);
}

/** Colour at (x, y) in the unit square. The art stays inside the central 80% (maskable safe zone). */
function sample(x, y) {
  const dx = x - 0.5;
  const dy = y - 0.5;
  const r = Math.hypot(dx, dy);
  const ang = Math.atan2(dy, dx);
  // lamplit glow
  const glow = Math.max(0, 1 - r / 0.62) * 0.22;
  let c = [BG[0] + (LAMP[0] - BG[0]) * glow, BG[1] + (LAMP[1] - BG[1]) * glow, BG[2] + (LAMP[2] - BG[2]) * glow];
  // gear body with 12 teeth
  const tooth = Math.cos(ang * 12) > -0.15 ? 0.355 : 0.3;
  if (r < tooth) c = BRASS;
  if (r < 0.3 && r > 0.275) c = BRASS_DARK; // rim groove
  // clock face
  if (r < 0.215) c = BRASS_DARK;
  if (r < 0.2) c = FACE;
  // hour ticks
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    if (Math.hypot(dx - Math.cos(a) * 0.17, dy - Math.sin(a) * 0.17) < 0.011) c = INK;
  }
  // hands: minute hand to 12, hour hand toward 4
  const inSeg = (bx, by, w) => {
    const t = Math.max(0, Math.min(1, (dx * bx + dy * by) / (bx * bx + by * by)));
    return Math.hypot(dx - bx * t, dy - by * t) < w;
  };
  if (inSeg(0, -0.15, 0.012)) c = INK;
  if (inSeg(0.085, 0.05, 0.015)) c = INK;
  if (r < 0.022) c = LAMP;
  // corgi ear silhouette on the upper right of the gear
  if (inTri(x, y, [0.6, 0.3], [0.72, 0.1], [0.78, 0.31])) c = EAR;
  if (inTri(x, y, [0.64, 0.28], [0.72, 0.15], [0.75, 0.28])) c = EAR_IN;
  return c;
}

/** Renders a size x size RGBA buffer. */
export function render(size) {
  const buf = Buffer.alloc(size * size * 4);
  const n = SS * SS;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size);
          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const o = (py * size + px) * 4;
      buf[o] = Math.round(r / n);
      buf[o + 1] = Math.round(g / n);
      buf[o + 2] = Math.round(b / n);
      buf[o + 3] = 255;
    }
  }
  return buf;
}

const CRC = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC[(c ^ byte) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

/** Encodes an RGBA buffer as a PNG. */
export function encodePng(rgba, size) {
  const stride = size * 4 + 1;
  const raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** File name to pixel size. The maskable icon uses the same full-bleed art, whose content stays in the safe zone. */
export const ICONS = {
  'icon-192.png': 192,
  'icon-512.png': 512,
  'icon-maskable-512.png': 512,
  'apple-touch-icon.png': 180,
  'favicon-32.png': 32,
};

/** Returns { fileName: Buffer } for every icon. */
export function generateIcons() {
  const cache = new Map();
  const out = {};
  for (const [name, size] of Object.entries(ICONS)) {
    if (!cache.has(size)) cache.set(size, encodePng(render(size), size));
    out[name] = cache.get(size);
  }
  return out;
}
