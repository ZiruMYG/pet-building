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
  assert.equal(initial.state.view,'auto');
  assert.equal(await page.$$eval('[data-lab-action]',buttons=>buttons.length),14);
  assert.equal(await page.$$eval('[data-lab-view]',buttons=>buttons.length),6);
  assert.equal(initial.state.leafShape,'auto');
  assert.equal(initial.state.leafMotion,'auto');
  assert.equal(await page.$$eval('[data-leaf-shape]',buttons=>buttons.length),6);
  assert.equal(await page.$$eval('[data-leaf-motion]',buttons=>buttons.length),8);
  const changed=async previous=>page.waitForFunction(image=>document.querySelector('#out').toDataURL()!==image,{timeout:10000},previous);

  await page.evaluate(()=>{
    const perform=window.YayaViews.perform;
    window.labActionRenders=[];
    window.YayaViews.perform=function(...args){window.labActionRenders.push({action:window.yayaLab.getState().action,age:args[5]});return perform.apply(this,args);};
  });
  const actions=['eat','drink','sleep','stretch','walk','run','spin','celebrate','wave','hug','reach','turn','nod'];
  const actionImages=new Map();
  for(const action of actions) {
    const before=await snapshot();
    await page.evaluate(()=>window.yayaLab.setView('front'));
    await page.click(`[data-lab-action="${action}"]`);
    await page.evaluate(()=>window.yayaLab.setTime(1.5));
    await changed(before.image);
    const current=await snapshot();
    assert.equal(current.state.action,action);
    assert.equal(current.state.view,'auto','choosing an action restores its complete demonstration');
    assert.equal(current.state.playing,false);
    assert.equal(await page.$eval(`[data-lab-action="${action}"]`,button=>button.getAttribute('aria-pressed')),'true');
    assert.ok(current.image.length>20000,'canvas contains rendered character artwork');
    actionImages.set(action,current.image);
    const expectedDuration=['run','spin'].includes(action)?6:['walk','sleep'].includes(action)?8:4;
    assert.equal(current.state.duration,expectedDuration,`${action} has its full timeline`);
    assert.equal(await page.$eval('#scrub',input=>Number(input.max)),expectedDuration);
  }
  assert.equal(new Set(actionImages.values()).size,actions.length,'all requested actions draw distinct demonstrations');
  const automaticActions=await page.evaluate(()=>[...new Set(window.labActionRenders.map(frame=>frame.action))]);
  for(const action of actions)assert.ok(automaticActions.includes(action),`${action} renders through the action choreography`);
  const viewImages=new Set();
  for(const view of ['front','side','back']) {
    await page.click(`[data-lab-view="${view}"]`);
    await page.evaluate(()=>window.yayaLab.setTime(1.5));
    const current=await snapshot();
    assert.equal(current.state.view,view);
    viewImages.add(current.image);
  }
  assert.equal(viewImages.size,3,'front, side and back produce different drawings');

  await page.click('[data-lab-action="run"]');
  await page.waitForFunction(()=>window.yayaLab.getState().view==='auto');
  assert.equal((await snapshot()).state.duration,6,'running completes the trip faster than walking');
  assert.equal(await page.$eval('#scrub',input=>Number(input.max)),6);
  const positions=[];
  for(const t of [1.1,2.7,4.1,5.7]) {
    const before=await snapshot();
    await page.evaluate(time=>window.yayaLab.setTime(time),t);
    await changed(before.image);
    positions.push((await snapshot()).image);
  }
  assert.equal(new Set(positions).size,4,'running and both turnarounds draw distinct poses');
  await page.click('[data-lab-action="walk"]');
  await page.click('[data-lab-view="travel"]');
  assert.equal((await snapshot()).state.action,'walk','manual travel retains the walking gait');
  assert.equal((await snapshot()).state.duration,8);
  await page.click('[data-lab-action="eat"]');
  await page.click('[data-lab-view="travel"]');
  assert.equal((await snapshot()).state.action,'run','travel selects running when the current action cannot travel');
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

  // A paused, fixed body pose isolates leaf changes from ordinary body animation.
  await page.evaluate(async()=>{
    window.yayaLab.setAction('idle');
    window.yayaLab.setView('front');
    await window.yayaLab.setTime(.63);
    await window.yayaLab.setLeafShape('natural');
    await window.yayaLab.setLeafMotion('still');
  });
  const natural=await snapshot();
  const shapeImages=new Set([natural.image]);
  for(const shape of ['upright','spread','droop','cup']) {
    const before=await snapshot();
    await page.click(`[data-leaf-shape="${shape}"]`);
    await changed(before.image);
    const current=await snapshot();
    assert.equal(current.state.leafShape,shape);
    assert.equal(current.state.playing,false);
    assert.equal(current.state.time,.63,'shape changes do not reset the paused timeline');
    assert.equal(await page.$eval(`[data-leaf-shape="${shape}"]`,button=>button.getAttribute('aria-pressed')),'true');
    shapeImages.add(current.image);
  }
  assert.equal(shapeImages.size,5,'five manual leaf shapes produce distinct paused drawings');
  await page.evaluate(()=>window.yayaLab.setLeafShape('natural'));
  const still=await snapshot();
  await page.click('[data-leaf-motion="alternate"]');
  await changed(still.image);
  assert.equal((await snapshot()).state.leafMotion,'alternate');
  for(const motion of ['breathe','sway','flap','twitch','wind','still','auto']) {
    await page.click(`[data-leaf-motion="${motion}"]`);
    const current=await snapshot();
    assert.equal(current.state.leafMotion,motion);
    assert.equal(current.state.playing,false);
    assert.equal(current.state.time,.63,'motion changes preserve the paused timeline');
    assert.equal(await page.$eval(`[data-leaf-motion="${motion}"]`,button=>button.getAttribute('aria-pressed')),'true');
  }
  await page.evaluate(async()=>{
    await window.yayaLab.setLeafShape('spread');
    await window.yayaLab.setLeafMotion('flap');
    await window.yayaLab.setTime(1.31);
  });
  assert.equal((await snapshot()).state.leafShape,'spread','scrubbing retains the chosen leaf shape');
  assert.equal((await snapshot()).state.leafMotion,'flap','scrubbing retains the chosen leaf motion');
  await page.click('#reset-leaves');
  assert.equal((await snapshot()).state.leafShape,'auto');
  assert.equal((await snapshot()).state.leafMotion,'auto');

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
  const mobileButtons=await page.$$eval('[data-lab-action]',buttons=>buttons.map(button=>({key:button.dataset.labAction,width:button.getBoundingClientRect().width,height:button.getBoundingClientRect().height,left:button.getBoundingClientRect().left,right:button.getBoundingClientRect().right})));
  assert.equal(mobileButtons.length,14);
  for(const button of mobileButtons)assert.ok(button.width>40&&button.height>=44&&button.left>=0&&button.right<=mobile.width,`${button.key} has a visible, comfortably sized mobile button`);
  for(const action of ['sleep','run','hug','nod']){
    await page.click(`[data-lab-action="${action}"]`);
    assert.equal((await snapshot()).state.action,action,`${action} is reachable on mobile`);
  }
  await page.click('.leaf-jump');
  await page.click('[data-leaf-shape="droop"]');
  await page.click('[data-leaf-motion="sway"]');
  assert.equal((await snapshot()).state.leafShape,'droop','mobile shape controls are reachable');
  assert.equal((await snapshot()).state.leafMotion,'sway','mobile motion controls are reachable');
  await page.evaluate(()=>window.yayaLab.setTime(.63));
  await page.screenshot({path:resolve('out/rig-lab-leaves-mobile-qa.png'),fullPage:true});
  assert.deepEqual(errors,[],'no script errors');
  assert.deepEqual(failed,[],'all offline dependencies load');
  console.log(JSON.stringify({ok:true,target,actions:14,views:6,leafShapes:6,leafMotions:8,screenshot:resolve('out/rig-lab-qa.png'),mobileScreenshot:resolve('out/rig-lab-leaves-mobile-qa.png'),mobileWidth:mobile.width}));
} finally {
  await browser.close();
}
