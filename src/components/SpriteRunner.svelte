<script>
  /**
   * The full-body character that lives on the bottom edge of the screen: walks, runs, jumps
   * and emotes using the strips from `npm run sprite`. Behaviour is in lib/spriteBrain.js;
   * this component only measures, ticks and draws.
   */
  import { onMount, untrack } from 'svelte';
  import { lenis, reducedMotion } from '../lib/scroll.js';
  import { mascot } from '../lib/mascot.svelte.js';
  import { SpriteBrain } from '../lib/spriteBrain.js';

  /** overlay(side) renders the speech bubble; side is 'left' or 'right' of the character. */
  let { sheet, active = true, onpoke, onhide, overlay } = $props();

  const brain = new SpriteBrain(untrack(() => sheet));

  let charH = $state(150); // on-screen standing height
  let x = $state(0);
  let y = $state(0);
  let dir = $state(-1);
  let strip = $state(untrack(() => sheet.get('idle')));
  let frame = $state(0);
  let side = $state('left');

  const boxW = $derived(charH * 0.62);
  const k = $derived(charH / (strip.ref ?? 320));
  const col = $derived(frame % strip.cols);
  const row = $derived(Math.floor(frame / strip.cols));

  function measure() {
    charH = Math.round(Math.max(96, Math.min(innerHeight * 0.25, innerWidth * 0.34, 220)));
    brain.resize(innerWidth, charH, charH * 0.4 + 8);
    sync();
  }

  function sync() {
    x = brain.x;
    y = brain.y;
    dir = brain.dir;
    const f = brain.frame();
    if (f.strip !== strip) strip = f.strip;
    frame = f.frame;
    // the bubble sits on the roomier side, with a dead zone so it doesn't flip back and forth mid-run
    const p = x / innerWidth;
    if (p > 0.58) side = 'left';
    else if (p < 0.42) side = 'right';
  }

  onMount(() => {
    measure();
    addEventListener('resize', measure);
    const onScroll = (e) => {
      if (active && Math.abs(e.velocity ?? 0) > 12) brain.nudge(Math.sign(e.velocity));
    };
    lenis?.on('scroll', onScroll);
    return () => {
      removeEventListener('resize', measure);
      lenis?.off('scroll', onScroll);
    };
  });

  // animation loop, only while the character is on screen
  $effect(() => {
    if (!active || reducedMotion) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      brain.pointerX = mascot.pointer.active ? mascot.pointer.x : null;
      brain.step(dt);
      sync();
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  });

  // pokes, moods and speech from the shared mascot store
  let seen = { mood: mascot.moodId, say: mascot.sayId, hop: mascot.bounce };
  $effect(() => {
    const now = { mood: mascot.moodId, say: mascot.sayId, hop: mascot.bounce };
    const mood = mascot.mood;
    const text = mascot.say;
    const base = mascot.base;
    untrack(() => {
      brain.sleepy = base === 'sleepy';
      const changes = {
        hop: now.hop !== seen.hop,
        mood: now.mood !== seen.mood ? mood : null,
        talk: now.say !== seen.say && text ? text.length * 0.024 + 1.8 : 0,
      };
      seen = now;
      if (!reducedMotion) brain.respond(changes);
    });
  });
</script>

<div
  class="pointer-events-none fixed bottom-0 left-0 z-[45]"
  style="width: {boxW}px; height: {charH}px; transform: translate3d({x - boxW / 2}px, 0, 0)"
>
  <div class="relative h-full w-full transition-[translate] duration-700 ease-out-expo {active ? 'translate-y-[3%]' : 'translate-y-[140%]'}">
    {@render overlay?.(side)}

    <!-- ground shadow: shrinks while he's in the air -->
    <span class="shadow" style="transform: translateX(-50%) scale({1 - (y / charH) * 1.2}); opacity: {0.55 - (y / charH) * 0.8}" aria-hidden="true"></span>

    <button
      onclick={onpoke}
      class="pointer-events-auto absolute bottom-0 left-1/2 block cursor-pointer"
      style="width: {strip.w * k}px; height: {strip.h * k}px; translate: -50% {-y}px"
      aria-label="Poke Moulishwar's character"
      data-cursor="Poke"
      data-mood="curious"
    >
      <span
        class="block h-full w-full"
        style="background-image: url({strip.url}); background-size: {strip.cols * 100}% {strip.rows * 100}%; background-position: {strip.cols > 1 ? (col / (strip.cols - 1)) * 100 : 0}% {strip.rows > 1 ? (row / (strip.rows - 1)) * 100 : 0}%; transform: scaleX({dir})"
      ></span>
    </button>

    <button
      onclick={onhide}
      class="pointer-events-auto absolute -right-3 top-[2%] grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-[12px] text-white opacity-50 transition-opacity hover:opacity-100 focus-visible:opacity-100"
      aria-label="Hide character"
    >
      ×
    </button>
  </div>
</div>

<style>
  .shadow {
    position: absolute;
    left: 50%;
    bottom: 1%;
    width: 58%;
    height: 7%;
    border-radius: 50%;
    background: radial-gradient(closest-side, rgba(0, 0, 0, 0.55), transparent);
    pointer-events: none;
  }
  button span {
    background-repeat: no-repeat;
    filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.3));
  }
</style>
