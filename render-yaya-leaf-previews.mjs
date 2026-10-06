import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const chrome=process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const out=resolve('outputs/yaya-pet/assets/leaves');mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:chrome,headless:true,args:['--allow-file-access-from-files','--use-angle=d3d11']});
try {
  const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(pathToFileURL(resolve('outputs/yaya-pet/rig-lab.html')).href,{waitUntil:'networkidle0'});
  await page.waitForFunction(()=>window.yayaLab?.getState().ready);
  await page.evaluate(()=>window.yayaLab.pause());
  const cases=[
    ['自然圆叶','idle','natural','breathe',.4,'front'],
    ['竖起倾听','curious','upright','still',.4,'front'],
    ['开心扑扇','happy','spread','flap',.35,'front'],
    ['害羞内扣','shy','cup','breathe',.4,'front'],
    ['软软垂落','sad','droop','breathe',.4,'front'],
    ['一上一下','curious','natural','alternate',.5,'front'],
    ['轻轻抖两下','playful','natural','twitch',.75,'front'],
    ['跑动向后摆','run','natural','wind',.4,'side']
  ];
  const jpg=await page.evaluate(async cases=>{
    window.LOOP=()=>{
      background('#F4FCF8');
      cases.forEach(([label,mood,leafShape,leafMotion,time,view],i)=>{
        const x=240+(i%4)*480,y=445+Math.floor(i/4)*540;
        const state={...getYayaEmotionState(mood,time),leafShape,leafMotion};
        YayaViews.draw(x,y,34,time,state,time,view);
      });
    };
    await redraw();composite(0);
    const sheet=document.createElement('canvas');sheet.width=1920;sheet.height=1080;
    const ctx=sheet.getContext('2d');ctx.drawImage(document.querySelector('#out'),0,0);
    ctx.fillStyle='#26475B';ctx.font='bold 28px "Microsoft YaHei",sans-serif';ctx.textAlign='center';
    cases.forEach(([label],i)=>ctx.fillText(label,240+(i%4)*480,510+Math.floor(i/4)*540));
    return sheet.toDataURL('image/jpeg',.94);
  },cases);
  writeFileSync(resolve(out,'leaf-expression-sheet.jpg'),Buffer.from(jpg.split(',')[1],'base64'));
  if(errors.length)throw Error(errors.join('\n'));
  console.log('Saved leaf expression contact sheet.');
}finally{await browser.close();}
