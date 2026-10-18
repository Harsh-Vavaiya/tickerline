/*
 * Renders the extension icons from code, so they can be regenerated rather than
 * hand-exported and gradually drifting from the product's colours.
 *
 * The mark is the strip itself sitting in its lower third: one shape, which is
 * the only thing that survives being shown at 16px in a browser toolbar.
 *
 * Usage: node tools/make-icons.js
 */
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

const INK_TOP = [23, 25, 29];
const INK_BOTTOM = [10, 10, 12];
const ACCENT = [10, 132, 255];

const CORNER = 0.22; // of the icon's side
const HAIRLINE = 0.014;
const SS = 4; // supersampling factor, for clean corners without a canvas

/*
 * A near-black ground merges into Chrome's dark toolbar (#202124), which left
 * the 16px icon as a floating blue dash with no silhouette. Two things fix it:
 * a faint rim that defines the edge against a dark background and disappears
 * against a light one, and a taller band at small sizes so the blue carries
 * recognition even when the ground does not.
 */
const RIM = [255, 255, 255];
const RIM_ALPHA = 0.16;

function bandFor(size) {
  return size < 48 ? { top: 0.56, height: 0.3 } : { top: 0.6, height: 0.22 };
}

function insideRoundRectWH(x, y, w, h, r) {
  if (x < 0 || y < 0 || x > w || y > h) return false;
  r = Math.min(r, w / 2, h / 2);
  const cx = x < r ? r : x > w - r ? w - r : x;
  const cy = y < r ? r : y > h - r ? h - r : y;
  const dx = x - cx;
  const dy = y - cy;
  return dx * dx + dy * dy <= r * r;
}

function insideRoundRect(x, y, size, radius) {
  return insideRoundRectWH(x, y, size, size, radius);
}

function mix(a, b, t) {
  return [
    Math.round(a[0] + (b[0] - a[0]) * t),
    Math.round(a[1] + (b[1] - a[1]) * t),
    Math.round(a[2] + (b[2] - a[2]) * t),
  ];
}

// Marks suggesting running text inside the band, as a fraction of the side.
// They give the icon something to read as at store size; at 16px they would
// turn the band to mush, so they are only drawn once there are pixels for them.
const TEXT_MARKS = [
  [0.12, 0.44],
  [0.52, 0.72],
];
const MARK_HEIGHT = 0.055;

/** Colour of the icon at a point, ignoring the rounded-corner mask. */
function shade(x, y, size) {
  const band = bandFor(size);
  const bandTop = size * band.top;
  const bandBottom = bandTop + size * band.height;
  if (y >= bandTop && y < bandBottom) {
    // a lit top edge, the way a translucent surface catches light; too fine to
    // land at 16px, so it is only drawn where there are pixels to hold it
    if (size >= 48 && y < bandTop + Math.max(1, size * HAIRLINE)) {
      return mix(ACCENT, [255, 255, 255], 0.24);
    }
    if (size >= 48) {
      const markH = size * MARK_HEIGHT;
      const markTop = (bandTop + bandBottom) / 2 - markH / 2;
      if (y >= markTop && y < markTop + markH) {
        for (const [x0, x1] of TEXT_MARKS) {
          if (x >= size * x0 && x < size * x1) return [255, 255, 255];
        }
      }
    }
    return ACCENT;
  }
  return mix(INK_TOP, INK_BOTTOM, y / size);
}

function renderRGBA(size) {
  const radius = size * CORNER;
  const rim = Math.max(1, size * 0.03);
  const buf = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          if (!insideRoundRect(x, y, size, radius)) continue;
          let c = shade(x, y, size);
          // inside the outline but outside the inset shape: that is the rim
          const inner = insideRoundRect(
            x - rim, y - rim, size - rim * 2, Math.max(0, radius - rim)
          );
          if (!inner) c = mix(c, RIM, RIM_ALPHA);
          r += c[0]; g += c[1]; b += c[2]; a += 1;
        }
      }
      const i = (py * size + px) * 4;
      const samples = SS * SS;
      if (a === 0) continue; // transparent outside the rounded square
      buf[i] = Math.round(r / a);
      buf[i + 1] = Math.round(g / a);
      buf[i + 2] = Math.round(b / a);
      buf[i + 3] = Math.round((a / samples) * 255);
    }
  }
  return buf;
}

/* --- minimal PNG writer (RGBA, no interlace) --- */

const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([len, body, crc]);
}

function encodePNG(rgba, width, height) {
  const size = width; // scanline stride below uses width
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type: RGBA
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // one filter byte (none) per scanline
  const stride = width * 4 + 1;
  const raw = Buffer.alloc(height * stride);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0;
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/**
 * The store wants a 128x128 icon holding 96x96 of artwork, with the remaining
 * 16px on each side left transparent. A full-bleed icon reads as oversized
 * next to everything else in a listing.
 */
function padded(artSize, canvasSize) {
  const art = renderRGBA(artSize);
  const out = Buffer.alloc(canvasSize * canvasSize * 4);
  const offset = Math.round((canvasSize - artSize) / 2);
  for (let y = 0; y < artSize; y++) {
    art.copy(
      out,
      ((y + offset) * canvasSize + offset) * 4,
      y * artSize * 4,
      (y + 1) * artSize * 4
    );
  }
  return out;
}

/*
 * Small promotional tile. The store's own guidance is to avoid text and to
 * stay legible at half size, so this is the mark at tile scale: a frame with
 * the strip across its lower third, and nothing else to lose when it shrinks.
 */
function renderPromo(w, h) {
  const buf = Buffer.alloc(w * h * 4);
  const tileW = w * 0.52;
  const tileH = h * 0.62;
  const tileX = (w - tileW) / 2;
  const tileY = (h - tileH) / 2;
  const radius = tileH * 0.16;
  const bandTop = tileY + tileH * 0.62;
  const bandBottom = bandTop + tileH * 0.2;
  const marks = [[0.1, 0.42], [0.5, 0.7]];

  for (let py = 0; py < h; py++) {
    for (let px = 0; px < w; px++) {
      let r = 0, g = 0, b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const x = px + (sx + 0.5) / SS;
          const y = py + (sy + 0.5) / SS;
          let c;
          const inTile = insideRoundRectWH(x - tileX, y - tileY, tileW, tileH, radius);
          if (!inTile) {
            // page behind the tile, lit from the top left
            const t = (x / w) * 0.35 + (y / h) * 0.65;
            c = mix([20, 22, 26], [8, 8, 10], t);
          } else if (y >= bandTop && y < bandBottom) {
            c = ACCENT;
            const markH = tileH * 0.05;
            const markTop = (bandTop + bandBottom) / 2 - markH / 2;
            if (y >= markTop && y < markTop + markH) {
              for (const [x0, x1] of marks) {
                if (x >= tileX + tileW * x0 && x < tileX + tileW * x1) c = [255, 255, 255];
              }
            }
            if (y < bandTop + tileH * 0.012) c = mix(ACCENT, [255, 255, 255], 0.24);
          } else {
            c = mix([44, 49, 56], [28, 31, 36], (y - tileY) / tileH);
          }
          r += c[0]; g += c[1]; b += c[2];
        }
      }
      const n = SS * SS;
      const i = (py * w + px) * 4;
      buf[i] = Math.round(r / n);
      buf[i + 1] = Math.round(g / n);
      buf[i + 2] = Math.round(b / n);
      buf[i + 3] = 255; // promo tiles are full bleed, no transparency
    }
  }
  return buf;
}

const root = path.join(here, '..');
const iconDir = path.join(root, 'extension', 'icons');
const storeDir = path.join(root, 'store');
fs.mkdirSync(iconDir, { recursive: true });
fs.mkdirSync(storeDir, { recursive: true });

const rel = (f) => path.relative(root, f);

for (const size of [16, 48, 128]) {
  const file = path.join(iconDir, `icon${size}.png`);
  fs.writeFileSync(file, encodePNG(renderRGBA(size), size, size));
  console.log(`wrote ${rel(file)} (${size}x${size})`);
}

const storeIcon = path.join(storeDir, 'icon-store-128.png');
fs.writeFileSync(storeIcon, encodePNG(padded(96, 128), 128, 128));
console.log(`wrote ${rel(storeIcon)} (128x128, 96x96 artwork + 16px padding)`);

const promo = path.join(storeDir, 'promo-small-440x280.png');
fs.writeFileSync(promo, encodePNG(renderPromo(440, 280), 440, 280));
console.log(`wrote ${rel(promo)} (440x280)`);
