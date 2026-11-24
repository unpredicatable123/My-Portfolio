<script>
  import { scrollTo, magnetic } from '../lib/scroll.js';
  import Icon from './Icon.svelte';
  import { projects, moreProjects, toolkitGroups, experience, education, certifications } from '../lib/data.js';

  const pad = (n) => String(n).padStart(2, '0');
  const links = [
    { label: 'Work', count: pad(projects.length + moreProjects.length), href: '#work' },
    { label: 'Skills', count: pad(toolkitGroups.length), href: '#skills' },
    { label: 'Journey', count: pad(experience.length + education.length + certifications.length), href: '#journey' },
    { label: 'Contact', href: '#contact' },
  ];

  const go = (e, href) => {
    e.preventDefault();
    scrollTo(href);
  };
</script>

<header class="hero-nav absolute inset-x-0 top-0 z-30 flex items-center justify-between gap-4 px-4 pt-4 md:px-8 md:pt-6">
  <div class="pill bg-white px-3.5 py-2 text-[12.5px] font-medium text-ink shadow-[0_8px_30px_-12px_rgba(0,0,0,.25)] md:px-4 md:text-[13px]">
    <span class="pulse-dot"></span>
    Open to opportunities
  </div>

  <nav class="hidden items-center gap-10 text-[13.5px] font-medium text-ink lg:flex" aria-label="Primary">
    {#each links as l}
      <a href={l.href} onclick={(e) => go(e, l.href)} class="group relative">
        <span class="relative">
          {l.label}
          <span class="absolute -bottom-1 left-0 h-px w-full origin-right scale-x-0 bg-ink transition-transform duration-500 ease-out-expo group-hover:origin-left group-hover:scale-x-100"></span>
        </span>
        {#if l.count}<span class="mono ml-1 text-[10px] text-ash">[{l.count}]</span>{/if}
      </a>
    {/each}
  </nav>

  <a
    href="#contact"
    use:magnetic
    onclick={(e) => go(e, '#contact')}
    class="pill bg-ink px-4 py-2.5 text-[13px] font-medium text-white transition-colors hover:bg-black md:px-5"
  >
    Let's Talk <Icon name="arrow" size={14} />
  </a>
</header>
