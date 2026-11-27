<script>
  import { onMount } from 'svelte';
  import { gsap, scrollTo, magnetic } from '../lib/scroll.js';
  import { profile, socials } from '../lib/data.js';
  import { media } from '../lib/media.js';
  import { react, say, hop } from '../lib/mascot.svelte.js';
  import SceneBg from './SceneBg.svelte';
  import Icon from './Icon.svelte';

  let section;
  let copied = $state(false);
  let time = $state('');

  async function copyEmail() {
    try {
      await navigator.clipboard.writeText(profile.email);
      copied = true;
      react('love', 2000);
      hop();
      say('Copied! Talk soon 💌', 2600);
      setTimeout(() => (copied = false), 1800);
    } catch {
      location.href = `mailto:${profile.email}`;
    }
  }

  onMount(() => {
    const fmt = new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const tick = () => (time = fmt.format(new Date()));
    tick();
    const id = setInterval(tick, 1000);

    const ctx = gsap.context(() => {
      gsap.from('.talk-char', {
        yPercent: 110,
        stagger: 0.04,
        duration: 1.3,
        ease: 'expo.out',
        scrollTrigger: { trigger: '.talk', start: 'top 85%' },
      });
      gsap.from('.contact-fade', { y: 40, autoAlpha: 0, stagger: 0.08, duration: 1.1, ease: 'expo.out', scrollTrigger: { trigger: '.talk', start: 'top 70%' } });
    }, section);

    return () => {
      clearInterval(id);
      ctx.revert();
    };
  });

  const talk = "LET'S TALK".split('');
</script>

<section bind:this={section} id="contact" class="relative flex min-h-svh flex-col overflow-hidden bg-night">
  <SceneBg variant="stars" sequence={media.scenes.contact} dim={0.3} />

  <div class="relative z-10 flex flex-1 flex-col justify-center px-5 pt-28 md:px-10">
    <div class="mono mb-6 flex items-center gap-3 text-[11px] uppercase tracking-[0.25em] text-mist/70">
      <span class="h-px w-10 bg-lime"></span> (07) Contact
    </div>

    <a
      href="mailto:{profile.email}"
      class="talk group display block w-fit whitespace-nowrap text-[clamp(3rem,13.4vw,15rem)]"
      data-cursor="Say hi"
      aria-label="Email Moulishwar"
    >
      {#each talk as ch}
        <span class="line-mask"><span class="talk-char fill-text inline-block transition-[--fill] duration-700" style="--stroke: 2px">{ch === ' ' ? ' ' : ch}</span></span>
      {/each}
    </a>

    <div class="mt-10 grid gap-10 md:mt-14 md:grid-cols-[1.3fr_1fr] md:items-end">
      <div class="contact-fade">
        <p class="max-w-md text-[17px] leading-relaxed text-white/65">
          Looking for a fresher who designs and builds with care? I'm open to internships, full-time roles and
          interesting collaborations.
        </p>
        <div class="mt-7 flex flex-wrap items-center gap-3">
          <a use:magnetic href="mailto:{profile.email}" class="pill bg-lime px-6 py-3.5 text-[15px] font-semibold text-ink">
            {profile.email} <Icon name="arrow" size={16} />
          </a>
          <button
            use:magnetic
            onclick={copyEmail}
            class="pill border border-white/15 px-5 py-3.5 text-[14px] text-white/80 transition-colors hover:border-white/40"
          >
            <Icon name={copied ? 'check' : 'copy'} size={15} />
            {copied ? 'Copied!' : 'Copy email'}
          </button>
        </div>
      </div>

      <ul class="contact-fade flex flex-wrap gap-3 md:justify-end">
        {#each socials as s}
          <li>
            <a
              use:magnetic={0.3}
              href={s.href}
              target={s.href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
              download={s.icon === 'file' ? 'Moulishwar-G-Resume.pdf' : undefined}
              class="pill border border-white/15 bg-white/5 px-4 py-2.5 text-[14px] backdrop-blur transition-colors hover:bg-white hover:text-ink"
            >
              <Icon name={s.icon} size={15} />
              {s.label}
            </a>
          </li>
        {/each}
      </ul>
    </div>
  </div>

  <footer class="relative z-10 mt-20 flex flex-col gap-4 border-t border-white/10 px-5 py-6 text-[12.5px] text-white/50 md:flex-row md:items-center md:justify-between md:px-10">
    <span>© {new Date().getFullYear()} Moulishwar G · Designed & built with Svelte, GSAP & Higgsfield</span>
    <span class="mono">India · {time} IST</span>
    <button onclick={() => scrollTo('#top')} class="pill w-fit text-white/70 transition-colors hover:text-lime">
      Back to top <span class="rotate-180"><Icon name="down" size={14} /></span>
    </button>
  </footer>
</section>

<style>
  .talk:hover .talk-char {
    --fill: 1;
  }
  @property --fill {
    syntax: '<number>';
    inherits: true;
    initial-value: 0;
  }
</style>
