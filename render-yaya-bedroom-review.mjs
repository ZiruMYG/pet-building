import fs from 'node:fs/promises';
import vm from 'node:vm';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import puppeteer from 'puppeteer-core';

// Capture the real interactive renderer at meaningful contact/transition phases.
const context=vm.createContext({console,Math});context.window=context;
for(const name of ['yaya-rig','yaya-body','yaya-bedroom-art','yaya-bedroom-model'])vm.runInContext(await fs.readFile(`src/${name}.js`,'utf8'),context);
const wanted={read:['reach','pick','open-book','read','turn-page','place'],teddy:['reach','hug'],lamp:['lamp-touch'],sleep:['bed-touch','climb','bed-sit','lie-down','cover','sleep','uncover','sit-up','climb-down'],wander:['walk','look']};
const snapshots=[{key:'idle',time:0,phase:'idle'}];
for(const [key,phases] of Object.entries(wanted)){
 const model=context.YayaBedroomModel.create({auto:false});model.request(key);
 const ranges=new Map();
 for(let i=0;i<9000;i++){
  const s=model.getState();
  if(phases.includes(s.phase)){
   const range=ranges.get(s.phase);
   if(!range)ranges.set(s.phase,{start:s.time,end:s.time});
   else if(s.time-range.end<.1)range.end=s.time;
  }
  if(!s.action)break;model.step(1/60);
 }
 for(const [phase,r]of ranges)snapshots.push({key,phase,time:(r.start+r.end)/2});
}
await fs.mkdir('out/bedroom-review',{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--ignore-gpu-blocklist','--use-angle=d3d11']});
try{
 const page=await browser.newPage();await page.setViewport({width:1280,height:1200,deviceScaleFactor:1});
 page.on('pageerror',e=>console.error(e.message));
 await page.goto(pathToFileURL(resolve('outputs/yaya-pet/bedroom.html')).href,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.yayaBedroom?.getState().ready);
 await page.evaluate(async()=>{await yayaBedroom.pause();await yayaBedroom.setAuto(false);});
 for(const snap of snapshots){
  const data=await page.evaluate(async snap=>{await yayaBedroom.restart();if(snap.key!=='idle')yayaBedroom.request(snap.key);await yayaBedroom.advance(snap.time);return {image:document.querySelector('#out').toDataURL('image/png'),state:yayaBedroom.getState()};},snap);
  const name=`${snap.key}-${snap.phase}`;
  await fs.writeFile(`out/bedroom-review/${name}.png`,Buffer.from(data.image.split(',')[1],'base64'));
  snap.actualPhase=data.state.phase;
 }
 await page.evaluate(async()=>{await yayaBedroom.restart();await yayaBedroom.pause();});
 await page.screenshot({path:'out/bedroom-review/page.png',fullPage:true});
 await fs.writeFile('out/bedroom-review/times.json',JSON.stringify(snapshots,null,2));
 const sheet=await browser.newPage();
 await sheet.setViewport({width:1920,height:300,deviceScaleFactor:1});
 await sheet.setContent('<html><body style="margin:0;background:#f4f6f1;font:20px sans-serif;display:grid;grid-template-columns:repeat(3,1fr);gap:8px"></body></html>');
 await sheet.evaluate(async snapshots=>{
  for(const snap of snapshots){const figure=document.createElement('figure');figure.style='margin:0;background:white;padding:8px';const image=new Image();image.src=snap.uri;image.style='width:100%;display:block';const caption=document.createElement('figcaption');caption.textContent=`${snap.key} / ${snap.phase} · ${snap.time.toFixed(1)} s`;figure.append(image,caption);document.body.append(figure);await image.decode();}
 },await Promise.all(snapshots.map(async snap=>({...snap,uri:'data:image/png;base64,'+(await fs.readFile(`out/bedroom-review/${snap.key}-${snap.phase}.png`)).toString('base64')}))));
 await sheet.screenshot({path:'out/bedroom-review/sheet.jpg',fullPage:true});
 await sheet.close();
 await page.bringToFront();
 await page.goto(pathToFileURL(resolve('outputs/yaya-pet/index.html')).href+'#life-panel',{waitUntil:'domcontentloaded'});
 const roomFrame=await(await page.$('[data-testid="bedroom-frame"]')).contentFrame();
 await roomFrame.waitForFunction(()=>window.yayaBedroom?.getState().ready);
 await roomFrame.evaluate(async()=>{await yayaBedroom.pause();await yayaBedroom.restart();});
 await(await page.$('#life-panel')).screenshot({path:'out/bedroom-review/main-panel.png'});
 console.log(JSON.stringify({frames:snapshots.length,output:'out/bedroom-review/sheet.jpg'}));
}finally{await browser.close();}
