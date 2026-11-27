/**
 * Playback defaults for the full-body character strips built by `npm run sprite`
 * (public/media/sprite/). `npm run sprite -- … --fps / --loop / --once / --speed` overrides them
 * per action in sprite.json. The Play section's game (lib/game/engine.js) reads these.
 *   speed  natural travel speed in character heights per second (matches the stride)
 */
export const ACTION_DEFAULTS = {
  idle: { fps: 8, loop: true },
  walk: { fps: 10, loop: true, speed: 0.55 },
  run: { fps: 14, loop: true, speed: 1.7 },
  jump: { fps: 12, loop: false },
  wave: { fps: 9, loop: false },
  sit: { fps: 6, loop: true },
  sleep: { fps: 4, loop: true },
  think: { fps: 3, loop: true },
  dance: { fps: 8, loop: true },
  code: { fps: 8, loop: true },
};
