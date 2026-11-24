<script>
  import { onMount } from 'svelte';
  import { gsap } from '../lib/scroll.js';

  let dot, ring;
  let label = $state('');
  let hover = $state(false);
  let enabled = $state(false);

  onMount(() => {
    if (!matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    enabled = true;
    document.documentElement.classList.add('has-cursor');
    const dx = gsap.quickTo(dot, 'x', { duration: 0.08 });
    const dy = gsap.quickTo(dot, 'y', { duration: 0.08 });
    const rx = gsap.quickTo(ring, 'x', { duration: 0.45, ease: 'power3.out' });
    const ry = gsap.quickTo(ring, 'y', { duration: 0.45, ease: 'power3.out' });

    const move = (e) => {
      dx(e.clientX); dy(e.clientY); rx(e.clientX); ry(e.clientY);
      const t = e.target.closest?.('a, button, [data-cursor]');
      hover = !!t;
      label = t?.dataset?.cursor || '';
    };
    window.addEventListener('pointermove', move, { passive: true });
    return () => {
      window.removeEventListener('pointermove', move);
      document.documentElement.classList.remove('has-cursor');
    };
  });
</script>

<div class:hidden={!enabled} class="pointer-events-none fixed left-0 top-0 z-[90] mix-blend-difference" aria-hidden="true">
  <div bind:this={dot} class="absolute -left-1 -top-1 h-2 w-2 rounded-full bg-white transition-opacity {hover ? 'opacity-0' : ''}"></div>
  <div
    bind:this={ring}
    class="absolute grid place-items-center rounded-full border border-white text-[11px] font-semibold uppercase tracking-wider text-black transition-[width,height,margin,background-color] duration-300 ease-out-expo
      {label ? '-ml-11 -mt-11 h-22 w-22 bg-white' : hover ? '-ml-7 -mt-7 h-14 w-14 bg-white' : '-ml-4.5 -mt-4.5 h-9 w-9'}"
  >
    {label}
  </div>
</div>
