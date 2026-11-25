/**
 * Full-body sprite character: loads the strips built by `npm run sprite` (public/media/sprite/).
 * Every action is optional except `idle`; a missing action borrows the closest one that exists.
 */
import { media } from './media.js';

/** Playback defaults per action name. `npm run sprite -- … --fps / --loop / --once / --speed` overrides them. */
export const ACTION_DEFAULTS = {
  idle: { fps: 8, loop: true },
  walk: { fps: 10, loop: true, speed: 0.55 }, // speed: character heights per second
  run: { fps: 14, loop: true, speed: 1.7 },
  jump: { fps: 12, loop: false },
  wave: { fps: 10, loop: false },
  sit: { fps: 6, loop: true },
  sleep: { fps: 4, loop: true },
  think: { fps: 6, loop: true },
  dance: { fps: 10, loop: true },
  code: { fps: 8, loop: true },
};

const BORROW = {
  walk: ['run'],
  run: ['walk'],
  sleep: ['sit'],
  code: ['sit', 'think'],
  dance: ['jump', 'wave'],
  think: [],
  sit: [],
  wave: [],
  jump: [],
};

export class SpriteSheet {
  constructor(manifest, base) {
    this.actions = {};
    this.ready = new Set(); // actions whose image has downloaded; others are borrowed until then
    for (const [name, a] of Object.entries(manifest.actions ?? {})) {
      this.actions[name] = {
        name,
        ...(ACTION_DEFAULTS[name] ?? { fps: 10, loop: true }),
        ...a,
        rows: Math.ceil(a.frames / a.cols),
        url: `${base}/${a.src}?v=${a.v ?? ''}`,
      };
    }
  }

  /** True when this action was generated (not borrowed) and is ready to play. */
  has(name) {
    return this.ready.has(name);
  }

  /** The strip to play for `name`, falling back to a similar action, then to idle. */
  get(name) {
    if (this.ready.has(name)) return this.actions[name];
    for (const alt of BORROW[name] ?? []) if (this.ready.has(alt)) return this.actions[alt];
    return this.actions.idle;
  }

  /** Seconds a one-shot action takes to play once. */
  duration(name) {
    const a = this.get(name);
    return a.frames / a.fps;
  }
}

const preload = (url) =>
  new Promise((ok, fail) => {
    const img = new Image();
    img.onload = () => (img.decode ? img.decode().catch(() => {}).then(() => ok(img)) : ok(img));
    img.onerror = fail;
    img.src = url;
  });

/** Resolves to a SpriteSheet once `idle` is downloaded, or null when no sprite has been generated. */
export async function loadSprite() {
  if (!media.sprite) return null;
  try {
    const res = await fetch(media.sprite, { cache: 'no-cache' });
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('json')) return null;
    const sheet = new SpriteSheet(await res.json(), media.sprite.replace(/\/[^/]*$/, ''));
    if (!sheet.actions.idle) return null;
    await preload(sheet.actions.idle.url);
    sheet.ready.add('idle');
    // the rest download in the background and join in as they arrive
    for (const a of Object.values(sheet.actions))
      if (a.name !== 'idle') preload(a.url).then(() => sheet.ready.add(a.name), () => {});
    return sheet;
  } catch {
    return null;
  }
}
