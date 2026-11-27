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
| 6 | **Play** (`Play.svelte`) | *Deploy Run*, a side-scrolling platformer starring you (see below). |
| 7 | **Contact** | Star-warp scene, copy-email, live IST clock. |

## The animated character

`Character.svelte` animates the 3D portrait live with a WebGL shader that warps the image around
face landmarks (`rig` in `src/lib/media.js`): eyes follow the cursor, blinks (with real eyelids),
smile, grin, wink, surprise, thinking and sleepy expressions. It appears in the hero and as a
floating companion (`Buddy.svelte`) on every section after it.

Reactions are wired in `src/lib/mascotDirector.js`: hover links (smile / grin / wink), scroll fast
(surprised), go idle for 16s (falls asleep, wakes when you move), enter a section (speech bubble),
click him (hop + fun fact), copy the email (grin). Moods and their values live in
`src/lib/mascot.svelte.js`. If you replace the portrait image, update the `rig` landmarks.

## Deploy Run (the Play section)

An original side-scrolling platformer starring the full-body version of you. One level in three
chapters (Campus → Hackathon → Internship) ending at the Deploy gate: collect your skills as keys,
bump **commit blocks** from below to unlock project cards (with Live / Code links), stomp bugs, jump
"404" gaps and "merge conflict" spikes. Checkpoints save at each chapter; the win screen leads to
Contact. Keyboard (← → / A D, Space / ↑, Esc), on-screen buttons on touch devices, fullscreen.

- `src/lib/game/level.js`: the level, built from helper calls (`ground`, `blocks`, `commit`, `key`,
  `bug`, `spikes`, `sign`, `checkpoint`). Skill labels come from `toolkit`, commit blocks hand out
  `projects` in order (both in `src/lib/data.js`).
- `src/lib/game/engine.js`: physics (coyote time, jump buffer, variable jump height), collisions,
  enemies, camera, and all the drawing. Tune feel with the constants at the top.
- `src/components/Play.svelte`: the section, HUD, project cards, start/pause/win screens, touch pad.
  The engine is only downloaded when the section scrolls near. In dev, `window.__game` exposes it.

The hero uses the sprite strips below: `idle`, `walk`, `run`, `jump` and `dance` (win). Enemies use
the `bug` strip (a 3D beetle, 4 walking frames). The floating companion in the corner stays the
animated bust and hides while the game is being played.

**Art.** Each chapter has a painted backdrop in `public/media/game/` (`bg-campus`, `bg-hackathon`,
`bg-office`, Seedream 5.0 lite, 21:9, no references) that scrolls slowly and crossfades at chapter
borders; its bottom quarter sits behind the ground. Ground, platforms and spikes are drawn in code per
chapter (grass and crates, a lit stage and flight cases, polished concrete and steel crates) and
pre-rendered once. Without the backdrop images the game falls back to a drawn skyline.

## The character sprites

### Actions

> **Walk and run need a pose guide.** Asked for a "walk cycle", image models draw the same stride
> in every pose, so he glides frozen mid-step. `python scripts/pose-guide.py --poses 16` draws gray
> stick mannequins in a correct cycle; add that image as a third reference and ask the model to
> redraw the character in exactly those poses ("copy the pose guide exactly; dark limbs are his
> near arm and leg, light limbs his far ones"). A short image-to-video clip converted with
> `npm run sprite -- run.mp4 run` works too, but costs credits.

| Action | Frames | Used for |
|--------|--------|----------|
| `idle` ⭐ | 4 | standing still (required) |
| `walk` | 16 | moving slowly |
| `run` | 15 | moving at full speed |
| `jump` | 6 | in the air: take-off, rise, peak, fall, landing |
| `dance` | 6 | celebrating at the Deploy gate |
| `wave`, `think`, `code`, `sit`, `sleep` | 2–6 | generated, not used by the game yet |

### 1. Make a full-body "master" image (once)

Higgsfield → **Nano Banana 2** (or GPT Image 2), reference image: `public/media/me-3d.webp`, aspect **2:3**.

> The same 3D Pixar-style character as the reference image: young Indian man, swept-up black hair,
> rectangular black-frame glasses, short beard and moustache, cream plaid shirt with navy checks
> (sleeves rolled to the elbow), dark navy jeans, white sneakers. FULL BODY, head to toe, the whole
> body visible from the top of the hair to the soles of the shoes, nothing cropped. Standing relaxed,
> turned three-quarters toward the RIGHT. Flat solid pure green #00FF00 background, no floor,
> no shadow, no text.

Save the result as `master.png`. Use it, plus `me-3d.webp`, as the references for every sheet below,
so he looks the same in every action.

### 2. Make one sprite sheet per action

Same model, both reference images, aspect **21:9** (Nano Banana 2.1 can also do **4:1**, which is even
better for one row). Start a fresh prompt each time (Ctrl+A, Delete). Paste the action line, then the
shared tail:

**Shared tail (always add):**
> Sprite sheet for a 2D game: exactly N poses of the SAME character from the reference images in ONE
> horizontal row, evenly spaced with clear empty space between poses so they don't touch. Every pose
> shows the FULL BODY head to toe, nothing cropped. Same size, same camera distance, same lighting,
> same outfit in every pose. Facing RIGHT. Flat solid pure green #00FF00 background, no floor, no
> shadows, no text, no numbers, no grid lines or borders.

**Action lines** (replace N with the number):
- **idle (4):** Idle breathing loop, standing relaxed, arms loose, gentle smile; the poses differ only slightly (chest rises, shoulders lift a little).
- **run (8):** Side view running cycle: contact, down, passing, up for the left leg, then the same for the right leg; arms swing opposite to legs, body leaning slightly forward.
- **walk (8):** Side view walking cycle: contact, down, passing, up for each leg, relaxed arm swing.
- **jump (6):** Jump: crouch to load, push off on toes, rising with arms up, peak with knees tucked, coming down legs extended, landing crouch.
- **wave (6):** Turned three-quarters toward the viewer, raising the right hand and waving hello, big friendly smile; hand goes left, right, left.
- **think (4):** Thinking: hand on chin, eyes looking up, head tilting slightly, finger tapping chin.
- **dance (6):** A fun, goofy victory dance: fist pumps, hip sway, one knee up, happy face.
- **code (4):** Sitting cross-legged on the floor with an open laptop on his lap, typing, focused; side view.
- **sit (4):** Sitting cross-legged on the floor, relaxed, slight breathing movement; side view.
- **sleep (4):** Sitting on the floor slumped forward, asleep, head nodding down; mouth slightly open.

AI sheets are rarely perfect. Generate 2–4 and keep the one where the character stays most
consistent; you can drop bad poses with `--frames` (a range like `2-5`, or a list like `1+3+5`).

### 3. Convert each sheet

```bash
npm run sprite -- path/to/idle.png idle
npm run sprite -- path/to/run.png run
npm run sprite -- path/to/jump.png jump --frames 1-5     # drop a bad 6th pose
npm run sprite -- path/to/wave.png wave --flip           # it came out facing left
```

This keys out the green, finds each pose, crops it, scales every action to the same body size, lines
the feet up on one floor, and writes `public/media/sprite/<action>.webp` plus `sprite.json`. Refresh
the site and he's there. Useful options (all listed at the top of `scripts/sprite.mjs`):

- `--grid 4x2` if the poses are in a fixed grid or auto-split merges two that touch
- `--fps 14` playback speed · `--loop` / `--once`
- `--speed 1.6` for walk/run: raise it if his feet slide backwards, lower it if they skate forwards
- `--size 0.62` how tall a pose is compared to standing (sit/code/sleep already default to this)
- `--tol 60` if a green halo is left, `--tol 35` if parts of him disappear
- A folder of separate images or a short video (`--start 1 --dur 1.2`) works as input too. A
  Higgsfield image-to-video clip of the master "running in place on a green screen, locked camera"
  gives the smoothest run, if one comes out clean.

Set `sprite: null` in `src/lib/media.js` to go back to the bust.

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
| `sprite` | ✅ idle 4 · walk 16 · run 15 · jump 6 · wave 6 · think 4 · dance 6 · code 3 · sit 3 · sleep 2 frames. Walk/run redrawn from `scripts/pose-guide.py` mannequins as a third reference; 16-pose guides (`pose-guide.py --poses 16`, 21:9, 2 rows of 8); converted with `--frames 1-15 --fps 24 --speed 1.65` (run) and `--fps 18 --speed 0.85` (walk) | Seedream 5.0 lite (Unlimited), `me-3d.webp` + full-body master as references, green screen; raw sheets in `sprites-src/` (git-ignored) |

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
