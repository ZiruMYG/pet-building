// Produce a small, repeatable visual QA pack for the procedural Yaya renderer.
// The pack is intentionally cheap: a contact sheet for silhouette/colour, a
// motion strip for timing, and a face crop for hand/eye scale. The same command
// can run locally or in CI when CHROME_PATH points at a Chromium binary.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';

const args = Object.fromEntries(process.argv.slice(2).map(arg => {
  const [key, value] = arg.replace(/^--/, '').split('=');
  return [key, value ?? true];
}));
const out = args.out || 'out/yaya-qa';
const chrome = args.chrome || process.env.CHROME_PATH;
mkdirSync(out, { recursive: true });

const run = (extra, label) => new Promise((resolve, reject) => {
  const env = { ...process.env, STUDIO_FILE: 'studio-yaya-pet.html' };
  const child = spawn(process.execPath, ['render.mjs', ...extra, ...(chrome ? [`--chrome=${chrome}`] : [])], { env, stdio: 'inherit' });
  child.on('close', code => code ? reject(new Error(`${label} exited ${code}`)) : resolve());
});

await run(['--sheet=0,0.5,1,1.5,2,2.5,3,3.5', '--cols=4', '--w=480', `--out=${out}/action-sheet.jpg`], 'action sheet');
await run(['--strip=0.8:2.2', '--cols=8', '--w=320', `--out=${out}/action-strip.jpg`], 'action strip');
await run(['--sheet=1.2,2.4', '--crop=700,250,520,500', '--cols=2', '--w=520', `--out=${out}/face-detail.jpg`], 'face detail');
console.log(`wrote Yaya visual QA pack to ${out}`);
