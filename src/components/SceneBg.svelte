<script>
  /**
   * Full-bleed scroll-driven scene background.
   * - If `sequence` is set (a Higgsfield clip converted with `npm run frames`), its frames are
   *   scrubbed by scroll position through the parent section.
   * - Otherwise a procedural canvas scene (`variant`) is rendered, also driven by scroll.
   */
  import { onMount } from 'svelte';
  import { ScrollTrigger } from '../lib/scroll.js';

  let { sequence = null, variant = 'code', dim = 0.55, class: cls = '' } = $props();

  let wrap, canvas;

  onMount(() => {
    const ctx = canvas.getContext('2d');
    const section = wrap.parentElement;
    let W = 0, H = 0, dpr = 1, raf = 0, visible = false;
    let progress = 0, vel = 0;
    let frames = null, manifest = null, lastDrawn = -1;
    const mouse = { x: 0.5, y: 0.5 };

    function resize() {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, sequence ? 1.5 : 1.25);
      W = r.width;
      H = r.height;
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      lastDrawn = -1;
      init();
    }

    // ---------- frame sequence ----------
    async function loadSequence() {
      try {
        manifest = await fetch(`/media/seq/${sequence}/manifest.json`).then((r) => r.json());
      } catch {
        manifest = null;
        return;
      }
      frames = new Array(manifest.count);
      const load = (i) =>
        new Promise((res) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = () => { frames[i] = img; res(); };
          img.onerror = res;
          img.src = `/media/seq/${sequence}/${String(i + 1).padStart(4, '0')}.${manifest.ext}`;
        });
      // coarse pass first so scrubbing works quickly, then fill the gaps
      const order = [];
      for (let step = 8; step >= 1; step = step >> 1)
        for (let i = 0; i < manifest.count; i += step) if (!order.includes(i)) order.push(i);
      for (let k = 0; k < order.length; k += 6) await Promise.all(order.slice(k, k + 6).map(load));
    }

    function nearestFrame(i) {
      for (let d = 0; d < frames.length; d++) {
        if (frames[i - d]) return frames[i - d];
        if (frames[i + d]) return frames[i + d];
      }
      return null;
    }

    function drawSequence() {
      if (!frames) return;
      const i = Math.round(progress * (frames.length - 1));
      if (i === lastDrawn && frames[i]) return;
      const img = nearestFrame(i);
      if (!img) return;
      if (frames[i]) lastDrawn = i;
      const s = Math.max(W / img.naturalWidth, H / img.naturalHeight);
      const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
      ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
    }

    // ---------- procedural scenes ----------
    let pts = [];
    const GL = '01{}<>/=;:+*#$&[]()';
    function init() {
      pts = [];
      if (variant === 'code') {
        const cols = Math.ceil(W / 22);
        for (let c = 0; c < cols; c++)
          pts.push({ x: c * 22 + 11, y: Math.random() * H, z: 0.3 + Math.random() * 0.7, sp: 0.4 + Math.random() * 1.2, len: 6 + ((Math.random() * 18) | 0), seed: Math.random() * 1000 });
      } else if (variant === 'stars') {
        for (let i = 0; i < 420; i++) pts.push({ x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2, z: Math.random() });
      } else if (variant === 'globe') {
        const N = W < 700 ? 420 : 720;
        const golden = Math.PI * (3 - Math.sqrt(5));
        for (let i = 0; i < N; i++) {
          const y = 1 - (i / (N - 1)) * 2;
          const r = Math.sqrt(1 - y * y);
          const phi = i * golden;
          pts.push({ x: Math.cos(phi) * r, y, z: Math.sin(phi) * r, node: Math.random() < 0.05, tw: Math.random() * Math.PI * 2 });
        }
        globe.nodes = pts.filter((p) => p.node);
      } else if (variant === 'orbit') {
        for (let i = 0; i < 160; i++) pts.push({ a: Math.random() * Math.PI * 2, r: 0.15 + Math.random() * 0.85, s: (Math.random() < 0.5 ? -1 : 1) * (0.1 + Math.random() * 0.4), size: Math.random() * 1.8 + 0.4 });
      }
    }

    function drawCode(t) {
      ctx.fillStyle = 'rgba(9,9,10,0.28)';
      ctx.fillRect(0, 0, W, H);
      ctx.font = '500 13px "JetBrains Mono", monospace';
      ctx.textAlign = 'center';
      const boost = 1 + Math.min(6, Math.abs(vel) / 400);
      for (const p of pts) {
        p.y += p.sp * boost * (0.6 + p.z);
        if (p.y - p.len * 16 > H) { p.y = -Math.random() * 200; p.len = 6 + ((Math.random() * 18) | 0); }
        for (let k = 0; k < p.len; k++) {
          const y = p.y - k * 16;
          if (y < -16 || y > H + 16) continue;
          const a = (1 - k / p.len) * 0.55 * p.z;
          const head = k === 0;
          ctx.fillStyle = head ? `rgba(200,255,46,${0.85 * p.z})` : `rgba(240,240,236,${a * 0.5})`;
          const g = GL[((p.seed + k * 7 + ((t / 90) | 0)) | 0) % GL.length];
          ctx.fillText(g, p.x, y);
        }
      }
    }

    function drawStars() {
      ctx.fillStyle = 'rgba(9,9,10,0.35)';
      ctx.fillRect(0, 0, W, H);
      const speed = 0.0018 + Math.min(0.03, Math.abs(vel) / 90000) + progress * 0.004;
      const cx = W * (0.5 + (mouse.x - 0.5) * 0.08), cy = H * (0.5 + (mouse.y - 0.5) * 0.08);
      const f = Math.max(W, H) * 0.5;
      for (const p of pts) {
        const pz = p.z;
        p.z -= speed;
        if (p.z <= 0.02) { p.x = (Math.random() - 0.5) * 2; p.y = (Math.random() - 0.5) * 2; p.z = 1; continue; }
        const x1 = cx + (p.x / pz) * f * 0.5, y1 = cy + (p.y / pz) * f * 0.5;
        const x2 = cx + (p.x / p.z) * f * 0.5, y2 = cy + (p.y / p.z) * f * 0.5;
        const b = 1 - p.z;
        ctx.strokeStyle = b > 0.85 ? `rgba(200,255,46,${b})` : `rgba(244,244,242,${b * 0.9})`;
        ctx.lineWidth = b * 2;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }
    }

    function drawOrbit(t) {
      ctx.clearRect(0, 0, W, H);
      const cx = W * 0.5, cy = H * 0.5, R = Math.min(W, H) * 0.62;
      ctx.strokeStyle = 'rgba(244,244,242,0.06)';
      for (let i = 1; i <= 4; i++) {
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * i * 0.25, R * i * 0.25 * 0.42, -0.25 + progress * 0.6, 0, Math.PI * 2);
        ctx.stroke();
      }
      const rot = t * 0.00012 + progress * 2.4;
      for (const p of pts) {
        const a = p.a + rot * p.s * 4;
        const x = cx + Math.cos(a) * p.r * R;
        const y = cy + Math.sin(a) * p.r * R * 0.42;
        const front = Math.sin(a) > 0;
        ctx.fillStyle = front ? 'rgba(244,244,242,0.55)' : 'rgba(244,244,242,0.18)';
        ctx.beginPath();
        ctx.arc(x, y, p.size * (front ? 1.2 : 0.8), 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // ---------- tech globe ----------
    const globe = { spin: 0, tiltX: 0.35, tiltY: 0, nodes: [] };
    function drawGlobe(t, dt) {
      ctx.clearRect(0, 0, W, H);
      const R = Math.min(W, H) * (W < 700 ? 0.42 : 0.4);
      const cx = W * 0.5, cy = H * 0.52;
      globe.spin += dt * (0.18 + Math.min(3, Math.abs(vel) / 900));
      globe.tiltX += (0.32 + (mouse.y - 0.5) * 0.5 - globe.tiltX) * 0.05;
      globe.tiltY += ((mouse.x - 0.5) * 0.9 - globe.tiltY) * 0.05;
      const ay = globe.spin + globe.tiltY + progress * 2.2, ax = globe.tiltX;
      const cY = Math.cos(ay), sY = Math.sin(ay), cX = Math.cos(ax), sX = Math.sin(ax);
      const proj = (p) => {
        const x1 = p.x * cY + p.z * sY, z1 = -p.x * sY + p.z * cY;
        const y2 = p.y * cX - z1 * sX, z2 = p.y * sX + z1 * cX;
        const s = 1 / (1.55 - z2 * 0.45);
        return { x: cx + x1 * R * s, y: cy + y2 * R * s, z: z2, s };
      };

      // soft core glow
      const glow = ctx.createRadialGradient(cx, cy, R * 0.1, cx, cy, R * 1.3);
      glow.addColorStop(0, 'rgba(200,255,46,0.07)');
      glow.addColorStop(0.5, 'rgba(139,123,255,0.04)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, W, H);

      // orbit rings with satellites
      for (let k = 0; k < 3; k++) {
        const tilt = -0.5 + k * 0.45, rr = R * (1.18 + k * 0.14), squash = 0.22 + k * 0.05;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(tilt);
        ctx.strokeStyle = `rgba(244,244,242,${0.07 - k * 0.015})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(0, 0, rr, rr * squash, 0, 0, Math.PI * 2);
        ctx.stroke();
        const a = t * 0.0004 * (1 + k * 0.4) + k * 2 + progress * 3;
        ctx.fillStyle = k === 1 ? '#8b7bff' : '#c8ff2e';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr * squash, 2.6, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // dots: back hemisphere dim, front bright
      const P = pts.map(proj);
      for (let pass = 0; pass < 2; pass++) {
        for (let i = 0; i < P.length; i++) {
          const q = P[i];
          if ((pass === 0) !== (q.z < 0)) continue;
          const d = (q.z + 1) / 2;
          if (pts[i].node) continue;
          ctx.fillStyle = `rgba(244,244,242,${0.08 + d * 0.62})`;
          const r = (0.55 + d * 1.2) * q.s;
          ctx.fillRect(q.x - r, q.y - r, r * 2, r * 2);
        }
      }

      // node network: lime nodes linked to their neighbours
      const N = globe.nodes.map(proj);
      ctx.lineWidth = 1;
      for (let i = 0; i < N.length; i++) {
        for (let j = i + 1; j < N.length; j++) {
          const a = globe.nodes[i], b = globe.nodes[j];
          const dd = (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2;
          if (dd > 0.42) continue;
          const depth = ((N[i].z + N[j].z) / 2 + 1) / 2;
          ctx.strokeStyle = `rgba(200,255,46,${(1 - dd / 0.42) * depth * 0.35})`;
          ctx.beginPath();
          ctx.moveTo(N[i].x, N[i].y);
          ctx.lineTo(N[j].x, N[j].y);
          ctx.stroke();
        }
      }
      for (let i = 0; i < N.length; i++) {
        const q = N[i], d = (q.z + 1) / 2;
        const pulse = 0.6 + 0.4 * Math.sin(t * 0.003 + globe.nodes[i].tw);
        ctx.fillStyle = `rgba(200,255,46,${(0.25 + d * 0.75) * pulse})`;
        ctx.shadowColor = '#c8ff2e';
        ctx.shadowBlur = 10 * d;
        ctx.beginPath();
        ctx.arc(q.x, q.y, (1.4 + d * 1.8) * q.s, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    function drawGrid(t) {
      ctx.clearRect(0, 0, W, H);
      const hy = H * 0.42, cx = W / 2;
      const off = ((t * 0.00004 + progress * 2) % 1);
      ctx.lineWidth = 1;
      for (let i = 0; i < 26; i++) {
        const z = (i + off) / 26;
        const y = hy + Math.pow(z, 2.4) * (H - hy) * 1.4;
        ctx.strokeStyle = `rgba(244,244,242,${0.03 + z * 0.12})`;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }
      for (let i = -20; i <= 20; i++) {
        ctx.strokeStyle = 'rgba(244,244,242,0.07)';
        ctx.beginPath(); ctx.moveTo(cx + i * 6, hy); ctx.lineTo(cx + i * W * 0.12, H); ctx.stroke();
      }
      const g = ctx.createRadialGradient(cx, hy, 0, cx, hy, W * 0.5);
      g.addColorStop(0, 'rgba(200,255,46,0.10)');
      g.addColorStop(1, 'rgba(200,255,46,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    let lastT = 0;
    function render(t) {
      raf = requestAnimationFrame(render);
      const dt = Math.min(0.05, (t - (lastT || t)) / 1000);
      lastT = t;
      if (!visible) return;
      vel *= 0.92;
      if (sequence && frames) return drawSequence();
      if (variant === 'globe') drawGlobe(t, dt);
      else if (variant === 'code') drawCode(t);
      else if (variant === 'stars') drawStars();
      else if (variant === 'orbit') drawOrbit(t);
      else drawGrid(t);
    }

    // created after the parent's pin exists so the range spans enter → pinned → exit
    let st;
    const timer = setTimeout(() => {
      const spacer = section.parentElement?.classList.contains('pin-spacer') ? section.parentElement : section;
      st = ScrollTrigger.create({
        trigger: spacer,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (s) => {
          progress = s.progress;
          vel = s.getVelocity();
        },
      });
    }, 0);

    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '200px' });
    const ro = new ResizeObserver(resize);
    const onMove = (e) => { mouse.x = e.clientX / innerWidth; mouse.y = e.clientY / innerHeight; };

    resize();
    ro.observe(wrap);
    io.observe(wrap);
    window.addEventListener('pointermove', onMove, { passive: true });
    if (sequence) loadSequence();
    raf = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      st?.kill();
      io.disconnect();
      ro.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  });
</script>

<div bind:this={wrap} class="pointer-events-none absolute inset-0 overflow-hidden {cls}" aria-hidden="true">
  <canvas bind:this={canvas} class="h-full w-full"></canvas>
  <div class="absolute inset-0" style="background: radial-gradient(120% 90% at 50% 40%, rgba(9,9,10,{dim * 0.4}) 0%, rgba(9,9,10,{Math.min(1, dim + 0.25)}) 100%)"></div>
</div>
