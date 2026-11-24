<script>
  // 2+2 bus layout, 8 rows. x = taken, s = selected
  const rows = ['xx.ox', 'ox.xo', 'oo.xx', 'xo.so', 'ox.oo', 'xx.ox', 'oo.xo', 'xo.oo'];
</script>

<div class="grid items-center gap-5 sm:grid-cols-[1.1fr_1fr]">
  <!-- Ticket -->
  <div class="ticket relative overflow-hidden rounded-2xl bg-[#13201d] p-5 text-[#f4efe4] shadow-[0_40px_100px_-40px_rgba(15,118,110,.6)]">
    <div class="flex items-center justify-between">
      <span class="display text-[20px] tracking-tight">VAZHI</span>
      <span class="mono rounded-full border border-white/20 px-2.5 py-1 text-[10px]">EN · தமிழ்</span>
    </div>
    <div class="mt-6 flex items-end justify-between gap-3">
      <div>
        <div class="mono text-[10px] text-white/50">FROM</div>
        <div class="text-[22px] font-semibold leading-tight">Salem</div>
        <div class="text-[13px] text-white/60">சேலம்</div>
      </div>
      <div class="route mb-3 h-px flex-1 bg-white/25"><span class="bus"></span></div>
      <div class="text-right">
        <div class="mono text-[10px] text-white/50">TO</div>
        <div class="text-[22px] font-semibold leading-tight">Chennai</div>
        <div class="text-[13px] text-white/60">சென்னை</div>
      </div>
    </div>
    <div class="mono mt-6 grid grid-cols-3 gap-3 text-[10px] text-white/50">
      <div>DATE<div class="mt-1 text-[13px] text-white">14 NOV</div></div>
      <div>DEPART<div class="mt-1 text-[13px] text-white">21:30</div></div>
      <div>SEAT<div class="mt-1 text-[13px] text-[#5eead4]">7C</div></div>
    </div>
    <div class="my-5 border-t border-dashed border-white/20"></div>
    <div class="flex items-center justify-between gap-4">
      <div>
        <div class="mono text-[10px] text-white/50">PNR</div>
        <div class="mono text-[15px] tracking-widest">VZ-48K2Q</div>
        <div class="mt-1 text-[11px] text-white/50">Conductor sees PNR + seat only</div>
      </div>
      <div class="grid h-16 w-16 shrink-0 grid-cols-6 gap-[2px] rounded bg-white p-1.5">
        {#each Array(36) as _, k}<span class={(k * 5 + (k >> 3)) % 3 ? 'bg-[#13201d]' : 'bg-white'}></span>{/each}
      </div>
    </div>
  </div>

  <!-- Seat map -->
  <div class="rounded-2xl border border-[#13201d]/10 bg-white p-4 text-[#13201d]">
    <div class="mono mb-3 flex justify-between text-[10px] text-[#13201d]/50"><span>SEAT MAP · 2+2</span><span>🛞 DRIVER</span></div>
    <div class="space-y-1.5">
      {#each rows as row, r}
        <div class="flex justify-center gap-1.5">
          {#each row.split('') as c, k}
            {#if c === '.'}<span class="w-4"></span>
            {:else}
              <span
                class="seat grid h-6 w-6 place-items-center rounded-md text-[8px] {c === 'x'
                  ? 'bg-[#13201d]/15'
                  : c === 's'
                    ? 'sel bg-[#0f766e] text-white'
                    : 'border border-[#13201d]/20'}"
              >{c === 's' ? '✓' : ''}</span>
            {/if}
          {/each}
        </div>
      {/each}
    </div>
    <div class="mono mt-3 flex gap-3 text-[9.5px] text-[#13201d]/60">
      <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm border border-[#13201d]/30"></span>Free</span>
      <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-[#13201d]/15"></span>Booked</span>
      <span class="flex items-center gap-1"><span class="h-2.5 w-2.5 rounded-sm bg-[#0f766e]"></span>Yours</span>
    </div>
  </div>
</div>

<style>
  .route {
    position: relative;
  }
  .bus {
    position: absolute;
    top: -3px;
    left: 0;
    width: 7px;
    height: 7px;
    border-radius: 99px;
    background: #5eead4;
    box-shadow: 0 0 12px #5eead4;
    animation: drive 3.4s ease-in-out infinite;
  }
  @keyframes drive {
    0% { left: 0; }
    100% { left: calc(100% - 7px); }
  }
  .sel {
    animation: pop 2s ease-in-out infinite;
  }
  @keyframes pop {
    50% { transform: scale(1.18); }
  }
  @media (prefers-reduced-motion: reduce) {
    .bus, .sel { animation: none; }
  }
</style>
