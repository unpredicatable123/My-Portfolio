<script>
  import { projects, moreProjects } from '../../lib/data.js';
  import { scrollTo } from '../../lib/scroll.js';
  import Icon from '../Icon.svelte';

  const num = (i) => String(projects.length + i + 1).padStart(2, '0');

  let active = $state(0);
</script>

<div class="panel relative flex min-h-svh w-full shrink-0 items-center overflow-hidden bg-night lg:h-full lg:w-screen">
  <div class="mx-auto grid w-full max-w-[1400px] items-center gap-10 px-5 py-20 lg:grid-cols-[1fr_1.1fr] lg:gap-14 lg:px-12">
    <div>
      <div class="mono mb-5 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
        <span class="h-px w-10 bg-lime"></span> More work
      </div>
      <ul class="border-t border-white/10">
        {#each moreProjects as m, i}
          <li class="border-b border-white/10">
            <a
              href={m.live ?? '#top'}
              target={m.live ? '_blank' : undefined}
              rel="noreferrer"
              onclick={(e) => {
                if (m.live) return;
                e.preventDefault();
                scrollTo('#top');
              }}
              data-cursor={m.live ? 'Visit' : 'Replay'}
              onpointerenter={() => (active = i)}
              onfocus={() => (active = i)}
              class="group flex items-center gap-5 py-5 transition-colors {active === i ? 'text-white' : 'text-white/45'}"
            >
              <span class="mono text-[11px] text-lime">{num(i)}</span>
              <span class="flex-1">
                <span class="display block text-[clamp(1.8rem,3.4vw,3.2rem)] transition-transform duration-500 ease-out-expo group-hover:translate-x-2">{m.title}</span>
                <span class="mt-1 block text-[13px] text-white/50">{m.kind}</span>
              </span>
              <span class="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-current transition-transform duration-500 group-hover:rotate-45">
                <Icon name="arrow" size={16} />
              </span>
            </a>
          </li>
        {/each}
      </ul>
      <a href="https://github.com/unpredicatable123" target="_blank" rel="noreferrer" class="pill mt-8 border border-white/15 px-5 py-3 text-[13.5px] text-white/80 transition-colors hover:border-lime hover:text-lime">
        <Icon name="github" size={15} /> All repositories on GitHub
      </a>
    </div>

    <div class="relative">
      {#each moreProjects as m, i}
        <div class="preview {active === i ? 'on' : ''} {i === 0 ? 'relative' : 'absolute inset-0'}">
          <div class="overflow-hidden rounded-2xl border border-white/10 bg-[#111] shadow-[0_40px_120px_-40px_rgba(0,0,0,.8)]">
            <img src={m.shot} alt="{m.title} screenshot" loading="lazy" class="aspect-[16/10] w-full object-cover object-top" />
          </div>
          <p class="mt-5 max-w-lg text-[14.5px] leading-relaxed text-white/60">{m.description}</p>
          <ul class="mt-4 flex flex-wrap gap-2">
            {#each m.tools as tool}<li class="mono rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/75">{tool}</li>{/each}
          </ul>
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .preview {
    opacity: 0;
    transform: translateY(16px) scale(0.98);
    transition: opacity 0.5s, transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
    pointer-events: none;
  }
  .preview.on {
    opacity: 1;
    transform: none;
    pointer-events: auto;
  }
</style>
