<script>
  const courses = [
    { name: 'Full-Stack with React', p: 82 },
    { name: 'Cloud on AWS', p: 64 },
    { name: 'PostgreSQL Deep Dive', p: 45 },
  ];
</script>

<div class="overflow-hidden rounded-2xl border border-ink/10 bg-white text-ink shadow-[0_40px_120px_-40px_rgba(0,0,0,.45)]">
  <div class="flex items-center gap-2 border-b border-ink/10 px-4 py-3">
    <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#febc2e]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#28c840]"></span>
    <span class="mono ml-3 rounded-md bg-ink/5 px-3 py-1 text-[11px] text-ink/50">hexoria.academy/dashboard</span>
  </div>
  <div class="grid grid-cols-[150px_1fr] max-sm:grid-cols-1">
    <aside class="border-r border-ink/10 p-4 max-sm:hidden">
      <div class="display text-[18px]">HEXORIA</div>
      <ul class="mt-6 space-y-1 text-[12.5px]">
        {#each ['Dashboard', 'My courses', 'Assessments', 'Certificates', 'Settings'] as item, i}
          <li class="rounded-lg px-3 py-2 {i === 0 ? 'bg-ink text-white' : 'text-ink/60'}">{item}</li>
        {/each}
      </ul>
    </aside>
    <div class="p-5">
      <div class="flex items-center justify-between">
        <div>
          <div class="text-[12px] text-ink/50">Welcome back</div>
          <div class="text-[18px] font-semibold">Keep learning 👋</div>
        </div>
        <span class="mono rounded-full bg-lime px-3 py-1 text-[10.5px] font-medium">JWT · secure</span>
      </div>
      <div class="mt-5 space-y-3">
        {#each courses as c, i}
          <div class="rounded-xl border border-ink/10 p-3.5">
            <div class="flex items-center justify-between text-[13px] font-medium">
              <span>{c.name}</span><span class="mono text-[11px] text-ink/50">{c.p}%</span>
            </div>
            <div class="mt-2.5 h-1.5 overflow-hidden rounded-full bg-ink/10">
              <div class="bar h-full rounded-full bg-ink" style="--w: {c.p}%; --d: {0.2 + i * 0.15}s"></div>
            </div>
          </div>
        {/each}
      </div>
      <div class="mt-4 grid grid-cols-2 gap-3">
        <div class="rounded-xl bg-ink p-3.5 text-white">
          <div class="text-[11px] text-white/50">Next assessment</div>
          <div class="mt-1 text-[14px] font-semibold">React Hooks Quiz</div>
          <div class="mono mt-2 text-[10.5px] text-lime">Starts in 02:14:09</div>
        </div>
        <div class="relative overflow-hidden rounded-xl border border-ink/10 p-3.5">
          <div class="text-[11px] text-ink/50">Certificate</div>
          <div class="mt-1 text-[14px] font-semibold">Ready to download</div>
          <div class="mono mt-2 text-[10.5px] text-ink/60">AWS S3 · signed URL</div>
          <span class="shine"></span>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .bar {
    width: 0;
    transition: width 1.6s cubic-bezier(0.16, 1, 0.3, 1) var(--d);
  }
  :global(.in) .bar {
    width: var(--w);
  }
  .shine {
    position: absolute;
    inset: 0;
    background: linear-gradient(110deg, transparent 30%, rgba(200, 255, 46, 0.45) 50%, transparent 70%);
    transform: translateX(-100%);
    animation: shine 3.2s ease-in-out infinite 1s;
  }
  @keyframes shine {
    60%, 100% { transform: translateX(100%); }
  }
</style>
