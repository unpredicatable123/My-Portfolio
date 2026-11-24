// Convert a (Higgsfield) video clip into a scroll-scrubbable WebP frame sequence.
// Usage: npm run frames -- <input.mp4> <name> [fps=24] [width=1600]
// Output: public/media/seq/<name>/0001.webp … + manifest.json
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const [input, name, fps = '24', width = '1600'] = process.argv.slice(2);
if (!input || !name) {
  console.error('Usage: npm run frames -- <input.mp4> <name> [fps] [width]');
  process.exit(1);
}
if (!existsSync(input)) {
  console.error(`Input not found: ${input}`);
  process.exit(1);
}

const out = resolve('public/media/seq', name);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

const r = spawnSync(
  'ffmpeg',
  ['-v', 'error', '-y', '-i', input, '-vf', `fps=${fps},scale=${width}:-2:flags=lanczos`, '-c:v', 'libwebp', '-quality', '78', '-compression_level', '5', join(out, '%04d.webp')],
  { stdio: 'inherit' },
);
if (r.status !== 0) process.exit(r.status ?? 1);

const count = readdirSync(out).filter((f) => f.endsWith('.webp')).length;
writeFileSync(join(out, 'manifest.json'), JSON.stringify({ count, ext: 'webp', fps: Number(fps) }, null, 2));
console.log(`✓ ${count} frames → ${out}\n  Set media.scenes.<slot> = '${name}' in src/lib/media.js`);
