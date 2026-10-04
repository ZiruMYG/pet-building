import puppeteer from 'puppeteer-core';
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const fps = 24;
const root = resolve('../../outputs/yaya-pet/assets');
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization', '--window-size=1920,1080', '--disable-renderer-backgrounding', '--disable-background-timer-throttling']
});

const first = await browser.newPage();
first.on('pageerror', error => console.error('[page error]', error.message));
await first.goto(pathToFileURL(resolve('studio-yaya-pet.html')).href + '?render', { waitUntil: 'networkidle0' });
await first.waitForFunction('window.ready === true', { timeout: 60000 });
const states = await first.evaluate(() => ({ moods: window.YAYA_MOODS, actions: window.YAYA_MOTION_ACTIONS }));
await first.close();

const jobs = [
  ...states.moods.map(name => ({ name, folder: 'emotions' })),
  ...states.actions.map(name => ({ name, folder: 'actions' }))
];
for (const job of jobs) mkdirSync(resolve(root, job.folder), { recursive: true });

async function renderJob(page, { name, folder }) {
  await page.evaluate(key => { window.LOOP = LOOPS[`yaya_${key}`]; }, name);
  const out = resolve(root, folder, `${name}.mp4`);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(fps), '-c:v', 'mjpeg', '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
  const len = 4, n = len * fps;
  for (let i = 0; i < n; i++) {
    const url = await page.evaluate(t => window.renderAt(t, 'image/jpeg', .9), i / fps);
    const buf = Buffer.from(url.slice(url.indexOf(',') + 1), 'base64');
    if (!ff.stdin.write(buf)) await new Promise(resolveDrain => ff.stdin.once('drain', resolveDrain));
  }
  ff.stdin.end();
  await new Promise((resolveClose, rejectClose) => { ff.once('error', rejectClose); ff.once('close', code => code ? rejectClose(new Error(`ffmpeg exited ${code}`)) : resolveClose()); });
  console.log(`wrote ${folder}/${name}.mp4`);
}

const workerCount = Math.min(4, jobs.length);
let cursor = 0;
await Promise.all(Array.from({ length: workerCount }, async () => {
  const page = await browser.newPage();
  page.on('pageerror', error => console.error('[page error]', error.message));
  await page.goto(pathToFileURL(resolve('studio-yaya-pet.html')).href + '?render', { waitUntil: 'networkidle0' });
  await page.waitForFunction('window.ready === true', { timeout: 60000 });
  while (cursor < jobs.length) {
    const job = jobs[cursor++];
    await renderJob(page, job);
  }
  await page.close();
}));
await browser.close();
