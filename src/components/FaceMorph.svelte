<script>
  import { onMount } from 'svelte';
  import { media } from '../lib/media.js';
  import Character from './Character.svelte';

  /** reveal: 0 = fully "animated" (code / stylized), 1 = real photo */
  let { reveal = 0, onready = () => {} } = $props();

  let box;
  let canvas;

  const PAPER = '#f1f0eb';
  const INK = '#0e0e0e';
  const LIME = '#c8ff2e';
  const RAMP = ' .,:;-=+*#%@';
  const CODE = '01<>/{}[]=;$#&*+?!';
  const GLYPHS = RAMP + CODE;
  const CODE_OFFSET = RAMP.length;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    let W = 0, H = 0, dpr = 1, cw = 8, ch = 10, cols = 0, rows = 0;
    let lum, alpha, noise, state, atlas, styl;
    let photo = null;
    let stylized = null;
    let mouse = { x: -9999, y: -9999 };
    let raf = 0;
    let visible = true;
    let cleared = false;
    let frame = 0;

    const loadImg = (src) =>
      new Promise((res) => {
        if (!src) return res(null);
        const i = new Image();
        i.decoding = 'async';
        i.onload = () => res(i);
        i.onerror = () => res(null);
        i.src = src;
      });

    function drawCoverTop(target, img, w, h) {
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight);
      const dw = img.naturalWidth * s;
      const dh = img.naturalHeight * s;
      target.drawImage(img, (w - dw) / 2, 0, dw, dh);
    }

    function buildAtlas() {
      atlas = document.createElement('canvas');
      atlas.width = Math.ceil(GLYPHS.length * cw * dpr);
      atlas.height = Math.ceil(2 * ch * dpr);
      const a = atlas.getContext('2d');
      a.scale(dpr, dpr);
      a.font = `500 ${Math.round(ch * 0.92)}px "JetBrains Mono", ui-monospace, monospace`;
      a.textAlign = 'center';
      a.textBaseline = 'middle';
      // row 0: ink on transparent, row 1: lime on transparent
      [INK, LIME].forEach((color, r) => {
        a.fillStyle = color;
        for (let g = 0; g < GLYPHS.length; g++) a.fillText(GLYPHS[g], g * cw + cw / 2, r * ch + ch / 2 + 0.5);
      });
    }

    function sample() {
      if (!photo || !W) return;
      const off = document.createElement('canvas');
      off.width = Math.round(W);
      off.height = Math.round(H);
      const o = off.getContext('2d', { willReadFrequently: true });
      drawCoverTop(o, photo, off.width, off.height);
      const data = o.getImageData(0, 0, off.width, off.height).data;

      const n = cols * rows;
      lum = new Float32Array(n);
      alpha = new Uint8Array(n);
      noise = new Float32Array(n);
      state = new Uint8Array(n);

      let lo = 1, hi = 0;
      const fx = W * 0.5, fy = H * 0.34;
      const maxD = Math.hypot(W * 0.5, H * 0.75);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const px = Math.min(off.width - 1, Math.floor(c * cw + cw / 2));
          const py = Math.min(off.height - 1, Math.floor(r * ch + ch / 2));
          const k = (py * off.width + px) * 4;
          const a = data[k + 3];
          alpha[i] = a > 60 ? 1 : 0;
          const l = (0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]) / 255;
          lum[i] = l;
          if (alpha[i]) {
            if (l < lo) lo = l;
            if (l > hi) hi = l;
          }
          const d = Math.hypot(c * cw - fx, r * ch - fy) / maxD;
          noise[i] = 0.6 * d + 0.4 * Math.random();
        }
      }
      // histogram-equalise the subject so facial features spread across the whole glyph ramp
      const idx = [];
      for (let i = 0; i < n; i++) if (alpha[i]) idx.push(i);

      // union with the stylized silhouette (cover-only cells, no glyphs) so it never pokes out
      if (stylized) {
        o.clearRect(0, 0, off.width, off.height);
        drawCoverTop(o, stylized, off.width, off.height);
        const sd = o.getImageData(0, 0, off.width, off.height).data;
        for (let r = 0; r < rows; r++)
          for (let c = 0; c < cols; c++) {
            const i = r * cols + c;
            if (alpha[i]) continue;
            const px = Math.min(off.width - 1, Math.floor(c * cw + cw / 2));
            const py = Math.min(off.height - 1, Math.floor(r * ch + ch / 2));
            if (sd[(py * off.width + px) * 4 + 3] > 60) alpha[i] = 3;
          }
      }
      idx.sort((a, b) => lum[a] - lum[b]);
      for (let k = 0; k < idx.length; k++) lum[idx[k]] = Math.pow(k / Math.max(1, idx.length - 1), 1.1);

      // dilate coverage by one cell so the real photo never peeks around the ASCII silhouette
      const cov = new Uint8Array(alpha);
      for (let r = 0; r < rows; r++)
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          if (alpha[i]) continue;
          if ((c > 0 && alpha[i - 1]) || (c < cols - 1 && alpha[i + 1]) || (r > 0 && alpha[i - cols]) || (r < rows - 1 && alpha[i + cols])) cov[i] = 2;
        }
      alpha = cov;

      let nlo = 1, nhi = 0;
      for (let i = 0; i < n; i++) {
        if (noise[i] < nlo) nlo = noise[i];
        if (noise[i] > nhi) nhi = noise[i];
      }
      for (let i = 0; i < n; i++) noise[i] = (noise[i] - nlo) / (nhi - nlo);

      if (stylized) {
        styl = document.createElement('canvas');
        styl.width = Math.round(W * dpr);
        styl.height = Math.round(H * dpr);
        const s = styl.getContext('2d');
        s.scale(dpr, dpr);
        drawCoverTop(s, stylized, W, H);
      }
    }

    function resize() {
      const r = box.getBoundingClientRect();
      if (!r.width) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      const cell = W < 320 ? 5 : W < 460 ? 6 : 7;
      cw = cell;
      ch = Math.round(cell * 1.45);
      cols = Math.ceil(W / cw);
      rows = Math.ceil(H / ch);
      buildAtlas();
      sample();
      cleared = false;
    }

    function glyph(g, color, x, y) {
      ctx.drawImage(atlas, g * cw * dpr, color * ch * dpr, cw * dpr, ch * dpr, x, y, cw, ch);
    }

    function render(t) {
      raf = requestAnimationFrame(render);
      if (!visible || !lum) return;
      const rv = reveal;
      if (rv >= 0.999) {
        if (!cleared) {
          ctx.setTransform(1, 0, 0, 1, 0, 0);
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          cleared = true;
        }
        return;
      }
      cleared = false;
      frame++;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, W, H);

      // Stages: code (ASCII) → stylized Higgsfield portrait (if provided) → real photo
      const two = !!styl;
      const p1 = two ? Math.min(1, rv / 0.5) : rv;
      const p2 = two ? Math.max(0, (rv - 0.5) / 0.5) : rv;
      const t1 = p1 * 1.25 - 0.12;
      const t2 = p2 * 1.25 - 0.12;
      const edge = 0.09;
      const scanY = (((t * 0.00018) % 1.3) - 0.15) * H;
      const R = Math.max(60, W * 0.16);
      const R2 = R * R;
      const n = cols * rows;

      // pass 1: classify. 0 = real photo shows, 1 = ASCII paper cell, 2 = ink edge/lens cell, 3 = stylized
      for (let i = 0; i < n; i++) {
        if (!alpha[i]) { state[i] = 0; continue; }
        const nz = noise[i];
        if (nz >= t1) {
          const x = (i % cols) * cw + cw / 2 - mouse.x;
          const y = Math.floor(i / cols) * ch + ch / 2 - mouse.y;
          state[i] = x * x + y * y < R2 && alpha[i] === 1 ? 2 : 1;
        } else if (nz >= t1 - edge) state[i] = 2;
        else if (!two) state[i] = 0;
        else if (nz >= t2) state[i] = 3;
        else if (nz >= t2 - edge) state[i] = 2;
        else state[i] = 0;
      }

      if (two) {
        // stylized layer: draw it, then punch out the cells where the real photo is revealed
        ctx.drawImage(styl, 0, 0, W, H);
        ctx.beginPath();
        for (let i = 0; i < n; i++) if (state[i] === 0) ctx.rect((i % cols) * cw, Math.floor(i / cols) * ch, cw, ch);
        ctx.save();
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = PAPER;
      ctx.beginPath();
      for (let i = 0; i < n; i++) if (state[i] === 1) ctx.rect((i % cols) * cw, Math.floor(i / cols) * ch, cw + 0.5, ch + 0.5);
      ctx.fill();

      ctx.fillStyle = INK;
      ctx.beginPath();
      for (let i = 0; i < n; i++) if (state[i] === 2) ctx.rect((i % cols) * cw, Math.floor(i / cols) * ch, cw + 0.5, ch + 0.5);
      ctx.fill();

      // pass 2: glyphs
      for (let i = 0; i < n; i++) {
        const s = state[i];
        if (!s || s === 3) continue;
        const c = i % cols;
        const r = (i / cols) | 0;
        const x = c * cw;
        const y = r * ch;
        if (s === 2) {
          glyph(CODE_OFFSET + ((i * 7 + frame) % CODE.length), 1, x, y);
          continue;
        }
        if (alpha[i] !== 1) continue;
        let g;
        if (Math.abs(y - scanY) < ch * 1.2) {
          g = CODE_OFFSET + ((i + (frame >> 1)) % 2);
        } else if (Math.random() < 0.012) {
          g = CODE_OFFSET + ((Math.random() * CODE.length) | 0);
        } else {
          const wave = 0.07 * Math.sin(c * 0.22 + r * 0.08 + t * 0.0022);
          const l = Math.min(1, Math.max(0, lum[i] + wave));
          g = Math.round((1 - l) * (RAMP.length - 1));
          if (g === 0) continue;
        }
        glyph(g, 0, x, y);
      }
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left;
      mouse.y = e.clientY - r.top;
    };
    const onLeave = () => (mouse = { x: -9999, y: -9999 });

    const ro = new ResizeObserver(() => resize());
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting));

    let alive = true;
    (async () => {
      await document.fonts?.load('500 12px "JetBrains Mono"').catch(() => {});
      [photo, stylized] = await Promise.all([loadImg(media.photo), loadImg(media.stylized)]);
      if (!alive) return;
      resize();
      ro.observe(box);
      io.observe(box);
      window.addEventListener('pointermove', onMove, { passive: true });
      document.addEventListener('pointerleave', onLeave);
      raf = requestAnimationFrame(render);
      onready();
    })();

    return () => {
      alive = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerleave', onLeave);
    };
  });
</script>

<div bind:this={box} class="face relative h-full w-full select-none">
  <span class="sr-only">Animated portrait of Moulishwar G</span>
  <Character
    class="photo absolute inset-0 h-full w-full"
    tilt={false}
    style="filter: grayscale({1 - reveal}) contrast({1.05 + (1 - reveal) * 0.1})"
  />
  <canvas bind:this={canvas} class="absolute inset-0 h-full w-full" aria-hidden="true"></canvas>
</div>

<style>
  :global(.face .photo) {
    will-change: filter;
  }
</style>
