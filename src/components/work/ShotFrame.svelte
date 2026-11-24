<script>
  /** Browser-framed screenshot of a live site. */
  let { src, url, alt, dark = true } = $props();
  const host = url ? new URL(url).host : '';
</script>

<a
  href={url}
  target="_blank"
  rel="noreferrer"
  data-cursor="Visit"
  class="shot group block overflow-hidden rounded-2xl border shadow-[0_40px_120px_-40px_rgba(0,0,0,.7)] {dark ? 'border-white/10 bg-[#111]' : 'border-ink/10 bg-white'}"
>
  <div class="flex items-center gap-2 border-b px-4 py-3 {dark ? 'border-white/10' : 'border-ink/10'}">
    <span class="h-2.5 w-2.5 rounded-full bg-[#ff5f57]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#febc2e]"></span><span class="h-2.5 w-2.5 rounded-full bg-[#28c840]"></span>
    <span class="mono ml-3 truncate rounded-md px-3 py-1 text-[11px] {dark ? 'bg-white/5 text-white/50' : 'bg-ink/5 text-ink/50'}">{host}</span>
    <span class="mono ml-auto flex items-center gap-1.5 text-[10.5px] {dark ? 'text-white/50' : 'text-ink/50'}"><span class="pulse-dot"></span> live</span>
  </div>
  <div class="overflow-hidden">
    <img {src} {alt} loading="lazy" class="aspect-[16/10] w-full object-cover object-top transition-transform duration-[1.2s] ease-out-expo group-hover:scale-[1.04]" />
  </div>
</a>
