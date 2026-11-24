<script>
  import { onMount } from 'svelte';
  import { gsap } from '../lib/scroll.js';
  import { hackathons, activities } from '../lib/data.js';

  let section;

  onMount(() => {
    const ctx = gsap.context(() => {
      const cards = gsap.utils.toArray('.hk-card');
      cards.forEach((card, i) => {
        const next = cards[i + 1];
        if (!next) return;
        gsap.to(card.querySelector('.hk-inner'), {
          scale: 0.92,
          opacity: 0.45,
          ease: 'none',
          scrollTrigger: { trigger: next, start: 'top 75%', end: 'top 20%', scrub: true },
        });
      });
      gsap.from('.act', { x: -40, autoAlpha: 0, stagger: 0.08, duration: 1, ease: 'expo.out', scrollTrigger: { trigger: '.acts', start: 'top 85%' } });
    }, section);
    return () => ctx.revert();
  });
</script>

<section bind:this={section} id="hackathons" class="relative bg-night px-5 py-24 md:px-10 md:py-36">
  <div class="mx-auto max-w-[1280px]">
    <div class="mono mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
      <span class="h-px w-10 bg-lime"></span> (05) Beyond the classroom
    </div>
    <h2 class="display text-[clamp(2.4rem,10.5vw,9rem)]">Hack<span class="outline" style="--stroke: 2px">athons</span></h2>

    <div class="mt-16">
      {#each hackathons as h, i}
        <div class="hk-card sticky {i < hackathons.length - 1 ? 'mb-[22svh]' : ''}" style="top: calc(14svh + {i * 30}px)">
          <article
            class="hk-inner relative flex min-h-[48svh] origin-top flex-col justify-between overflow-hidden rounded-[28px] border border-white/10 p-6 md:flex-row md:items-end md:p-10 {i === 2 ? 'bg-lime text-ink' : i === 1 ? 'bg-[#1a1a1c]' : 'bg-coal'}"
          >
            <div class="display pointer-events-none absolute -right-4 -top-6 text-[clamp(8rem,24vw,22rem)] leading-none opacity-[0.07]">'{h.year.slice(2)}</div>
            <div class="relative">
              <div class="mono text-[12px] uppercase tracking-widest opacity-60">SIH · {h.year}</div>
              <h3 class="display mt-4 text-[clamp(2.2rem,5vw,4.5rem)]">{h.title}</h3>
            </div>
            <div class="relative mt-8 max-w-sm md:mt-0 md:text-right">
              <span class="mono inline-block rounded-full border px-3 py-1.5 text-[11px] uppercase tracking-widest {i === 2 ? 'border-ink/30' : 'border-white/20'}">{h.status}</span>
              <p class="mt-4 text-[15px] leading-relaxed opacity-70">{h.note}</p>
            </div>
          </article>
        </div>
      {/each}
    </div>

    <div class="acts mt-24 grid gap-10 md:grid-cols-[1fr_1.4fr]">
      <h3 class="text-[clamp(1.6rem,3vw,2.4rem)] font-semibold leading-tight tracking-tight">Always learning,<br /><span class="text-mist/60">always shipping.</span></h3>
      <ul class="divide-y divide-white/10 border-y border-white/10">
        {#each activities as a, i}
          <li class="act flex items-center justify-between gap-6 py-5 text-[16px]">
            <span>{a}</span><span class="mono text-[11px] text-mist/50">0{i + 1}</span>
          </li>
        {/each}
      </ul>
    </div>
  </div>
</section>
