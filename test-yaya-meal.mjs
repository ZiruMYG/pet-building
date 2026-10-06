import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

// Exercise the delivered page and the ordinary action renderer. The test
// observes actual palm draws and furniture shapes; it does not reimplement
// a spoon trajectory, an arm solver, or the meal's animation clock.
const chrome = process.env.CHROME_PATH || 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe';
const target = resolve(process.env.YAYA_LAB_PAGE || 'outputs/yaya-pet/rig-lab.html');
const browser = await puppeteer.launch({ executablePath: chrome, headless: true,
  args: ['--allow-file-access-from-files', '--use-angle=d3d11'] });
const errors = [], failed = [];
const distance = (a,b) => Math.hypot(a[0]-b[0],a[1]-b[1]);
const near = (a,b,tolerance=1e-8) => Math.abs(a-b)<tolerance;

try {
  const page = await browser.newPage();
  page.on('pageerror', error => errors.push(error.message));
  page.on('requestfailed', request => failed.push(`${request.url()}: ${request.failure()?.errorText}`));
  await page.goto(pathToFileURL(target).href, { waitUntil: 'networkidle0' });
  await page.waitForFunction(() => window.yayaLab?.getState().ready, { timeout: 60000 });
  await page.evaluate(() => window.yayaLab.pause());

  const limits = await page.evaluate(() => {
    const D=window.YayaDrawing, V=window.YayaViews;
    let current;
    const drawArm=D.drawRigArm, drawEllipse=D.flatEllipse, drawPoly=D.flatPoly, drawFace=D.flatFace;
    D.drawRigArm=function(u,arm,cols,paper,parts) {
      if(current && parts?.palm!==false)current.palms.push({ side:arm.side, palm:[...arm.palm] });
      return drawArm.apply(this,arguments);
    };
    D.flatEllipse=function(x,y,rx,ry) {
      if(current)current.ellipses.push({x:x/current.u,y:y/current.u,rx:rx/current.u,ry:ry/current.u});
      return drawEllipse.apply(this,arguments);
    };
    D.flatPoly=function(points) {
      if(current)current.polygons.push(points.map(point=>point.map(value=>value/current.u)));
      return drawPoly.apply(this,arguments);
    };
    D.flatFace=function(u,age,state) {
      if(current)current.face={...state.face};
      return drawFace.apply(this,arguments);
    };
    const perform=V.perform;
    V.perform=function(...args) {
      current={u:args[2],palms:[],ellipses:[],polygons:[],face:null};
      const rendered=perform.apply(this,args);
      window.mealTestFrame={rendered,drawn:current};
      current=null;
      return rendered;
    };
    return window.YayaRig.constants;
  });

  let frames=0;
  for(const key of ['eat','drink']) {
    let first;
    for(let step=0;step<=32;step++) {
      const time=step/8;
      const {rendered:r,drawn}=await page.evaluate(async ({key,time}) => {
        window.yayaLab.setAction(key);
        await window.yayaLab.setTime(time);
        return window.mealTestFrame;
      },{key,time});
      const label=`${key} at ${time}s`;
      assert.equal(r.scene,'table-meal',label);
      assert.ok(r.seated && r.chair && r.table,`${label}: sits on a chair at the table`);
      assert.equal(r.character.arms.length,2,`${label}: two solved arms`);
      assert.deepEqual(drawn.palms.map(a=>a.side).sort(),[-1,1],`${label}: exactly two palms actually drawn`);
      assert.equal(r.utensil.kind,key==='eat'?'spoon':'cup');
      for(const arm of r.character.arms) {
        assert.deepEqual(arm.shoulder,[arm.side*limits.shoulderX,limits.shoulderY],`${label}: fixed cheek shoulder`);
        assert.equal(arm.clamped,false,`${label}: gesture stays within natural arm reach`);
        assert.ok(arm.reach<=limits.maxReach && arm.reach>0,`${label}: finite short arm`);
        assert.deepEqual(drawn.palms.find(a=>a.side===arm.side).palm,arm.palm,`${label}: renderer uses solved hand`);
      }
      const holdingHand=r.character.arms.find(arm=>arm.side===r.utensil.hand);
      assert.deepEqual(r.utensil.grip,holdingHand.palm,`${label}: utensil is parented to the actual palm`);
      assert.deepEqual(r.utensil.grip,holdingHand.sockets.grip,`${label}: shared grip socket`);

      if(key==='eat') {
        // Locate the actual drawn tabletop and bowl silhouette geometrically,
        // without depending on their palette or copying the bowl dimensions.
        const tabletop=drawn.ellipses.find(oval=>near(oval.y,r.tableTop) && oval.rx>4);
        assert.ok(tabletop,`${label}: tabletop really drawn at declared height`);
        const bowl=drawn.polygons.find(points=> {
          const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
          return near(Math.min(...ys),r.bowlCenter[1]) &&
            near((Math.min(...xs)+Math.max(...xs))/2,r.bowlCenter[0]);
        });
        assert.ok(bowl,`${label}: one stationary bowl silhouette`);
        const bottom=Math.max(...bowl.map(point=>point[1]));
        const onSurface=((r.bowlCenter[0]-tabletop.x)/tabletop.rx)**2+((bottom-tabletop.y)/tabletop.ry)**2;
        assert.ok(onSurface<1,`${label}: bowl base contacts the drawn tabletop`);
        if(!first)first=r;
        assert.deepEqual(r.bowlCenter,first.bowlCenter,`${label}: bowl does not follow the hand`);
        assert.equal(r.bodyY,first.bodyY,`${label}: seated body does not float away from the chair`);
        if(time===0 || time===4) {
          assert.ok(distance(r.utensil.tip,r.bowlCenter)<.03,`${label}: spoon scoops inside the bowl rim`);
        }
        if(time===1.5) {
          assert.equal(drawn.face.mouth,'open',`${label}: mouth opens for the bite`);
          // This is the design's mouth anchor, not a copied hand trajectory.
          assert.ok(distance(r.utensil.tip,[0,-3.58])<.15,`${label}: spoon reaches the open mouth`);
        }
      }
      frames++;
    }
  }
  assert.deepEqual(errors,[],'no page errors');
  assert.deepEqual(failed,[],'no failed asset requests');
  console.log(`PASS: ${frames} meal frames; table and bowl contact, two rendered palms, fixed shoulders, palm-owned utensils, scoop and bite contact.`);
} finally {
  await browser.close();
}
