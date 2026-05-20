// Dependency-free icon generator for the indicators app.
// Design: light background, green rising line + arrow, navy "TA" wordmark.
// Renders normalized vector art at high supersample, then downsamples
// using premultiplied alpha so transparent edges have no dark fringe.
//
// Run: node scripts/generate-icons.js
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

const WHITE = [255, 255, 255];
const GREEN = [22, 163, 74];   // #16A34A
const NAVY = [15, 42, 74];     // #0F2A4A

// All coords normalized 0..1 (y down). Content kept within ~[0.20,0.80]
// so it stays inside the Android adaptive-icon safe zone.
const CHART = [
  [0.205, 0.560],
  [0.335, 0.650],
  [0.465, 0.470],
  [0.595, 0.545],
  [0.715, 0.360],
  [0.800, 0.250],
];
const STROKE = 0.045;          // chart line thickness
const TEXT_STROKE = 0.026;     // wordmark stroke

function dist2seg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy || 1e-9;
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function inTriangle(px, py, a, b, c) {
  const d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1]);
  const l1 = ((b[1] - c[1]) * (px - c[0]) + (c[0] - b[0]) * (py - c[1])) / d;
  const l2 = ((c[1] - a[1]) * (px - c[0]) + (a[0] - c[0]) * (py - c[1])) / d;
  const l3 = 1 - l1 - l2;
  return l1 >= 0 && l2 >= 0 && l3 >= 0;
}

// Returns the art color at normalized point (x,y), or null for background.
function sample(x, y) {
  // Chart polyline (round caps/joins via distance-to-segment).
  const half = STROKE / 2;
  for (let i = 0; i < CHART.length - 1; i++) {
    const [ax, ay] = CHART[i], [bx, by] = CHART[i + 1];
    if (dist2seg(x, y, ax, ay, bx, by) <= half) return GREEN;
  }
  // Arrowhead at the end, oriented along the last segment.
  const p4 = CHART[CHART.length - 2], p5 = CHART[CHART.length - 1];
  let dx = p5[0] - p4[0], dy = p5[1] - p4[1];
  const dl = Math.hypot(dx, dy) || 1e-9;
  dx /= dl; dy /= dl;
  const nx = -dy, ny = dx;          // perpendicular
  const tip = [p5[0] + dx * 0.055, p5[1] + dy * 0.055];
  const baseC = [p5[0] - dx * 0.020, p5[1] - dy * 0.020];
  const aw = 0.075;
  const bL = [baseC[0] + nx * aw, baseC[1] + ny * aw];
  const bR = [baseC[0] - nx * aw, baseC[1] - ny * aw];
  if (inTriangle(x, y, tip, bL, bR)) return GREEN;

  // Wordmark "TA" (navy) in the lower-left.
  const ts = TEXT_STROKE, th = ts / 2;
  // T: top bar + stem
  if (x >= 0.205 && x <= 0.300 && y >= 0.685 && y <= 0.685 + ts) return NAVY;
  if (x >= 0.2395 && x <= 0.2655 && y >= 0.685 && y <= 0.800) return NAVY;
  // A: two legs + crossbar
  const apex = [0.3475, 0.685];
  const aL = [0.300, 0.800], aR = [0.395, 0.800];
  if (y >= 0.685 && y <= 0.800) {
    if (dist2seg(x, y, aL[0], aL[1], apex[0], apex[1]) <= th) return NAVY;
    if (dist2seg(x, y, apex[0], apex[1], aR[0], aR[1]) <= th) return NAVY;
  }
  if (x >= 0.318 && x <= 0.377 && y >= 0.760 && y <= 0.760 + ts) return NAVY;

  return null;
}

function render(size, ss, opaqueBg) {
  const S = size * ss;
  // accumulate premultiplied RGBA per output pixel
  const acc = new Float64Array(size * size * 4);
  for (let sy = 0; sy < S; sy++) {
    const ny = (sy + 0.5) / S;
    for (let sx = 0; sx < S; sx++) {
      const nx = (sx + 0.5) / S;
      const c = sample(nx, ny);
      let r, g, b, a;
      if (c) { r = c[0]; g = c[1]; b = c[2]; a = 255; }
      else if (opaqueBg) { r = WHITE[0]; g = WHITE[1]; b = WHITE[2]; a = 255; }
      else { r = 0; g = 0; b = 0; a = 0; }
      const ox = (sx / ss) | 0, oy = (sy / ss) | 0;
      const idx = (oy * size + ox) * 4;
      const af = a / 255;
      acc[idx] += r * af;
      acc[idx + 1] += g * af;
      acc[idx + 2] += b * af;
      acc[idx + 3] += a;
    }
  }
  const n = ss * ss;
  const out = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    const a = acc[i * 4 + 3] / n;            // averaged alpha, 0..255
    if (a <= 0.0001) { out[i * 4 + 3] = 0; continue; }
    // un-premultiply: straight = (sum_premul / n) / (a / 255)
    const inv = 255 / (a * n);
    out[i * 4] = Math.min(255, Math.round(acc[i * 4] * inv));
    out[i * 4 + 1] = Math.min(255, Math.round(acc[i * 4 + 1] * inv));
    out[i * 4 + 2] = Math.min(255, Math.round(acc[i * 4 + 2] * inv));
    out[i * 4 + 3] = Math.round(a);
  }
  return out;
}

// Minimal PNG encoder (RGBA, filter 0).
function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xEDB88320 & -(c & 1));
  }
  return ~c >>> 0;
}
function chunk(type, data) {
  const t = Buffer.from(type, 'ascii');
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
  return Buffer.concat([len, t, data, crc]);
}
function encodePng(size, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;   // bit depth
  ihdr[9] = 6;   // RGBA
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0;
    rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const assets = path.join(__dirname, '..', 'assets');
const targets = [
  { file: 'icon.png', size: 1024, ss: 3, opaque: true },
  { file: 'adaptive-icon.png', size: 1024, ss: 3, opaque: false },
  { file: 'splash-icon.png', size: 1024, ss: 3, opaque: false },
  { file: 'favicon.png', size: 64, ss: 8, opaque: true },
];
for (const t of targets) {
  const png = encodePng(t.size, render(t.size, t.ss, t.opaque));
  fs.writeFileSync(path.join(assets, t.file), png);
  console.log(`wrote assets/${t.file} (${t.size}x${t.size}, ${png.length} bytes)`);
}
