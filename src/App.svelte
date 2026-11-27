<script>
  import { onMount } from 'svelte';
  import { initScroll, ScrollTrigger } from './lib/scroll.js';
  import { app } from './lib/state.svelte.js';
  import Loader from './components/Loader.svelte';
  import Cursor from './components/Cursor.svelte';
  import FloatingNav from './components/FloatingNav.svelte';
  import Hero from './components/Hero.svelte';
  import About from './components/About.svelte';
  import Projects from './components/Projects.svelte';
  import Skills from './components/Skills.svelte';
  import Journey from './components/Journey.svelte';
  import Hackathons from './components/Hackathons.svelte';
  import Contact from './components/Contact.svelte';
  import Play from './components/Play.svelte';
  import Buddy from './components/Buddy.svelte';
  import { startMascot } from './lib/mascotDirector.js';

  initScroll();
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  onMount(() => {
    window.scrollTo(0, 0);
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    return () => window.removeEventListener('load', refresh);
  });

  $effect(() => {
    if (!app.loaded) return;
    requestAnimationFrame(() => ScrollTrigger.refresh());
    let stop;
    const t = setTimeout(() => (stop = startMascot()), 120);
    return () => {
      clearTimeout(t);
      stop?.();
    };
  });
</script>

<Loader />
<Cursor />
<FloatingNav />
<Buddy />
<div class="grain" aria-hidden="true"></div>

<main>
  <Hero />
  <About />
  <Skills />
  <Projects />
  <Journey />
  <Hackathons />
  <Play />
  <Contact />
</main>
