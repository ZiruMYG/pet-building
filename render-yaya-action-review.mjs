import puppeteer from 'puppeteer-core';
import {mkdirSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const out=resolve('outputs/yaya-pet/assets/actions/review');
mkdirSync(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--use-angle=d3d11']});
try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(pathToFileURL(resolve('studio-yaya-pet.html')).href+'?render',{waitUntil:'networkidle0'});
  await page.waitForFunction('window.ready === true');
  const overview=[['sleep','放松地躺着睡觉',1.5],['stretch','伸懒腰 · 大哈欠',1.7],['hug','侧身抱泰迪熊',1.6],['walk','走一走',1.3],['run','快跑 · 速度线',1.05],['wave','伸出胳膊挥手',1.2],['reach','伸手够一够',1.6],['celebrate','庆祝 · 跳到最高点',1.78],['nod','点头 · 脸部下压',.85],['spin','踏步转圈 · 换脚',2.45],['turn','看向一边 · 迈脚转身',.65],['eat','吃饭 · 手与勺子相连',1.55]];
  async function sheet(name,entries,cols=3) {
    const frames=[];
    for(const [key,label,time] of entries) {
      const url=await page.evaluate(async({key,time})=>{window.LOOP=LOOPS['yaya_'+key];return await window.renderAt(time,'image/jpeg',.94);},{key,time});
      frames.push({url,label});
    }
    const url=await page.evaluate(async({frames,cols})=>{
      const tileW=640,tileH=402,c=document.createElement('canvas');c.width=cols*tileW;c.height=Math.ceil(frames.length/cols)*tileH;
      const ctx=c.getContext('2d');ctx.fillStyle='#FFFFFF';ctx.fillRect(0,0,c.width,c.height);
      for(let i=0;i<frames.length;i++) {
        const im=new Image();im.src=frames[i].url;await im.decode();
        const x=i%cols*tileW,y=Math.floor(i/cols)*tileH;ctx.drawImage(im,x,y,tileW,360);
        ctx.fillStyle='#26384B';ctx.font='20px Microsoft YaHei';ctx.fillText(frames[i].label,x+18,y+386);
      }
      return c.toDataURL('image/jpeg',.94);
    },{frames,cols});
    writeFileSync(resolve(out,name+'.jpg'),Buffer.from(url.split(',')[1],'base64'));
  }
  await sheet('action-overview',overview);
  await sheet('spin-sequence',[.22,.8,1.6,2.4,3.2,4,4.8,5.6].map((time,i)=>['spin',['先看一看','迈出第一步','换脚跟上','转过背面','支撑换步','转回前面','最后一步','站稳'][i],time]),4);
  await sheet('turn-sequence',[.18,.66,1.27,1.9,2.25,2.79,3.39,3.8].map((time,i)=>['turn',['先看向目标','一只脚迈出','身体跟上','侧身站稳','回头看一眼','再迈一步','另一只脚收回','站好'][i],time]),4);
  await sheet('celebrate-sequence',[.75,1.1,1.78,2.65].map((time,i)=>['celebrate',['预备下蹲','起跳','最高点欢呼','落地缓冲'][i],time]),4);
  await sheet('nod-sequence',[0,.85,1.45,2.22].map((time,i)=>['nod',['抬头','低头','回正','再点一下'][i],time]),4);
  if(errors.length)throw Error(errors.join('\n'));
  console.log(`Saved action review sheets: ${out}`);
} finally {await browser.close();}
