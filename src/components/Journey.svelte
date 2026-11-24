<script>
  import { onMount } from 'svelte';
  import { gsap } from '../lib/scroll.js';
  import { experience, education, certifications } from '../lib/data.js';
  import Icon from './Icon.svelte';
  import { media } from '../lib/media.js';
  import SceneBg from './SceneBg.svelte';

  let section, line;

  function tilt(node) {
    if (matchMedia('(hover: none)').matches) return;
    const rx = gsap.quickTo(node, 'rotationX', { duration: 0.6, ease: 'power3.out' });
    const ry = gsap.quickTo(node, 'rotationY', { duration: 0.6, ease: 'power3.out' });
    const move = (e) => {
      const r = node.getBoundingClientRect();
      ry(((e.clientX - r.left) / r.width - 0.5) * 12);
      rx(((e.clientY - r.top) / r.height - 0.5) * -12);
      node.style.setProperty('--mx', `${((e.clientX - r.left) / r.width) * 100}%`);
      node.style.setProperty('--my', `${((e.clientY - r.top) / r.height) * 100}%`);
    };
    const leave = () => { rx(0); ry(0); };
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerleave', leave);
    return { destroy() { node.removeEventListener('pointermove', move); node.removeEventListener('pointerleave', leave); } };
  }

  onMount(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(line, { scaleY: 0 }, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: '.timeline', start: 'top 70%', end: 'bottom 60%', scrub: true } });
      gsap.utils.toArray('.edu').forEach((el) => {
        gsap.from(el, { y: 70, autoAlpha: 0, duration: 1.2, ease: 'expo.out', scrollTrigger: { trigger: el, start: 'top 85%' } });
        const dot = el.querySelector('.dot');
        if (dot) gsap.to(dot, { backgroundColor: '#0e0e0e', scale: 1.3, scrollTrigger: { trigger: el, start: 'top 60%', toggleActions: 'play none none reverse' } });
      });
      gsap.from('.cert', { y: 80, autoAlpha: 0, rotate: 2, duration: 1.2, stagger: 0.08, ease: 'expo.out', scrollTrigger: { trigger: '.certs', start: 'top 85%' } });
      gsap.fromTo('.journey-title', { xPercent: 8 }, { xPercent: -8, ease: 'none', scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true } });
    }, section);
    return () => ctx.revert();
  });
</script>

<section bind:this={section} id="journey" class="relative overflow-hidden bg-paper py-24 text-ink md:py-36">
  {#if media.scenes.journey}<SceneBg sequence={media.scenes.journey} dim={0} class="opacity-25" />{/if}

  <div class="relative z-10">
    <div class="mono mb-6 flex items-center gap-3 px-5 text-[11px] uppercase tracking-[0.25em] text-ink/50 md:px-10">
      <span class="h-px w-10 bg-ink"></span> (04) Journey
    </div>
    <h2 class="journey-title display whitespace-nowrap px-5 text-[clamp(4rem,15vw,15rem)] md:px-10">
      Education <span class="outline" style="--stroke: 2px">& Growth</span>
    </h2>

    <div class="mx-auto mt-16 grid max-w-[1280px] gap-16 px-5 md:mt-24 md:px-10 lg:grid-cols-[1fr_1.2fr]">
      <div class="lg:sticky lg:top-28 lg:self-start">
        <p class="max-w-sm text-[17px] leading-relaxed text-ink/70">
          From school benches to a Master's in Computer Applications, and now building real products as a full-stack
          intern at SymphoZen Labs, with a habit of picking up a new certification whenever something sparks curiosity.
        </p>
        <div class="mt-8 flex flex-col items-start gap-2.5">
          <div class="inline-flex items-center gap-3 rounded-full bg-lime px-4 py-2 text-[13px] font-medium text-ink">
            <span class="pulse-dot"></span> Full-stack intern · SymphoZen Labs
          </div>
          <div class="inline-flex items-center gap-3 rounded-full bg-ink px-4 py-2 text-[13px] text-white">
            <span class="pulse-dot"></span> Currently pursuing MCA · 8.5 CGPA
          </div>
        </div>
      </div>

      <ol class="timeline relative pl-10">
        <span class="absolute left-[7px] top-2 bottom-2 w-px bg-ink/15"></span>
        <span bind:this={line} class="absolute left-[7px] top-2 bottom-2 w-px origin-top bg-ink"></span>
        {#each experience as x}
          <li class="edu relative pb-14">
            <span class="work-dot absolute -left-10 top-2 h-[15px] w-[15px] rounded-full border-2 border-ink bg-lime"></span>
            <div class="mono flex flex-wrap items-center gap-2.5 text-[12px] uppercase tracking-widest text-ink/50">
              <span class="rounded-full bg-ink px-2 py-0.5 text-[10.5px] text-lime">Work</span>
              {x.when}
            </div>
            <h3 class="mt-2 text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-tight tracking-tight">
              <a href={x.href} target="_blank" rel="noreferrer" class="group inline-flex items-center gap-2 underline-offset-4 hover:underline" data-cursor="Visit">
                {x.company}
                <span class="transition-transform duration-300 group-hover:rotate-45"><Icon name="arrow" size={18} /></span>
              </a>
            </h3>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-[15px] text-ink/70">
              {x.role}
              <span class="mono rounded-full bg-lime px-2.5 py-1 text-[11px] text-ink">{x.badge}</span>
            </div>
            {#if x.note}<p class="mt-2 max-w-md text-[14px] leading-relaxed text-ink/55">{x.note}</p>{/if}
          </li>
        {/each}
        {#each education as e}
          <li class="edu relative pb-14 last:pb-0">
            <span class="dot absolute -left-10 top-2 h-[15px] w-[15px] rounded-full border-2 border-ink bg-paper"></span>
            <div class="mono text-[12px] uppercase tracking-widest text-ink/50">{e.when}</div>
            <h3 class="mt-2 text-[clamp(1.4rem,2.4vw,2rem)] font-semibold leading-tight tracking-tight">{e.school}</h3>
            <div class="mt-2 flex flex-wrap items-center gap-3 text-[15px] text-ink/70">
              {e.degree}
              {#if e.score}<span class="mono rounded-full border border-ink/15 px-2.5 py-1 text-[11px] text-ink {e.current ? 'bg-lime border-transparent' : ''}">{e.score}</span>{/if}
            </div>
          </li>
        {/each}
      </ol>
    </div>

    <div class="mx-auto mt-28 max-w-[1280px] px-5 md:mt-40 md:px-10">
      <div class="flex items-end justify-between gap-6">
        <h3 class="display text-[clamp(1.75rem,8.2vw,5.5rem)]">Certifications</h3>
        <span class="mono pb-2 text-[12px] text-ink/50">({String(certifications.length).padStart(2, '0')})</span>
      </div>
      <div class="certs mt-10 grid gap-4 [perspective:1200px] sm:grid-cols-2 lg:grid-cols-3">
        {#each certifications as c}
          <article
            use:tilt
            class="cert relative flex min-h-[200px] flex-col justify-between overflow-hidden rounded-2xl p-6 [transform-style:preserve-3d] {c.featured
              ? 'bg-ink text-white sm:col-span-2 lg:col-span-1 lg:row-span-2 lg:min-h-full'
              : 'border border-ink/10 bg-white'}"
          >
            <span class="glare pointer-events-none absolute inset-0"></span>
            <div class="mono flex items-center justify-between text-[11px] uppercase tracking-widest {c.featured ? 'text-white/50' : 'text-ink/45'}">
              <span>{c.by}</span>
              {#if c.featured}<span class="rounded-full bg-lime px-2.5 py-1 text-ink">★ Gold</span>{/if}
            </div>
            <div>
              {#if c.featured}
                <div class="display text-[clamp(4rem,8vw,7rem)] text-lime">Top 1%</div>
              {/if}
              <h4 class="mt-2 text-[20px] font-semibold leading-snug tracking-tight">{c.title}</h4>
              {#if c.note && !c.featured}<p class="mt-1 text-[13px] text-ink/60">{c.note}</p>{/if}
              {#if c.featured}<p class="mt-2 text-[13.5px] text-white/60">Gold certificate, ranked in the top 1% of the NPTEL Java course.</p>{/if}
            </div>
          </article>
        {/each}
      </div>
    </div>
  </div>
</section>

<style>
  .glare {
    background: radial-gradient(400px circle at var(--mx, 50%) var(--my, 50%), rgba(200, 255, 46, 0.18), transparent 45%);
    opacity: 0;
    transition: opacity 0.4s;
  }
  .cert:hover .glare {
    opacity: 1;
  }
</style>
