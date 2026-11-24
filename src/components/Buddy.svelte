<script>
  import { onMount, untrack } from 'svelte';
  import { ScrollTrigger } from '../lib/scroll.js';
  import { media } from '../lib/media.js';
  import { mascot, react, say, hop, PARTICLES, MOOD_LABEL } from '../lib/mascot.svelte.js';
  import Character from './Character.svelte';

  let show = $state(false);
  let mini = $state(false);
  let typed = $state('');
  let typing = $state(false);
  let particles = $state([]);
  let pid = 0;

  // poke → a different expression + line each time
  const pokes = [
    ['excited', 'Ha! That tickles 😄'],
    ['cool', 'Top 1% in NPTEL Java. Just saying 😎'],
    ['love', 'I render Golu dolls with Blender Python 🪔'],
    ['curious', 'Psst… scroll back up and decode my face 👀'],
    ['shy', "Svelte or React? I can't choose 🧡"],
    ['excited', 'Three Smart India Hackathons and counting 🏆'],
    ['think', 'Built OVERRIDE for live college tech events 🎮'],
  ];
  let pokeIdx = 0;

  function poke() {
    const [mood, line] = pokes[pokeIdx++ % pokes.length];
    hop();
    react(mood, 2200);
    say(line, 3400);
  }

  // typewriter
  $effect(() => {
    const text = mascot.say;
    mascot.sayId;
    typed = '';
    if (!text) return;
    typing = true;
    let i = 0;
    const id = setInterval(() => {
      typed = text.slice(0, ++i);
      if (i >= text.length) {
        clearInterval(id);
        typing = false;
      }
    }, 24);
    return () => clearInterval(id);
  });

  // emoji particles for expressive moods
  $effect(() => {
    const mood = mascot.mood;
    mascot.moodId;
    const set = PARTICLES[mood];
    if (!set || !show || mini) return;
    const n = mood === 'sleepy' ? 1 : 4;
    const batch = Array.from({ length: n }, (_, i) => ({
      id: ++pid,
      ch: set[i % set.length],
      x: 30 + Math.random() * 45,
      dx: (Math.random() - 0.5) * 70,
      rot: (Math.random() - 0.5) * 50,
      delay: i * 0.12,
      size: 16 + Math.random() * 12,
    }));
    untrack(() => (particles = [...particles, ...batch].slice(-14)));
    const ids = new Set(batch.map((b) => b.id));
    setTimeout(() => (particles = particles.filter((p) => !ids.has(p.id))), 2400);
  });

  // Visible from the About section to the very bottom of the page. Measured live on every
  // scroll instead of a ScrollTrigger with end: 'max', which switched off at the bottom of the
  // page and went stale whenever the page height changed after it was measured.
  onMount(() => {
    let raf = 0;
    const update = () => {
      raf = 0;
      const about = document.getElementById('about');
      if (about) show = about.getBoundingClientRect().top < innerHeight * 0.7;
    };
    const queue = () => (raf ||= requestAnimationFrame(update));
    window.addEventListener('scroll', queue, { passive: true });
    window.addEventListener('resize', queue);
    ScrollTrigger.addEventListener('refresh', queue);
    queue();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', queue);
      window.removeEventListener('resize', queue);
      ScrollTrigger.removeEventListener('refresh', queue);
    };
  });
</script>

<div
  class="buddy pointer-events-none fixed bottom-0 right-2 z-[45] transition-transform duration-700 ease-out-expo md:right-6 {show && !mini ? 'translate-y-[10%]' : 'translate-y-[120%]'}"
  style="width: clamp(88px, min(15vw, 22svh), 230px)"
>
  <!-- speech bubble -->
  {#key mascot.sayId}
    {#if typed}
      <div class="bubble-wrap pointer-events-auto absolute bottom-[80%] right-[58%]" role="status" aria-live="polite">
        <div class="bubble">
          <div class="head">
            <span class="dot"></span>
            <span class="name">MOULISHWAR</span>
            <span class="tag">{MOOD_LABEL[mascot.mood] ?? 'online'}</span>
          </div>
          <p class="text">{typed}<span class="caret {typing ? '' : 'done'}"></span></p>
        </div>
        <span class="trail t1"></span>
        <span class="trail t2"></span>
      </div>
    {/if}
  {/key}

  <!-- floating emoji -->
  {#each particles as p (p.id)}
    <span
      class="particle"
      style="left: {p.x}%; font-size: {p.size}px; --dx: {p.dx}px; --rot: {p.rot}deg; animation-delay: {p.delay}s"
      aria-hidden="true">{p.ch}</span
    >
  {/each}

  <button
    onclick={poke}
    class="pointer-events-auto relative block w-full cursor-pointer"
    style="aspect-ratio: {media.photoAspect}"
    aria-label="Poke Moulishwar's character"
    data-cursor="Poke"
    data-mood="curious"
  >
    <Character class="h-full w-full drop-shadow-[0_-10px_30px_rgba(0,0,0,0.35)]" />
  </button>

  <button
    onclick={() => (mini = true)}
    class="pointer-events-auto absolute right-1 top-[18%] grid h-6 w-6 place-items-center rounded-full bg-ink/80 text-[12px] text-white opacity-60 transition-opacity hover:opacity-100"
    aria-label="Hide character"
  >
    ×
  </button>
</div>

<!-- minimised: small pill to bring him back -->
<button
  onclick={() => {
    mini = false;
    react('excited', 1600);
    say("I'm back! 👋", 2400);
  }}
  class="pill fixed bottom-4 right-4 z-[45] border border-white/15 bg-ink px-4 py-2 text-[12.5px] text-white shadow-xl transition-all duration-500 {show && mini ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-6 opacity-0'}"
>
  👋 Bring Moulishwar back
</button>

<style>
  @property --spin {
    syntax: '<angle>';
    inherits: false;
    initial-value: 0deg;
  }

  .bubble-wrap {
    width: max-content;
    max-width: min(280px, 64vw);
    transform-origin: 100% 100%;
    animation: pop 0.55s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  }
  @keyframes pop {
    from { opacity: 0; transform: translate(14px, 14px) scale(0.55) rotate(-8deg); }
    to { opacity: 1; transform: none; }
  }

  .bubble {
    position: relative;
    border: 1.5px solid transparent;
    border-radius: 18px;
    padding: 10px 14px 12px;
    background:
      linear-gradient(rgba(12, 12, 14, 0.86), rgba(12, 12, 14, 0.86)) padding-box,
      conic-gradient(from var(--spin), #c8ff2e, #5eead4, #8b7bff, #ff4fa3, #c8ff2e) border-box;
    backdrop-filter: blur(14px) saturate(1.4);
    -webkit-backdrop-filter: blur(14px) saturate(1.4);
    box-shadow:
      0 18px 50px -18px rgba(0, 0, 0, 0.7),
      0 0 34px -10px rgba(200, 255, 46, 0.55),
      inset 0 1px 0 rgba(255, 255, 255, 0.08);
    animation: spin 4s linear infinite;
  }
  @keyframes spin {
    to { --spin: 360deg; }
  }

  .head {
    display: flex;
    align-items: center;
    gap: 7px;
    margin-bottom: 5px;
    font: 600 9.5px/1 'JetBrains Mono', ui-monospace, monospace;
    letter-spacing: 0.14em;
    color: rgba(244, 244, 242, 0.55);
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 99px;
    background: #c8ff2e;
    box-shadow: 0 0 10px #c8ff2e;
    animation: blink 1.6s ease-in-out infinite;
  }
  .tag {
    margin-left: auto;
    padding: 3px 7px;
    border-radius: 99px;
    background: rgba(200, 255, 46, 0.14);
    color: #c8ff2e;
    letter-spacing: 0.06em;
    text-transform: uppercase;
  }
  .text {
    margin: 0;
    color: #f7f7f4;
    font: 500 13.5px/1.45 'Inter Tight', system-ui, sans-serif;
  }
  /* phones: a smaller, quieter bubble so it doesn't sit on top of the content */
  @media (max-width: 639px) {
    .bubble-wrap {
      max-width: min(200px, 54vw);
    }
    .bubble {
      padding: 7px 10px 8px;
      border-radius: 14px;
    }
    .head {
      display: none;
    }
    .text {
      font-size: 12px;
      line-height: 1.4;
    }
  }

  .caret {
    display: inline-block;
    width: 7px;
    height: 1.05em;
    margin-left: 2px;
    vertical-align: -2px;
    border-radius: 2px;
    background: #c8ff2e;
    animation: blink 0.8s steps(2) infinite;
  }
  .caret.done {
    opacity: 0.6;
  }
  @keyframes blink {
    50% { opacity: 0.15; }
  }

  /* comic-style thought trail toward the character */
  .trail {
    position: absolute;
    border-radius: 99px;
    background: linear-gradient(135deg, #c8ff2e, #8b7bff);
    box-shadow: 0 0 12px rgba(200, 255, 46, 0.6);
  }
  .t1 {
    width: 10px;
    height: 10px;
    right: -8px;
    bottom: -6px;
  }
  .t2 {
    width: 6px;
    height: 6px;
    right: -18px;
    bottom: -16px;
  }

  .particle {
    position: absolute;
    bottom: 62%;
    pointer-events: none;
    filter: drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5));
    animation: float 2.2s cubic-bezier(0.22, 1, 0.36, 1) both;
  }
  @keyframes float {
    0% { opacity: 0; transform: translate(0, 10px) scale(0.4) rotate(0); }
    15% { opacity: 1; transform: translate(calc(var(--dx) * 0.2), -10px) scale(1.1) rotate(calc(var(--rot) * 0.3)); }
    100% { opacity: 0; transform: translate(var(--dx), -120px) scale(0.9) rotate(var(--rot)); }
  }

  @media (prefers-reduced-motion: reduce) {
    .bubble, .dot, .caret { animation: none; }
    .particle { display: none; }
  }
</style>
