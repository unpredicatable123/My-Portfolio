<script>
  const steps = [
    { k: 'OCR', v: 'text extracted · 61 tokens' },
    { k: 'NLP', v: 'urgency + prize lexicon hit' },
    { k: 'URL', v: 'typosquat: amaz0n-rewards.in' },
    { k: 'LAYOUT', v: 'unknown number · forwarded' },
  ];
</script>

<div class="grid items-center gap-5 sm:grid-cols-[0.9fr_1fr]">
  <!-- chat screenshot -->
  <div class="chat relative overflow-hidden rounded-[26px] border border-white/10 bg-[#0e1513] p-3 shadow-[0_40px_120px_-40px_rgba(139,123,255,.6)]">
    <div class="flex items-center gap-2 rounded-xl bg-[#1b2622] px-3 py-2">
      <span class="grid h-7 w-7 place-items-center rounded-full bg-[#8b7bff]/40 text-[11px]">?</span>
      <div class="leading-tight">
        <div class="text-[12px] font-medium">+91 98xxx xx210</div>
        <div class="text-[10px] text-white/40">unknown number</div>
      </div>
    </div>
    <div class="space-y-2 p-2 pt-3 text-[12px] leading-snug">
      <div class="w-[85%] rounded-xl rounded-tl-sm bg-[#1f2c27] p-2.5">
        <div class="mono mb-1 text-[9px] text-white/40">↪ Forwarded many times</div>
        🎉 Congratulations! Your number won <b>₹50,000</b> in the Amazon Festive Lucky Draw.
      </div>
      <div class="w-[85%] rounded-xl rounded-tl-sm bg-[#1f2c27] p-2.5">
        Claim within <b>2 hours</b> or it expires: <span class="text-[#7dd3fc] underline">amaz0n-rewards.in/claim</span>
      </div>
      <div class="ml-auto w-[55%] rounded-xl rounded-tr-sm bg-[#134e3a] p-2.5 text-right">is this real?</div>
    </div>
    <div class="scan pointer-events-none absolute inset-x-0 h-16"></div>
  </div>

  <!-- verdict -->
  <div class="mono space-y-3 text-[11.5px]">
    <div class="rounded-2xl border border-[#ff4632]/40 bg-[#ff4632]/10 p-4">
      <div class="text-[10px] tracking-[0.2em] text-white/50">STAGE 1 · BINARY</div>
      <div class="mt-1 flex items-end justify-between">
        <span class="display text-[26px] text-[#ff6b5a]">Fraudulent</span>
        <span class="text-[18px] text-white">0.97</span>
      </div>
    </div>
    <div class="rounded-2xl border border-[#8b7bff]/40 bg-[#8b7bff]/10 p-4">
      <div class="text-[10px] tracking-[0.2em] text-white/50">STAGE 2 · CATEGORY (1 OF 7)</div>
      <div class="mt-1 text-[15px] text-white">Lottery / prize scam</div>
    </div>
    <ul class="space-y-1.5 rounded-2xl border border-white/10 p-4">
      {#each steps as s, i}
        <li class="sig flex justify-between gap-3" style="--d: {0.3 + i * 0.25}s">
          <span class="text-[#8b7bff]">{s.k}</span><span class="text-right text-white/60">{s.v}</span>
        </li>
      {/each}
    </ul>
  </div>
</div>

<style>
  .scan {
    top: -64px;
    background: linear-gradient(to bottom, transparent, rgba(139, 123, 255, 0.28), transparent);
    border-bottom: 1px solid rgba(139, 123, 255, 0.8);
    animation: scan 3.2s linear infinite;
  }
  @keyframes scan {
    to { top: 100%; }
  }
  .sig {
    opacity: 0;
    transform: translateX(-8px);
  }
  :global(.in) .sig {
    animation: sig 0.5s forwards var(--d);
  }
  @keyframes sig {
    to { opacity: 1; transform: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    .scan { animation: none; }
    .sig { opacity: 1; transform: none; }
  }
</style>
