/**
 * Wires the page to the character: pointer tracking, hover reactions, fast-scroll
 * surprise, idle → sleepy → wake, and a line of dialogue for each section.
 */
import { ScrollTrigger, lenis } from './scroll.js';
import { mascot, react, setBase, say, hop, MOODS } from './mascot.svelte.js';
import { projects, moreProjects } from './data.js';

const SECTION_LINES = {
  about: ["Hey! I'm Moulishwar 👋 Nice to meet you.", 'excited'],
  skills: ['My toolkit! Grab a key and throw it 🎯', 'cool'],
  work: [`${projects.length + moreProjects.length} projects ahead, scroll to slide through them →`, 'curious'],
  journey: ['Full-stack intern at SymphoZen Labs, and MCA at Sona 🎓', 'excited'],
  hackathons: ['Smart India Hackathon, three times! 🏆', 'excited'],
  play: ["I'm the hero in this one. Press Start! 🎮", 'excited'],
  contact: ["Let's build something together ✨", 'love'],
};

const IDLE_MS = 16000;

export function startMascot() {
  let idleTimer;
  let asleep = false;
  let lastSurprise = 0;
  let lastHover = null;

  const wake = () => {
    if (!asleep) return;
    asleep = false;
    setBase('idle');
    react('surprised', 900);
    hop();
    say("Oh! I'm awake 👀", 2000);
  };

  const resetIdle = () => {
    wake();
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => {
      asleep = true;
      setBase('sleepy');
      say('Zzz… move or scroll to wake me 😴', 0);
    }, IDLE_MS);
  };

  const onMove = (e) => {
    mascot.pointer.x = e.clientX;
    mascot.pointer.y = e.clientY;
    mascot.pointer.active = true;
    resetIdle();
  };
  const onLeave = () => (mascot.pointer.active = false);

  const onOver = (e) => {
    const el = e.target.closest?.('a, button, [data-mood]');
    if (!el || el === lastHover || asleep) return;
    lastHover = el;
    let mood = el.dataset.mood;
    if (!mood) {
      const href = el.getAttribute('href') || '';
      const text = el.textContent || '';
      if (href.startsWith('mailto') || /talk|contact|copy email/i.test(text)) mood = 'love';
      else if (/github/i.test(href) || /source code/i.test(text)) mood = 'cool';
      else if (/linkedin/i.test(href)) mood = 'excited';
      else if (/live site|vercel\.app/i.test(text + href)) mood = 'excited';
      else if (el.closest('#work')) mood = 'curious';
      else if (/resume|\.pdf/i.test(href)) mood = 'shy';
      else mood = 'smile';
    }
    react(mood, 1500);
  };
  const onOut = (e) => {
    if (lastHover && !lastHover.contains(e.relatedTarget)) lastHover = null;
  };

  const onScrollFast = (e) => {
    resetIdle();
    const v = Math.abs(e?.velocity ?? 0);
    const now = performance.now();
    if (v > 55 && now - lastSurprise > 1800) {
      lastSurprise = now;
      react('surprised', 700);
    }
  };

  window.addEventListener('pointermove', onMove, { passive: true });
  document.addEventListener('pointerleave', onLeave);
  document.addEventListener('pointerover', onOver);
  document.addEventListener('pointerout', onOut);
  window.addEventListener('keydown', resetIdle);
  window.addEventListener('touchstart', resetIdle, { passive: true });
  if (lenis) lenis.on('scroll', onScrollFast);
  else window.addEventListener('scroll', resetIdle, { passive: true });

  const triggers = Object.entries(SECTION_LINES).map(([id, [line, mood]]) =>
    ScrollTrigger.create({
      trigger: `#${id}`,
      start: 'top 55%',
      end: 'bottom 45%',
      onEnter: () => {
        react(mood, 1600);
        say(line);
      },
      onEnterBack: () => react(mood, 1200),
    }),
  );

  resetIdle();
  if (import.meta.env.DEV) window.__mascot = { mascot, react, setBase, say, hop, MOODS };

  return () => {
    clearTimeout(idleTimer);
    window.removeEventListener('pointermove', onMove);
    document.removeEventListener('pointerleave', onLeave);
    document.removeEventListener('pointerover', onOver);
    document.removeEventListener('pointerout', onOut);
    window.removeEventListener('keydown', resetIdle);
    window.removeEventListener('touchstart', resetIdle);
    if (lenis) lenis.off('scroll', onScrollFast);
    else window.removeEventListener('scroll', resetIdle);
    triggers.forEach((t) => t.kill());
  };
}
