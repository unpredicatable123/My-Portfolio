<script>
  import { onMount } from 'svelte';
  import { gsap, ScrollTrigger, reducedMotion } from '../lib/scroll.js';
  import { profile, stats } from '../lib/data.js';
  import AuroraBg from './AuroraBg.svelte';

  let section;
  const words = profile.about.split(' ');
  const key = new Set(['SymphoZen', 'Labs', 'Figma,', 'React', 'Svelte,', 'Node', 'PostgreSQL', 'cloud.', 'products.']);

  onMount(() => {
    const ctx = gsap.context(() => {
      if (!reducedMotion) {
        gsap
          .timeline({
            scrollTrigger: { trigger: '.about-pin', start: 'top top', end: '+=150%', pin: true, scrub: true },
          })
          .fromTo('.about-word', { opacity: 0.12 }, { opacity: 1, stagger: 0.05, ease: 'none' });
      }

      gsap.utils.toArray('.stat-num').forEach((el) => {
        const v = parseFloat(el.dataset.value);
        const dec = parseInt(el.dataset.decimals, 10);
        const obj = { n: 0 };
        ScrollTrigger.create({
          trigger: el,
          start: 'top 95%',
          once: true,
          onEnter: () =>
            gsap.to(obj, {
              n: v,
              duration: 2,
              ease: 'expo.out',
              onUpdate: () => (el.textContent = obj.n.toFixed(dec)),
            }),
        });
      });
    }, section);
    return () => ctx.revert();
  });
</script>

<section bind:this={section} id="about" class="relative overflow-hidden bg-night px-5 pb-24 md:px-10 md:pb-32">
  <AuroraBg />

  <div class="about-pin relative z-10 mx-auto flex min-h-svh w-full max-w-[1280px] flex-col justify-center py-20">
    <div class="mono mb-8 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
      <span class="h-px w-10 bg-lime"></span> (01) About me
    </div>

    <p class="text-[clamp(1.5rem,min(3.6vw,5.4svh),3.6rem)] font-medium leading-[1.14] tracking-[-0.02em]">
      {#each words as w}
        <span class="about-word {key.has(w) ? 'text-lime' : ''}">{w}</span>{' '}
      {/each}
    </p>
  </div>

  <div class="relative z-10 mx-auto w-full max-w-[1280px]">
    <dl class="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4">
      {#each stats as s}
        <div class="bg-night/80 p-5 backdrop-blur md:p-7">
          <dd class="display whitespace-nowrap text-[clamp(1.9rem,3.8vw,3.8rem)]">
            {s.prefix}<span class="stat-num" data-value={s.value} data-decimals={s.decimals}>0</span>{s.suffix}
          </dd>
          <dt class="mono mt-3 text-[11px] uppercase tracking-widest text-mist/60">{s.label}</dt>
        </div>
      {/each}
    </dl>
  </div>
</section>
