<script>
  const protocols = [
    { name: 'SCAN', state: 'done' },
    { name: 'DECODE', state: 'done' },
    { name: 'TRACE', state: 'live' },
    { name: 'ESCAPE', state: 'locked' },
    { name: 'OVERDRIVE', state: 'locked' },
    { name: 'OVERRIDE', state: 'locked' },
  ];
  const teams = [
    { name: 'NULL_POINTERS', xp: 2840 },
    { name: 'BIT_BANDITS', xp: 2610 },
    { name: 'ROOT_ACCESS', xp: 2275 },
    { name: 'STACK_SMASH', xp: 1930 },
  ];
  const max = teams[0].xp;
</script>

<div class="arena mono overflow-hidden rounded-2xl border border-lime/25 bg-black text-[12px] text-white shadow-[0_0_140px_-30px_rgba(200,255,46,.45)]">
  <div class="flex items-center justify-between border-b border-lime/20 px-4 py-3">
    <span class="text-lime">OVERRIDE://ARENA</span>
    <span class="flex items-center gap-2 text-white/50"><span class="blink h-2 w-2 rounded-full bg-lime"></span> 42 TEAMS ONLINE</span>
  </div>

  <div class="alert flex items-center justify-between gap-3 bg-alert/15 px-4 py-2 text-alert">
    <span>⚠ RED ALERT · BOSS PROTOCOL INBOUND</span><span>00:47</span>
  </div>

  <div class="grid gap-5 p-5 sm:grid-cols-[1fr_1.3fr]">
    <div>
      <div class="mb-3 text-[10px] tracking-[0.25em] text-white/40">PROTOCOLS</div>
      <ol class="space-y-2">
        {#each protocols as p, i}
          <li
            class="flex items-center justify-between rounded-lg border px-3 py-2 {p.state === 'live'
              ? 'border-lime bg-lime/10 text-lime'
              : p.state === 'done'
                ? 'border-white/10 text-white/70'
                : 'border-white/5 text-white/25'}"
          >
            <span>0{i + 1} {p.name}</span>
            <span>{p.state === 'done' ? '✓' : p.state === 'live' ? '▶' : '🔒'}</span>
          </li>
        {/each}
      </ol>
    </div>
    <div>
      <div class="mb-3 text-[10px] tracking-[0.25em] text-white/40">LEADERBOARD · XP</div>
      <ul class="space-y-3">
        {#each teams as t, i}
          <li>
            <div class="flex justify-between"><span class={i === 0 ? 'text-lime' : 'text-white/80'}>#{i + 1} {t.name}</span><span class="text-white/50">{t.xp}</span></div>
            <div class="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div class="xp h-full rounded-full {i === 0 ? 'bg-lime' : 'bg-white/60'}" style="--w: {(t.xp / max) * 100}%; --d: {0.2 + i * 0.12}s"></div>
            </div>
          </li>
        {/each}
      </ul>
      <div class="mt-5 flex items-center gap-3 rounded-lg border border-white/10 p-3">
        <div class="qr grid h-12 w-12 shrink-0 grid-cols-5 gap-[2px] bg-white p-1">
          {#each Array(25) as _, k}<span class={(k * 7 + (k >> 2)) % 3 ? 'bg-black' : 'bg-white'}></span>{/each}
        </div>
        <div class="text-[11px] leading-snug text-white/60">Player 02 joins by scanning the team QR.<br /><span class="text-lime">/join/X7K-29Q</span></div>
      </div>
    </div>
  </div>
</div>

<style>
  .xp {
    width: 0;
    transition: width 1.6s cubic-bezier(0.16, 1, 0.3, 1) var(--d);
  }
  :global(.in) .xp {
    width: var(--w);
  }
  .blink {
    animation: blink 1.2s steps(2) infinite;
  }
  .alert {
    animation: alert 1.6s ease-in-out infinite;
  }
  @keyframes blink {
    50% { opacity: 0.2; }
  }
  @keyframes alert {
    50% { background: rgba(255, 70, 50, 0.3); }
  }
  @media (prefers-reduced-motion: reduce) {
    .blink, .alert { animation: none; }
  }
</style>
