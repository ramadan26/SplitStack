/**
 * Dependency-free PWA icon generator.
 * Draws the SplitStack mark (an emerald rounded square with two overlapping
 * "split" circles) and writes valid PNGs using a hand-rolled PNG encoder
 * (zlib is built into Node). Supersampled 2x for smooth edges.
 */
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT_DIR = new URL("../public/icons/", import.meta.url).pathname;

// ---------- minimal PNG encoder ----------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

function encodePng(width, height, rgba) {
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type: RGBA

  const stride = width * 4 + 1;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    raw[y * stride] = 0; // filter: none
    rgba.copy(raw, y * stride + 1, y * width * 4, (y + 1) * width * 4);
  }

  return Buffer.concat([
    signature,
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------- icon drawing ----------

const EMERALD = [16, 185, 129]; // #10b981
const WHITE = [255, 255, 255];
const SUPERSAMPLE = 2;

function blendPixel(buf, idx, [r, g, b], alpha) {
  const inv = 255 - alpha;
  buf[idx] = (r * alpha + buf[idx] * inv) / 255;
  buf[idx + 1] = (g * alpha + buf[idx + 1] * inv) / 255;
  buf[idx + 2] = (b * alpha + buf[idx + 2] * inv) / 255;
  buf[idx + 3] = Math.min(255, alpha + (buf[idx + 3] * inv) / 255);
}

function drawIcon(size, { maskable = false } = {}) {
  const dim = size * SUPERSAMPLE;
  const buf = Buffer.alloc(dim * dim * 4);

  const cornerRadius = maskable ? 0 : dim * 0.22;
  const half = dim / 2;
  const inner = half - cornerRadius;

  // Motif: two overlapping circles ("split"), kept inside the 80% safe
  // zone for maskable icons.
  const motifScale = maskable ? 0.8 : 1;
  const circleR = dim * 0.17 * motifScale;
  const offset = dim * 0.115 * motifScale;
  const cy = half;
  const circles = [
    { cx: half - offset, alpha: 255 },
    { cx: half + offset, alpha: 140 },
  ];

  for (let y = 0; y < dim; y++) {
    for (let x = 0; x < dim; x++) {
      const idx = (y * dim + x) * 4;

      // Rounded-rect membership (signed distance to box, negative = inside)
      const qx = Math.abs(x - half) - inner;
      const qy = Math.abs(y - half) - inner;
      const dist =
        Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) +
        Math.min(Math.max(qx, qy), 0);
      const insideSquare = cornerRadius === 0 || dist <= cornerRadius;
      if (!insideSquare) continue; // stays transparent

      blendPixel(buf, idx, EMERALD, 255);

      for (const { cx, alpha } of circles) {
        if (Math.hypot(x - cx, y - cy) <= circleR) {
          blendPixel(buf, idx, WHITE, alpha);
        }
      }
    }
  }

  // Box-filter downsample from the supersampled buffer
  const out = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      let r = 0,
        g = 0,
        b = 0,
        a = 0;
      for (let sy = 0; sy < SUPERSAMPLE; sy++) {
        for (let sx = 0; sx < SUPERSAMPLE; sx++) {
          const idx =
            ((y * SUPERSAMPLE + sy) * dim + (x * SUPERSAMPLE + sx)) * 4;
          r += buf[idx];
          g += buf[idx + 1];
          b += buf[idx + 2];
          a += buf[idx + 3];
        }
      }
      const n = SUPERSAMPLE * SUPERSAMPLE;
      const outIdx = (y * size + x) * 4;
      out[outIdx] = r / n;
      out[outIdx + 1] = g / n;
      out[outIdx + 2] = b / n;
      out[outIdx + 3] = a / n;
    }
  }
  return out;
}

// ---------- generate ----------

mkdirSync(OUT_DIR, { recursive: true });

const icons = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  { file: "icon-maskable-192.png", size: 192, maskable: true },
  { file: "icon-maskable-512.png", size: 512, maskable: true },
  // iOS ignores alpha and fills it black, so ship a full-bleed variant
  { file: "apple-touch-icon.png", size: 180, maskable: true },
  { file: "favicon-32.png", size: 32 },
];

for (const { file, size, maskable = false } of icons) {
  const rgba = drawIcon(size, { maskable });
  writeFileSync(join(OUT_DIR, file), encodePng(size, size, rgba));
  console.log(`✓ ${file} (${size}x${size}${maskable ? ", maskable" : ""})`);
}
