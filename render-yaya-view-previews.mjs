import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

// Render review images from the same offline lab the user opens.
const chrome=process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const out=resolve('outputs/yaya-pet/assets/rig');
mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--allow-file-access-from-files','--use-angle=d3d11']});
try {
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.setViewport({width:1200,height:1100});
  await page.goto(pathToFileURL(resolve('outputs/yaya-pet/rig-lab.html')).href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.yayaLab?.getState().ready);
  await page.evaluate(()=>window.yayaLab.pause());
  for(const [name,action,view,time] of [['three-views','idle','sheet',0],['stretch','stretch','front',1.6],['eat','eat','front',1.55],['run-right','run','travel',1.15],['run-back','run','travel',2.65],['run-left','run','travel',4.15],['run-quarter','run','travel',5.82]]) {
    await page.evaluate(async({action,view,time})=>{yayaLab.setAction(action);yayaLab.setView(view);await yayaLab.setTime(time);},{action,view,time});
    const jpg=await page.evaluate(()=>document.querySelector('#out').toDataURL('image/jpeg',.94));
    writeFileSync(resolve(out,name+'.jpg'),Buffer.from(jpg.split(',')[1],'base64'));
    if(name==='three-views') await page.screenshot({path:resolve(out,'lab-page.png'),fullPage:true});
  }
  if(errors.length) throw Error(errors.join('\n'));
  console.log('Saved shared-renderer three-view and action review images.');
}finally{await browser.close();}
