<script>
  import { onMount } from 'svelte';
  import { gsap, ScrollTrigger, scrollTo, magnetic, reducedMotion } from '../lib/scroll.js';
  import { profile, socials } from '../lib/data.js';
  import { app } from '../lib/state.svelte.js';
  import { media } from '../lib/media.js';
  import FaceMorph from './FaceMorph.svelte';
  import Nav from './Nav.svelte';
  import Icon from './Icon.svelte';

  let section, card, nameEl, nameWrap, portrait, shade;
  let progress = $state(0);
  const reveal = $derived(Math.min(1, Math.max(0, progress / 0.62)));
  const pct = $derived(String(Math.round(reveal * 100)).padStart(3, '0'));
  const verified = $derived(reveal >= 0.999);
  const stage = $derived(!media.stylized ? 'DECODING_FACE' : reveal < 0.5 ? 'COMPILING_AVATAR' : 'RENDERING_HUMAN');

  const outline = profile.first.toUpperCase().split('');
  const charFill = (i) => Math.min(1, Math.max(0, reveal * (outline.length + 2) - i));

  function fitName() {
    if (!nameEl || !nameWrap) return;
    nameEl.style.fontSize = '100px';
    const w = nameWrap.clientWidth;
    const inner = nameEl.querySelector('[aria-hidden]');
    // 0.98: leave room for the negative tracking after the last glyph
    nameEl.style.fontSize = `${(100 * w * 0.98) / inner.getBoundingClientRect().width}px`;
  }

  onMount(() => {
    fitName();
    document.fonts?.ready.then(() => {
      fitName();
      ScrollTrigger.refresh();
    });
    // refit whenever the name's container really changes width (also after ScrollTrigger re-pins on resize)
    let lastW = 0;
    const ro = new ResizeObserver(() => {
      if (nameWrap.clientWidth !== lastW) {
        lastW = nameWrap.clientWidth;
        fitName();
      }
    });
    ro.observe(nameWrap);

    const ctx = gsap.context(() => {
      gsap.set('.hero-char', { yPercent: 115 });
      gsap.set(['.hero-fade', '.hero-nav'], { autoAlpha: 0, y: 24 });
      gsap.set(portrait, { autoAlpha: 0, y: 120 });

      if (reducedMotion) {
        progress = 1;
        return;
      }

      gsap
        .timeline({
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=190%',
            pin: true,
            scrub: true,
            onUpdate: (s) => (progress = s.progress),
          },
        })
        .to(nameWrap, { yPercent: -18, ease: 'none', duration: 0.7 }, 0)
        .to(card, { scale: 0.88, borderRadius: 40, ease: 'power2.in', duration: 0.26 }, 0.74)
        .to(shade, { opacity: 0.55, ease: 'none', duration: 0.26 }, 0.74);

      // subtle mouse parallax (desktop)
      if (matchMedia('(hover: hover)').matches) {
        const nx = gsap.quickTo(nameEl, 'x', { duration: 1.2, ease: 'power3.out' });
        const px = gsap.quickTo(portrait, 'x', { duration: 1.2, ease: 'power3.out' });
        const move = (e) => {
          const k = e.clientX / innerWidth - 0.5;
          nx(k * -26);
          px(k * 14);
        };
        window.addEventListener('pointermove', move, { passive: true });
        return () => window.removeEventListener('pointermove', move);
      }
    }, section);

    return () => {
      ro.disconnect();
      ctx.revert();
    };
  });

  // entrance once the loader is done
  $effect(() => {
    if (!app.loaded) return;
    fitName();
    const tl = gsap.timeline({ defaults: { ease: 'expo.out' } });
    tl.to('.hero-char', { yPercent: 0, duration: 1.4, stagger: 0.045 }, 0)
      .to(portrait, { autoAlpha: 1, y: 0, duration: 1.6 }, 0.25)
      .to('.hero-nav', { autoAlpha: 1, y: 0, duration: 1.1 }, 0.5)
      .to('.hero-fade', { autoAlpha: 1, y: 0, duration: 1.1, stagger: 0.07 }, 0.6);
  });
</script>

<section bind:this={section} id="top" class="relative h-svh w-full overflow-hidden bg-night">
  <div bind:this={card} class="hero-card absolute inset-0 overflow-hidden bg-paper text-ink will-change-transform">
    <Nav />

    <!-- Giant name -->
    <div bind:this={nameWrap} class="absolute inset-x-4 top-[88px] z-0 md:inset-x-8 md:top-[13svh]">
      <h1 bind:this={nameEl} class="display whitespace-nowrap leading-[0.8]" style="--stroke: clamp(1px, 0.16vw, 2.5px)">
        <span class="sr-only">{profile.first} {profile.last}</span>
        <span aria-hidden="true">
          {#each outline as ch, i}
            <span class="line-mask"><span class="hero-char fill-text inline-block" style="--fill: {charFill(i)}">{ch}</span></span>
          {/each}
          <span class="line-mask ml-[0.18em]"><span class="hero-char inline-block">{profile.last}</span></span>
        </span>
      </h1>
    </div>

    <!-- Portrait / face decode -->
    <div
      bind:this={portrait}
      class="portrait absolute inset-x-0 bottom-0 z-10 mx-auto"
      style="--ar: {media.photoAspect}; aspect-ratio: {media.photoAspect}"
    >
      <FaceMorph {reveal} />

      <!-- face-scan HUD -->
      <div
        class="hud pointer-events-none absolute"
        style="left: {29 - (1 - reveal) * 10}%; right: {29 - (1 - reveal) * 10}%; top: {4 - (1 - reveal) * 3}%; height: {60 + (1 - reveal) * 10}%;"
      >
        <span class="corner tl"></span><span class="corner tr"></span><span class="corner bl"></span><span class="corner br"></span>
        <div class="mono absolute -top-7 left-0 flex items-center gap-2 text-[10.5px] font-medium tracking-wider md:-top-8 md:text-[11px]">
          {#if verified}
            <span class="pill bg-ink px-2.5 py-1 text-lime">● IDENTITY VERIFIED</span>
          {:else}
            <span class="pill bg-ink/90 px-2.5 py-1 text-white">{stage} <span class="text-lime">{pct}%</span></span>
          {/if}
        </div>
      </div>
    </div>

    <!-- Left: role + CTA -->
    <div class="absolute left-4 right-4 top-[calc(88px+18vw)] z-20 md:top-auto md:right-auto md:bottom-14 md:left-8 md:max-w-[300px] lg:max-w-[340px]">
      <h2 class="hero-fade text-[19px] font-semibold leading-tight tracking-tight md:text-[26px]">{profile.role}</h2>
      <p class="hero-fade mt-2 hidden text-[14px] leading-relaxed text-ink/65 md:block">{profile.pitch}</p>
      <div class="hero-fade mt-5 hidden items-center gap-3 md:flex">
        <a
          href="#work"
          use:magnetic
          onclick={(e) => { e.preventDefault(); scrollTo('#work'); }}
          class="pill bg-ink px-5 py-3 text-[13.5px] font-medium text-white"
        >
          See my work <Icon name="arrow" size={14} />
        </a>
      </div>
      <div class="hero-fade mono mt-8 hidden items-center gap-2 text-[11px] uppercase tracking-widest text-ink/50 md:flex">
        <span class="scroll-cue"><Icon name="down" size={13} /></span> Scroll to decode
      </div>
    </div>

    <!-- Right: socials -->
    <ul class="absolute bottom-12 right-8 z-20 hidden flex-col items-end gap-3 md:flex">
      {#each socials as s}
        <li class="hero-fade">
          <a
            href={s.href}
            target={s.href.startsWith('http') ? '_blank' : undefined}
            rel="noreferrer"
            use:magnetic={0.25}
            class="pill border border-ink/10 bg-white/80 px-4 py-2 text-[13px] font-medium backdrop-blur transition-colors hover:bg-ink hover:text-white"
          >
            <Icon name={s.icon} size={14} />
            {s.label}
          </a>
        </li>
      {/each}
    </ul>

    <!-- mobile scroll cue -->
    <div class="hero-fade mono absolute bottom-4 left-4 z-20 flex items-center gap-2 rounded-full bg-ink px-3 py-1.5 text-[10px] uppercase tracking-widest text-white md:hidden">
      <span class="scroll-cue"><Icon name="down" size={12} /></span> Scroll
    </div>

    <div bind:this={shade} class="pointer-events-none absolute inset-0 z-40 bg-night opacity-0"></div>
  </div>
</section>

<style>
  .portrait {
    width: min(96vw, 50svh * var(--ar), 760px);
  }
  @media (min-width: 768px) {
    .portrait {
      width: min(52vw, 75svh * var(--ar), 920px);
    }
  }
  .corner {
    position: absolute;
    width: 22px;
    height: 22px;
    border-color: var(--color-ink);
    border-style: solid;
    border-width: 0;
  }
  .tl { top: 0; left: 0; border-top-width: 2px; border-left-width: 2px; }
  .tr { top: 0; right: 0; border-top-width: 2px; border-right-width: 2px; }
  .bl { bottom: 0; left: 0; border-bottom-width: 2px; border-left-width: 2px; }
  .br { bottom: 0; right: 0; border-bottom-width: 2px; border-right-width: 2px; }
  .scroll-cue {
    display: inline-flex;
    animation: bob 1.6s ease-in-out infinite;
  }
  @keyframes bob {
    50% { transform: translateY(4px); }
  }
</style>
