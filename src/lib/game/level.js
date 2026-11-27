/**
 * Deploy Run: the one level. Three chapters of the story (Campus → Hackathon → Internship)
 * ending at the Deploy gate. Built from small helper calls instead of a hand-drawn tile map
 * so it's easy to tweak: x is in tiles from the left, y in tiles from the top (ground is row 12).
 */
import { projects, toolkit } from '../data.js';

export const T = 32; // tile size in world pixels
export const ROWS = 15; // level height in tiles; the view always shows all of them
export const GROUND = 12; // first ground row

// tile ids
export const EMPTY = 0;
export const DIRT = 1; // ground
export const BLOCK = 2; // floating platform block
export const COMMIT = 3; // bump from below: pops out a project
export const USED = 4; // a commit block that has been bumped
export const SPIKE = 5; // "merge conflict": hurts, not solid

export const SOLID = new Set([DIRT, BLOCK, COMMIT, USED]);

export function buildLevel() {
  const W = 196;
  const grid = Array.from({ length: ROWS }, () => new Array(W).fill(EMPTY));
  const L = {
    W,
    grid,
    keys: [],
    bugs: [],
    signs: [],
    checkpoints: [],
    commits: [],
    zones: [],
    start: { x: 3 * T, y: GROUND * T },
    goal: { x: 188 * T, y: GROUND * T },
  };

  const set = (x, y, v) => {
    if (x >= 0 && x < W && y >= 0 && y < ROWS) grid[y][x] = v;
  };
  const ground = (x0, x1, top = GROUND) => {
    for (let x = x0; x <= x1; x++) for (let y = top; y < ROWS; y++) set(x, y, DIRT);
  };
  const blocks = (x0, x1, y) => {
    for (let x = x0; x <= x1; x++) set(x, y, BLOCK);
  };
  const commit = (x, y) => {
    set(x, y, COMMIT);
    L.commits.push({ x, y });
  };
  const spikes = (x0, x1, y = GROUND - 1) => {
    for (let x = x0; x <= x1; x++) set(x, y, SPIKE);
  };
  const key = (x, y) => L.keys.push({ x: (x + 0.5) * T, y: (y + 0.5) * T });
  const bug = (x, y = GROUND) => L.bugs.push({ x: (x + 0.5) * T, y: y * T });
  const sign = (x, title, sub) => L.signs.push({ x: x * T, title, sub });
  const checkpoint = (x, name) => L.checkpoints.push({ x: (x + 0.5) * T, y: GROUND * T, name });
  const zone = (x, name) => L.zones.push({ x: x * T, name });

  // ── Chapter 1: Campus ─────────────────────────────────────────────
  zone(0, 'Campus');
  ground(0, 27);
  sign(5, 'SONA COLLEGE OF TECHNOLOGY', 'MCA · 8.5 CGPA');
  key(8.6, 10), key(10.1, 10), key(11.6, 10);
  commit(14, 8);
  blocks(18, 21, 9);
  key(18.8, 8), key(20.2, 8);
  bug(24);
  // 404 gap
  key(27.6, 9), key(29, 8), key(30.4, 9);
  ground(31, 52);
  ground(35, 36, 11), ground(37, 38, 10), ground(39, 40, 9);
  key(39.5, 7);
  bug(44);
  commit(46, 8);
  bug(49);
  ground(56, 95);
  checkpoint(58, 'Campus');

  // ── Chapter 2: Hackathon ──────────────────────────────────────────
  zone(63, 'Hackathon');
  sign(64, 'SMART INDIA HACKATHON', '2022 · 2024 · 2025');
  blocks(69, 74, 9); // walk over the merge conflict
  spikes(70, 73);
  key(70.8, 8), key(72.2, 8);
  bug(78), bug(82);
  commit(86, 8);
  bug(91);
  // 404 gap with a stepping stone
  blocks(97, 98, 9);
  key(97.5, 8);
  ground(100, 126);
  spikes(104, 106);
  key(105, 8);
  bug(110), bug(114);
  commit(117, 8);
  checkpoint(122, 'Hackathon');

  // ── Chapter 3: Internship → Deploy ────────────────────────────────
  zone(127, 'Internship');
  key(128, 9);
  ground(130, 195);
  sign(132, 'SYMPHOZEN LABS', 'Full-stack intern · 2026');
  commit(138, 8);
  blocks(142, 145, 9);
  key(142.8, 8), key(144.2, 8);
  bug(148), bug(152);
  spikes(156, 157);
  commit(161, 8);
  bug(165);
  ground(170, 171, 11), ground(172, 173, 10), ground(174, 175, 9), ground(176, 177, 8);
  ground(178, 179, 10), ground(180, 181, 11);
  key(171, 9), key(176.5, 6);

  // labels: skills on the keys (in toolkit order), featured projects in the commit blocks
  const skills = toolkit.filter((k) => k.kind !== 'glyph').map((k) => k.label);
  L.keys.forEach((k, i) => (k.label = skills[i % skills.length]));
  L.commits.forEach((c, i) => (c.project = projects[i % projects.length]));
  return L;
}
