<script>
  /**
   * Live-animated character. A WebGL fragment shader warps the portrait around rig
   * landmarks (src/lib/media.js → rig): eyes follow the cursor and widen/narrow, each
   * brow and each mouth corner moves independently (smirks, raised brow), cheeks lift
   * and blush. No eyelids are painted, so the artwork is never covered. Mood comes from
   * the shared mascot store, so every instance reacts together.
   */
  import { onMount } from 'svelte';
  import { media } from '../lib/media.js';
  import { mascot, MOODS } from '../lib/mascot.svelte.js';
  import { reducedMotion } from '../lib/scroll.js';

  let { class: cls = '', style = '', tilt = true } = $props();

  let wrap, head, canvas;
  let failed = $state(false);
  const shades = $derived(!!MOODS[mascot.mood]?.shades);

  // sunglasses box (over the glasses frame), as % of the portrait
  const [IW, IH] = media.rig.size;
  const sg = { left: (468 / IW) * 100, top: (392 / IH) * 100, width: (464 / IW) * 100, height: (160 / IH) * 100 };

  const VERT = `
    attribute vec2 a;
    varying vec2 v_uv;
    void main() {
      v_uv = vec2(a.x * 0.5 + 0.5, 0.5 - a.y * 0.5);
      gl_Position = vec4(a, 0.0, 1.0);
    }`;

  const FRAG = `
    precision highp float;
    varying vec2 v_uv;
    uniform sampler2D u_tex;
    uniform vec2 u_res;
    uniform vec2 u_e0, u_e1, u_er, u_b0, u_b1, u_mL, u_mR, u_mC, u_gaze;
    uniform float u_smile0, u_smile1, u_brow0, u_brow1, u_widen, u_blush;

    float g(vec2 p, vec2 c, vec2 s) { vec2 d = (p - c) / s; return exp(-0.5 * dot(d, d)); }

    vec2 eyeWarp(vec2 p, vec2 src, vec2 e) {
      vec2 q = (p - e) / u_er;
      float m = 1.0 - smoothstep(0.62, 1.0, length(q));
      src.y = mix(src.y, e.y + (src.y - e.y) * (1.0 - u_widen * 0.15), m);
      src -= u_gaze * u_er * vec2(0.27, 0.2) * m;
      return src;
    }

    void main() {
      vec2 p = v_uv * u_res;
      vec2 src = p;

      // mouth: each corner lifts (or drops) on its own, centre and cheeks follow
      float mw = distance(u_mL, u_mR);
      vec2 sc = vec2(mw * 0.24);
      float a0 = mw * 0.08 * u_smile0;
      float a1 = mw * 0.08 * u_smile1;
      src -= vec2(-0.45, -1.0) * g(p, u_mL, sc) * a0 + vec2(0.45, -1.0) * g(p, u_mR, sc) * a1;
      src.y += g(p, u_mC, vec2(mw * 0.42, mw * 0.2)) * (a0 + a1) * 0.11;
      vec2 cs = vec2(u_er.x * 0.95, u_er.y * 1.2);
      vec2 cheekOff = vec2(0.0, u_er.y * 2.7);
      src.y += g(p, u_e0 + cheekOff, cs) * a0 * 0.3 + g(p, u_e1 + cheekOff, cs) * a1 * 0.3;

      // brows, independently (masked so the glasses frame below never bends)
      vec2 bs = vec2(u_er.x * 1.4, u_er.y * 0.75);
      float bm0 = g(p, u_b0, bs) * (1.0 - smoothstep(u_b0.y + u_er.y * 0.2, u_b0.y + u_er.y * 0.75, p.y));
      float bm1 = g(p, u_b1, bs) * (1.0 - smoothstep(u_b1.y + u_er.y * 0.2, u_b1.y + u_er.y * 0.75, p.y));
      src.y += (bm0 * u_brow0 + bm1 * u_brow1) * u_er.y * 0.42;

      // eyes: widen / slight squint + gaze
      src = eyeWarp(p, src, u_e0);
      src = eyeWarp(p, src, u_e1);

      vec4 col = texture2D(u_tex, src / u_res);

      // blush on the cheeks, below the glasses
      vec2 bsz = vec2(u_er.x * 0.95, u_er.y * 0.85);
      float bl = g(p, u_e0 + vec2(-u_er.x * 0.3, u_er.y * 3.5), bsz) + g(p, u_e1 + vec2(u_er.x * 0.3, u_er.y * 3.5), bsz);
      bl = min(1.0, bl) * u_blush * 0.6 * col.a;
      col.rgb = mix(col.rgb, vec3(1.0, 0.32, 0.42) * col.a, bl);

      gl_FragColor = col;
    }`;

  onMount(() => {
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: true });
    if (!gl) {
      failed = true;
      return;
    }
    const rig = media.rig;

    const compile = (type, srcText) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, srcText);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    };
    let prog;
    try {
      prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    } catch (e) {
      console.warn('[Character] shader failed, falling back to static image', e);
      failed = true;
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const U = {};
    for (const n of ['u_tex', 'u_res', 'u_e0', 'u_e1', 'u_er', 'u_b0', 'u_b1', 'u_mL', 'u_mR', 'u_mC', 'u_gaze', 'u_smile0', 'u_smile1', 'u_brow0', 'u_brow1', 'u_widen', 'u_blush'])
      U[n] = gl.getUniformLocation(prog, n);

    gl.uniform2f(U.u_res, IW, IH);
    gl.uniform2f(U.u_e0, ...rig.eyes[0]);
    gl.uniform2f(U.u_e1, ...rig.eyes[1]);
    gl.uniform2f(U.u_er, ...rig.eyeRadius);
    gl.uniform2f(U.u_b0, ...rig.brows[0]);
    gl.uniform2f(U.u_b1, ...rig.brows[1]);
    gl.uniform2f(U.u_mL, ...rig.mouthL);
    gl.uniform2f(U.u_mR, ...rig.mouthR);
    gl.uniform2f(U.u_mC, ...rig.mouthC);

    let ready = false;
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      const tex = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, tex);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(U.u_tex, 0);
      ready = true;
    };
    img.src = media.photo;

    // ---------- animation state ----------
    const st = { s0: 0.18, s1: 0.18, b0: 0, b1: 0, widen: 0, blush: 0, gx: 0, gy: 0, rot: 0 };
    let saccade = { x: 0, y: 0, t: 0 };
    let bounceT = -1, lastBounce = mascot.bounce;
    let visible = true, raf = 0, last = performance.now(), time = 0;

    function resize() {
      const r = wrap.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.min(IW, Math.round(r.width * dpr)));
      canvas.height = Math.max(1, Math.min(IH, Math.round(r.height * dpr)));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    const lerp = (a, b, k) => a + (b - a) * k;

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible || !ready) return;
      time += dt;

      const mood = mascot.mood;
      const m = MOODS[mood] || MOODS.idle;
      const k = 1 - Math.exp(-dt * 8);
      st.s0 = lerp(st.s0, m.smileL ?? m.smile ?? 0, k);
      st.s1 = lerp(st.s1, m.smileR ?? m.smile ?? 0, k);
      st.b0 = lerp(st.b0, m.browL ?? m.brow ?? 0, k);
      st.b1 = lerp(st.b1, m.browR ?? m.brow ?? 0, k);
      st.widen = lerp(st.widen, Math.max(-0.2, m.widen ?? 0), k);
      st.blush = lerp(st.blush, m.blush ?? 0, 1 - Math.exp(-dt * 4));

      // gaze: mood override, else follow the pointer, else wander
      let tx, ty;
      if (m.look) {
        [tx, ty] = m.look;
      } else if (mascot.pointer.active) {
        const r = wrap.getBoundingClientRect();
        const ex = r.left + (((rig.eyes[0][0] + rig.eyes[1][0]) / 2) / IW) * r.width;
        const ey = r.top + (((rig.eyes[0][1] + rig.eyes[1][1]) / 2) / IH) * r.height;
        const dx = mascot.pointer.x - ex, dy = mascot.pointer.y - ey;
        const len = Math.hypot(dx, dy);
        const s = len / (len + 260);
        tx = (dx / (len || 1)) * s * 1.15;
        ty = (dy / (len || 1)) * s * 1.15;
      } else {
        saccade.t -= dt;
        if (saccade.t <= 0) saccade = { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 0.6, t: 1 + Math.random() * 2.5 };
        tx = saccade.x;
        ty = saccade.y;
      }
      const gk = 1 - Math.exp(-dt * (m.look ? 6 : 14));
      st.gx = lerp(st.gx, Math.max(-1, Math.min(1, tx)), gk);
      st.gy = lerp(st.gy, Math.max(-1, Math.min(1, ty)), gk);

      gl.uniform2f(U.u_gaze, st.gx, st.gy);
      gl.uniform1f(U.u_smile0, st.s0);
      gl.uniform1f(U.u_smile1, st.s1);
      gl.uniform1f(U.u_brow0, st.b0);
      gl.uniform1f(U.u_brow1, st.b1);
      gl.uniform1f(U.u_widen, st.widen);
      gl.uniform1f(U.u_blush, st.blush);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      // head motion: tilt (mood + pointer), idle bob, hop on bounce
      if (mascot.bounce !== lastBounce) {
        lastBounce = mascot.bounce;
        bounceT = 0;
      }
      // in-place "pulse" instead of a jump: the bust stays anchored to the bottom edge
      let sy = 1, sx = 1;
      if (bounceT >= 0) {
        bounceT += dt;
        const u = bounceT / 0.55;
        if (u >= 1) bounceT = -1;
        else {
          const sq = Math.sin(u * Math.PI * 2) * (1 - u);
          sy = 1 + sq * 0.035;
          sx = 1 - sq * 0.02;
        }
      }
      if (tilt && !reducedMotion) {
        const target = Math.max(-3.5, Math.min(3.5, (m.tilt ?? 0) * 0.6 + st.gx * 1.2));
        st.rot = lerp(st.rot, target, 1 - Math.exp(-dt * 5));
        const breathe = 1 + Math.sin(time * (mood === 'sleepy' ? 1.1 : 1.6)) * 0.004;
        head.style.transform = `rotate(${st.rot}deg) scale(${sx * breathe}, ${sy * breathe})`;
      }
    }

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '100px' });
    io.observe(wrap);
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      io.disconnect();
    };
  });
</script>

<div bind:this={wrap} class="relative {cls}" {style}>
  <div bind:this={head} class="relative h-full w-full origin-bottom will-change-transform">
    {#if failed}
      <img src={media.photo} alt="" class="h-full w-full object-cover object-top" />
    {:else}
      <canvas bind:this={canvas} class="block h-full w-full" aria-hidden="true"></canvas>
    {/if}

    <!-- 😎 sunglasses -->
    <svg
      class="shades pointer-events-none absolute"
      class:on={shades}
      style="left: {sg.left}%; top: {sg.top}%; width: {sg.width}%; height: {sg.height}%"
      viewBox="0 0 464 160"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="lens" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#1b1b1f" />
          <stop offset="0.55" stop-color="#050506" />
          <stop offset="1" stop-color="#16161a" />
        </linearGradient>
        <linearGradient id="glare" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#c8ff2e" stop-opacity="0" />
          <stop offset="0.5" stop-color="#c8ff2e" stop-opacity="0.85" />
          <stop offset="1" stop-color="#c8ff2e" stop-opacity="0" />
        </linearGradient>
        <clipPath id="lenses">
          <path d="M14 22 H206 Q214 22 212 34 L200 112 Q196 140 168 142 H62 Q30 142 24 112 L10 36 Q8 22 14 22 Z" />
          <path d="M258 22 H450 Q456 22 454 36 L440 112 Q434 142 402 142 H296 Q268 140 264 112 L252 34 Q250 22 258 22 Z" />
        </clipPath>
      </defs>
      <!-- bridge + top bar -->
      <rect x="0" y="14" width="464" height="16" rx="8" fill="#0a0a0b" />
      <path d="M206 40 Q232 22 258 40" stroke="#0a0a0b" stroke-width="12" fill="none" />
      <!-- lenses -->
      <g clip-path="url(#lenses)">
        <rect width="464" height="160" fill="url(#lens)" />
        <rect class="glint" x="-120" y="0" width="90" height="160" fill="url(#glare)" transform="skewX(-20)" />
      </g>
      <path d="M14 22 H206 Q214 22 212 34 L200 112 Q196 140 168 142 H62 Q30 142 24 112 L10 36 Q8 22 14 22 Z" fill="none" stroke="#000" stroke-width="5" />
      <path d="M258 22 H450 Q456 22 454 36 L440 112 Q434 142 402 142 H296 Q268 140 264 112 L252 34 Q250 22 258 22 Z" fill="none" stroke="#000" stroke-width="5" />
    </svg>
  </div>
</div>

<style>
  .shades {
    opacity: 0;
    transform: translateY(-160%) rotate(-8deg);
    transition:
      transform 0.55s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.25s;
  }
  .shades.on {
    opacity: 1;
    transform: none;
  }
  .glint {
    animation: glint 2.4s ease-in-out infinite;
  }
  @keyframes glint {
    0%, 40% { transform: skewX(-20deg) translateX(0); }
    80%, 100% { transform: skewX(-20deg) translateX(700px); }
  }
</style>
