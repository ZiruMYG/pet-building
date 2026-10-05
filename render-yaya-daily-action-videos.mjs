import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Render the concrete daily verbs added to Yaya's action vocabulary. Existing
// action clips stay untouched; this keeps iteration on the new gestures fast.
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['drink', 'run', 'exercise', 'stretch', 'ball', 'dance'];
const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const out = resolve(process.env.YAYA_ACTION_OUT || '../../outputs/yaya-pet/assets/actions');
const fps = 24, seconds = 4;
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization', '--window-size=1920,1080']
});
const page = await browser.newPage();
page.on('pageerror', error => console.error('[page error]', error.message));
await page.goto(pathToFileURL(resolve('studio-yaya-pet.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true', { timeout: 60000 });
for (const name of names) {
  const available = await page.evaluate(key => Boolean(LOOPS[`yaya_${key}`]), name);
  if (!available) throw new Error(`No Yaya loop named ${name}`);
  await page.evaluate(key => { window.LOOP = LOOPS[`yaya_${key}`]; }, name);
  const poster = await page.evaluate(() => window.renderAt(1.55, 'image/jpeg', .9));
  writeFileSync(resolve(out, `${name}.jpg`), Buffer.from(poster.slice(poster.indexOf(',') + 1), 'base64'));
  const file = resolve(out, `${name}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', file], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < seconds * fps; i++) {
    const url = await page.evaluate(t => window.renderAt(t, 'image/jpeg', .9), i / fps);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(resolveDrain => ff.stdin.once('drain', resolveDrain));
  }
  ff.stdin.end();
  await new Promise((ok, bad) => { ff.once('error', bad); ff.once('close', code => code ? bad(new Error(`ffmpeg exited ${code}`)) : ok()); });
  console.log(`wrote ${name}.jpg and ${name}.mp4`);
}
await page.close();
await browser.close();

