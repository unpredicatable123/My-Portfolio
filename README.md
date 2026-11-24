# Moulishwar G — Portfolio

Interactive scroll-scene portfolio built with **Svelte 5 + Tailwind CSS v4 + GSAP ScrollTrigger + Lenis**,
with AI visuals generated in **Higgsfield**.

## Run

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # production build → dist/
npm run preview   # serve the build
```

Deploy: push to GitHub and import the repo in Vercel (framework preset: Vite, build `npm run build`, output `dist`; `vercel.json` sets these plus cache headers). No env vars needed.

## The scroll story

| # | Section | What happens on scroll |
|---|---------|------------------------|
| 0 | **Hero** (`Hero.svelte`, `FaceMorph.svelte`) | Pinned. Your face starts as live ASCII code (reacts to the mouse), dissolves into the Higgsfield 3D-animated version, then into the real photo. The outlined name fills letter by letter; the card shrinks into the next scene. |
| 1 | **About** | Pinned; words light up one by one over a scroll-scrubbed scene. Stats count up. |
| 2 | **Toolkit** (`Skills.svelte`) | Skills rain down as physical keycaps (matter-js) and pile up over the headline. Grab and throw them, sweep the cursor through the pile, scroll fast and it jumps; on touch, tap a key to flick it. Below the pile, "The full kit" lists every skill by category; pointing at (or tapping) a category lights its keys and makes them jump out of the pile. Edit keys in `toolkit` and categories in `toolkitGroups` in `src/lib/data.js`. |
| 3 | **Selected Work** | Horizontal pinned scroll (desktop) through 6 featured GitHub projects (Hexoria, Golu, OVERRIDE, VAZHI, AI Scam Detection, Android Malware), each with its own theme and a live screenshot or animated UI mock, then a "More work" hover list (SymphoCare and this portfolio). Edit them in `src/lib/data.js` (`projects`, `moreProjects`); screenshots live in `public/media/projects/`. |
| 4 | **Journey** | Timeline line draws itself; tilt/glare certification cards. |
| 5 | **Hackathons** | Sticky stacking SIH cards. |
| 6 | **Contact** | Star-warp scene, copy-email, live IST clock. |

## The animated character

`Character.svelte` animates the 3D portrait live with a WebGL shader that warps the image around
face landmarks (`rig` in `src/lib/media.js`): eyes follow the cursor, blinks (with real eyelids),
smile, grin, wink, surprise, thinking and sleepy expressions. It appears in the hero and as a
floating companion (`Buddy.svelte`) on every section after it.

Reactions are wired in `src/lib/mascotDirector.js`: hover links (smile / grin / wink), scroll fast
(surprised), go idle for 16s (falls asleep, wakes when you move), enter a section (speech bubble),
click him (hop + fun fact), copy the email (grin). Moods and their values live in
`src/lib/mascot.svelte.js`. If you replace the portrait image, update the `rig` landmarks.

## Media & Higgsfield

All media slots live in `src/lib/media.js`.

- `photo` — the Higgsfield 3D-animated portrait (transparent PNG/WebP). The hero's ASCII "code" stage is
  generated from this same image. Set `photoAspect` to its width / height. Keep the body cut only by the
  bottom edge (no shoulders touching the sides) so it sits cleanly on the hero card.
- `stylized` — optional extra middle stage (unused).
- `scenes.*` — Higgsfield video clips, converted to scroll-scrubbed frame sequences.

### Adding / replacing a scene clip

1. Generate a 16:9 clip in Higgsfield (Seedance 2.0 Fast, 5s, 720p, audio off works well).
2. Download the MP4 and convert it:
   ```bash
   npm run frames -- path/to/clip.mp4 about
   ```
   This writes `public/media/seq/about/0001.webp …` plus `manifest.json` (needs `ffmpeg` on PATH).
3. Set `scenes.about = 'about'` in `src/lib/media.js`.

A slot left as `null` falls back to a procedural canvas scene (code rain, orbit, grid, star warp),
so the site always works.

### Current Higgsfield assets

| Slot | Status | Source |
|------|--------|--------|
| `photo` | ✅ `me-3d.webp` (head-and-shoulders bust, cut only at the bottom) | GPT Image 2, your photo as reference |
| `about` | ✅ 58 frames | Seedance 2.0 Fast, trimmed to 0–2.4s |
| `skills` | ✅ 63 frames | Seedance 2.0 Fast, trimmed to 0–2.6s |
| `malware` | ✅ 29 frames | Seedance 2.0 Fast, trimmed to 0–1.2s (a longer clean clip would scrub smoother) |
| `journey` | ⏳ procedural fallback | not generated yet |
| `contact` | ⏳ procedural star-warp | not generated yet |

When generating, make sure the prompt box is **completely empty** first (Ctrl+A, Delete); Higgsfield keeps
the previous prompt and the old text can leak into the clip.

### Prompts to use (16:9 · 5s · 720p · audio off)

- **3D portrait (GPT Image 2, your photo as reference, 3:4):** "Transform the person in the reference photo
  into a premium 3D animated film character, Pixar style render. Keep EXACTLY the same pose, framing,
  camera angle and composition… plain pure white background…"
- **About:** "Cinematic slow dolly-in through an infinite dark digital void. Thousands of floating glowing
  monospace code characters… one continuous shot, no cuts, no scene change, no people, no readable text."
- **Malware:** "Cinematic macro shot slowly pushing in on a black smartphone lying on a dark reflective glass
  desk. A thin red laser scanning line sweeps down across its glowing screen… one continuous shot, no cuts."
- **Journey:** "Cinematic aerial drone shot slowly rising over a modern college campus at sunrise. Warm golden
  light, soft morning mist… a few graduation caps tossed in the air… one continuous shot, no readable text."
- **Contact:** "Cinematic hyperspace flight forward through a tunnel of streaking white and lime-green light
  trails that opens into a bright sunrise over a futuristic city skyline… one continuous shot, no text."
