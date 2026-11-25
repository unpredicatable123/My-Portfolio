// Turn Higgsfield output into one animation ("action") of the running character.
//
//   npm run sprite -- <input> <action> [options]
//
// <input> is any of:
//   • a sprite sheet image (png/jpg/webp): the frames are found automatically, or use --grid 4x2
//   • a folder of images: one frame per image, in filename order
//   • a video (mp4/mov/webm): sampled at --fps, trimmed with --start / --dur
//
// The background is keyed out (solid green works best), every frame is cropped, scaled so the
// character is the same size in every action, and lined up on its feet. The result is a
// single strip public/media/sprite/<action>.webp plus an entry in public/media/sprite/sprite.json.
//
// Options
//   --grid auto|CxR     how to cut a sheet (default auto: splits on empty gaps between poses)
//   --key auto|none|green|white|#rrggbb   background colour to remove (auto = sampled from the border)
//   --tol 48            colour distance treated as background (raise if a halo is left, lower if the character gets eaten)
//   --frames 1-8        keep only these frames (1-based, after cutting; e.g. 2-9 or 1+3+5+7)
//   --height 320        the character's STANDING height in the strip, in px (keep it the same for every action)
//   --size 1            how tall this pose is compared to standing: sit/code/sleep default to 0.62,
//                       everything else to 1. Tweak if a pose looks too big or small next to idle.
//   --fps 12            playback speed (and video sampling rate)
//   --loop / --once     play forever or once (defaults depend on the action name)
//   --flip              mirror the frames (the site expects the character to face RIGHT)
//   --align feet|ground feet = every frame stands on its own lowest pixel (default);
//                       ground = keep the vertical motion that is in the source (shared floor line)
//   --anchor upper|mass where each frame is centred: upper = torso and head (default; steady while the
//                       legs swing), mass = the whole body
//   --start 0 --dur 2   video trim in seconds
//   --speed 1.6         walking/running speed in character-heights per second (walk/run only)
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { extname, join, resolve } from 'node:path';

// ---------------------------------------------------------------- args
const argv = process.argv.slice(2);
const pos = [];
const opt = {};
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (!a.startsWith('--')) pos.push(a);
  else if (a === '--loop' || a === '--once' || a === '--flip') opt[a.slice(2)] = true;
  else opt[a.slice(2)] = argv[++i];
}
const [input, action] = pos;
if (!input || !action) {
  console.error('Usage: npm run sprite -- <sheet.png | folder | clip.mp4> <action> [--grid auto|4x2] [--key auto|green|white|#hex] [--frames 1-8] [--fps 12] [--height 320] [--flip]');
  process.exit(1);
}
if (!/^[a-z][a-z0-9-]*$/.test(action)) fail(`Action name must be lowercase letters/digits/dashes, got "${action}"`);
if (!existsSync(input)) fail(`Input not found: ${input}`);

const HEIGHT = num(opt.height, 320);
const SIZE = num(opt.size, { sit: 0.62, code: 0.62, sleep: 0.6 }[action] ?? 1);
const TOL = num(opt.tol, 48);
const SOFT = 36;
const SOLID = 128; // alpha that counts as "part of the character" when measuring
const OUT_DIR = resolve('public/media/sprite');

// ---------------------------------------------------------------- decode
const VIDEO = /\.(mp4|mov|webm|mkv|m4v|gif)$/i;
const IMAGE = /\.(png|jpe?g|webp|bmp)$/i;

/** @type {{w:number,h:number,px:Buffer,cells?:number[][]}[]} */
let sources = [];
if (statSync(input).isDirectory()) {
  const files = readdirSync(input).filter((f) => IMAGE.test(f)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  if (!files.length) fail(`No images in ${input}`);
  sources = files.map((f) => ({ ...decodeImage(join(input, f)), whole: true }));
} else if (VIDEO.test(input)) {
  sources = decodeVideo(input, num(opt.fps, 12), opt.start, opt.dur).map((s) => ({ ...s, whole: true }));
} else if (IMAGE.test(input)) {
  sources = [decodeImage(input)];
} else fail(`Unsupported input type: ${extname(input)}`);

// ---------------------------------------------------------------- key out the background
for (const s of sources) keyBackground(s);

// ---------------------------------------------------------------- cut into frames
let frames = [];
for (const s of sources) {
  if (s.whole) {
    const b = bbox(s, 0, 0, s.w, s.h);
    if (b) frames.push({ s, ...b, row: 0 });
  } else if (opt.grid && opt.grid !== 'auto') {
    const m = /^(\d+)x(\d+)$/i.exec(opt.grid);
    if (!m) fail('--grid must look like 4x2 (columns x rows)');
    const [cols, rows] = [+m[1], +m[2]];
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++) {
        const x0 = Math.round((c * s.w) / cols), x1 = Math.round(((c + 1) * s.w) / cols);
        const y0 = Math.round((r * s.h) / rows), y1 = Math.round(((r + 1) * s.h) / rows);
        const b = bbox(s, x0, y0, x1, y1);
        if (b) frames.push({ s, ...b, row: r, cellBottom: y1 });
      }
  } else frames.push(...autoSplit(s));
}
if (!frames.length) fail('No character found. Try --key with the background colour, or a different --tol.');

if (opt.frames) {
  const keep = parseList(opt.frames, frames.length);
  frames = keep.map((i) => frames[i - 1]).filter(Boolean);
}
console.log(`• ${frames.length} frame${frames.length === 1 ? '' : 's'} found`);

// ---------------------------------------------------------------- measure + align
// Scale: the median frame height becomes HEIGHT × SIZE, so the character is the same size in every action.
const heights = frames.map((f) => f.y1 - f.y0).sort((a, b) => a - b);
const scale = (HEIGHT * SIZE) / heights[Math.floor(heights.length / 2)];

// Floor line per sheet row (for --align ground).
const ground = new Map();
for (const f of frames) {
  const k = `${sources.indexOf(f.s)}:${f.row}`;
  ground.set(k, Math.max(ground.get(k) ?? 0, f.y1));
}
for (const f of frames) {
  f.feet = opt.align === 'ground' ? ground.get(`${sources.indexOf(f.s)}:${f.row}`) : f.y1;
  f.cx = massCenterX(f);
}

const PAD = 4;
const half = Math.max(...frames.map((f) => Math.max(f.cx - f.x0, f.x1 - f.cx)));
const up = Math.max(...frames.map((f) => f.feet - f.y0));
// Source-resolution cell, chosen so it scales to a whole number of output pixels.
const outW = Math.ceil((half * 2 + PAD * 2) * scale);
const outH = Math.ceil((up + PAD) * scale);
const cellW = Math.round(outW / scale);
const cellH = Math.round(outH / scale);

// WebP is limited to 16383 px per side, so long animations wrap onto extra rows.
const cols = Math.max(1, Math.min(frames.length, Math.floor(16383 / outW)));
const rows = Math.ceil(frames.length / cols);
const stripW = cols * cellW, stripH = rows * cellH;
const strip = Buffer.alloc(stripW * stripH * 4);

frames.forEach((f, i) => {
  const ox = (i % cols) * cellW, oy = Math.floor(i / cols) * cellH;
  const dx = Math.round(ox + cellW / 2 - f.cx); // source x → strip x
  const dy = Math.round(oy + cellH - PAD - f.feet);
  for (let y = f.y0; y < f.y1; y++)
    for (let x = f.x0; x < f.x1; x++) {
      const si = (y * f.s.w + x) * 4;
      if (f.s.px[si + 3] === 0 || (f.mask && !f.mask(x, y))) continue;
      let tx = x + dx;
      if (opt.flip) tx = ox + (cellW - 1 - (tx - ox));
      const ty = y + dy;
      if (tx < ox || tx >= ox + cellW || ty < oy || ty >= oy + cellH) continue;
      f.s.px.copy(strip, (ty * stripW + tx) * 4, si, si + 4);
    }
});
bleedColors(strip, stripW, stripH, 6);

// ---------------------------------------------------------------- encode
mkdirSync(OUT_DIR, { recursive: true });
const file = `${action}.webp`;
const enc = spawnSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${stripW}x${stripH}`, '-i', '-',
   '-vf', `scale=${cols * outW}:${rows * outH}:flags=lanczos`, '-frames:v', '1',
   '-c:v', 'libwebp', '-pix_fmt', 'yuva420p', '-quality', '86', '-compression_level', '6',
   '-f', 'image2', join(OUT_DIR, file)],
  { input: strip, maxBuffer: 1 << 30, stdio: ['pipe', 'inherit', 'inherit'] },
);
if (enc.error?.code === 'ENOENT') fail('ffmpeg was not found on PATH.');
if (enc.status !== 0) process.exit(enc.status ?? 1);

// ---------------------------------------------------------------- manifest
const manPath = join(OUT_DIR, 'sprite.json');
const man = existsSync(manPath) ? JSON.parse(readFileSync(manPath, 'utf8')) : { actions: {} };
const entry = {
  src: file,
  v: createHash('sha1').update(readFileSync(join(OUT_DIR, file))).digest('hex').slice(0, 8),
  frames: frames.length,
  cols,
  w: outW,
  h: outH,
  // The character's standing height inside this strip. Lets the site scale actions built at different --height.
  ref: HEIGHT,
};
if (opt.fps) entry.fps = num(opt.fps, 12);
if (opt.loop) entry.loop = true;
if (opt.once) entry.loop = false;
if (opt.speed) entry.speed = num(opt.speed, 1);
man.actions = { ...man.actions, [action]: entry };
man.actions = Object.fromEntries(Object.entries(man.actions).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(manPath, JSON.stringify(man, null, 2) + '\n');
console.log(`✓ ${action}: ${frames.length} frames of ${outW}×${outH} → public/media/sprite/${file}`);
if (!man.actions.idle) console.log('  The character appears on the site once an "idle" action exists.');

// ================================================================= helpers
function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}
function num(v, d) {
  const n = Number(v);
  return v === undefined || Number.isNaN(n) ? d : n;
}
function parseList(spec, max) {
  const out = [];
  for (const part of String(spec).split(/[,+]/)) {
    const [a, b] = part.split('-').map((n) => parseInt(n, 10));
    if (Number.isNaN(a)) continue;
    const end = b === undefined || Number.isNaN(b) ? a : Math.min(b, max);
    for (let i = a; i <= end; i++) out.push(i);
  }
  return out;
}

function probe(path) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path], { encoding: 'utf8' });
  if (r.error?.code === 'ENOENT') fail('ffprobe (part of ffmpeg) was not found on PATH.');
  const [w, h] = r.stdout.trim().split(',').map(Number);
  if (!w || !h) fail(`Could not read ${path}`);
  return { w, h };
}
function decodeImage(path) {
  const { w, h } = probe(path);
  const r = spawnSync('ffmpeg', ['-v', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgba', '-'], { maxBuffer: 1 << 30 });
  if (r.status !== 0 || r.stdout.length < w * h * 4) fail(`Could not decode ${path}\n${r.stderr}`);
  return { w, h, px: r.stdout.subarray(0, w * h * 4) };
}
function decodeVideo(path, fps, start, dur) {
  const { w, h } = probe(path);
  const args = ['-v', 'error'];
  if (start) args.push('-ss', String(start));
  if (dur) args.push('-t', String(dur));
  args.push('-i', path, '-vf', `fps=${fps}`, '-f', 'rawvideo', '-pix_fmt', 'rgba', '-');
  const r = spawnSync('ffmpeg', args, { maxBuffer: 1 << 31 });
  if (r.status !== 0) fail(`Could not decode ${path}\n${r.stderr}`);
  const size = w * h * 4;
  const out = [];
  for (let o = 0; o + size <= r.stdout.length; o += size) out.push({ w, h, px: Buffer.from(r.stdout.subarray(o, o + size)) });
  return out;
}

/** Removes the background colour. Writes alpha in place and cleans up colour spill on the edges. */
function keyBackground(s) {
  const { w, h, px } = s;
  const border = [];
  for (let x = 0; x < w; x += 2) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y += 2) border.push(y * w, y * w + w - 1);

  if ((opt.key ?? 'auto') === 'none') return;
  if ((opt.key ?? 'auto') === 'auto') {
    const clear = border.filter((i) => px[i * 4 + 3] < 16).length;
    if (clear > border.length * 0.6) return; // already transparent
  }
  const key = keyColor(opt.key ?? 'auto', px, border);
  const greenish = key[1] > key[0] + 40 && key[1] > key[2] + 40;
  const blueish = key[2] > key[0] + 40 && key[2] > key[1] + 40;
  const dist = (i) => Math.hypot(px[i] - key[0], px[i + 1] - key[1], px[i + 2] - key[2]);

  // Distance → alpha. For a green/blue screen every matching pixel goes (nothing on the
  // character is that colour, so gaps between arm and body clear too). For white or other
  // keys only background connected to the border goes, so white eyes and shirts survive.
  const n = w * h;
  const reach = new Uint8Array(n);
  if (greenish || blueish) reach.fill(1);
  else {
    const stack = [];
    for (const i of border) if (dist(i * 4) < TOL + SOFT) (reach[i] = 1), stack.push(i);
    while (stack.length) {
      const i = stack.pop();
      const x = i % w;
      for (const j of [i - w, i + w, x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1]) {
        if (j < 0 || j >= n || reach[j]) continue;
        if (dist(j * 4) < TOL + SOFT) (reach[j] = 1), stack.push(j);
      }
    }
  }
  for (let i = 0; i < n; i++) {
    const p = i * 4;
    if (!reach[i]) continue;
    const d = dist(p);
    const a = Math.max(0, Math.min(1, (d - TOL) / SOFT));
    if (a >= 1) continue;
    if (a > 0) {
      // un-mix the key colour from partially covered edge pixels
      for (let c = 0; c < 3; c++) px[p + c] = Math.max(0, Math.min(255, (px[p + c] - (1 - a) * key[c]) / a));
    }
    px[p + 3] = Math.round(px[p + 3] * a);
  }
  if (greenish || blueish) {
    // spill suppression: the key channel may not exceed the brighter of the other two
    const [ch, o1, o2] = greenish ? [1, 0, 2] : [2, 0, 1];
    for (let p = 0; p < n * 4; p += 4) {
      const cap = Math.max(px[p + o1], px[p + o2]);
      if (px[p + ch] > cap) px[p + ch] = cap;
    }
  }
}
function keyColor(spec, px, border) {
  if (spec === 'green') return [0, 255, 0];
  if (spec === 'white') return [255, 255, 255];
  if (/^#?[0-9a-f]{6}$/i.test(spec)) {
    const v = parseInt(spec.replace('#', ''), 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }
  // auto: per-channel median of the border
  return [0, 1, 2].map((c) => {
    const vals = border.map((i) => px[i * 4 + c]).sort((a, b) => a - b);
    return vals[vals.length >> 1];
  });
}

/** Tight bounding box of solid pixels in a region, ignoring stray specks. */
function bbox(s, x0, y0, x1, y1) {
  const rowsOcc = [], colsOcc = new Array(x1 - x0).fill(0);
  for (let y = y0; y < y1; y++) {
    let c = 0;
    for (let x = x0; x < x1; x++)
      if (s.px[(y * s.w + x) * 4 + 3] >= SOLID) c++, colsOcc[x - x0]++;
    rowsOcc.push(c);
  }
  const ys = rowsOcc.map((c, i) => (c > 1 ? i : -1)).filter((i) => i >= 0);
  const xs = colsOcc.map((c, i) => (c > 1 ? i : -1)).filter((i) => i >= 0);
  if (ys.length < 8 || xs.length < 4) return null;
  return { x0: x0 + xs[0], x1: x0 + xs[xs.length - 1] + 1, y0: y0 + ys[0], y1: y0 + ys[ys.length - 1] + 1 };
}
/**
 * Finds each pose as a connected shape, so poses that overlap column-wise (a raised hand above
 * the next pose's fist) still separate as long as they don't touch. Small detached bits (a hand
 * drawn slightly apart, glasses glints) join the nearest pose; stray specks are dropped.
 */
function autoSplit(s) {
  const { w, h, px } = s;
  const lab = new Int32Array(w * h).fill(-1);
  const stack = new Int32Array(w * h);
  const comps = [];
  const solid = (i) => px[i * 4 + 3] >= 64;
  for (let i0 = 0; i0 < w * h; i0++) {
    if (lab[i0] >= 0 || !solid(i0)) continue;
    const c = { id: comps.length, x0: w, x1: 0, y0: h, y1: 0, mass: 0 };
    let sp = 0;
    stack[sp++] = i0;
    lab[i0] = c.id;
    while (sp) {
      const i = stack[--sp];
      const x = i % w, y = (i / w) | 0;
      c.mass++;
      if (x < c.x0) c.x0 = x;
      if (x >= c.x1) c.x1 = x + 1;
      if (y < c.y0) c.y0 = y;
      if (y >= c.y1) c.y1 = y + 1;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const j = ny * w + nx;
          if (lab[j] < 0 && solid(j)) (lab[j] = c.id), (stack[sp++] = j);
        }
    }
    comps.push(c);
  }
  if (!comps.length) return [];
  const maxMass = Math.max(...comps.map((c) => c.mass));
  const poses = comps.filter((c) => c.mass >= maxMass * 0.2).map((c) => ({ ...c, ids: new Set([c.id]) }));
  const gapTo = (a, b) => Math.hypot(Math.max(0, a.x0 - b.x1, b.x0 - a.x1), Math.max(0, a.y0 - b.y1, b.y0 - a.y1));
  for (const c of comps) {
    if (c.mass >= maxMass * 0.2 || c.mass < maxMass * 0.0015) continue;
    let best = null, bd = Infinity;
    for (const p of poses) {
      const d = gapTo(c, p);
      if (d < bd) (bd = d), (best = p);
    }
    if (best && bd < (best.y1 - best.y0) * 0.12) {
      best.ids.add(c.id);
      best.x0 = Math.min(best.x0, c.x0); best.x1 = Math.max(best.x1, c.x1);
      best.y0 = Math.min(best.y0, c.y0); best.y1 = Math.max(best.y1, c.y1);
    }
  }
  // rows: poses whose vertical centre falls inside an existing row's span share that row
  poses.sort((a, b) => a.y0 + a.y1 - (b.y0 + b.y1));
  const rows = [];
  for (const p of poses) {
    const cy = (p.y0 + p.y1) / 2;
    let row = rows.find((r) => cy > r.y0 && cy < r.y1);
    if (!row) rows.push((row = { y0: p.y0, y1: p.y1, items: [] }));
    row.items.push(p);
  }
  rows.sort((a, b) => a.y0 - b.y0);
  const out = [];
  rows.forEach((r, row) =>
    r.items
      .sort((a, b) => a.x0 + a.x1 - (b.x0 + b.x1))
      .forEach((p) => out.push({ s, x0: p.x0, x1: p.x1, y0: p.y0, y1: p.y1, row, mask: (x, y) => p.ids.has(lab[y * w + x]) })),
  );
  return out;
}
/**
 * Alpha-weighted horizontal centre. By default only the top 55% of the figure counts (head and
 * torso), so swinging legs don't shift the body sideways from frame to frame.
 */
function massCenterX(f) {
  let sum = 0, wsum = 0;
  const yEnd = opt.anchor === 'mass' ? f.y1 : f.y0 + Math.round((f.y1 - f.y0) * 0.55);
  for (let y = f.y0; y < yEnd; y += 2)
    for (let x = f.x0; x < f.x1; x++) {
      if (f.mask && !f.mask(x, y)) continue;
      const a = f.s.px[(y * f.s.w + x) * 4 + 3];
      sum += a * x;
      wsum += a;
    }
  return wsum ? sum / wsum : (f.x0 + f.x1) / 2;
}
/** Spreads edge colours into transparent pixels so scaling never drags in the old background. */
function bleedColors(px, w, h, passes) {
  const n = w * h;
  let filled = new Uint8Array(n);
  for (let i = 0; i < n; i++) filled[i] = px[i * 4 + 3] > 0 ? 1 : 0;
  for (let p = 0; p < passes; p++) {
    const next = filled.slice();
    for (let i = 0; i < n; i++) {
      if (filled[i]) continue;
      const x = i % w;
      let r = 0, g = 0, b = 0, c = 0;
      for (const j of [i - w, i + w, x > 0 ? i - 1 : -1, x < w - 1 ? i + 1 : -1]) {
        if (j < 0 || j >= n || !filled[j]) continue;
        r += px[j * 4]; g += px[j * 4 + 1]; b += px[j * 4 + 2]; c++;
      }
      if (!c) continue;
      px[i * 4] = r / c; px[i * 4 + 1] = g / c; px[i * 4 + 2] = b / c;
      next[i] = 1;
    }
    filled = next;
  }
}
