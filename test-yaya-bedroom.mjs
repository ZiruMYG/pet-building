import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console});
context.window=context;
for(const file of ['src/yaya-rig.js','src/yaya-body.js','src/yaya-bedroom-art.js','src/yaya-bedroom-model.js'])vm.runInContext(readFileSync(file,'utf8'),context,{filename:file});
const M=context.YayaBedroomModel,R=context.YayaRig;
const near=(a,b,label,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${label}: ${a} != ${b}`);
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let samples=0,transfers=0;

function validate(s,previous) {
 samples++;
 assert.ok([s.time,s.position.x,s.position.y,s.yaw,s.rotation,s.cover,s.gait].every(Number.isFinite),'finite room pose');
 assert.ok(s.position.x>0&&s.position.x<1920&&s.position.y>0&&s.position.y<1080,'pet stays in room');
 assert.ok(s.cover>=0&&s.cover<=1,'quilt has a bounded unfolding phase');
 const handItems=Object.entries(s.props).filter(([,item])=>item.mode==='hand');
 assert.equal(handItems.length,s.carrying?1:0,'there is exactly one owner for a held room object');
 if(s.carrying)assert.equal(handItems[0][0],s.carrying,'held item matches the actual carrying state');
 if(s.handTargets)assert.equal(s.grips.length,2,'a room gesture uses the existing two palms');
 for(const arm of s.grips) {
  near(arm.shoulder[0],arm.side*2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw),'fixed projected shoulder X');
  near(arm.shoulder[1],-3.93,'fixed cheek-height shoulder Y');
  assert.equal(arm.clamped,false,`${s.action}/${s.phase}: grip is physically reachable, side ${arm.side}`);
  assert.ok(arm.reach<=R.constants.maxReach+1e-8,'short-arm maximum is preserved');
  near(arm.radius,.64,'palm volume stays constant');
  assert.ok(arm.world.every(Number.isFinite),'world palm coordinates are finite');
 }
 if(s.carrying) {
  const a=s.grips[0].world,b=s.grips[1].world,tf=M.bodyTransform(s),prop=s.props[s.carrying];
  if(s.carrying==='book'&&s.phase==='turn-page') {
   const left=s.grips.find(arm=>arm.side===-1).world,dx=39.2*tf.sx,dy=16*tf.sy;
   near(prop.x,left[0]+Math.cos(tf.rotation)*dx-Math.sin(tf.rotation)*dy,'left support palm keeps book steady X');
   near(prop.y,left[1]+Math.sin(tf.rotation)*dx+Math.cos(tf.rotation)*dy,'left support palm keeps book steady Y');
  } else {
   near(prop.x,(a[0]+b[0])/2-Math.sin(tf.rotation)*16*tf.sy,'prop is parented to solved palms X');
   near(prop.y,(a[1]+b[1])/2+Math.cos(tf.rotation)*16*tf.sy,'prop is parented to solved palms Y');
  }
 }
 for(const [key,prop] of Object.entries(s.props))if(prop.mode==='shelf') {
  near(prop.x,M.anchor[key].x,`${key} stays on its furniture X`);
  near(prop.y,M.anchor[key].y,`${key} stays on its furniture Y`);
 }
 if(s.sleeping) {
  assert.ok(s.inBed,'sleeping requires bed support');
  assert.ok(Math.sin(s.rotation)*Math.sin(s.yaw)<-.9,'sleeping face points upward');
 }
 if(['cover','uncover'].includes(s.phase)) {
  const hand=s.grips.find(arm=>arm.side===1),cuff=context.YayaBedroomArt.quiltGrip(s.cover);
  assert.ok(hand,'pulling the quilt requires an actual hand');
  assert.ok(Math.hypot(hand.world[0]-cuff.x,hand.world[1]-cuff.y)<.1,'the same real palm grips the moving quilt cuff');
 }
 if(previous) {
  assert.ok(distance(s.position,previous.position)<4,`${s.action}/${s.phase}: body may not teleport`);
  assert.ok(Math.abs(s.rotation-previous.rotation)<.08,'body roll stays continuous');
  assert.ok(Math.abs(s.yaw-previous.yaw)<.12,`${s.action}/${s.phase}: head and torso turn continuously`);
  if(s.phase==='turn-page'&&previous.phase==='turn-page') {
   assert.ok(distance(s.props.book,previous.props.book)<.001,'turning a page does not drag the whole book');
   assert.ok(s.bookPage>=previous.bookPage,'the page progresses to the next spread');
  }
  for(const key of ['book','teddy']) {
   const prop=s.props[key],old=previous.props[key];
   assert.ok(distance(prop,old)<5,`${s.action}/${s.phase}: ${key} may not jump between anchors`);
   if(prop.mode!==old.mode) {
    transfers++;
    assert.ok(distance(prop,old)<.2,`${key} ownership switches only at actual contact`);
   }
  }
 }
}

// A carried object's attachment works across the whole turn, including the
// back view; mirrored target labels may not silently cross the two arms.
for(let i=0;i<=720;i++) {
 const yaw=i*Math.PI/360;
 const s={position:{x:1000,y:900},rotation:0,yaw,gait:0,speed:0,motion:'idle',squash:0,carrying:'book'};
 for(const arm of M.grips(s))assert.equal(arm.clamped,false,`carried item reachable at yaw ${yaw}`);
}

const results=[];
for(const command of M.commands) {
 const model=M.create({auto:false,random:()=>.5});
 assert.equal(model.request(command),true);
 let previous=model.getState();
 const phases=new Set([previous.phase]);
 let firstPageHand=null,maxPageHandTravel=0;
 for(let i=0;i<120*180;i++) {
  model.step(1/120);
  const current=model.getState();validate(current,previous);phases.add(current.phase);previous=current;
  if(current.phase==='turn-page') {
   const hand=current.grips.find(arm=>arm.side===1).world;
   if(!firstPageHand)firstPageHand=[...hand];
   maxPageHandTravel=Math.max(maxPageHandTravel,Math.hypot(hand[0]-firstPageHand[0],hand[1]-firstPageHand[1]));
  }
  if(!current.action)break;
 }
 assert.equal(previous.action,null,`${command} completes its lifecycle`);
 assert.equal(previous.carrying,null,`${command} returns held items before finishing`);
 assert.equal(previous.inBed,false,`${command} finishes standing in the room`);
 if(command==='read')for(const phase of ['reach','pick','open-book','read','turn-page','close-book','place','release'])assert.ok(phases.has(phase),`reading includes ${phase}`);
 if(command==='read')assert.ok(maxPageHandTravel>10,'right hand visibly moves to turn the page while the left supports the book');
 if(command==='teddy')for(const phase of ['reach','pick','hug','place','release'])assert.ok(phases.has(phase),`teddy interaction includes ${phase}`);
 if(command==='sleep')for(const phase of ['bed-touch','climb','lie-down','cover','sleep','uncover','sit-up','climb-down','land'])assert.ok(phases.has(phase),`sleep includes ${phase}`);
 results.push({command,seconds:Number(previous.time.toFixed(2)),phases:phases.size});
}

// Manual intent waits for a grasp/bed sequence to end safely; it must never
// delete a carried object or teleport the sleeping pet to the next activity.
for(const [first,interrupt,when] of [['read','window',s=>s.carrying==='book'],['sleep','lamp',s=>s.phase==='sleep']]) {
 const model=M.create({auto:false,random:()=>.5});model.request(first);
 let previous=model.getState(),requested=false,sawNext=false;
 for(let i=0;i<120*200;i++) {
  if(!requested&&when(previous)){model.request(interrupt);requested=true;}
  model.step(1/120);
  const current=model.getState();validate(current,previous);
  if(current.action===interrupt){sawNext=true;assert.equal(current.carrying,null,'next command starts after object release');assert.equal(current.inBed,false,'next command starts after leaving the bed');}
  previous=current;
  if(requested&&sawNext&&!current.action)break;
 }
 assert.ok(requested&&sawNext,`${first} accepts a safe ${interrupt} request`);
}

const idle=M.create({auto:false});
for(let i=0;i<1000;i++)idle.step(1/60);
assert.equal(idle.getState().action,null,'turning off autonomy does not launch activities');
idle.setAuto(true);
for(let i=0;i<240;i++)idle.step(1/60);
assert.ok(idle.getState().action,'autonomy starts a complete room activity');
assert.equal(idle.request('not-an-action'),false,'unknown commands do not alter choreography');
console.log(JSON.stringify({ok:true,samples,transfers,activities:results}));

if(process.argv.includes('--browser')) {
 const {default:puppeteer}=await import('puppeteer-core');
 const {resolve}=await import('node:path');
 const {pathToFileURL}=await import('node:url');
 const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--ignore-gpu-blocklist','--use-angle=d3d11']});
 const errors=[],failed=[];
 try {
  const page=await browser.newPage();await page.setViewport({width:1280,height:1100,deviceScaleFactor:1});
  page.on('pageerror',error=>errors.push(error.message));page.on('requestfailed',req=>{
   const error=req.failure()?.errorText;
   // Chromium cancels a video's remaining byte range after preload=metadata
   // has obtained enough data. The page's ready flag separately validates all
   // required metadata; missing media and failed scripts still fail this test.
   if(req.resourceType()==='media'&&error==='net::ERR_ABORTED')return;
   failed.push({url:req.url(),error});
  });
  await page.goto(pathToFileURL(resolve(process.env.YAYA_BEDROOM_PAGE||'outputs/yaya-pet/bedroom.html')).href,{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.yayaBedroom?.getState().ready,{timeout:60000});
  await page.evaluate(async()=>{await yayaBedroom.pause();await yayaBedroom.setAuto(false);await yayaBedroom.restart();});
  assert.equal(await page.$$eval('[data-room-command]',buttons=>buttons.length),M.commands.length,'all physical activities have controls');
  assert.equal(await page.$$eval('[data-room-object]',buttons=>buttons.length),5,'room objects have direct interaction targets');
  const image=()=>page.$eval('#out',canvas=>canvas.toDataURL());
  const initial=await image();assert.ok(initial.length>20000,'actual bedroom artwork renders');
  const images=new Set([initial]);
  for(const key of ['read','teddy','sleep','lamp']) {
   await page.evaluate(async command=>{await yayaBedroom.restart();yayaBedroom.request(command);await yayaBedroom.advance(18);},key);
   assert.equal(await page.evaluate(()=>yayaBedroom.getState().action),key,`${key} renders its own activity`);
   images.add(await image());
  }
  assert.equal(images.size,5,'bedroom interactions visibly differ');
  await page.evaluate(()=>yayaBedroom.restart());
  await page.click('[data-room-command="read"]');
  await page.evaluate(()=>yayaBedroom.advance(18));
  assert.equal(await page.evaluate(()=>yayaBedroom.getState().carrying),'book','manual reading reaches a physical book grasp');
  await page.click('[data-room-command="window"]');
  await page.evaluate(()=>yayaBedroom.pause());
  const queued=await page.evaluate(()=>({state:yayaBedroom.getState(),visible:!document.getElementById('queue-label').hidden,text:document.getElementById('queue-label').textContent}));
  assert.equal(queued.state.pending,'window','actual activity control queues the next intent');
  assert.equal(queued.state.action,'read','clicking another object does not cut a carried-book interaction');
  assert.ok(queued.visible&&queued.text.includes('窗外'),'pending activity is explained in the interface');
  await page.evaluate(()=>yayaBedroom.advance(80));
  const afterRequest=await page.evaluate(()=>yayaBedroom.getState());
  assert.equal(afterRequest.carrying,null,'manual handoff leaves no orphan held object');
  assert.equal(afterRequest.props.book.mode,'shelf','manual handoff returns the same book');
  assert.ok(afterRequest.history.some(label=>label.includes('窗外')),'queued window request eventually executes');
  const paused=await page.evaluate(()=>yayaBedroom.getState().time);
  await page.evaluate(()=>new Promise(resolve=>setTimeout(resolve,180)));
  near(await page.evaluate(()=>yayaBedroom.getState().time),paused,'pause stops the model clock');
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'mobile page has no horizontal overflow');

  // The main entry must expose the living room directly, with the standalone
  // room loaded in its real iframe and the older garden remaining opt-in.
  await page.setViewport({width:1280,height:1100,deviceScaleFactor:1});
  const mainTarget=resolve(process.env.YAYA_MAIN_PAGE||'outputs/yaya-pet/index.html');
  await page.goto(pathToFileURL(mainTarget).href+'#life-panel',{waitUntil:'domcontentloaded',timeout:60000});
  await page.waitForFunction(()=>window.yayaLife&&window.yayaPet?.getState().ready,{timeout:60000});
  const embedded=await page.$('#life-panel [data-testid="bedroom-frame"]');
  assert.ok(embedded,'main life panel embeds the actual bedroom');
  const roomFrame=await embedded.contentFrame();
  assert.ok(roomFrame,'the bedroom iframe has a live document');
  await roomFrame.waitForFunction(()=>window.yayaBedroom?.getState().ready,{timeout:60000});
  await roomFrame.evaluate(()=>yayaBedroom.pause());
  const garden=await page.evaluate(()=>({pet:yayaPet.getState(),life:yayaLife.getState()}));
  assert.equal(garden.pet.paused,true,'legacy garden playback starts paused');
  assert.equal(garden.life.enabled,false,'legacy garden autonomy starts disabled');
  assert.equal(await roomFrame.$$eval('[data-room-command]',buttons=>buttons.length),M.commands.length,'embedded room retains every interaction');
  assert.ok((await roomFrame.$eval('#out',canvas=>canvas.toDataURL())).length>20000,'embedded room actually paints its scene');
  await roomFrame.evaluate(async()=>{await yayaBedroom.setAuto(false);await yayaBedroom.restart();});
  await page.click('[data-room-catalog-command="read"]');
  await roomFrame.waitForFunction(()=>yayaBedroom.getState().action==='read');
  assert.ok((await page.$eval('#catalog-room-feedback',el=>el.textContent)).includes('已安排'),'main action table connects to the living bedroom');
  await roomFrame.evaluate(()=>yayaBedroom.pause());
  await page.setViewport({width:390,height:844,deviceScaleFactor:1});
  await page.waitForFunction(()=>document.querySelector('[data-testid="bedroom-frame"]').clientWidth<=390);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'main page fits a mobile viewport');
  assert.equal(await roomFrame.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),true,'embedded room fits its mobile iframe');
  assert.deepEqual(errors,[],'no bedroom browser errors');assert.deepEqual(failed,[],'all bedroom resources load');
  console.log(JSON.stringify({browser:true,activities:4,hotspots:5,manualPending:true,mainEmbed:true,mobileWidth:390}));
 } finally {await browser.close();}
}
