/**
 * Media slots.
 * Higgsfield clips are turned into scroll-scrubbed frame sequences with:
 *   npm run frames -- path/to/clip.mp4 <name>
 * which writes public/media/seq/<name>/*.webp + manifest.json.
 * Put <name> in a slot below. A slot left as null falls back to a procedural canvas scene.
 */
export const media = {
  // Final hero portrait: Higgsfield (GPT Image 2) 3D-animated version of you, transparent background.
  // The ASCII "code" stage is generated from this same image, so the silhouettes always match.
  photo: '/media/me-3d.webp',
  photoAspect: 1400 / 1288, // width / height of the portrait image (head + full shoulders, cut only at the bottom)
  stylized: null, // optional middle stage between code and `photo`
  // Full-body character that runs along the bottom of the screen (built with `npm run sprite`).
  // Until an `idle` action exists, the floating buddy stays the animated bust. null = always the bust.
  sprite: '/media/sprite/sprite.json',
  // Face rig landmarks for `photo`, in image pixels (image is 1400 × 1288).
  // Used by Character.svelte to animate eyes, blinks, brows and smile with a WebGL warp.
  rig: {
    size: [1400, 1288],
    eyes: [
      [598, 454],
      [800, 456],
    ],
    eyeRadius: [50, 32],
    brows: [
      [590, 376],
      [805, 381],
    ],
    mouthL: [609, 642],
    mouthR: [789, 640],
    mouthC: [700, 646],
  },
  scenes: {
    about: null, // About uses the real-time AuroraBg instead
    skills: null, // Skills uses the real-time "globe" scene instead
    hexoria: null,
    malware: 'malware', // Higgsfield: red laser scanning a smartphone
    journey: null,
    contact: null,
  },
};
