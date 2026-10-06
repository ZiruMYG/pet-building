import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const browser = await puppeteer.launch({ executablePath: chrome, headless: true, args: ['--allow-file-access-from-files'] });
const page = await browser.newPage();
const errors = [];
page.on('console', message => console.log('[page]', message.type(), message.text()));
page.on('pageerror', error => errors.push(error.message));
await page.goto(pathToFileURL(resolve('../../outputs/yaya-pet/index.html')).href, { waitUntil: 'domcontentloaded', timeout:60000 });
await page.waitForFunction(()=>window.yayaPet?.getState().ready,{timeout:60000});
const bootState = await page.evaluate(() => window.yayaPet?.getState?.() || null);
if (!bootState?.ready) throw new Error(`pet page did not become ready: ${JSON.stringify(bootState)}`);
const initial = await page.evaluate(() => ({ state: window.yayaPet.getState(), emotionCount: document.querySelectorAll('[data-emotion]').length, actionCount: document.querySelectorAll('[data-motion]').length }));
assert.equal(initial.emotionCount, 31);
assert.equal(initial.actionCount, 19);
await page.click('[data-jump-to="rig-lab"]');
const lab = await (await page.$('[data-testid="rig-lab-frame"]')).contentFrame();
await lab.waitForFunction(() => window.yayaLab?.getState().ready, { timeout: 60000 });
await page.click('[data-jump-to="action-panel"]');
await page.waitForFunction(() => { const r = document.querySelector('#action-panel')?.getBoundingClientRect(); return r && r.top < window.innerHeight && r.bottom > 0; }, { timeout: 5000 });
const actionEntry = await page.evaluate(() => ({ actionPanelFirst: document.querySelector('#action-panel')?.compareDocumentPosition(document.querySelector('#emotion-panel')) === Node.DOCUMENT_POSITION_FOLLOWING, jumpLabel: document.querySelector('.top-action-link')?.textContent.trim() }));
await page.click('[data-emotion="surprised"]');
await page.waitForFunction(() => document.querySelector('[data-testid="emotion-preview-video"]').currentTime > 0, { timeout: 10000 });
const selected = await page.evaluate(() => ({ title: document.querySelector('[data-testid="emotion-preview-title"]').textContent, image: document.querySelector('[data-testid="emotion-preview-image"]').getAttribute('src') }));
await page.click('[data-action-category="exercise"]');
// Motion buttons are grouped behind the exercise tab on the learning-device UI.
await page.click('[data-motion="walk"]');
await page.click('[data-direction="-1"]');
await page.waitForFunction(() => document.querySelector('[data-testid="action-preview-video"]').currentTime > 0, { timeout: 10000 });
const selectedAction = await page.evaluate(() => ({ title: document.querySelector('[data-testid="action-preview-title"]').textContent, image: document.querySelector('[data-testid="action-preview-image"]').getAttribute('src'), direction: document.querySelector('[data-direction="-1"]').getAttribute('aria-pressed') }));
await page.click('[data-action-category="all"]');
for(const [action,seconds] of [['sleep',8],['turn',4],['spin',6]]) {
  await page.click(`[data-motion="${action}"]`);
  await page.waitForFunction(({action,seconds})=>{
    const video=document.querySelector('[data-testid="action-preview-video"]');
    return video.currentSrc.includes(`/${action}.mp4`) && Math.abs(video.duration-seconds)<.02 && video.currentTime>0;
  },{timeout:10000},{action,seconds});
}
await page.click('[data-testid="action-feed"]');
await page.waitForFunction(() => window.yayaPet.getState().clip === 'eat', { timeout: 10000 });
await page.click('[data-testid="action-drink"]');
await page.waitForFunction(() => window.yayaPet.getState().clip === 'drink', { timeout: 10000 });
await page.click('[data-testid="action-exercise"]');
await page.waitForFunction(() => window.yayaPet.getState().clip === 'exercise', { timeout: 10000 });
const categories = await page.evaluate(() => [...document.querySelectorAll('.action-tab')].map(tab => ({ category: tab.dataset.actionCategory, selected: tab.getAttribute('aria-selected') })));
const afterAction = await page.evaluate(() => window.yayaPet.getState());
console.log(JSON.stringify({ initial, actionEntry, selected, selectedAction, categories, afterAction }));
await browser.close();
assert.deepEqual(errors, [], 'main page and embedded lab must not throw');
