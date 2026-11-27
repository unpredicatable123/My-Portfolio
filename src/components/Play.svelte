<script>
  /**
   * (06) Play: "Deploy Run", a side-scrolling platformer starring the portfolio character.
   * The engine (lib/game/engine.js) is only downloaded when this section scrolls near.
   */
  import { onMount } from 'svelte';
  import { gsap, scrollTo } from '../lib/scroll.js';
  import { app } from '../lib/state.svelte.js';

  let section;
  let frame;
  let canvas;
  let game = null;
  let enginePromise = null;

  let status = $state('idle'); // idle | loading | playing | paused | won | error
  let stats = $state({ keys: 0, totalKeys: 18, projects: 0, totalProjects: 6, retries: 0, time: 0 });
  let zone = $state('Campus');
  let card = $state(null);
  let toast = $state('');
  let fullscreen = $state(false);
  let touch = $state(false);
  let cardTimer = 0;
  let toastTimer = 0;
  let timeTimer = 0;

  let errorMsg = $state('');

  // a failed download isn't remembered, so "Try again" really tries again
  const loadEngine = () =>
    (enginePromise ??= import('../lib/game/engine.js').catch((err) => {
      enginePromise = null;
      throw err;
    }));

  function flash(text, ms = 1600) {
    toast = text;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (toast = ''), ms);
  }

  function onEvent(e) {
    if (e.stats) stats = e.stats;
    if (e.type === 'project') {
      card = e.project;
      clearTimeout(cardTimer);
      cardTimer = setTimeout(() => (card = null), 6500);
    } else if (e.type === 'key') flash(`+ ${e.label}`, 900);
    else if (e.type === 'checkpoint') flash(`✓ ${e.name} saved`);
    else if (e.type === 'zone') zone = e.name;
    else if (e.type === 'hurt') flash(e.reason, 1400);
    else if (e.type === 'win') {
      status = 'won';
      app.playing = false;
      clearInterval(timeTimer);
    }
  }

  async function play() {
    if (status === 'loading') return;
    try {
      if (!game) {
        status = 'loading';
        const { createGame } = await loadEngine();
        game = await createGame(canvas, { onEvent });
      }
      game.restart();
      stats = { ...game.stats };
      zone = 'Campus';
      card = null;
      resume();
    } catch (err) {
      console.error('[Play]', err);
      game = null;
      errorMsg = /fetch|import|network|load/i.test(String(err?.message))
        ? "Couldn't download the game. Check your connection (or that the dev server is running) and try again."
        : String(err?.message ?? err);
      status = 'error';
    }
  }

  function resume() {
    if (!game) return;
    status = 'playing';
    app.playing = true;
    game.resize();
    game.start();
    canvas.focus({ preventScroll: true });
    clearInterval(timeTimer);
    timeTimer = setInterval(() => (stats = { ...stats, time: game.stats.time }), 250);
  }

  function pause() {
    if (status !== 'playing') return;
    game?.pause();
    status = 'paused';
    app.playing = false;
    clearInterval(timeTimer);
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await frame.requestFullscreen?.();
    } catch {}
  }

  /** On-screen buttons: hold to move, tap to jump. */
  function hold(key) {
    return {
      onpointerdown: (e) => {
        e.preventDefault();
        if (game) game.input[key] = true;
      },
      onpointerup: () => game && (game.input[key] = false),
      onpointercancel: () => game && (game.input[key] = false),
      onpointerleave: () => game && (game.input[key] = false),
    };
  }

  const fmtTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

  onMount(() => {
    touch = matchMedia('(hover: none)').matches;

    // fetch the engine a little before the section is reached
    const near = new IntersectionObserver(
      ([en]) => {
        if (!en.isIntersecting) return;
        loadEngine().catch(() => {}); // Start retries and reports a failure
        near.disconnect();
      },
      { rootMargin: '900px 0px' },
    );
    near.observe(section);

    // pause as soon as the game scrolls (mostly) out of view
    const seen = new IntersectionObserver(([en]) => !en.isIntersecting && pause(), { threshold: 0.4 });
    seen.observe(frame);

    const ro = new ResizeObserver(() => game?.resize());
    ro.observe(frame);

    const onFs = () => {
      fullscreen = document.fullscreenElement === frame;
      requestAnimationFrame(() => game?.resize());
    };
    const onVis = () => document.hidden && pause();
    const onKey = (e) => {
      if (e.code === 'Escape' || e.code === 'KeyP') {
        if (status === 'playing') pause();
        else if (status === 'paused' && e.code === 'KeyP') resume();
      }
    };
    document.addEventListener('fullscreenchange', onFs);
    document.addEventListener('visibilitychange', onVis);
    addEventListener('keydown', onKey);

    const ctx = gsap.context(() => {
      gsap.from('.play-fade', { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: section, start: 'top 75%' } });
    }, section);

    return () => {
      near.disconnect();
      seen.disconnect();
      ro.disconnect();
      document.removeEventListener('fullscreenchange', onFs);
      document.removeEventListener('visibilitychange', onVis);
      removeEventListener('keydown', onKey);
      clearInterval(timeTimer);
      clearTimeout(cardTimer);
      clearTimeout(toastTimer);
      game?.destroy();
      app.playing = false;
      ctx.revert();
    };
  });
</script>

<section bind:this={section} id="play" class="relative bg-night px-5 py-24 md:px-10 md:py-32">
  <div class="mx-auto max-w-[1280px]">
    <div class="play-fade mono mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
      <span class="h-px w-10 bg-lime"></span> (06) Play
    </div>
    <div class="mb-8 flex flex-col gap-5 md:mb-10 md:flex-row md:items-end md:justify-between">
      <h2 class="play-fade display text-[clamp(2.6rem,10vw,8.5rem)] text-white">Deploy <span class="outline" style="--stroke: 2px">Run</span></h2>
      <p class="play-fade max-w-md text-[15px] leading-relaxed text-mist">
        Run through my story from campus to production. Collect skill keys, bump <span class="text-lime">commit blocks</span> to unlock
        projects, stomp bugs, and ship it.
      </p>
    </div>

    <div
      bind:this={frame}
      class="game play-fade relative overflow-hidden rounded-[22px] border border-white/10 bg-coal {fullscreen ? 'is-full' : ''}"
    >
      <canvas bind:this={canvas} class="block h-full w-full outline-none" tabindex="-1" aria-label="Deploy Run game"></canvas>

      {#if status === 'playing' || status === 'paused' || status === 'won'}
        <!-- HUD -->
        <div class="mono pointer-events-none absolute inset-x-0 top-0 flex items-start justify-between gap-3 p-3 text-[11px] text-white md:p-4 md:text-[12px]">
          <div class="flex flex-wrap gap-2">
            <span class="chip"><span class="text-lime">●</span> {zone}</span>
            <span class="chip">⌨ {stats.keys}/{stats.totalKeys} skills</span>
            <span class="chip">◆ {stats.projects}/{stats.totalProjects} projects</span>
          </div>
          <div class="flex gap-2">
            <span class="chip hidden sm:inline-flex">↻ {stats.retries}</span>
            <span class="chip">{fmtTime(stats.time)}</span>
            {#if status === 'playing'}
              <button class="chip pointer-events-auto hover:border-lime/60" onclick={pause} aria-label="Pause">❚❚</button>
            {/if}
            <button class="chip pointer-events-auto hover:border-lime/60" onclick={toggleFullscreen} aria-label={fullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
              {fullscreen ? '⤡' : '⤢'}
            </button>
          </div>
        </div>
      {/if}

      {#if toast}
        <div class="pointer-events-none absolute inset-x-0 top-14 flex justify-center md:top-16">
          <div class="toast mono rounded-full bg-ink/85 px-3.5 py-1.5 text-[12px] text-lime">{toast}</div>
        </div>
      {/if}

      <!-- project unlocked by a commit block -->
      {#if card}
        <div class="card absolute bottom-3 left-3 max-w-[min(340px,calc(100%-24px))] rounded-2xl border border-lime/40 bg-ink/90 p-4 text-white backdrop-blur md:bottom-4 md:left-4">
          <div class="mono mb-1 text-[10px] uppercase tracking-[0.2em] text-lime">Project unlocked</div>
          <div class="text-[17px] font-semibold leading-tight">{card.title}</div>
          <div class="mt-0.5 text-[12.5px] text-mist">{card.kind}</div>
          <div class="mt-3 flex gap-2">
            {#if card.live}<a class="btn" href={card.live} target="_blank" rel="noopener">Live ↗</a>{/if}
            {#if card.repo}<a class="btn" href={card.repo} target="_blank" rel="noopener">Code ↗</a>{/if}
            <button class="btn" onclick={() => (card = null)}>Close</button>
          </div>
        </div>
      {/if}

      <!-- start / loading / paused / won / error screens -->
      {#if status !== 'playing'}
        <div class="overlay absolute inset-0 grid place-items-center p-6 text-center">
          {#if status === 'idle' || status === 'loading'}
            <div class="max-w-md">
              <div class="mono mb-3 text-[11px] uppercase tracking-[0.25em] text-lime">1 level · ~90 seconds</div>
              <div class="display mb-5 text-[clamp(2.2rem,6vw,4.2rem)] text-white">Ready to ship?</div>
              <button class="start" onclick={play} disabled={status === 'loading'}>
                {status === 'loading' ? 'Loading…' : '▶ Start'}
              </button>
              <p class="mono mt-5 text-[11.5px] leading-relaxed text-mist">
                {#if touch}Use the on-screen buttons to move and jump.{:else}← → / A D to move · Space / ↑ to jump · Esc to pause{/if}
              </p>
            </div>
          {:else if status === 'paused'}
            <div>
              <div class="display mb-5 text-[clamp(2rem,5vw,3.6rem)] text-white">Paused</div>
              <div class="flex flex-wrap justify-center gap-3">
                <button class="start" onclick={resume}>▶ Resume</button>
                <button class="ghost" onclick={play}>↻ Restart</button>
              </div>
            </div>
          {:else if status === 'won'}
            <div class="max-w-lg">
              <div class="mono mb-3 text-[11px] uppercase tracking-[0.25em] text-lime">✓ Deployed to production</div>
              <div class="display mb-4 text-[clamp(2.2rem,6vw,4.2rem)] text-white">Shipped it!</div>
              <div class="mono mb-6 flex flex-wrap justify-center gap-2 text-[12px] text-white">
                <span class="chip">⌨ {stats.keys}/{stats.totalKeys} skills</span>
                <span class="chip">◆ {stats.projects}/{stats.totalProjects} projects</span>
                <span class="chip">⏱ {fmtTime(stats.time)}</span>
                <span class="chip">↻ {stats.retries} retries</span>
              </div>
              <div class="flex flex-wrap justify-center gap-3">
                <button
                  class="start"
                  onclick={() => {
                    if (document.fullscreenElement) document.exitFullscreen();
                    scrollTo('#contact');
                  }}>Let's work together →</button
                >
                <button class="ghost" onclick={play}>↻ Play again</button>
              </div>
            </div>
          {:else if status === 'error'}
            <div class="max-w-sm text-mist">
              <div class="mb-2 text-white">The game couldn't load.</div>
              <p class="mono mb-5 text-[11.5px] leading-relaxed">{errorMsg}</p>
              <button class="ghost" onclick={play}>Try again</button>
            </div>
          {/if}
        </div>
      {/if}

      <!-- touch controls -->
      {#if touch && status === 'playing'}
        <div class="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between p-3">
          <div class="pointer-events-auto flex gap-2">
            <button class="pad" aria-label="Move left" {...hold('left')}>◀</button>
            <button class="pad" aria-label="Move right" {...hold('right')}>▶</button>
          </div>
          <button class="pad pad-jump pointer-events-auto" aria-label="Jump" {...hold('jump')}>⤒</button>
        </div>
      {/if}
    </div>

    <p class="play-fade mono mt-4 text-[11px] text-mist/60">
      Original game built for this site: canvas, a tiny physics engine and the same AI-generated sprites as my character.
    </p>
  </div>
</section>

<style>
  .game {
    aspect-ratio: 16 / 9;
    max-height: 80svh;
    width: 100%;
    touch-action: none;
    user-select: none;
  }
  @media (max-width: 767px) {
    .game {
      aspect-ratio: 4 / 5;
      max-height: 72svh;
    }
  }
  .game.is-full {
    aspect-ratio: auto;
    max-height: none;
    border-radius: 0;
  }
  .overlay {
    background: radial-gradient(ellipse at center, rgba(9, 9, 10, 0.55), rgba(9, 9, 10, 0.88));
    backdrop-filter: blur(2px);
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 5px 10px;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 999px;
    background: rgba(14, 14, 14, 0.72);
    backdrop-filter: blur(6px);
  }
  .start,
  .ghost,
  .btn {
    border-radius: 999px;
    font-weight: 600;
    transition: transform 0.2s, background 0.2s, border-color 0.2s;
  }
  .start {
    padding: 14px 28px;
    background: var(--color-lime);
    color: var(--color-ink);
    font-size: 15px;
  }
  .start:hover:not(:disabled) {
    transform: translateY(-2px);
  }
  .start:disabled {
    opacity: 0.6;
  }
  .ghost {
    padding: 13px 24px;
    border: 1px solid rgba(255, 255, 255, 0.25);
    color: white;
    font-size: 15px;
  }
  .ghost:hover {
    border-color: var(--color-lime);
  }
  .btn {
    padding: 6px 12px;
    border: 1px solid rgba(255, 255, 255, 0.2);
    font-size: 12px;
  }
  .btn:hover {
    border-color: var(--color-lime);
    color: var(--color-lime);
  }
  .card {
    animation: rise 0.45s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  .toast {
    animation: rise 0.3s cubic-bezier(0.16, 1, 0.3, 1) both;
  }
  @keyframes rise {
    from {
      opacity: 0;
      transform: translateY(12px);
    }
  }
  .pad {
    display: grid;
    place-items: center;
    width: 58px;
    height: 58px;
    border-radius: 18px;
    border: 1px solid rgba(255, 255, 255, 0.18);
    background: rgba(14, 14, 14, 0.6);
    color: white;
    font-size: 20px;
    backdrop-filter: blur(6px);
    touch-action: none;
  }
  .pad:active {
    background: rgba(200, 255, 46, 0.25);
    border-color: var(--color-lime);
  }
  .pad-jump {
    width: 70px;
    height: 70px;
    border-radius: 999px;
    color: var(--color-lime);
    font-size: 26px;
  }
</style>
