import puppeteer from 'puppeteer-core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const out = resolve(process.env.YAYA_ACTION_OUT || '../../outputs/yaya-pet/assets/actions');
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: chrome, headless: true, protocolTimeout: 0,
  args: ['--allow-file-access-from-files', '--ignore-gpu-blocklist', '--use-angle=d3d11', '--enable-gpu-rasterization', '--window-size=1920,1080']
});
const page = await browser.newPage();
page.on('pageerror', error => console.error('[page error]', error.message));
await page.goto(pathToFileURL(resolve('studio-yaya-pet.html')).href + '?render', { waitUntil: 'networkidle0' });
await page.waitForFunction('window.ready === true', { timeout: 60000 });
const states = await page.evaluate(() => window.YAYA_MOTION_ACTIONS || []);
for (const state of states) {
  await page.evaluate(name => { window.LOOP = LOOPS[`yaya_${name}`]; }, state);
  const url = await page.evaluate(() => window.renderAt(1.55, 'image/jpeg', .9));
  writeFileSync(resolve(out, `${state}.jpg`), Buffer.from(url.slice(url.indexOf(',') + 1), 'base64'));
  console.log(`wrote ${state}.jpg`);
}
await browser.close();
