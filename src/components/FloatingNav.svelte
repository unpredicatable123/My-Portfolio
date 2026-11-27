<script>
  import { onMount } from 'svelte';
  import { ScrollTrigger, scrollTo } from '../lib/scroll.js';

  let show = $state(false);
  let active = $state('');
  const links = [
    { id: 'about', label: 'About' },
    { id: 'work', label: 'Work' },
    { id: 'skills', label: 'Skills' },
    { id: 'journey', label: 'Journey' },
    { id: 'hackathons', label: 'Hackathons' },
    { id: 'play', label: 'Play' },
    { id: 'contact', label: 'Contact' },
  ];

  onMount(() => {
    // wait for pins to exist so positions are correct
    const triggers = [];
    const t = setTimeout(() => {
      triggers.push(
        ScrollTrigger.create({ trigger: '#about', start: 'top 60%', onToggle: (s) => (show = s.isActive || s.progress > 0), end: 'max' }),
      );
      for (const l of links) {
        triggers.push(
          ScrollTrigger.create({
            trigger: `#${l.id}`,
            start: 'top 50%',
            end: 'bottom 50%',
            onToggle: (s) => {
              if (s.isActive) active = l.id;
              else if (active === l.id) active = '';
            },
          }),
        );
      }
    }, 50);
    return () => {
      clearTimeout(t);
      triggers.forEach((tr) => tr.kill());
    };
  });
</script>

<nav
  class="fixed left-1/2 top-4 z-50 -translate-x-1/2 transition-all duration-700 ease-out-expo {show ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-24 opacity-0'}"
  aria-label="Sections"
>
  <div class="pill gap-1 border border-white/10 bg-night/70 p-1.5 text-[13px] shadow-2xl backdrop-blur-xl">
    <button onclick={() => scrollTo('#top')} class="display grid h-9 w-9 place-items-center rounded-full bg-lime text-[13px] text-ink" aria-label="Back to top">MG</button>
    {#each links as l}
      <button
        onclick={() => scrollTo(`#${l.id}`)}
        class="hidden rounded-full px-3.5 py-2 transition-colors sm:block {active === l.id ? 'bg-white text-ink' : 'text-white/70 hover:text-white'}"
      >
        {l.label}
      </button>
    {/each}
    <a href="mailto:gmouly1@gmail.com" class="rounded-full bg-white px-4 py-2 font-medium text-ink sm:hidden">Let's talk</a>
  </div>
</nav>
