<script>
  import { onMount } from 'svelte';
  import { gsap, lenis } from '../lib/scroll.js';
  import { app } from '../lib/state.svelte.js';
  import { media } from '../lib/media.js';

  let el = $state();
  let count = $state(0);
  let gone = $state(false);

  onMount(() => {
    const preload = (src) =>
      new Promise((res) => {
        if (!src) return res();
        const i = new Image();
        i.onload = i.onerror = res;
        i.src = src;
      });

    const counter = { v: 0 };
    const tween = gsap.to(counter, { v: 86, duration: 1.6, ease: 'power2.out', onUpdate: () => (count = Math.round(counter.v)) });

    Promise.all([
      document.fonts?.ready,
      preload(media.photo),
      preload(media.stylized),
      new Promise((r) => setTimeout(r, 1500)),
    ]).then(() => {
      tween.kill();
      gsap
        .timeline()
        .to(counter, { v: 100, duration: 0.5, ease: 'power2.out', onUpdate: () => (count = Math.round(counter.v)) })
        .to(el, { yPercent: -100, duration: 1.15, ease: 'expo.inOut' }, '+=0.1')
        .add(() => {
          app.loaded = true;
          lenis?.start();
        }, '-=0.75')
        .add(() => (gone = true));
    });
  });
</script>

{#if !gone}
  <div bind:this={el} class="fixed inset-0 z-[100] flex flex-col justify-between bg-night p-5 text-white md:p-10">
    <div class="mono flex justify-between text-[11px] uppercase tracking-[0.25em] text-white/50">
      <span>Moulishwar G</span><span>Portfolio · {new Date().getFullYear()}</span>
    </div>
    <div class="flex items-end justify-between gap-6">
      <div class="mono max-w-xs text-[12px] leading-relaxed text-white/50">
        <span class="text-lime">&gt;</span> compiling face.ascii<br /><span class="text-lime">&gt;</span> loading scenes<br /><span class="text-lime">&gt;</span> warming up the GPU
      </div>
      <div class="display text-[clamp(5rem,18vw,16rem)] leading-none tabular-nums">{String(count).padStart(3, '0')}</div>
    </div>
    <div class="absolute bottom-0 left-0 h-[3px] bg-lime" style="width: {count}%"></div>
  </div>
{/if}
