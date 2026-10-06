import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const chrome=process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const target=resolve(process.env.YAYA_LAB_PAGE || 'outputs/yaya-pet/rig-lab.html');
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--allow-file-access-from-files','--ignore-gpu-blocklist','--use-angle=d3d11']});
const errors=[],failed=[];
try {
  const page=await browser.newPage();
  await page.setViewport({width:1200,height:1100,deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));
  page.on('requestfailed',request=>failed.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(pathToFileURL(target).href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.yayaLab?.getState().ready,{timeout:60000});
  await page.evaluate(()=>window.yayaLab.pause());
  const snapshot=()=>page.evaluate(()=>({state:window.yayaLab.getState(),image:document.querySelector('#out').toDataURL()}));
  const initial=await snapshot();
  assert.equal(initial.state.view,'sheet');
  assert.equal(await page.$$eval('[data-lab-action]',buttons=>buttons.length),5);
  assert.equal(await page.$$eval('[data-lab-view]',buttons=>buttons.length),5);
  const changed=async previous=>page.waitForFunction(image=>document.querySelector('#out').toDataURL()!==image,{timeout:10000},previous);

  for(const action of ['eat','drink','stretch']) {
    const before=await snapshot();
    await page.click(`[data-lab-action="${action}"]`);
    await page.evaluate(()=>window.yayaLab.setTime(1.5));
    await changed(before.image);
    const current=await snapshot();
    assert.equal(current.state.action,action);
    assert.equal(current.state.playing,false);
    assert.equal(await page.$eval(`[data-lab-action="${action}"]`,button=>button.getAttribute('aria-pressed')),'true');
    assert.ok(current.image.length>20000,'canvas contains rendered character artwork');
  }
  const viewImages=new Set();
  for(const view of ['front','side','back']) {
    const before=await snapshot();
    await page.click(`[data-lab-view="${view}"]`);
    await changed(before.image);
    const current=await snapshot();
    assert.equal(current.state.view,view);
    viewImages.add(current.image);
  }
  assert.equal(viewImages.size,3,'front, side and back produce different drawings');

  await page.click('[data-lab-action="run"]');
  await page.waitForFunction(()=>window.yayaLab.getState().view==='travel');
  assert.equal((await snapshot()).state.duration,8,'return trip has its full eight-second timeline');
  assert.equal(await page.$eval('#scrub',input=>Number(input.max)),8);
  const positions=[];
  for(const t of [1.5,3.5,5.5,7.5]) {
    const before=await snapshot();
    await page.evaluate(time=>window.yayaLab.setTime(time),t);
    await changed(before.image);
    positions.push((await snapshot()).image);
  }
  assert.equal(new Set(positions).size,4,'running and both turnarounds draw distinct poses');
  await page.click('#show-rig');
  assert.equal((await snapshot()).state.debug,true);
  assert.equal(await page.$eval('#rig-legend',el=>el.hidden),false);

  await page.click('#play-toggle');
  const playStart=(await snapshot()).state.time;
  await page.waitForFunction(start=>window.yayaLab.getState().time!==start,{timeout:5000},playStart);
  await page.click('#play-toggle');
  assert.equal((await snapshot()).state.playing,false);
  await page.click('#restart');
  assert.equal((await snapshot()).state.time,0);

  // A reviewable screenshot preserves the fixed shoulders and raised wrists.
  await page.click('[data-lab-action="stretch"]');
  await page.click('[data-lab-view="sheet"]');
  const beforeSheet=await snapshot();
  await page.evaluate(()=>window.yayaLab.setTime(2));
  await changed(beforeSheet.image);
  mkdirSync(resolve('out'),{recursive:true});
  await page.screenshot({path:resolve('out/rig-lab-qa.png'),fullPage:true});

  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:window.innerWidth}));
  assert.ok(mobile.scroll<=mobile.width+1,'mobile layout has no horizontal overflow');
  assert.deepEqual(errors,[],'no script errors');
  assert.deepEqual(failed,[],'all offline dependencies load');
  console.log(JSON.stringify({ok:true,target,actions:5,views:5,screenshot:resolve('out/rig-lab-qa.png'),mobileWidth:mobile.width}));
} finally {
  await browser.close();
}
