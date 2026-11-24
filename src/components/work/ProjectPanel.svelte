<script>
  import { media } from '../../lib/media.js';
  import { magnetic } from '../../lib/scroll.js';
  import SceneBg from '../SceneBg.svelte';
  import Icon from '../Icon.svelte';
  import HexoriaMock from './HexoriaMock.svelte';
  import MalwareMock from './MalwareMock.svelte';
  import OverrideMock from './OverrideMock.svelte';
  import VazhiMock from './VazhiMock.svelte';
  import ScamMock from './ScamMock.svelte';
  import ShotFrame from './ShotFrame.svelte';

  let { project: p, flip = false } = $props();
  const t = p.theme;
  const seq = media.scenes[p.id] ?? null;

  function inview(node) {
    const io = new IntersectionObserver(([e]) => e.isIntersecting && node.classList.add('in'), { threshold: 0.3 });
    io.observe(node);
    return { destroy: () => io.disconnect() };
  }

  // split the title so the last word can take the accent colour
  const words = p.title.split(' ');
  const head = words.length > 1 ? words.slice(0, -1).join(' ') : '';
  const tail = words[words.length - 1];
</script>

<article
  use:inview
  class="panel relative flex min-h-svh w-full shrink-0 items-center overflow-hidden lg:h-full lg:w-screen"
  style="background: {t.bg}; color: {t.fg}; --accent: {t.accent};"
>
  {#if seq}<SceneBg sequence={seq} dim={0.35} />{/if}
  {#if !seq && t.dark}
    <div class="pointer-events-none absolute inset-0" style="background: radial-gradient(60% 60% at {flip ? '25%' : '75%'} 50%, color-mix(in srgb, {t.accent} 16%, transparent), transparent 70%)"></div>
  {/if}
  <span
    class="display pointer-events-none absolute -bottom-[0.18em] select-none text-[clamp(10rem,30vw,32rem)] leading-none opacity-[0.05] {flip ? 'left-[-0.04em]' : 'right-[-0.04em]'}"
    aria-hidden="true">{p.index}</span
  >

  <div class="relative z-10 mx-auto grid w-full max-w-[1400px] items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_1.15fr] lg:gap-14 lg:px-12 lg:py-12">
    <div class={flip ? 'lg:order-2' : ''}>
      <div class="mono flex items-center gap-3 text-[12px]" style="color: color-mix(in srgb, {t.fg} 55%, transparent)">
        <span class="display text-[clamp(36px,7svh,56px)]" style="color: {t.fg}">{p.index}</span>
        <span class="uppercase tracking-widest">{p.kind}</span>
      </div>
      <h3 class="display mt-3 text-[clamp(2.2rem,min(4.6vw,8.4svh),5rem)]">
        {#if head}{head}<br />{/if}<span style="color: {t.dark ? t.accent : t.fg}">{tail}</span>
      </h3>
      <p class="mt-4 max-w-xl text-[14.5px] leading-relaxed" style="color: color-mix(in srgb, {t.fg} 70%, transparent)">{p.description}</p>
      <ul class="mt-5 space-y-1.5">
        {#each p.highlights as h}
          <li class="flex items-center gap-3 text-[14px] font-medium"><span class="h-1.5 w-1.5 shrink-0 rounded-full" style="background: {t.accent}"></span>{h}</li>
        {/each}
      </ul>
      <ul class="mt-6 flex flex-wrap gap-2">
        {#each p.tools as tool}
          <li class="mono rounded-full border px-3 py-1.5 text-[11px]" style="border-color: color-mix(in srgb, {t.fg} 18%, transparent)">{tool}</li>
        {/each}
      </ul>
      <div class="mt-8 flex flex-wrap gap-3">
        {#if p.live}
          <a
            use:magnetic={0.25}
            href={p.live}
            target="_blank"
            rel="noreferrer"
            class="pill px-5 py-3 text-[13.5px] font-semibold"
            style="background: {t.accent}; color: {t.dark ? '#0e0e0e' : '#fff'}"
          >
            Live site <Icon name="arrow" size={14} />
          </a>
        {/if}
        <a
          use:magnetic={0.25}
          href={p.repo}
          target="_blank"
          rel="noreferrer"
          class="pill border px-5 py-3 text-[13.5px] font-medium transition-opacity hover:opacity-70"
          style="border-color: color-mix(in srgb, {t.fg} 25%, transparent)"
        >
          <Icon name="github" size={15} /> Source code
        </a>
      </div>
    </div>

    <div class="px-layer {flip ? 'lg:order-1' : ''}">
      {#if p.visual === 'hexoria'}<HexoriaMock />
      {:else if p.visual === 'malware'}<MalwareMock />
      {:else if p.visual === 'override'}<OverrideMock />
      {:else if p.visual === 'vazhi'}<VazhiMock />
      {:else if p.visual === 'scam'}<ScamMock />
      {:else if p.visual === 'shot'}<ShotFrame src={p.shot} url={p.live} alt="{p.title} website" dark={t.dark} />
      {/if}
    </div>
  </div>
</article>
