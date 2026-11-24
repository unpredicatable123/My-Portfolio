<script>
  import { onMount } from 'svelte';
  import Matter from 'matter-js';
  import { gsap, ScrollTrigger, reducedMotion } from '../lib/scroll.js';
  import { toolkit, toolkitGroups } from '../lib/data.js';
  import { react, say } from '../lib/mascot.svelte.js';
  import SceneBg from './SceneBg.svelte';

  const { Engine, Bodies, Body, Composite, Mouse, MouseConstraint, Events, Sleeping } = Matter;

  // keycaps rain into the section and pile up; grab and throw them (desktop) or tap to flick (touch)
  const touch = typeof matchMedia !== 'undefined' && !matchMedia('(hover: hover) and (pointer: fine)').matches;
  let section, stage;
  const caps = $state([]);

  // categorized list under the pile: pointing at a category lights its keys and makes them jump
  const groups = toolkitGroups.map((g) => ({ ...g, items: toolkit.filter((t) => t.group === g.id) }));
  let active = $state(null);
  let summon = () => {};
  const lastSummon = {};

  function pick(id, fromTap = false) {
    active = fromTap && active === id ? null : id;
    if (!active) return;
    const now = performance.now();
    if (now - (lastSummon[id] || 0) < 700) return;
    lastSummon[id] = now;
    summon(id);
  }

  onMount(() => {
    if (reducedMotion) return;

    const engine = Engine.create({ enableSleeping: true });
    engine.gravity.y = 1.15;
    const world = engine.world;

    let W = stage.clientWidth;
    let H = stage.clientHeight;
    const T = 400;
    const M = 10; // gap between the keys and the stage edges
    const wall = { isStatic: true, friction: 0.5, restitution: 0.15 };
    const floor = Bodies.rectangle(W / 2, H + T / 2, W * 3, T, wall);
    const left = Bodies.rectangle(M - T / 2, -H, T, H * 5, wall);
    const right = Bodies.rectangle(W - M + T / 2, -H, T, H * 5, wall);
    const ceiling = Bodies.rectangle(W / 2, -3 * H - T / 2, W * 3, T, wall);
    Composite.add(world, [floor, left, right, ceiling]);

    let bodies = [];
    let started = false;
    let visible = false;

    function drop() {
      started = true;
      bodies = caps.map((el, i) => {
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const b = Bodies.rectangle(M + w / 2 + Math.random() * Math.max(1, W - w - 2 * M), -h - i * 55 - Math.random() * 60, w, h, {
          chamfer: { radius: h * 0.2 },
          restitution: 0.3,
          friction: 0.6,
          frictionAir: 0.014,
          density: 0.0018,
          angle: (Math.random() - 0.5) * 1.2,
        });
        Object.assign(b, { el, w, h, i });
        el.style.visibility = 'visible';
        return b;
      });
      Composite.add(world, bodies);
    }

    function wake(b) {
      Sleeping.set(b, false);
    }

    function pop(b) {
      wake(b);
      Body.setVelocity(b, { x: (Math.random() - 0.5) * 7, y: -15 - Math.random() * 5 });
      Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.45);
      b.el.animate([{ filter: 'brightness(1.35)' }, { filter: 'none' }], { duration: 450 });
    }

    summon = (id) => {
      let n = 0;
      for (const b of bodies) {
        if (toolkit[b.i].group !== id) continue;
        setTimeout(() => {
          pop(b);
          Body.setVelocity(b, { x: b.velocity.x, y: -17 - Math.random() * 5 });
        }, n++ * 70);
      }
    };

    const tick = (_t, dt) => {
      Engine.update(engine, Math.min(dt, 32));
      for (const b of bodies) {
        // anything that escaped (very hard throws) gets dropped back in from the top
        if (b.position.y > H + 300 || b.position.x < -300 || b.position.x > W + 300) {
          Body.setPosition(b, { x: W / 2, y: -b.h * 2 });
          Body.setVelocity(b, { x: 0, y: 0 });
        }
        b.el.style.transform = `translate3d(${b.position.x - b.w / 2}px, ${b.position.y - b.h / 2}px, 0) rotate(${b.angle}rad)`;
      }
    };

    const setRunning = (on) => {
      gsap.ticker.remove(tick);
      if (on) gsap.ticker.add(tick);
    };

    const io = new IntersectionObserver(
      ([e]) => {
        visible = e.isIntersecting;
        if (visible && !started) document.fonts.ready.then(drop);
        setRunning(visible);
      },
      { threshold: 0.25 },
    );
    io.observe(stage);

    // keep the walls hugging the stage
    const ro = new ResizeObserver(() => {
      W = stage.clientWidth;
      H = stage.clientHeight;
      Body.setPosition(floor, { x: W / 2, y: H + T / 2 });
      Body.setPosition(right, { x: W - M + T / 2, y: -H });
      Body.setPosition(left, { x: M - T / 2, y: -H });
      Body.setPosition(ceiling, { x: W / 2, y: -3 * H - T / 2 });
      for (const b of bodies) {
        wake(b);
        // keys are sized from the window height; keep each physics shape matching its key
        const w = b.el.offsetWidth;
        const h = b.el.offsetHeight;
        if (w && h && (Math.abs(w - b.w) > 1 || Math.abs(h - b.h) > 1)) {
          const angle = b.angle;
          Body.setAngle(b, 0);
          Body.scale(b, w / b.w, h / b.h);
          Body.setAngle(b, angle);
          b.w = w;
          b.h = h;
        }
        if (b.position.x > W - M - b.w / 2) Body.setPosition(b, { x: W - M - b.w / 2, y: b.position.y });
      }
    });
    ro.observe(stage);

    // scroll fast and the pile jumps
    let lastKick = 0;
    const st = ScrollTrigger.create({
      trigger: stage,
      start: 'top bottom',
      end: 'bottom top',
      onUpdate: (s) => {
        const v = Math.abs(s.getVelocity());
        const now = performance.now();
        if (!visible || v < 1600 || now - lastKick < 450) return;
        lastKick = now;
        const p = Math.min(1, v / 5000);
        for (const b of bodies) {
          wake(b);
          Body.setVelocity(b, { x: b.velocity.x + (Math.random() - 0.5) * 8 * p, y: -(5 + Math.random() * 11) * p });
          Body.setAngularVelocity(b, (Math.random() - 0.5) * 0.3 * p);
        }
      },
    });

    const cleanups = [];

    if (touch) {
      // tap a key to flick it; page scrolling stays untouched
      const onClick = (e) => {
        const el = e.target.closest?.('.cap');
        const b = el && bodies.find((x) => x.el === el);
        if (b) pop(b);
      };
      stage.addEventListener('click', onClick);
      cleanups.push(() => stage.removeEventListener('click', onClick));
    } else {
      const mouse = Mouse.create(stage);
      // matter grabs wheel and touch events by default; give them back to the page
      stage.removeEventListener('wheel', mouse.mousewheel);
      stage.removeEventListener('touchmove', mouse.mousemove);
      stage.removeEventListener('touchstart', mouse.mousedown);
      stage.removeEventListener('touchend', mouse.mouseup);
      const mc = MouseConstraint.create(engine, { mouse, constraint: { stiffness: 0.18, damping: 0.08 } });
      Composite.add(world, mc);

      let downAt = 0;
      let downPos = { x: 0, y: 0 };
      let lastLine = 0;
      Events.on(mc, 'startdrag', (e) => {
        downAt = performance.now();
        downPos = { ...mouse.position };
        stage.classList.add('dragging');
        const t = toolkit[e.body.i];
        if (t && t.kind !== 'glyph' && downAt - lastLine > 6000) {
          lastLine = downAt;
          react('grin', 1600);
          say(`${t.label}? Good pick 😎`, 2200);
        }
      });
      Events.on(mc, 'enddrag', (e) => {
        stage.classList.remove('dragging');
        const moved = Math.hypot(mouse.position.x - downPos.x, mouse.position.y - downPos.y);
        if (performance.now() - downAt < 220 && moved < 6) pop(e.body);
      });
      const release = () => (mouse.button = -1);
      window.addEventListener('mouseup', release);

      // sweep the cursor through the pile to shove keys around
      let last = null;
      const onMove = (e) => {
        const r = stage.getBoundingClientRect();
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        if (last && !mc.body) {
          const vx = Math.max(-40, Math.min(40, x - last.x));
          const vy = Math.max(-40, Math.min(40, y - last.y));
          if (Math.abs(vx) + Math.abs(vy) > 3) {
            for (const b of bodies) {
              const reach = Math.max(b.w, b.h) / 2 + 18;
              if (Math.hypot(b.position.x - x, b.position.y - y) > reach) continue;
              wake(b);
              Body.setVelocity(b, { x: b.velocity.x + vx * 0.3, y: b.velocity.y + vy * 0.3 - 1.2 });
              Body.setAngularVelocity(b, b.angularVelocity + vx * 0.004);
            }
          }
        }
        last = { x, y };
      };
      const onLeave = () => {
        last = null;
        release();
      };
      stage.addEventListener('pointermove', onMove);
      stage.addEventListener('pointerleave', onLeave);
      cleanups.push(() => {
        window.removeEventListener('mouseup', release);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerleave', onLeave);
        stage.removeEventListener('mousemove', mouse.mousemove);
        stage.removeEventListener('mousedown', mouse.mousedown);
        stage.removeEventListener('mouseup', mouse.mouseup);
      });
    }

    return () => {
      setRunning(false);
      io.disconnect();
      ro.disconnect();
      st.kill();
      cleanups.forEach((f) => f());
      Composite.clear(world, false);
      Engine.clear(engine);
    };
  });
</script>

<!-- desktop: the whole toolkit (headline, pile, list) fits one screen -->
<section bind:this={section} id="skills" class="relative flex flex-col overflow-hidden bg-night lg:h-svh lg:min-h-[620px]">
  <SceneBg variant="globe" dim={0.4} />

  <div class="relative z-10 mx-auto w-full max-w-[1600px] px-5 pt-24 md:px-10 md:pt-28 lg:pt-[92px]">
    <div class="mono flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.25em] text-mist/70">
      <span class="flex items-center gap-3"><span class="h-px w-10 bg-lime"></span> (02) Toolkit</span>
      {#if !reducedMotion}<span class="text-mist/45">{touch ? 'Tap a key' : 'Grab · Throw · Scroll fast'}</span>{/if}
    </div>
  </div>

  <div
    bind:this={stage}
    class="stage relative z-10 mx-auto h-[72svh] min-h-[480px] w-full max-w-[1600px] select-none overflow-hidden md:h-[78svh] md:min-h-[600px] lg:h-auto lg:min-h-0 lg:flex-1"
    class:static={reducedMotion}
  >
    <h2 class="display pointer-events-none absolute left-5 top-6 text-[clamp(3.4rem,min(13.5vw,19svh),14rem)] leading-[0.82] md:left-10 md:top-8 lg:top-5">
      Tools of<br /><span class="outline text-white/90" style="--stroke: 1.5px">the trade</span>
    </h2>

    <div class="caps">
      {#each toolkit as t, i}
        <div
          bind:this={caps[i]}
          class="cap {t.tone ?? 'dark'} {t.kind === 'glyph' ? 'glyph' : ''}"
          class:lit={active && t.group === active}
          class:faded={active && t.group !== active}
          data-cursor={touch || reducedMotion ? undefined : 'Grab'}
          aria-hidden={t.kind === 'glyph' ? 'true' : undefined}
        >
          {t.label}
        </div>
      {/each}
    </div>

    <span class="ground" aria-hidden="true"></span>
  </div>

  <!-- the readable version: every skill, by category -->
  <div class="relative z-10 mx-auto w-full max-w-[1600px] px-5 pb-24 pt-10 md:px-10 md:pb-32 md:pt-14 lg:pb-7 lg:pt-5">
    <div class="mono mb-6 flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.25em] text-mist/45 lg:mb-3">
      <span>The full kit</span>
      {#if !reducedMotion}<span>{touch ? 'Tap a category' : 'Point at a category'}</span>{/if}
    </div>
    <ul class="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-3 lg:grid-cols-5">
      {#each groups as g, i}
        <li class="bg-night {i === groups.length - 1 ? 'max-lg:col-span-2 md:max-lg:col-span-1' : ''}">
          <button
            type="button"
            class="cat group/cat relative flex h-full w-full flex-col p-5 text-left md:p-7 lg:px-6 lg:py-[clamp(0.9rem,2.2svh,1.6rem)]"
            class:on={active === g.id}
            aria-pressed={active === g.id}
            onmouseenter={() => !touch && pick(g.id)}
            onmouseleave={() => !touch && (active = null)}
            onfocus={() => !touch && pick(g.id)}
            onblur={() => !touch && (active = null)}
            onclick={() => touch && pick(g.id, true)}
          >
            <span class="mono text-[11px] text-mist/45">0{i + 1}</span>
            <span class="cat-title mt-3 text-[clamp(1.15rem,1.6vw,1.45rem)] font-semibold tracking-tight lg:mt-1.5">{g.label}</span>
            <span class="mt-4 flex flex-wrap gap-1.5 lg:mt-3">
              {#each g.items as t}
                <span class="mini">{t.label}</span>
              {/each}
            </span>
            <span class="bar"></span>
          </button>
        </li>
      {/each}
    </ul>
  </div>
</section>

<style>
  .ground {
    position: absolute;
    inset: auto 0 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(200, 255, 46, 0.45), transparent);
    box-shadow: 0 0 40px 6px rgba(200, 255, 46, 0.12);
  }

  /* ---------- keycaps ---------- */
  .cap {
    position: absolute;
    left: 0;
    top: 0;
    z-index: 1;
    isolation: isolate;
    visibility: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    height: 52px;
    padding: 0 20px 5px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    white-space: nowrap;
    color: #f4f4f2;
    cursor: grab;
    will-change: transform;
    -webkit-tap-highlight-color: transparent;
    background: linear-gradient(180deg, #2b2b2e, #141415);
    box-shadow:
      inset 0 1px 0 rgba(255, 255, 255, 0.08),
      0 14px 24px -6px rgba(0, 0, 0, 0.7);
  }
  .cap::before {
    content: '';
    position: absolute;
    inset: 3px 4px 8px;
    z-index: -1;
    border-radius: 9px;
    background: linear-gradient(180deg, #3b3b3f, #2b2b2f);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 1px 3px rgba(0, 0, 0, 0.4);
  }
  .cap.light {
    color: var(--color-ink);
    background: linear-gradient(180deg, #d9d8d1, #a5a49d);
  }
  .cap.light::before {
    background: linear-gradient(180deg, #faf9f5, #e7e6e0);
    box-shadow: inset 0 1px 0 #fff, 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .cap.lime {
    color: var(--color-ink);
    background: linear-gradient(180deg, #b6ec14, #779c00);
  }
  .cap.lime::before {
    background: linear-gradient(180deg, #ddff70, #c5f82c);
    box-shadow: inset 0 1px 0 #f3ffcf, 0 1px 3px rgba(0, 0, 0, 0.2);
  }
  .cap.glyph {
    min-width: 52px;
    padding: 0 14px 5px;
    font-size: 19px;
  }
  :global(.stage.dragging) .cap,
  .cap:active {
    cursor: grabbing;
  }

  @media (min-width: 768px) {
    .cap {
      height: clamp(50px, 8.4svh, 70px);
      padding: 0 clamp(20px, 3.4svh, 30px) 7px;
      border-radius: 15px;
      font-size: clamp(15px, 2.35svh, 20px);
    }
    .cap::before {
      inset: 4px 5px 10px;
      border-radius: 11px;
    }
    .cap.glyph {
      min-width: clamp(50px, 8.4svh, 70px);
      font-size: clamp(18px, 2.8svh, 24px);
    }
  }

  /* a category is pointed at: its keys glow, the rest step back */
  .cap {
    transition: opacity 0.3s, filter 0.3s;
  }
  .cap.lit {
    box-shadow:
      0 0 0 2px var(--color-lime),
      0 0 34px rgba(200, 255, 46, 0.45),
      0 14px 24px -6px rgba(0, 0, 0, 0.7);
  }
  .cap.faded {
    opacity: 0.28;
    filter: saturate(0.2);
  }

  /* ---------- categorized list ---------- */
  .cat {
    transition: background-color 0.35s;
  }
  .cat.on {
    background: rgba(200, 255, 46, 0.05);
  }
  .cat-title {
    transition: color 0.3s;
  }
  .cat.on .cat-title {
    color: var(--color-lime);
  }
  .mini {
    border-radius: 7px;
    padding: 4px 9px 5px;
    font-size: 13px;
    color: rgba(255, 255, 255, 0.72);
    background: #1a1a1c;
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.06);
    transition: background-color 0.3s, color 0.3s, transform 0.3s var(--ease-out-expo);
  }
  .cat.on .mini {
    color: var(--color-ink);
    background: var(--color-lime);
    box-shadow: inset 0 -2px 0 rgba(0, 0, 0, 0.25);
  }
  .bar {
    position: absolute;
    inset: auto 0 0;
    height: 2px;
    background: var(--color-lime);
    transform: scaleX(0);
    transform-origin: left;
    transition: transform 0.5s var(--ease-out-expo);
  }
  .cat.on .bar {
    transform: scaleX(1);
  }
  .cat:focus-visible {
    outline: 2px solid var(--color-lime);
    outline-offset: -2px;
  }

  /* reduced motion: a calm, static heap at the bottom */
  .stage.static {
    height: auto;
    min-height: 0;
    padding: 0 1.25rem 4rem;
  }
  .stage.static h2 {
    position: static;
    margin: 1.5rem 0 2.5rem;
  }
  .stage.static .caps {
    display: flex;
    flex-wrap: wrap;
    gap: 10px;
  }
  .stage.static .cap {
    position: relative;
    visibility: visible;
    cursor: default;
  }
</style>
