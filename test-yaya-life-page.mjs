import assert from 'node:assert/strict';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

const chrome=process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const target=resolve(process.env.YAYA_LIFE_PAGE||'outputs/yaya-pet/index.html');
const output=resolve('out/life-page-review');
mkdirSync(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--allow-file-access-from-files','--ignore-gpu-blocklist','--use-angle=d3d11']});
const errors=[],consoleErrors=[];
const sleep=ms=>new Promise(done=>setTimeout(done,ms));
async function verifyReducedMotionAndVisibility() {
  const normal=await browser.newPage();
  normal.on('pageerror',error=>errors.push(error.message));
  normal.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await normal.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  await normal.goto(pathToFileURL(target).href,{waitUntil:'networkidle0'});
  await normal.waitForFunction(()=>window.yayaLife&&window.yayaPet?.getState().ready&&window.yayaPet.getState().playing,{timeout:60000});
  const reduced=await browser.newPage();
  reduced.on('pageerror',error=>errors.push(error.message));
  reduced.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await reduced.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
  await reduced.goto(pathToFileURL(target).href,{waitUntil:'networkidle0'});
  await reduced.waitForFunction(()=>window.yayaLife&&window.yayaPet?.getState().ready,{timeout:60000});
  const reducedState=await reduced.evaluate(()=>({pet:yayaPet.getState(),life:yayaLife.getState(),toggle:document.getElementById('life-toggle').getAttribute('aria-pressed')}));
  assert.equal(reducedState.pet.reducedMotion,true);
  assert.equal(reducedState.life.enabled,false,'reduced-motion preference starts with autonomous activity disabled');
  assert.equal(reducedState.toggle,'false');
  await reduced.bringToFront();
  const hidden=await normal.evaluate(()=>document.hidden);
  let background='unsupported by this browser';
  if(hidden) {
    const before=await normal.evaluate(()=>yayaLife.getState());
    await sleep(1200);
    const after=await normal.evaluate(()=>yayaLife.getState());
    assert.equal(after.clock,before.clock,'hidden tab freezes life clock');
    assert.deepEqual(after.needs,before.needs,'hidden tab freezes needs');
    assert.equal(after.remaining,before.remaining,'hidden tab freezes current step');
    await normal.bringToFront();
    await normal.waitForFunction(()=>!document.hidden&&yayaPet.getState().playing);
    const resumed=await normal.evaluate(()=>yayaLife.getState().clock);
    await sleep(450);
    const later=await normal.evaluate(()=>yayaLife.getState().clock);
    assert.ok(later>resumed,'visible tab resumes life clock');
    assert.ok(later-resumed<1,'visible tab must not replay hidden wall time');
    background='PASS hidden pause and visible resume';
  }
  await normal.close();
  await reduced.close();
  return {reducedMotionDefaultsOff:true,background};
}
try {
  const edgeCases=await verifyReducedMotionAndVisibility();
  if(process.env.YAYA_LIFE_EDGE_ONLY==='1') {
    assert.deepEqual(errors,[]);
    assert.deepEqual(consoleErrors,[]);
    console.log(JSON.stringify({result:'PASS',...edgeCases}));
  } else {
  const page=await browser.newPage();
  const clickNext=async()=>{await page.waitForFunction(()=>!document.getElementById('life-next').disabled);await page.click('#life-next');};
  await page.setViewport({width:1280,height:1100,deviceScaleFactor:1});
  await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')consoleErrors.push(message.text());});
  await page.goto(pathToFileURL(target).href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.yayaLife&&window.yayaPet?.getState().ready&&window.yayaPet.getState().playing,{timeout:60000});
  const initial=await page.evaluate(()=>({pet:yayaPet.getState(),life:yayaLife.getState()}));
  assert.equal(initial.pet.reducedMotion,false);
  assert.equal(initial.life.enabled,true,'visible non-reduced-motion page begins with autonomous activity enabled');
  await page.click('#life-toggle');
  await page.waitForFunction(()=>!yayaLife.getState().enabled&&!yayaPet.getState().switching);

  const expectedGroups=await page.evaluate(()=>YayaCatalog.emotionGroups.map(group=>({key:group.key,keys:group.keys})));
  assert.equal(expectedGroups.length,7);
  const visited=[];
  for(const group of expectedGroups) {
    await page.click(`[data-emotion-category="${group.key}"]`);
    const visible=await page.$$eval('[data-emotion]',elements=>elements.filter(el=>!el.hidden&&getComputedStyle(el).display!=='none').map(el=>el.dataset.emotion));
    assert.deepEqual(visible.sort(),group.keys.slice().sort(),`category ${group.key} must preserve each mapped choice`);
    visited.push(...visible);
  }
  assert.equal(visited.length,31);
  assert.equal(new Set(visited).size,31);
  await page.click('[data-emotion-category="all"]');
  assert.equal(await page.$$eval('[data-emotion]',elements=>elements.filter(el=>!el.hidden).length),31);
  await page.click('[data-emotion="scared"]');
  assert.equal(await page.$eval('[data-emotion="scared"]',el=>el.firstChild.textContent),'有点害怕');
  const implementedRows=await page.$$eval('#action-catalog [data-catalog-action]',rows=>rows.map(row=>({key:row.dataset.catalogAction,canPlay:Boolean(row.querySelector('button'))})));
  assert.equal(implementedRows.length,19);
  assert.ok(implementedRows.every(row=>row.canPlay));
  const planned=await page.$$eval('#action-catalog .catalog-gaps p',rows=>rows.map(row=>({text:row.textContent,hasButton:Boolean(row.querySelector('button'))})));
  assert.equal(planned.length,5);
  assert.ok(planned.every(row=>row.text.includes('待开发')&&!row.hasButton));
  await (await page.$('#emotion-panel')).screenshot({path:resolve(output,'emotions-desktop.png')});

  await page.click('#life-toggle');
  await page.waitForFunction(()=>yayaLife.getState().enabled&&!yayaPet.getState().switching&&yayaPet.getState().playing);
  await page.select('#life-routine','meal');
  await clickNext();
  await page.waitForFunction(()=>yayaLife.getState().plan==='meal'&&yayaPet.getState().clip==='emotion:hopeful'&&!yayaPet.getState().switching,{timeout:10000});
  const sequence=[],deadline=Date.now()+45000;
  let capturedMeal=false;
  while(Date.now()<deadline) {
    const sample=await page.evaluate(()=>({life:yayaLife.getState(),pet:yayaPet.getState()}));
    if(!sample.pet.switching&&sequence.at(-1)!==sample.pet.clip)sequence.push(sample.pet.clip);
    if(sample.pet.clip==='eat'&&!capturedMeal) {
      await (await page.$('#life-panel')).screenshot({path:resolve(output,'life-desktop.png')});
      capturedMeal=true;
    }
    if(sample.life.completed>=1&&sample.life.plan===null)break;
    await sleep(200);
  }
  assert.deepEqual(sequence.slice(0,4),['emotion:hopeful','eat','drink','emotion:relieved'],'meal must display its planned clips in order');
  const afterMeal=await page.evaluate(()=>yayaLife.getState());
  assert.ok(afterMeal.completed>=1,'the full meal completes');
  assert.ok(afterMeal.needs.hunger<initial.life.needs.hunger,'completed meal satisfies hunger');
  assert.ok(afterMeal.needs.thirst<initial.life.needs.thirst,'completed drink satisfies thirst');

  await page.waitForFunction(()=>!yayaPet.getState().switching&&yayaPet.getState().playing);
  await page.select('#life-routine','observe');
  await clickNext();
  await page.waitForFunction(()=>yayaLife.getState().plan==='observe'&&!yayaPet.getState().switching);
  await page.click('[data-testid="action-drink"]');
  await page.waitForFunction(()=>yayaPet.getState().clip==='drink'&&!yayaPet.getState().switching);
  const interrupted=await page.evaluate(()=>yayaLife.getState());
  assert.equal(interrupted.plan,null,'manual interaction cancels the current plan');
  assert.equal(interrupted.current,null,'manual interaction clears pending steps');
  assert.equal(interrupted.index,-1);
  assert.ok(interrupted.waiting>12,'manual interaction gets an idle grace period');

  await page.click('[data-testid="pause-toggle"]');
  await page.waitForFunction(()=>yayaPet.getState().paused);
  const frozen=await page.evaluate(()=>yayaLife.getState());
  await sleep(1300);
  const paused=await page.evaluate(()=>yayaLife.getState());
  assert.equal(paused.clock,frozen.clock,'pause freezes life clock');
  assert.deepEqual(paused.needs,frozen.needs,'pause freezes all needs');
  assert.equal(paused.waiting,frozen.waiting,'pause freezes restart grace period');
  assert.equal(await page.$eval('#life-next',el=>el.disabled),true);
  await page.click('[data-testid="pause-toggle"]');
  await page.waitForFunction(()=>!yayaPet.getState().paused&&yayaPet.getState().playing);

  await page.select('#life-routine','play');
  await clickNext();
  await page.waitForFunction(()=>yayaLife.getState().plan==='play'&&!yayaPet.getState().switching);
  await page.click('#life-toggle');
  await page.waitForFunction(()=>!yayaLife.getState().enabled&&yayaPet.getState().clip==='idle'&&!yayaPet.getState().switching);
  const disabled=await page.evaluate(()=>({life:yayaLife.getState(),pet:yayaPet.getState()}));
  await sleep(4500);
  const stillDisabled=await page.evaluate(()=>({life:yayaLife.getState(),pet:yayaPet.getState()}));
  assert.equal(stillDisabled.life.plan,null);
  assert.equal(stillDisabled.life.current,null);
  assert.equal(stillDisabled.pet.clip,'idle','disabled autonomous mode cannot switch to a new clip');
  assert.equal(stillDisabled.life.completed,disabled.life.completed);

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.click('[data-emotion-category="all"]');
  await sleep(150);
  const layout=await page.evaluate(()=>({viewport:innerWidth,width:document.documentElement.scrollWidth,body:document.body.scrollWidth,tableWidth:document.querySelector('.catalog-scroll table').scrollWidth,tableViewport:document.querySelector('.catalog-scroll').clientWidth}));
  assert.ok(layout.width<=layout.viewport+1,`mobile page overflows: ${JSON.stringify(layout)}`);
  assert.ok(layout.body<=layout.viewport+1,'body must fit 390px viewport');
  assert.ok(layout.tableWidth>layout.tableViewport,'wide action table scrolls within its own container');
  await (await page.$('#life-panel')).screenshot({path:resolve(output,'life-mobile.png')});
  await (await page.$('#emotion-panel')).screenshot({path:resolve(output,'emotions-mobile.png')});
  await (await page.$('#action-catalog')).screenshot({path:resolve(output,'actions-mobile.png')});
  assert.deepEqual(errors,[],'page and embedded lab must not throw');
  assert.deepEqual(consoleErrors,[],'browser console must not report errors');
  console.log(JSON.stringify({result:'PASS',groups:expectedGroups.length,states:visited.length,actions:implementedRows.length,planned:planned.length,sequence,manualPreemption:true,pauseFreezesNeeds:true,autonomyOffStable:true,mobile:layout,screenshots:output,...edgeCases}));
  }
} finally {
  await browser.close();
}
