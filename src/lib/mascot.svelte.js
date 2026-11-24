/**
 * Shared state for the animated character. Every <Character> instance reads it,
 * so the hero portrait and the floating buddy react together.
 */
export const mascot = $state({
  mood: 'idle',
  base: 'idle', // mood to return to after a temporary reaction
  moodId: 0, // increments on every reaction (used to re-trigger particles)
  say: '',
  sayId: 0,
  bounce: 0, // increment to trigger a squash-and-stretch hop
  pointer: { x: -1, y: -1, active: false },
});

let moodTimer;
let sayTimer;

/** Temporarily switch mood, then fall back to the base mood. */
export function react(mood, ms = 1400) {
  mascot.mood = mood;
  mascot.moodId++;
  if (MOODS[mood]?.hop) mascot.bounce++;
  clearTimeout(moodTimer);
  if (ms > 0) moodTimer = setTimeout(() => (mascot.mood = mascot.base), ms);
}

export function setBase(mood) {
  mascot.base = mood;
  mascot.mood = mood;
  mascot.moodId++;
  clearTimeout(moodTimer);
}

/** Show a speech bubble. */
export function say(text, ms = 3800) {
  mascot.say = text;
  mascot.sayId++;
  clearTimeout(sayTimer);
  if (ms > 0) sayTimer = setTimeout(() => (mascot.say = ''), ms);
}

export function hop() {
  mascot.bounce++;
}

/**
 * Expression targets. All values are optional:
 *  smile (both corners) or smileL / smileR, brow or browL / browR (+ up, − down),
 *  widen (+ wide eyes, − slight squint), blush 0..1, look [x, y] gaze override,
 *  tilt (deg), shades (sunglasses), hop (bounce on enter).
 */
export const MOODS = {
  idle: { smile: 0.18 },
  smile: { smile: 0.72, brow: 0.25, widen: 0.05 },
  grin: { smile: 1, brow: 0.45, widen: 0.1, tilt: 2 },
  excited: { smile: 1, brow: 0.95, widen: 0.5, blush: 0.25, hop: true },
  surprised: { smile: -0.12, brow: 1, widen: 1 },
  think: { smile: 0.04, browL: -0.6, browR: 0.35, look: [-0.75, -0.8], tilt: -5 },
  curious: { smileL: 0.04, smileR: 0.62, browL: 0.95, browR: -0.3, widen: 0.15, tilt: 5 },
  shy: { smile: 0.55, blush: 1, look: [0.75, 0.6], widen: -0.08, tilt: 6 },
  love: { smile: 0.9, brow: 0.35, blush: 0.75, widen: 0.2, hop: true },
  cool: { smileL: 0.08, smileR: 0.68, brow: -0.15, shades: true, tilt: 3 },
  sleepy: { smile: 0.05, brow: -0.45, look: [0.05, 0.85], widen: -0.15, tilt: 5 },
};

/** Little emoji that float up from the character for some moods. */
export const PARTICLES = {
  excited: ['✨', '⚡', '✨', '⭐'],
  love: ['❤️', '💖', '❤️'],
  think: ['💭'],
  curious: ['❓', '❔'],
  surprised: ['❗'],
  shy: ['🌸', '✿'],
  sleepy: ['💤'],
  grin: ['✨'],
};

/** Short label shown in the speech bubble header. */
export const MOOD_LABEL = {
  idle: 'chilling',
  smile: 'happy',
  grin: 'stoked',
  excited: 'hyped',
  surprised: 'whoa',
  think: 'thinking',
  curious: 'curious',
  shy: 'shy',
  love: 'in love',
  cool: 'cool',
  sleepy: 'dozing',
};
