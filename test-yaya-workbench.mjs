import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import vm from 'node:vm';
import puppeteer from 'puppeteer-core';

const root=process.cwd(),out=process.env.YAYA_OUTPUT_DIR?path.resolve(process.env.YAYA_OUTPUT_DIR):path.join(root,'outputs/yaya-pet'),uiOnly=process.argv.includes('--ui-only');
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
  const home=page.frames().find(f=>f.url().includes('/home.html'));
  if(!uiOnly){await home.evaluate(async()=>{await yayaHome.setAuto(false);await yayaHome.pause();});}
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
  const objectEntries=await page.evaluate(()=>({actual:[...document.querySelectorAll('[data-object-command]')].map(b=>b.dataset.objectCommand),expected:YayaHomeInteractions.list('bedroom').map(o=>o.command)}));
  assert.deepEqual(objectEntries.actual,objectEntries.expected,'every room object has a named control');
  const objectChecks=[];
  if(!uiOnly){
    for(const room of ['bedroom','ensuite','living','kitchen','guestroom','bathroom']){
      if(room!=='bedroom')await home.evaluate(async room=>{yayaHome.setRoom(room);await yayaHome.advance(180);},room);
      await page.waitForFunction(room=>yayaWorkbench.getState().room===room,{},room);
      const controls=await page.evaluate(()=>({actual:[...document.querySelectorAll('[data-object-command]')].map(b=>b.dataset.objectCommand),expected:YayaHomeInteractions.list(yayaWorkbench.getState().room).map(o=>o.command)}));
      assert.deepEqual(controls.actual,controls.expected,`${room}: every furnishing and item has an entry`);
      const check=await home.evaluate(()=>{const s=yayaHome.getState(),regions=yayaHome.hotspots(),box=document.getElementById('out').getBoundingClientRect(),scale=Math.max(box.width/1920,box.height/1080),bounds={left:(1920-box.width/scale)/2,right:(1920+box.width/scale)/2,top:(1080-box.height/scale)/2,bottom:(1080+box.height/scale)/2};
        const inside=(x,y,poly)=>{let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++){const a=poly[i],b=poly[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;};
        const hidden=[];for(const region of regions){let found=false;const p=region.polygon;for(let y=Math.max(bounds.top,Math.min(...p.map(p=>p.y)))+1;y<=Math.min(bounds.bottom,Math.max(...p.map(p=>p.y)))&&!found;y+=3)for(let x=Math.max(bounds.left,Math.min(...p.map(p=>p.x)))+1;x<=Math.min(bounds.right,Math.max(...p.map(p=>p.x)));x+=3)if(regions.find(r=>inside(x,y,r.polygon))?.id===region.id){found=true;break;}if(!found)hidden.push(region.id);}
        return {room:s.room,error:s.error,regions:regions.length,entries:YayaHomeInteractions.list(s.room).length,doors:YayaHomeLayout.rooms[s.room].doors.length,hidden};});
      assert.equal(check.error,null);assert.equal(check.regions,check.entries+check.doors);assert.deepEqual(check.hidden,[],`${room}: every visible object and door must have an exposed hit area`);objectChecks.push(check);
      const before=await home.evaluate(()=>yayaHome.getState().time);await new Promise(resolve=>setTimeout(resolve,80));const after=await home.evaluate(()=>yayaHome.getState().time);assert.equal(after,before,'advance leaves the live room paused');
    }
    await home.evaluate(async()=>{yayaHome.setRoom('bedroom');await yayaHome.advance(180);});
    await page.waitForFunction(()=>yayaWorkbench.getState().room==='bedroom');
    const sample=await home.evaluate(()=>{const region=yayaHome.hotspots().find(item=>item.targetId==='bedside-lamp');for(let y=Math.min(...region.polygon.map(p=>p.y));y<Math.max(...region.polygon.map(p=>p.y));y+=3)for(let x=Math.min(...region.polygon.map(p=>p.x));x<Math.max(...region.polygon.map(p=>p.x));x+=3)if(yayaHome.hitTest(x,y)?.id===region.id){const box=document.getElementById('out').getBoundingClientRect(),scale=Math.max(box.width/1920,box.height/1080);return {id:region.id,command:region.command,x:box.left+(box.width-1920*scale)/2+x*scale,y:box.top+(box.height-1080*scale)/2+y*scale};}return null;});
    assert(sample,'bedside lamp must not be swallowed by the bed or cabinet hit area');
    const frameBox=await page.$eval('#home-frame',e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y};});
    await page.mouse.move(frameBox.x+sample.x,frameBox.y+sample.y);
    assert.equal(await home.$eval('#object-tooltip',e=>e.hidden),false);
    await page.mouse.click(frameBox.x+sample.x,frameBox.y+sample.y);
    const clickState=await home.evaluate(()=>yayaHome.getState());assert.equal(clickState.pending||clickState.action,sample.command,'visible lamp click must address the lamp');
    const duplicate=await home.evaluate(command=>yayaHome.request(command),sample.command);assert.equal(duplicate,false,'repeated command must not restart or queue itself');
    await home.evaluate(async()=>{await yayaHome.advance(120);await yayaHome.pause();});
    const empty=await home.evaluate(()=>{const r=YayaHomeLayout.rooms[yayaHome.getState().room],box=document.getElementById('out').getBoundingClientRect(),scale=Math.max(box.width/1920,box.height/1080);for(const [x,z]of [[8,3.5],[8.5,5.5],[4.8,6.6]]){const p=YayaHomeArt.project(x,z,0,r);if(!YayaHomeModel.blocked(r,x,z)&&!yayaHome.hitTest(p.x,p.y))return {target:{x,z},x:box.left+(box.width-1920*scale)/2+p.x*scale,y:box.top+(box.height-1080*scale)/2+p.y*scale};}return null;});
    assert(empty,'room must have clickable open floor');await page.mouse.click(frameBox.x+empty.x,frameBox.y+empty.y);assert.match(await home.evaluate(()=>yayaHome.getState().action),/^goto:/,'floor click must request world-space walking');
    const arrived=await home.evaluate(async()=>yayaHome.advance(30));assert.equal(arrived.error,null);assert(Math.hypot(arrived.p.x-empty.target.x,arrived.p.z-empty.target.z)<.02,'pet arrives at the actual selected floor point');
    await page.click('#play-pause');await page.waitForFunction(()=>yayaWorkbench.getState().playing);await page.click('#play-pause');await page.waitForFunction(()=>!yayaWorkbench.getState().playing);
  }
  await fs.mkdir(path.join(out,'assets/home'),{recursive:true});
  await page.screenshot({path:path.join(out,'assets/home/workbench-desktop.png')});
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  const mobile=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));assert(mobile.scroll<=mobile.width,'mobile must not overflow horizontally');
  await page.screenshot({path:path.join(out,'assets/home/workbench-mobile.png'),fullPage:true});
  if(!uiOnly)assert.equal(await page.evaluate(()=>yayaWorkbench.getState().lastHome?.error||null),null,'live room must not report a navigation or interaction error');
  assert.deepEqual(errors,[]);
  console.log(JSON.stringify({pass:true,desktop:initial,mobile,objectChecks,homeReady:await page.evaluate(()=>yayaWorkbench.getState().ready),uiOnly,errors},null,2));
}finally{await browser.close();}
