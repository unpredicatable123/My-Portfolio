<script>
  /**
   * Full-bleed WebGL aurora: flowing lime / teal / violet light ribbons over a fine
   * dot grid that glows around the cursor. Scroll position drifts the ribbons and
   * scroll speed makes them flow faster. Renders only while on screen.
   */
  import { onMount } from 'svelte';
  import { ScrollTrigger, reducedMotion } from '../lib/scroll.js';

  let { intensity = 1 } = $props();
  let wrap, canvas;

  const FRAG = `
    precision highp float;
    uniform vec2 u_res;
    uniform float u_time, u_scroll, u_dpr, u_int;
    uniform vec2 u_mouse;

    float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
    float noise(vec2 p) {
      vec2 i = floor(p), f = fract(p);
      vec2 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
    }
    float fbm(vec2 p) {
      float v = 0.0, a = 0.5;
      for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
      return v;
    }

    void main() {
      vec2 uv = gl_FragCoord.xy / u_res;
      vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / u_res.y;
      float t = u_time * 0.07 + u_scroll * 1.6;

      vec3 col = vec3(0.034, 0.034, 0.04);
      vec3 ribbon = vec3(0.0);
      for (int i = 0; i < 3; i++) {
        float fi = float(i);
        float y = 0.22 - fi * 0.21
          + 0.16 * sin(p.x * 1.25 + t * (1.0 + fi * 0.35) + fi * 2.1)
          + 0.28 * (fbm(vec2(p.x * 1.1 + t * 0.6 + fi * 3.7, t * 0.45 + fi)) - 0.5);
        float d = p.y - y;
        // soft band with a brighter lower edge and a long fade upward, like a curtain
        float band = exp(-d * d * 70.0) * 0.85 + exp(-max(d, 0.0) * 9.0) * smoothstep(-0.015, 0.0, d) * 0.1;
        band *= 0.45 + 0.55 * fbm(vec2(p.x * 3.0 - t * 1.3, p.y * 5.0 + fi * 4.0));
        band *= 0.5 + 0.5 * fbm(vec2(p.x * 18.0 + fi * 9.0, t * 1.8)); // vertical streaks
        // violet on top, teal in the middle, a thin lime ribbon at the bottom
        vec3 c = i == 0 ? vec3(0.56, 0.45, 1.0) : (i == 1 ? vec3(0.15, 0.85, 0.78) : vec3(0.78, 1.0, 0.18));
        float w = i == 2 ? 0.55 : 1.0;
        ribbon += c * band * w;
      }
      col += ribbon * 0.34 * u_int;

      // fine dot grid, brighter under the aurora and around the cursor
      vec2 g = fract(gl_FragCoord.xy / (24.0 * u_dpr)) - 0.5;
      float dotm = smoothstep(0.11, 0.0, length(g));
      vec2 m = (u_mouse - 0.5 * u_res) / u_res.y;
      float spot = exp(-dot(p - m, p - m) * 7.0);
      col += vec3(0.86, 1.0, 0.62) * dotm * (0.035 + spot * 0.4 + length(ribbon) * 0.12);
      col += vec3(0.78, 1.0, 0.18) * spot * 0.045;

      // vignette + gentle film noise to avoid banding
      col *= 1.0 - 0.6 * dot(uv - 0.5, uv - 0.5) * 2.0;
      col += (hash(gl_FragCoord.xy + u_time) - 0.5) * 0.012;
      gl_FragColor = vec4(col, 1.0);
    }`;

  onMount(() => {
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;
    const sh = (type, src) => {
      const s = gl.createShader(type);
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.warn('[AuroraBg]', gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }'));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const U = Object.fromEntries(['u_res', 'u_time', 'u_scroll', 'u_dpr', 'u_int', 'u_mouse'].map((n) => [n, gl.getUniformLocation(prog, n)]));

    let dpr = 1, visible = false, raf = 0, time = 0, last = performance.now();
    let progress = 0, boost = 0, flow = 0;
    const mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };

    function resize() {
      const r = wrap.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
      gl.viewport(0, 0, canvas.width, canvas.height);
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!visible) return;
      boost *= 0.94;
      flow += dt * (1 + boost);
      time = reducedMotion ? 8 : flow;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      gl.uniform2f(U.u_res, canvas.width, canvas.height);
      gl.uniform1f(U.u_time, time);
      gl.uniform1f(U.u_scroll, progress);
      gl.uniform1f(U.u_dpr, dpr);
      gl.uniform1f(U.u_int, intensity);
      gl.uniform2f(U.u_mouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    const onMove = (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.tx = (e.clientX - r.left) * dpr;
      mouse.ty = (r.bottom - e.clientY) * dpr; // GL y is up
      if (mouse.x < -999) (mouse.x = mouse.tx), (mouse.y = mouse.ty);
    };

    const section = wrap.parentElement;
    let st;
    const timer = setTimeout(() => {
      st = ScrollTrigger.create({
        trigger: section,
        start: 'top bottom',
        end: 'bottom top',
        onUpdate: (s) => {
          progress = s.progress;
          boost = Math.min(6, boost + Math.abs(s.getVelocity()) / 4000);
        },
      });
    }, 0);

    const ro = new ResizeObserver(resize);
    ro.observe(wrap);
    const io = new IntersectionObserver(([e]) => (visible = e.isIntersecting), { rootMargin: '150px' });
    io.observe(wrap);
    window.addEventListener('pointermove', onMove, { passive: true });
    resize();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timer);
      st?.kill();
      ro.disconnect();
      io.disconnect();
      window.removeEventListener('pointermove', onMove);
    };
  });
</script>

<div bind:this={wrap} class="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
  <canvas bind:this={canvas} class="h-full w-full"></canvas>
</div>
