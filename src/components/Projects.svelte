<script>
  import { onMount } from 'svelte';
  import { gsap, reducedMotion } from '../lib/scroll.js';
  import { projects, moreProjects } from '../lib/data.js';
  import SceneBg from './SceneBg.svelte';
  import ProjectPanel from './work/ProjectPanel.svelte';
  import MoreWork from './work/MoreWork.svelte';

  let section, track, bar;
  const total = String(projects.length + moreProjects.length).padStart(2, '0');

  onMount(() => {
    const mm = gsap.matchMedia();
    mm.add('(min-width: 1024px)', () => {
      if (reducedMotion) return;
      const dist = () => track.scrollWidth - window.innerWidth;
      const tween = gsap.to(track, {
        x: () => -dist(),
        ease: 'none',
        scrollTrigger: {
          trigger: section,
          start: 'top top',
          end: () => `+=${dist()}`,
          pin: true,
          scrub: 0.8,
          invalidateOnRefresh: true,
          onUpdate: (s) => bar && (bar.style.transform = `scaleX(${s.progress})`),
        },
      });
      // parallax inside panels, tied to the horizontal scroll
      gsap.utils.toArray('.px-layer').forEach((el) => {
        gsap.fromTo(
          el,
          { xPercent: 10 },
          {
            xPercent: -10,
            ease: 'none',
            scrollTrigger: { trigger: el.closest('.panel'), containerAnimation: tween, start: 'left right', end: 'right left', scrub: true },
          },
        );
      });
    });
    return () => mm.revert();
  });
</script>

<section bind:this={section} id="work" class="relative overflow-hidden bg-night">
  <div bind:this={track} class="flex flex-col lg:h-svh lg:w-max lg:flex-row">
    <!-- Intro -->
    <div class="panel relative flex min-h-[70svh] w-full shrink-0 flex-col justify-end overflow-hidden px-5 pb-16 pt-28 lg:h-full lg:w-[62vw] lg:px-10 lg:pb-20">
      <SceneBg variant="grid" dim={0.2} />
      <div class="relative z-10">
        <div class="mono mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
          <span class="h-px w-10 bg-lime"></span> (03) Selected work
        </div>
        <h2 class="display text-[clamp(3.6rem,7.6vw,9rem)]">
          Selected<br /><span class="outline" style="--stroke: 2px">Work</span><sup class="mono ml-3 align-top text-[0.14em] font-normal tracking-normal text-lime">({total})</sup>
        </h2>
        <p class="mt-8 max-w-md text-[15px] leading-relaxed text-white/60">
          From cloud LMS platforms and ML pipelines to live event games, transit apps and Blender-rendered experiences:
          things I've designed, built and shipped.
          <span class="hidden lg:inline">Keep scrolling →</span>
        </p>
        <ul class="mono mt-8 hidden max-w-lg flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-widest text-white/40 lg:flex">
          {#each projects as p}<li><span class="text-lime">{p.index}</span> {p.title}</li>{/each}
        </ul>
      </div>
    </div>

    {#each projects as p, i}
      <ProjectPanel project={p} flip={i % 2 === 1} />
    {/each}

    <MoreWork />
  </div>

  <!-- horizontal progress -->
  <div class="pointer-events-none absolute inset-x-0 bottom-0 z-20 hidden h-[3px] bg-white/10 lg:block">
    <div bind:this={bar} class="h-full origin-left scale-x-0 bg-lime"></div>
  </div>
</section>
