/**
 * Deploy Run: a small side-scrolling platformer starring the portfolio character.
 * Canvas 2D, fixed 60 Hz physics, tile collisions, a follow camera, and the sprite
 * strips from public/media/sprite for the hero. Lazy-loaded by Play.svelte.
 *
 *   const game = await createGame(canvas, { onEvent })
 *   game.start() · game.pause() · game.restart() · game.destroy()
 *   game.input.left/right/jump = true|false (for on-screen buttons)
 *
 * Events: key, project, checkpoint, zone, hurt, win (see emit() calls).
 */
import { media } from '../media.js';
import { ACTION_DEFAULTS } from '../sprite.js';
import { T, ROWS, GROUND, SOLID, COMMIT, USED, SPIKE, DIRT, BLOCK, buildLevel } from './level.js';

const VIEW_TOP = 3 * T; // the top 3 rows are only sky: skipping them zooms the camera in
const VIEW_H = (ROWS - 3) * T; // world px the camera shows vertically
const WORLD_H = ROWS * T;

// physics, in world pixels and seconds
const GRAVITY = 1900;
const JUMP_V = 720;
const JUMP_CUT = 260; // releasing jump early caps the upward speed (short hops)
const MAX_FALL = 950;
const RUN_SPEED = 270;
const ACCEL = 1900;
const AIR_ACCEL = 1200;
const FRICTION = 2200;
const COYOTE = 0.1; // can still jump this long after walking off a ledge
const BUFFER = 0.12; // a jump pressed this long before landing still fires
const STEP = 1 / 60;

const HERO = { w: 26, h: 63, drawH: 78 }; // hitbox, and the standing height the sprite is drawn at
const BUG = { w: 40, h: 24, drawH: 34 };

const COLORS = {
  sky0: '#0b0b0e',
  sky1: '#15151b',
  far: '#16161c',
  near: '#1d1d24',
  window: 'rgba(200,255,46,0.55)',
  dirt: '#17171a',
  dirtEdge: '#222228',
  lime: '#c8ff2e',
  block: '#24242b',
  blockEdge: '#3a3a44',
  used: '#1e1e24',
  alert: '#ff4632',
  text: '#f4f4f2',
  mist: '#8b8a85',
};

const BACKDROPS = ['/media/game/bg-campus.webp', '/media/game/bg-hackathon.webp', '/media/game/bg-office.webp'];

export async function createGame(canvas, { onEvent = () => {} } = {}) {
  // backdrops are optional: without them the procedural skyline is drawn instead
  const [sprites, backdrops] = await Promise.all([loadSprites(), Promise.all(BACKDROPS.map((u) => loadImage(u).catch(() => null)))]);
  const game = new Game(canvas, sprites, onEvent, backdrops);
  if (import.meta.env.DEV) window.__game = game; // for playtesting from the console
  return game;
}

/** Loads the strips the game uses, as Image elements ready for drawImage. */
async function loadSprites() {
  const res = await fetch(media.sprite ?? '/media/sprite/sprite.json');
  if (!res.ok) throw new Error(`Couldn't load the character sprites (${res.status})`);
  const man = await res.json();
  const base = (media.sprite ?? '/media/sprite/sprite.json').replace(/\/[^/]*$/, '');
  const out = {};
  await Promise.all(
    ['idle', 'walk', 'run', 'jump', 'dance', 'wave', 'bug'].map(async (name) => {
      const a = man.actions?.[name];
      if (!a) return;
      const img = await loadImage(`${base}/${a.src}?v=${a.v ?? ''}`).catch(() => {
        throw new Error(`Couldn't load the ${name} sprite`);
      });
      out[name] = { ...(ACTION_DEFAULTS[name] ?? {}), ...a, img, rows: Math.ceil(a.frames / a.cols) };
    }),
  );
  if (!out.idle) throw new Error('Deploy Run needs at least the idle sprite');
  return out;
}

function loadImage(url) {
  return new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = fail;
    img.src = url;
  });
}

class Game {
  constructor(canvas, sprites, emit, backdrops = []) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.sprites = sprites;
    this.backdrops = backdrops;
    this.tiles = makeTileArt(); // pre-rendered, per-chapter tile images
    this.emit = emit;
    this.input = { left: false, right: false, jump: false };
    this.running = false;
    this.raf = 0;
    this.onKey = this.onKey.bind(this);
    this.loop = this.loop.bind(this);
    addEventListener('keydown', this.onKey);
    addEventListener('keyup', this.onKey);
    this.restart();
    this.resize();
  }

  // ── lifecycle ─────────────────────────────────────────────────────
  restart() {
    this.L = buildLevel();
    this.grid = this.L.grid.map((row) => row.slice());
    this.keys = this.L.keys.map((k) => ({ ...k, got: false }));
    this.bugs = this.L.bugs.map((b) => ({ x: b.x, y: b.y, vx: -55, vy: 0, w: BUG.w, h: BUG.h, dead: 0, dist: 0 }));
    this.commits = this.L.commits.map((c) => ({ ...c, used: false, bump: 0 }));
    this.particles = [];
    this.bumps = [];
    this.checkpoint = { x: this.L.start.x, y: this.L.start.y, name: 'Start' };
    this.reached = new Set();
    this.zoneIdx = -1;
    this.stats = { keys: 0, totalKeys: this.keys.length, projects: 0, totalProjects: this.commits.length, retries: 0, time: 0 };
    this.won = false;
    this.wonT = 0;
    this.spawn(this.L.start);
    this.cam = 0;
    this.acc = 0;
    this.clock = 0;
  }

  spawn(at) {
    this.p = {
      x: at.x,
      y: at.y,
      vx: 0,
      vy: 0,
      ...HERO,
      onGround: false,
      face: 1,
      coyote: 0,
      buffer: 0,
      inv: 0,
      dist: 0, // distance travelled on the ground, drives the walk/run frames
      airT: 0,
      landT: 0,
      jumpHeld: false,
    };
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  pause() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.input.left = this.input.right = this.input.jump = false;
  }

  destroy() {
    this.pause();
    removeEventListener('keydown', this.onKey);
    removeEventListener('keyup', this.onKey);
  }

  /** Match the canvas buffer to its CSS size (crisp on high-DPI screens). */
  resize() {
    const r = this.canvas.getBoundingClientRect();
    const dpr = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.max(1, Math.round(r.width * dpr));
    this.canvas.height = Math.max(1, Math.round(r.height * dpr));
    this.scale = this.canvas.height / VIEW_H; // device px per world px
    this.viewW = this.canvas.width / this.scale;
    this.vignette = null; // rebuilt for the new size
    this.render();
  }

  onKey(e) {
    if (!this.running) return;
    const down = e.type === 'keydown';
    const k = e.code;
    let used = true;
    if (k === 'ArrowLeft' || k === 'KeyA') this.input.left = down;
    else if (k === 'ArrowRight' || k === 'KeyD') this.input.right = down;
    else if (k === 'Space' || k === 'ArrowUp' || k === 'KeyW') this.input.jump = down;
    else if (k === 'ArrowDown') used = true; // don't let the page scroll under the game
    else used = false;
    if (used) e.preventDefault();
  }

  loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.acc += dt;
    let steps = 0;
    while (this.acc >= STEP && steps < 6) {
      this.update(STEP);
      this.acc -= STEP;
      steps++;
    }
    this.render();
    this.raf = requestAnimationFrame(this.loop);
  }

  // ── simulation ────────────────────────────────────────────────────
  update(dt) {
    this.clock += dt;
    if (!this.won) this.stats.time += dt;
    const p = this.p;
    const inp = this.won ? { left: false, right: false, jump: false } : this.input;

    // horizontal
    const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    if (dir) {
      const a = p.onGround ? ACCEL : AIR_ACCEL;
      // turning round brakes harder, so changing direction feels snappy
      const accel = Math.sign(p.vx) === -dir ? a + FRICTION : a;
      p.vx = clamp(p.vx + dir * accel * dt, -RUN_SPEED, RUN_SPEED);
      p.face = dir;
    } else if (p.onGround) {
      const f = FRICTION * dt;
      p.vx = Math.abs(p.vx) <= f ? 0 : p.vx - Math.sign(p.vx) * f;
    }

    // jump: coyote time + input buffer + variable height
    p.coyote = p.onGround ? COYOTE : p.coyote - dt;
    if (inp.jump && !p.jumpHeld) p.buffer = BUFFER;
    else p.buffer -= dt;
    if (p.buffer > 0 && p.coyote > 0) {
      p.vy = -JUMP_V;
      p.buffer = 0;
      p.coyote = 0;
      p.onGround = false;
      p.airT = 0;
      this.puff(p.x, p.y, 4);
    }
    if (!inp.jump && p.vy < -JUMP_CUT) p.vy = -JUMP_CUT;
    p.jumpHeld = inp.jump;

    p.vy = Math.min(MAX_FALL, p.vy + GRAVITY * dt);
    const wasGround = p.onGround;
    this.moveBody(p, dt, true);
    if (p.onGround && !wasGround && p.airT > 0.15) {
      p.landT = 0.1;
      this.puff(p.x, p.y, 5);
    }
    p.airT = p.onGround ? 0 : p.airT + dt;
    p.landT -= dt;
    p.inv -= dt;
    if (p.onGround) p.dist += Math.abs(p.vx) * dt;
    p.x = clamp(p.x, p.w / 2, this.L.W * T - p.w / 2);

    // fell into a 404
    if (p.y > WORLD_H + 120) this.hurt('404: page not found');

    // spikes: only the lower half of the tile hurts
    if (p.inv <= 0) {
      for (const [tx, ty] of this.tilesUnder(p.x - p.w / 2 + 3, p.y - 14, p.x + p.w / 2 - 3, p.y - 1)) {
        // the spike tips stand 14px tall at the bottom of their tile
        if (this.grid[ty]?.[tx] === SPIKE && p.y > ty * T + T - 12) {
          this.hurt('Merge conflict!');
          break;
        }
      }
    }

    this.updateBugs(dt);
    this.updatePickups();
    this.updateProgress();

    // camera: look ahead in the direction he faces, ease toward it
    const target = clamp(p.x - this.viewW * (p.face > 0 ? 0.38 : 0.62), 0, Math.max(0, this.L.W * T - this.viewW));
    this.cam += (target - this.cam) * Math.min(1, dt * 5);

    for (const c of this.commits) c.bump = Math.max(0, c.bump - dt * 6);
    this.particles = this.particles.filter((q) => {
      q.t += dt;
      q.vy += (q.g ?? 900) * dt;
      q.x += q.vx * dt;
      q.y += q.vy * dt;
      return q.t < q.life;
    });
    if (this.won) {
      this.wonT += dt;
      if (this.wonT < 3 && Math.random() < 0.6) this.confetti();
    }
  }

  /** Moves a body along x then y against solid tiles; bumps commit blocks with the hero's head. */
  moveBody(b, dt, isHero = false) {
    // x first, resolved against the nearest solid tile in the direction of travel
    b.x += b.vx * dt;
    let hit = this.solidsUnder(b);
    if (hit.length && b.vx) {
      const tx = b.vx > 0 ? Math.min(...hit.map((h) => h[0])) : Math.max(...hit.map((h) => h[0]));
      b.x = b.vx > 0 ? tx * T - b.w / 2 - 0.01 : (tx + 1) * T + b.w / 2 + 0.01;
      b.vx = isHero ? 0 : -b.vx;
    }
    // then y
    b.onGround = false;
    b.y += b.vy * dt;
    hit = this.solidsUnder(b);
    if (hit.length && b.vy) {
      if (b.vy > 0) {
        b.y = Math.min(...hit.map((h) => h[1])) * T;
        b.onGround = true;
      } else {
        const ty = Math.max(...hit.map((h) => h[1]));
        b.y = (ty + 1) * T + b.h;
        if (isHero) {
          // bump the block that's most directly above his head
          const row = hit.filter((h) => h[1] === ty).sort((a, c) => Math.abs((a[0] + 0.5) * T - b.x) - Math.abs((c[0] + 0.5) * T - b.x));
          if (this.grid[ty][row[0][0]] === COMMIT) this.bumpCommit(row[0][0], ty);
        }
      }
      b.vy = 0;
    }
  }

  solidsUnder(b) {
    return this.tilesUnder(b.x - b.w / 2, b.y - b.h, b.x + b.w / 2, b.y - 0.01).filter(([tx, ty]) => SOLID.has(this.grid[ty]?.[tx]));
  }

  tilesUnder(x0, y0, x1, y1) {
    const out = [];
    for (let ty = Math.floor(y0 / T); ty <= Math.floor(y1 / T); ty++)
      for (let tx = Math.floor(x0 / T); tx <= Math.floor(x1 / T); tx++) out.push([tx, ty]);
    return out;
  }

  isSolidAt(x, y) {
    return SOLID.has(this.grid[Math.floor(y / T)]?.[Math.floor(x / T)]);
  }

  bumpCommit(tx, ty) {
    const c = this.commits.find((k) => k.x === tx && k.y === ty);
    if (!c || c.used) return;
    c.used = true;
    c.bump = 1;
    this.grid[ty][tx] = USED;
    this.stats.projects++;
    for (let i = 0; i < 14; i++) {
      const a = Math.PI + Math.random() * Math.PI;
      this.particles.push({ x: (tx + 0.5) * T, y: ty * T, vx: Math.cos(a) * 160, vy: Math.sin(a) * 260, t: 0, life: 0.7, color: COLORS.lime, size: 3 });
    }
    this.emit({ type: 'project', project: c.project, stats: { ...this.stats } });
  }

  updateBugs(dt) {
    const p = this.p;
    for (const b of this.bugs) {
      if (b.dead) {
        b.dead += dt;
        continue;
      }
      // only simulate bugs near the camera
      if (b.x < this.cam - 200 || b.x > this.cam + this.viewW + 200) continue;
      b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);
      this.moveBody(b, dt);
      b.dist += Math.abs(b.vx) * dt;
      // turn around at ledges instead of walking off
      if (b.onGround && !this.isSolidAt(b.x + Math.sign(b.vx) * (b.w / 2 + 2), b.y + 4)) b.vx = -b.vx;
      if (b.y > WORLD_H + 100) b.dead = 1;

      // hero vs bug
      if (Math.abs(p.x - b.x) < (p.w + b.w) / 2 && p.y > b.y - b.h && p.y - p.h < b.y) {
        if (p.vy > 0 && p.y - (b.y - b.h) < 16) {
          b.dead = 0.001;
          p.vy = -480;
          this.puff(b.x, b.y - 6, 8, COLORS.alert);
          this.emit({ type: 'stomp' });
        } else if (p.inv <= 0) this.hurt('Ouch, a bug!');
      }
    }
    this.bugs = this.bugs.filter((b) => !b.dead || b.dead < 0.5);
  }

  updatePickups() {
    const p = this.p;
    for (const k of this.keys) {
      if (k.got) continue;
      if (Math.abs(p.x - k.x) < 24 && Math.abs(p.y - p.h / 2 - k.y) < p.h / 2 + 12) {
        k.got = true;
        this.stats.keys++;
        for (let i = 0; i < 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          this.particles.push({ x: k.x, y: k.y, vx: Math.cos(a) * 120, vy: Math.sin(a) * 120, g: 0, t: 0, life: 0.4, color: COLORS.lime, size: 2.5 });
        }
        this.emit({ type: 'key', label: k.label, stats: { ...this.stats } });
      }
    }
  }

  updateProgress() {
    const p = this.p;
    for (const cp of this.L.checkpoints) {
      if (p.x >= cp.x && !this.reached.has(cp.name)) {
        this.reached.add(cp.name);
        this.checkpoint = cp;
        this.emit({ type: 'checkpoint', name: cp.name });
      }
    }
    let zi = 0;
    this.L.zones.forEach((z, i) => p.x >= z.x && (zi = i));
    if (zi !== this.zoneIdx) {
      this.zoneIdx = zi;
      this.emit({ type: 'zone', name: this.L.zones[zi].name });
    }
    if (!this.won && p.x >= this.L.goal.x - 6) {
      this.won = true;
      p.vx = 0;
      p.face = -1; // turn to face the screen-left crowd while dancing
      this.emit({ type: 'win', stats: { ...this.stats } });
    }
  }

  hurt(reason) {
    if (this.won) return;
    this.stats.retries++;
    this.puff(this.p.x, this.p.y - 20, 10, COLORS.alert);
    this.spawn(this.checkpoint);
    this.p.inv = 1.2;
    this.emit({ type: 'hurt', reason, stats: { ...this.stats } });
  }

  puff(x, y, n, color = 'rgba(244,244,242,0.6)') {
    for (let i = 0; i < n; i++)
      this.particles.push({ x, y, vx: (Math.random() - 0.5) * 140, vy: -Math.random() * 120, g: 300, t: 0, life: 0.35 + Math.random() * 0.2, color, size: 2 + Math.random() * 2 });
  }

  confetti() {
    const g = this.L.goal;
    const colors = [COLORS.lime, '#5eead4', '#8b7bff', '#ff4fa3', '#f4f4f2'];
    this.particles.push({ x: g.x + (Math.random() - 0.5) * 120, y: g.y - 200, vx: (Math.random() - 0.5) * 200, vy: -Math.random() * 300, g: 500, t: 0, life: 1.6, color: colors[(Math.random() * colors.length) | 0], size: 3 + Math.random() * 2 });
  }

  // ── drawing ───────────────────────────────────────────────────────
  /** Which chapter (0 Campus, 1 Hackathon, 2 Internship) a world x belongs to. */
  chapterAt(x) {
    let i = 0;
    this.L.zones.forEach((z, k) => x >= z.x && (i = k));
    return Math.min(i, 2);
  }

  render() {
    const { ctx } = this;
    if (!this.scale) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const sky = ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    sky.addColorStop(0, COLORS.sky0);
    sky.addColorStop(1, COLORS.sky1);
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    ctx.save();
    ctx.translate(0, -VIEW_TOP);
    if (this.backdrops.some(Boolean)) this.drawPaintedBackdrop();
    else this.drawBackdrop();
    ctx.restore();

    ctx.save();
    ctx.translate(-Math.round(this.cam * this.scale) / this.scale, -VIEW_TOP);
    this.drawSigns();
    this.drawTiles();
    this.drawCheckpoints();
    this.drawGoal();
    this.drawKeys();
    this.drawBugs();
    this.drawHero();
    for (const q of this.particles) {
      ctx.globalAlpha = Math.max(0, 1 - q.t / q.life);
      ctx.fillStyle = q.color;
      ctx.fillRect(q.x - q.size / 2, q.y - q.size / 2, q.size, q.size);
    }
    ctx.globalAlpha = 1;
    ctx.restore();

    // lens vignette: darkens the corners so the middle of the action reads first
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (!this.vignette) {
      const { width: w, height: h } = this.canvas;
      const g = ctx.createRadialGradient(w / 2, h * 0.55, Math.min(w, h) * 0.35, w / 2, h * 0.55, Math.max(w, h) * 0.75);
      g.addColorStop(0, 'rgba(0,0,0,0)');
      g.addColorStop(1, 'rgba(0,0,0,0.55)');
      this.vignette = g;
    }
    ctx.fillStyle = this.vignette;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * One painted backdrop per chapter, scrolled slowly (parallax) and crossfaded at the chapter
   * borders. Each image's bottom quarter (its "floor") sits behind the ground tiles.
   */
  drawPaintedBackdrop() {
    const { ctx } = this;
    const F = 0.15; // parallax: the backdrop moves at 15% of the camera speed
    const FADE = 260;
    const zs = this.L.zones;
    const center = this.cam + this.viewW / 2;
    zs.forEach((z, i) => {
      const img = this.backdrops[i];
      if (!img) return;
      const start = z.x, end = zs[i + 1]?.x ?? this.L.W * T;
      const fadeIn = i === 0 ? 1 : clamp((center - start + FADE / 2) / FADE, 0, 1);
      const fadeOut = i === zs.length - 1 ? 1 : clamp((end + FADE / 2 - center) / FADE, 0, 1);
      const a = Math.min(fadeIn, fadeOut);
      if (a <= 0) return;
      const travel = (end - start) * F;
      const h = Math.max(VIEW_H * 1.15, ((this.viewW + travel) * img.height) / img.width);
      const w = (h * img.width) / img.height;
      const x = clamp(-(center - start) * F, this.viewW - w, 0);
      const y = GROUND * T - h * 0.76;
      ctx.globalAlpha = a;
      ctx.drawImage(img, x, y, w, h);
    });
    ctx.globalAlpha = 1;
    // push the backdrop back a little so the playfield reads clearly in front of it
    ctx.fillStyle = 'rgba(8,8,12,0.28)';
    ctx.fillRect(0, VIEW_TOP, this.viewW, VIEW_H);
  }

  /** Fallback when the painted backdrops are missing: two parallax skylines. */
  drawBackdrop() {
    const { ctx } = this;
    if (!this.skyline) this.skyline = makeSkyline(this.L);
    for (const [layer, factor, color] of [
      [this.skyline.far, 0.25, COLORS.far],
      [this.skyline.near, 0.5, COLORS.near],
    ]) {
      const off = this.cam * factor;
      for (const b of layer) {
        const x = b.x - off;
        if (x + b.w < 0 || x > this.viewW) continue;
        ctx.fillStyle = color;
        if (b.kind === 'screen') {
          ctx.fillRect(x, b.y, b.w, b.h);
          ctx.fillStyle = 'rgba(200,255,46,0.12)';
          ctx.fillRect(x + 4, b.y + 4, b.w - 8, b.h - 8);
          ctx.fillStyle = color;
          ctx.fillRect(x + b.w / 2 - 2, b.y + b.h, 4, WORLD_H - b.y - b.h);
        } else {
          ctx.fillRect(x, b.y, b.w, WORLD_H - b.y);
          if (b.roof) {
            ctx.beginPath();
            ctx.moveTo(x - 4, b.y);
            ctx.lineTo(x + b.w / 2, b.y - b.roof);
            ctx.lineTo(x + b.w + 4, b.y);
            ctx.fill();
          }
          ctx.fillStyle = COLORS.window;
          for (const w of b.windows) ctx.fillRect(x + w[0], b.y + w[1], 3, 4);
        }
      }
    }
  }

  /** Lit signboards on dark metal posts. */
  drawSigns() {
    const { ctx } = this;
    for (const s of this.L.signs) {
      if (s.x > this.cam + this.viewW + 400 || s.x < this.cam - 500) continue;
      const w = 300;
      const y = 3.6 * T;
      const postTop = y + 64;
      for (const px of [s.x + 18, s.x + w - 24]) {
        const g = ctx.createLinearGradient(px, 0, px + 6, 0);
        g.addColorStop(0, '#2b2d33');
        g.addColorStop(0.5, '#5b5f68');
        g.addColorStop(1, '#2b2d33');
        ctx.fillStyle = g;
        ctx.fillRect(px, postTop, 6, GROUND * T - postTop);
      }
      ctx.shadowColor = 'rgba(200,255,46,0.25)';
      ctx.shadowBlur = 18;
      const panel = ctx.createLinearGradient(0, y, 0, y + 64);
      panel.addColorStop(0, '#24262c');
      panel.addColorStop(1, '#16171b');
      ctx.fillStyle = panel;
      roundRect(ctx, s.x, y, w, 64, 8);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(200,255,46,0.45)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.font = '700 15px Archivo, "Inter Tight", sans-serif';
      ctx.fillStyle = COLORS.text;
      ctx.fillText(s.title, s.x + 16, y + 28, w - 32);
      ctx.font = '500 11px "JetBrains Mono", monospace';
      ctx.fillStyle = COLORS.mist;
      ctx.fillText(s.sub, s.x + 16, y + 48, w - 32);
    }
  }

  drawTiles() {
    const { ctx, grid } = this;
    const art = this.tiles;
    const x0 = Math.max(0, Math.floor(this.cam / T) - 1);
    const x1 = Math.min(this.L.W - 1, Math.ceil((this.cam + this.viewW) / T) + 1);
    for (let ty = 3; ty < ROWS; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = grid[ty][tx];
        if (!t) continue;
        const x = tx * T, y = ty * T;
        const ch = art.chapters[this.chapterAt(x)];
        if (t === DIRT) {
          const top = grid[ty - 1]?.[tx] !== DIRT;
          ctx.drawImage(top ? ch.groundTop : (tx + ty) % 3 ? ch.ground : ch.ground2, x, y, T, T);
        } else if (t === BLOCK) {
          ctx.drawImage(ch.block, x, y, T, T);
        } else if (t === COMMIT || t === USED) {
          const c = this.commits.find((k) => k.x === tx && k.y === ty);
          const bob = t === COMMIT ? Math.sin(this.clock * 3 + tx) * 1.5 : 0;
          const lift = c ? -Math.sin(c.bump * Math.PI) * 10 : 0;
          if (t === COMMIT) {
            ctx.shadowColor = 'rgba(200,255,46,0.55)';
            ctx.shadowBlur = 10 + Math.sin(this.clock * 4 + tx) * 4;
          }
          ctx.drawImage(t === COMMIT ? art.commit : art.used, x, y + bob + lift, T, T);
          ctx.shadowBlur = 0;
        } else if (t === SPIKE) {
          ctx.drawImage(art.spike, x, y, T, T);
        }
      }
    }
  }

  drawCheckpoints() {
    const { ctx } = this;
    for (const cp of this.L.checkpoints) {
      const on = this.reached.has(cp.name);
      const x = cp.x, y = cp.y;
      const pole = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
      pole.addColorStop(0, '#2b2d33');
      pole.addColorStop(0.5, on ? COLORS.lime : '#6a6e78');
      pole.addColorStop(1, '#2b2d33');
      ctx.fillStyle = pole;
      ctx.fillRect(x - 2, y - 74, 4, 74);
      if (on) {
        ctx.shadowColor = COLORS.lime;
        ctx.shadowBlur = 16;
      }
      ctx.beginPath();
      ctx.arc(x, y - 80, 9, 0, Math.PI * 2);
      ctx.fillStyle = on ? COLORS.lime : '#2a2c32';
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = on ? '#e8ffa8' : '#55585f';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.font = '500 10px "JetBrains Mono", monospace';
      ctx.fillStyle = on ? COLORS.lime : COLORS.mist;
      ctx.fillText(on ? `✓ ${cp.name.toLowerCase()} saved` : 'git commit', x + 14, y - 76);
    }
  }

  /** The Deploy gate: a server rack whose lights go green when he arrives. */
  drawGoal() {
    const { ctx } = this;
    const g = this.L.goal;
    const x = g.x + 10, y = g.y;
    const body = ctx.createLinearGradient(x, 0, x + 70, 0);
    body.addColorStop(0, '#15161a');
    body.addColorStop(0.5, '#262830');
    body.addColorStop(1, '#121317');
    ctx.fillStyle = body;
    if (this.won) {
      ctx.shadowColor = COLORS.lime;
      ctx.shadowBlur = 24;
    }
    roundRect(ctx, x, y - 150, 70, 150, 6);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.won ? COLORS.lime : '#4a4d55';
    ctx.lineWidth = 2;
    ctx.stroke();
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = '#1c1d22';
      ctx.fillRect(x + 8, y - 140 + i * 22, 54, 16);
      ctx.fillStyle = 'rgba(255,255,255,0.05)';
      ctx.fillRect(x + 8, y - 140 + i * 22, 54, 2);
      const blink = this.won || Math.sin(this.clock * 5 + i * 1.7) > 0.3;
      ctx.fillStyle = blink ? (this.won ? COLORS.lime : '#5eead4') : '#2f2f38';
      ctx.fillRect(x + 50, y - 135 + i * 22, 6, 6);
    }
    ctx.font = '700 13px "JetBrains Mono", monospace';
    ctx.fillStyle = this.won ? COLORS.lime : COLORS.text;
    ctx.fillText(this.won ? '✓ deployed' : '>_ deploy', x - 4, y - 162);
  }

  /** Skill keys as real keycaps: a sculpted top, darker skirt and a soft drop shadow. */
  drawKeys() {
    const { ctx } = this;
    ctx.textAlign = 'center';
    for (const k of this.keys) {
      if (k.got || k.x < this.cam - 40 || k.x > this.cam + this.viewW + 40) continue;
      const y = k.y + Math.sin(this.clock * 3 + k.x * 0.05) * 3;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(k.x, y + 18, 18, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      const skirt = ctx.createLinearGradient(0, y - 13, 0, y + 13);
      skirt.addColorStop(0, '#d6d4cc');
      skirt.addColorStop(1, '#8f8d86');
      ctx.fillStyle = skirt;
      roundRect(ctx, k.x - 22, y - 13, 44, 26, 6);
      ctx.fill();
      const top = ctx.createLinearGradient(0, y - 12, 0, y + 6);
      top.addColorStop(0, '#ffffff');
      top.addColorStop(1, '#e7e5de');
      ctx.fillStyle = top;
      roundRect(ctx, k.x - 18, y - 12, 36, 18, 4);
      ctx.fill();
      ctx.font = '600 8.5px "Inter Tight", sans-serif';
      ctx.fillStyle = '#1a1a1a';
      ctx.fillText(k.label, k.x, y + 0.5, 32);
    }
    ctx.textAlign = 'left';
  }

  /** Bugs: the 3D beetle sprite when it exists (legs cycle with distance), else a drawn beetle. */
  drawBugs() {
    const { ctx } = this;
    const S = this.sprites.bug;
    for (const b of this.bugs) {
      if (b.x < this.cam - 60 || b.x > this.cam + this.viewW + 60) continue;
      const fade = b.dead ? Math.max(0, 1 - b.dead * 2) : 1;
      ctx.globalAlpha = fade;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(b.x, b.y - 1, 16, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(b.x, b.y + 1);
      ctx.scale(b.vx < 0 ? -1 : 1, b.dead ? 0.3 : 1); // squashed flat when stomped
      if (S) {
        const k = BUG.drawH / (S.ref ?? 320);
        const f = b.dead ? 0 : Math.floor(b.dist / 9) % S.frames;
        const col = f % S.cols, row = Math.floor(f / S.cols);
        ctx.drawImage(S.img, col * S.w, row * S.h, S.w, S.h, (-S.w * k) / 2, -S.h * k, S.w * k, S.h * k);
      } else drawBeetle(ctx, this.clock + b.x);
      ctx.restore();
      ctx.globalAlpha = 1;
    }
  }

  drawHero() {
    const { ctx } = this;
    const p = this.p;
    if (p.inv > 0 && Math.floor(p.inv * 12) % 2 === 0) return; // blink while invulnerable
    const S = this.sprites;
    let a = S.idle, f = 0;
    if (this.won && S.dance) {
      a = S.dance;
      f = Math.floor(this.wonT * a.fps) % a.frames;
    } else if (!p.onGround) {
      a = S.jump ?? S.idle;
      if (S.jump) f = p.airT < 0.06 && p.vy < 0 ? 1 : p.vy < -120 ? 2 : p.vy < 160 ? 3 : 4;
    } else if (p.landT > 0 && S.jump) {
      a = S.jump;
      f = 5;
    } else if (Math.abs(p.vx) > 8) {
      // frames advance with distance travelled. Game speed is ~2.4x the sprite's natural pace,
      // so the stride per loop is stretched to keep the legs readable rather than a blur.
      const fast = Math.abs(p.vx) > 190 && S.run;
      a = fast ? S.run : S.walk ?? S.run ?? S.idle;
      const loop = a === S.run ? 150 : 125; // world px per animation loop
      f = Math.floor((p.dist / loop) * a.frames) % a.frames;
    }
    const k = HERO.drawH / (a.ref ?? 320);
    const dw = a.w * k, dh = a.h * k;
    const col = f % a.cols, row = Math.floor(f / a.cols);
    ctx.save();
    ctx.translate(p.x, p.y + 2);
    // soft contact shadow, smaller and fainter the higher he is above the ground below him
    let floor = p.y;
    while (floor < WORLD_H && !this.isSolidAt(p.x, floor + 1)) floor += T / 2;
    const lift = clamp((floor - p.y) / 160, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${0.4 * (1 - lift)})`;
    ctx.beginPath();
    ctx.ellipse(0, floor - p.y - 1, 20 * (1 - lift * 0.6), 4.5 * (1 - lift * 0.6), 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.scale(p.face, 1);
    ctx.drawImage(a.img, col * a.w, row * a.h, a.w, a.h, -dw / 2, -dh, dw, dh);
    ctx.restore();
  }
}

/**
 * Pre-renders each chapter's tiles once at 2x (ground top/fill, platform block), plus the shared
 * commit block and spikes, so drawing the level is just image copies.
 *   Campus: grass over soil, wooden crates · Hackathon: wooden stage with an LED edge, flight cases
 *   Internship: polished concrete floor, steel crates
 */
function makeTileArt() {
  const S = 2; // render scale
  const tile = (draw) => {
    const c = document.createElement('canvas');
    c.width = c.height = T * S;
    const g = c.getContext('2d');
    g.scale(S, S);
    draw(g);
    return c;
  };
  let seed = 11;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const speckle = (g, colors, n, size = 1.5) => {
    for (let i = 0; i < n; i++) {
      g.fillStyle = colors[(rnd() * colors.length) | 0];
      g.fillRect(rnd() * T, rnd() * T, size * (0.5 + rnd()), size * (0.5 + rnd()));
    }
  };
  const vgrad = (g, y0, y1, stops) => {
    const gr = g.createLinearGradient(0, y0, 0, y1);
    stops.forEach(([o, c]) => gr.addColorStop(o, c));
    return gr;
  };

  // ── Campus ──
  const soil = (variant) => (g) => {
    g.fillStyle = vgrad(g, 0, T, [[0, '#3a2a1e'], [1, '#2a1d14']]);
    g.fillRect(0, 0, T, T);
    speckle(g, ['#4a3626', '#22170f', '#53402d'], 26 + variant * 6);
    // a pebble or two
    for (let i = 0; i < 2; i++) {
      const x = rnd() * T, y = 6 + rnd() * (T - 10);
      g.fillStyle = '#6b6358';
      g.beginPath();
      g.ellipse(x, y, 2.2 + rnd() * 1.5, 1.6, 0, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.18)';
      g.fillRect(x - 1, y - 1.2, 1.2, 0.8);
    }
  };
  const campus = {
    ground: tile(soil(0)),
    ground2: tile(soil(1)),
    groundTop: tile((g) => {
      soil(0)(g);
      g.fillStyle = vgrad(g, 0, 11, [[0, '#7fb43a'], [0.6, '#4f8022'], [1, '#2f4f16']]);
      g.fillRect(0, 0, T, 11);
      // grass blades poking up and a soft root shadow
      for (let i = 0; i < 16; i++) {
        const x = rnd() * T, h = 3 + rnd() * 4;
        g.strokeStyle = rnd() < 0.5 ? '#9ad04a' : '#5f9a2a';
        g.lineWidth = 1;
        g.beginPath();
        g.moveTo(x, 2);
        g.lineTo(x + (rnd() - 0.5) * 2, 2 - h);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(0, 11, T, 2);
    }),
    block: tile((g) => {
      // wooden crate
      g.fillStyle = vgrad(g, 0, T, [[0, '#a8743f'], [1, '#6e4521']]);
      g.fillRect(1, 1, T - 2, T - 2);
      g.strokeStyle = 'rgba(40,22,8,0.55)';
      g.lineWidth = 1;
      for (const y of [9, 17, 25]) {
        g.beginPath();
        g.moveTo(3, y);
        g.lineTo(T - 3, y);
        g.stroke();
      }
      g.strokeStyle = '#5a3818';
      g.lineWidth = 3;
      g.strokeRect(2.5, 2.5, T - 5, T - 5);
      g.beginPath();
      g.moveTo(4, T - 4);
      g.lineTo(T - 4, 4);
      g.stroke();
      g.fillStyle = 'rgba(255,230,190,0.18)';
      g.fillRect(3, 3, T - 6, 2);
      g.fillStyle = '#c9c4b8';
      for (const [x, y] of [[5, 5], [T - 5, 5], [5, T - 5], [T - 5, T - 5]]) g.fillRect(x - 1, y - 1, 2, 2);
    }),
  };

  // ── Hackathon ──
  const stage = (g) => {
    g.fillStyle = vgrad(g, 0, T, [[0, '#1d1a24'], [1, '#121016']]);
    g.fillRect(0, 0, T, T);
    g.strokeStyle = 'rgba(255,255,255,0.04)';
    g.lineWidth = 1;
    g.strokeRect(0.5, 0.5, T - 1, T - 1);
    speckle(g, ['rgba(255,255,255,0.03)', 'rgba(0,0,0,0.25)'], 18);
  };
  const hack = {
    ground: tile(stage),
    ground2: tile(stage),
    groundTop: tile((g) => {
      stage(g);
      // polished wooden stage boards with a lime LED strip on the edge
      g.fillStyle = vgrad(g, 0, 10, [[0, '#7a5638'], [1, '#4d3420']]);
      g.fillRect(0, 0, T, 10);
      g.strokeStyle = 'rgba(30,18,8,0.6)';
      g.beginPath();
      g.moveTo(T / 2, 0);
      g.lineTo(T / 2, 10);
      g.stroke();
      g.fillStyle = 'rgba(255,240,220,0.25)';
      g.fillRect(0, 0, T, 1.5);
      g.fillStyle = '#c8ff2e';
      g.fillRect(0, 10, T, 2);
      g.fillStyle = 'rgba(200,255,46,0.25)';
      g.fillRect(0, 12, T, 4);
    }),
    block: tile((g) => {
      // flight case: dark ribbed panel, metal corners, lime stripe
      g.fillStyle = vgrad(g, 0, T, [[0, '#3a3b42'], [1, '#202127']]);
      g.fillRect(1, 1, T - 2, T - 2);
      g.fillStyle = 'rgba(255,255,255,0.05)';
      for (let y = 4; y < T - 2; y += 3) g.fillRect(3, y, T - 6, 1);
      g.fillStyle = '#c8ff2e';
      g.fillRect(1, T / 2 - 1.5, T - 2, 3);
      g.fillStyle = vgrad(g, 0, 7, [[0, '#d7d9de'], [1, '#868a93']]);
      for (const [x, y] of [[1, 1], [T - 8, 1], [1, T - 8], [T - 8, T - 8]]) g.fillRect(x, y, 7, 7);
    }),
  };

  // ── Internship / office ──
  const concrete = (g) => {
    g.fillStyle = vgrad(g, 0, T, [[0, '#33363c'], [1, '#24262b']]);
    g.fillRect(0, 0, T, T);
    speckle(g, ['rgba(255,255,255,0.05)', 'rgba(0,0,0,0.2)'], 30, 1.2);
  };
  const office = {
    ground: tile(concrete),
    ground2: tile(concrete),
    groundTop: tile((g) => {
      concrete(g);
      // polished floor tiles with a reflection band and a grout line
      g.fillStyle = vgrad(g, 0, 9, [[0, '#a7acb5'], [1, '#6b7079']]);
      g.fillRect(0, 0, T, 9);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(0, 1, T, 1.5);
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.fillRect(T - 1, 0, 1, 9);
      g.fillRect(0, 9, T, 2);
    }),
    block: tile((g) => {
      // brushed steel crate with rivets
      g.fillStyle = vgrad(g, 0, T, [[0, '#7a808a'], [1, '#454a52']]);
      g.fillRect(1, 1, T - 2, T - 2);
      g.fillStyle = 'rgba(255,255,255,0.06)';
      for (let y = 3; y < T - 2; y += 2) g.fillRect(2, y, T - 4, 0.6);
      g.strokeStyle = '#2f3339';
      g.lineWidth = 2;
      g.strokeRect(2, 2, T - 4, T - 4);
      g.fillStyle = '#c3c8d0';
      for (const [x, y] of [[5, 5], [T - 5, 5], [5, T - 5], [T - 5, T - 5]]) {
        g.beginPath();
        g.arc(x, y, 1.3, 0, Math.PI * 2);
        g.fill();
      }
    }),
  };

  // ── shared ──
  const commitArt = (used) =>
    tile((g) => {
      const body = used ? [[0, '#3a3d34'], [1, '#22241f']] : [[0, '#e4ff7a'], [0.5, '#c8ff2e'], [1, '#86b300']];
      g.fillStyle = vgrad(g, 0, T, body);
      roundRect(g, 1, 1, T - 2, T - 2, 6);
      g.fill();
      g.fillStyle = used ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.55)';
      roundRect(g, 4, 3, T - 8, 5, 2.5);
      g.fill();
      g.strokeStyle = used ? 'rgba(200,255,46,0.45)' : 'rgba(40,60,0,0.6)';
      g.lineWidth = 1.5;
      roundRect(g, 1, 1, T - 2, T - 2, 6);
      g.stroke();
      // commit-graph node
      g.strokeStyle = used ? 'rgba(200,255,46,0.6)' : '#1b2600';
      g.lineWidth = 2.5;
      g.beginPath();
      g.moveTo(6, T / 2 + 1);
      g.lineTo(T - 6, T / 2 + 1);
      g.stroke();
      g.beginPath();
      g.arc(T / 2, T / 2 + 1, 5.5, 0, Math.PI * 2);
      g.fillStyle = used ? '#22241f' : '#1b2600';
      g.fill();
      g.stroke();
    });
  const spike = tile((g) => {
    for (let i = 0; i < 4; i++) {
      const x = i * 8;
      const gr = g.createLinearGradient(x, 0, x + 8, 0);
      gr.addColorStop(0, '#5c0f08');
      gr.addColorStop(0.45, '#ff6a52');
      gr.addColorStop(1, '#8a1a10');
      g.fillStyle = gr;
      g.beginPath();
      g.moveTo(x, T);
      g.lineTo(x + 4, T - 15);
      g.lineTo(x + 8, T);
      g.fill();
    }
    g.fillStyle = '#3a3c42';
    g.fillRect(0, T - 3, T, 3);
  });

  return { chapters: [campus, hack, office], commit: commitArt(false), used: commitArt(true), spike };
}

/** Fallback beetle when the bug sprite hasn't been generated. Drawn facing right at the origin. */
function drawBeetle(ctx, t) {
  const leg = Math.sin(t * 18) * 3;
  ctx.strokeStyle = '#1a0d0a';
  ctx.lineWidth = 2;
  for (let i = -1; i <= 1; i++) {
    ctx.beginPath();
    ctx.moveTo(i * 8, -7);
    ctx.lineTo(i * 8 + (i % 2 ? leg : -leg), 0);
    ctx.stroke();
  }
  const shell = ctx.createRadialGradient(-3, -16, 2, 0, -11, 16);
  shell.addColorStop(0, '#ff8a70');
  shell.addColorStop(0.5, '#c8281a');
  shell.addColorStop(1, '#5a0d07');
  ctx.fillStyle = shell;
  ctx.beginPath();
  ctx.ellipse(0, -11, 15, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#140808';
  ctx.beginPath();
  ctx.arc(14, -10, 6, 0, Math.PI * 2);
  ctx.fill();
}

/** Deterministic background buildings per chapter (campus blocks, hackathon screens, office towers). */
function makeSkyline(L) {
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const zoneAt = (x) => {
    let name = L.zones[0].name;
    for (const z of L.zones) if (x >= z.x) name = z.name;
    return name;
  };
  const build = (factor, minH, maxH, gap) => {
    const out = [];
    const span = L.W * T * factor + 2000;
    for (let x = -100; x < span; x += gap + rnd() * gap) {
      const worldX = x / factor; // which chapter this building sits behind
      const zone = zoneAt(worldX);
      const w = 40 + rnd() * 70;
      const h = minH + rnd() * (maxH - minH);
      const y = GROUND * T - h;
      if (zone === 'Hackathon' && rnd() < 0.55) {
        out.push({ kind: 'screen', x, y: y - 20, w: w * 1.2, h: 46 });
        continue;
      }
      const tall = zone === 'Internship' ? 1.5 : 1;
      const b = { x, y: GROUND * T - h * tall, w: zone === 'Internship' ? w * 0.7 : w, roof: zone === 'Campus' && rnd() < 0.5 ? 18 : 0, windows: [] };
      for (let wy = 10; wy < h * tall - 20; wy += 14)
        for (let wx = 8; wx < b.w - 8; wx += 12) if (rnd() < 0.18) b.windows.push([wx, wy]);
      out.push(b);
    }
    return out;
  };
  return { far: build(0.25, 120, 230, 70), near: build(0.5, 70, 150, 90) };
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function clamp(v, a, b) {
  return Math.max(a, Math.min(b, v));
}
