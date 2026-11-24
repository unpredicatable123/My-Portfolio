import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

gsap.registerPlugin(ScrollTrigger);

export const reducedMotion =
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export let lenis = null;

export function initScroll() {
  if (reducedMotion || lenis) return lenis;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  return lenis;
}

export function scrollTo(target) {
  if (lenis) lenis.scrollTo(target, { duration: 1.8, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else document.querySelector(target)?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
}

/** Svelte action: element is pulled toward the pointer while hovered. */
export function magnetic(node, strength = 0.35) {
  if (matchMedia('(hover: none)').matches) return;
  const xTo = gsap.quickTo(node, 'x', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  const yTo = gsap.quickTo(node, 'y', { duration: 0.6, ease: 'elastic.out(1, 0.4)' });
  const move = (e) => {
    const r = node.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const leave = () => {
    xTo(0);
    yTo(0);
  };
  node.addEventListener('pointermove', move);
  node.addEventListener('pointerleave', leave);
  return {
    destroy() {
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerleave', leave);
    },
  };
}

export { gsap, ScrollTrigger };
