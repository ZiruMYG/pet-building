import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const root=process.cwd(),out=path.join(root,'outputs/yaya-pet'),uiOnly=process.argv.includes('--ui-only');
const context=vm.createContext({});
vm.runInContext(await fs.readFile(path.join(root,'src/yaya-catalog.js'),'utf8'),context);
const catalog=context.YayaCatalog;
for(const e of catalog.emotions){await fs.access(path.join(out,`assets/emotions/${e.key}.mp4`));await fs.access(path.join(out,`assets/emotions/${e.key}.jpg`));}
for(const a of catalog.actions.filter(a=>a.inMenu&&a.implemented)){await fs.access(path.join(out,['eat','sleep'].includes(a.key)?`assets/${a.key}.mp4`:`assets/actions/${a.key}.mp4`));await fs.access(path.join(out,`assets/actions/${a.key}.jpg`));}

const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,args:['--disable-gpu','--autoplay-policy=no-user-gesture-required']});
try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.setViewport({width:1440,height:960,deviceScaleFactor:1});
  await page.goto(pathToFileURL(path.join(out,'index.html')).href,{waitUntil:'load'});
  await page.waitForFunction(()=>!!window.yayaWorkbench);
  if(!uiOnly)await page.waitForFunction(()=>yayaWorkbench.getState().ready,{timeout:60000});
  const initial=await page.evaluate(()=>({scroll:document.documentElement.scrollHeight,height:innerHeight,emotions:document.querySelectorAll('[data-emotion]').length,actions:document.querySelectorAll('[data-action]').length,rooms:document.querySelectorAll('[data-room]').length,videos:document.querySelectorAll('video').length,panels:Array.from(document.querySelectorAll('[role=tabpanel]')).filter(e=>!e.hidden).map(e=>e.id)}));
  assert(initial.scroll<=initial.height+2,'desktop must not be a long stacked page');assert.equal(initial.emotions,31);assert.equal(initial.actions,19);assert.equal(initial.rooms,6);assert.equal(initial.videos,1);assert.deepEqual(initial.panels,['panel-life']);
  await page.click('#tab-emotion');await page.click('[data-emotion="laugh"]');
  await page.waitForFunction(()=>document.getElementById('preview-video').readyState>=2);
  assert.equal(await page.$eval('#preview-title',e=>e.textContent),'咯咯笑');
  await page.click('#emotion-filters [data-filter="cognitive"]');
  assert.equal(await page.$$eval('#emotion-grid button',buttons=>buttons.filter(b=>!b.hidden).length),6);
  await page.click('#tab-action');await page.click('[data-action="eat"]');
  await page.waitForFunction(()=>document.getElementById('preview-video').readyState>=2);
  assert.match(await page.$eval('#preview-video',e=>e.src),/assets\/eat\.mp4/);
  await page.click('#tab-life');assert.equal(await page.$eval('#preview-video',e=>e.paused),true);
  await page.click('#open-floorplan');assert.equal(await page.$$eval('[data-plan-room]',a=>a.length),6);assert.equal(await page.$eval('#floorplan-dialog',e=>e.open),true);
  await page.click('#floorplan-dialog [data-close-dialog]');
  await page.click('#open-inventory');assert.equal(await page.$eval('#inventory-dialog',e=>e.open),true);await page.click('[data-inventory-tab="emotion"]');assert.equal(await page.$$eval('.inventory-table tbody tr',a=>a.length),31);await page.click('#inventory-dialog [data-close-dialog]');
  await page.focus('#tab-life');await page.keyboard.press('ArrowRight');assert.equal(await page.$eval('#tab-emotion',e=>e.getAttribute('aria-selected')),'true');
  await page.click('#tab-shape');await page.click('[data-inspector="views"]');assert.equal(await page.$eval('#inspector-dialog',e=>e.open),true);await page.click('#inspector-dialog [data-close-dialog]');assert.equal(await page.$eval('#inspector-frame',e=>e.src),'about:blank');
  await page.click('#tab-life');
  await fs.mkdir(path.join(out,'assets/home'),{recursive:true});
  await page.screenshot({path:path.join(out,'assets/home/workbench-desktop.png')});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(mobile.scroll<=mobile.width,'mobile must not overflow horizontally');
  await page.screenshot({path:path.join(out,'assets/home/workbench-mobile.png'),fullPage:true});
  if(!uiOnly)assert.equal(await page.evaluate(()=>yayaWorkbench.getState().lastHome?.error||null),null,'live room must not report a navigation or interaction error');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,desktop:initial,mobile,homeReady:await page.evaluate(()=>yayaWorkbench.getState().ready),uiOnly,errors},null,2));
}finally{await browser.close();}
