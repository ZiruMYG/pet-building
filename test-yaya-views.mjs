import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Pure geometry regression: no browser, p5 or drawing stubs are needed.
const context = vm.createContext({ console });
context.window = context;
for (const file of ['src/yaya-actions.js','src/yaya-rig.js', 'src/yaya-views.js']) {
  vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
}
const A=context.YayaActions,R = context.YayaRig, V = context.YayaViews;
assert.ok(R && V, 'both shared geometry APIs must load without a graphics runtime');
const near = (a, b, message, tolerance = 1e-8) => assert.ok(Math.abs(a-b) <= tolerance, `${message}: ${a} != ${b}`);
const samePoint = (a, b, message, tolerance) => a.forEach((n, i) => near(n, b[i], `${message}[${i}]`, tolerance));
const angleEqual = (a, b, message, tolerance) => {
  near(Math.sin(a), Math.sin(b), `${message} sin`, tolerance);
  near(Math.cos(a), Math.cos(b), `${message} cos`, tolerance);
};

// Both routes must close position, facing and stride, despite different pace
// and distance-per-step. Feet stay planted throughout the entire turnaround.
for(const key of ['run','walk']) {
 const period=A.duration(key),half=period/2,move=key==='run'?2.3:3,turn=half-move;
 near(V.travel(0,key).period,period,`${key} uses shared action duration`);
 for (const t of [-period, -1, 0, .1, move/2, move, move+turn/2, half,half+move/2,half+move,period]) {
  const a = V.travel(t,key), b = V.travel(t + period,key);
  near(a.x, b.x, 'loop position');
  near(a.speed, b.speed, 'loop speed');
  angleEqual(a.yaw, b.yaw, 'loop facing');
  angleEqual(a.gait, b.gait, 'loop gait');
 }
const epsilon = 1e-5;
 for (const boundary of [0, move, half, half+move, period]) {
  const a = V.travel(boundary-epsilon,key), b = V.travel(boundary+epsilon,key);
  near(a.x, b.x, `position continuity at ${boundary}`, 1e-6);
  near(a.speed, b.speed, `speed continuity at ${boundary}`, 2e-5);
  angleEqual(a.yaw, b.yaw, `facing continuity at ${boundary}`, 1e-6);
  angleEqual(a.gait, b.gait, `stride continuity at ${boundary}`, 1e-6);
  near(V.travel(boundary,key).speed, 0, `${key} feet stop at boundary ${boundary}`);
 }
 for (let t=0; t<period; t+=1/120) {
  const p=V.travel(t,key);
  for (const key of ['x', 'yaw', 'gait', 'speed']) assert.ok(Number.isFinite(p[key]), `finite travel ${key}`);
  assert.ok(p.x>=-1-1e-8 && p.x<=1+1e-8, 'runner stays inside track');
  assert.ok(p.speed>=0 && p.speed<=1+1e-8, 'speed envelope stays bounded');
  if (t<move-.01) assert.ok(V.travel(t+.005,key).x>=p.x, `${key} rightward leg progresses right`);
  if (t>half && t<half+move-.01) assert.ok(V.travel(t+.005,key).x<=p.x, `${key} leftward leg progresses left`);
 }
 for (const start of [move,half+move]) {
  const first=V.travel(start+turn*.1,key), last=V.travel(start+turn*.9,key);
  near(first.x,last.x,'turn stays planted');
  near(first.gait,last.gait,'turn does not cycle feet');
  near(first.speed,0,'turn has zero travel speed');
  assert.ok(Math.abs(last.yaw-first.yaw)>1,'turn actually changes facing');
 }
}
assert.ok(V.travel(1.15,'run').x>V.travel(1.15,'walk').x,'running crosses the track faster');
assert.ok(V.travel(1.15,'run').gait>V.travel(1.5,'walk').gait,'running uses more strides per crossing');

samePoint(V.project(2,-4,1,0),[2,-4,1],'front projection');
samePoint(V.project(2,-4,1,Math.PI/2),[1,-4,-2],'right profile projection');
samePoint(V.project(2,-4,1,Math.PI),[-2,-4,-1],'back projection');
samePoint(V.project(2,-4,1,Math.PI*1.5),[-1,-4,2],'left profile projection');
for (const yaw of [0,.3,Math.PI/2,Math.PI,5.5]) {
  const p=V.project(2.28,-3.93,.45,yaw);
  near(Math.hypot(p[0],p[2]),Math.hypot(2.28,.45),'projection preserves body-space radial distance');
  near(p[1],-3.93,'projection preserves shoulder height');
}

// In every direction the arm's two wrist corners overlap the same round palm.
let armSamples=0;
for (const side of [-1,1]) for (let i=0;i<72;i++) for (const reach of [0,.05,.4,1,1.8,2.05,4]) {
  const theta=i*Math.PI/36, shoulder=[side*R.constants.shoulderX,R.constants.shoulderY];
  const target=[shoulder[0]+Math.cos(theta)*reach,shoulder[1]+Math.sin(theta)*reach];
  const arm=R.solveArm({side,target});
  samePoint(arm.shoulder,shoulder,'fixed shoulder');
  assert.ok(arm.reach<=R.constants.maxReach+1e-8,'reach remains short');
  for (const point of [...arm.band,arm.palm,arm.wrist]) assert.ok(point.every(Number.isFinite),'no invalid arm coordinates');
  for (const corner of [arm.band[1],arm.band[2]]) {
    assert.ok(Math.hypot(corner[0]-arm.palm[0],corner[1]-arm.palm[1])<arm.radius,'wrist corner sits inside palm');
  }
  samePoint(arm.sockets.grip,arm.palm,'grip belongs to the solved palm');
  armSamples++;
}
const actions=['idle','eat','drink','sleep','stretch','walk','run','spin','turn','nod','celebrate','wave','hug','reach'];
for (const action of actions) for (let frame=0;frame<=96;frame++) {
  const t=frame/24, arms=R.poseArms(action,t,{action},{});
  assert.equal(arms.length,2,'exactly two anatomical arms');
  assert.equal(new Set(arms.map(a=>a.side)).size,2,'one palm per side');
  for (const arm of arms) {
    samePoint(arm.shoulder,[arm.side*R.constants.shoulderX,R.constants.shoulderY],`${action} fixed root`);
    near(arm.radius,R.constants.palmRadius,`${action} consistent palm volume`);
  }
  if (action==='eat'||action==='drink') {
    const prop=R.propPose(action,t,arms),owner=arms.find(a=>a.side===prop.hand);
    samePoint(prop.grip,owner.palm,`${action} prop attached to owning palm`);
  }
}
for (const action of actions) {
  const a=R.poseArms(action,0,{action},{}),b=R.poseArms(action,A.duration(action),{action},{});
  a.forEach((arm,i)=>samePoint(arm.palm,b[i].palm,`${action} arm loop closure`));
}

// Exercise the production projection/solve interface, not a second test-only
// projection. The shoulder rotates with body volume and never with a gesture.
let projectedSamples=0;
function projectedArms(action,t,yaw,route={}) {
 const locomotion=action==='run'||action==='walk';
 return V.solveArms({},R,action,t,{action},{},yaw,locomotion,route.gait??t*Math.PI*2,route.speed??1);
}
function checkArms(action,arms,yaw) {
 assert.equal(arms.length,2,`${action}: two projected arms`);
 assert.equal(new Set(arms.map(a=>a.side)).size,2,`${action}: one arm each side`);
 for(const arm of arms) {
  const root=V.project(arm.side*R.constants.shoulderX,R.constants.shoulderY,.45,yaw);
  samePoint(arm.shoulder,root.slice(0,2),`${action}: projected fixed shoulder`);
  near(arm.depth,root[2],`${action}: shoulder depth controls occlusion`);
  near(arm.radius,R.constants.palmRadius,`${action}: projected palm retains volume`);
  assert.ok(arm.reach<=R.constants.maxReach+1e-8,`${action}: projected arm overextends`);
  assert.equal(arm.edges.length,2,`${action}: no closed shoulder seam`);
  for(const point of [...arm.band,arm.palm,arm.wrist])assert.ok(point.every(Number.isFinite),`${action}: finite projected geometry`);
  for(const corner of [arm.band[1],arm.band[2]])assert.ok(Math.hypot(corner[0]-arm.palm[0],corner[1]-arm.palm[1])<arm.radius-.1,`${action}: projected wrist stays inside palm`);
  samePoint(arm.sockets.grip,arm.palm,`${action}: projected grip belongs to hand`);
  projectedSamples++;
 }
}
for(const action of actions)for(const yaw of [0,.45,1.15,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]) {
 for(let frame=0;frame<=A.duration(action)*24;frame++)checkArms(action,projectedArms(action,frame/24,yaw),yaw);
 const first=projectedArms(action,0,yaw),last=projectedArms(action,A.duration(action),yaw);
 first.forEach((arm,i)=>samePoint(arm.palm,last[i].palm,`${action}: projected action loop`));
}
for(const action of ['turn','spin','walk','run']) {
 let previous;
 for(let frame=0;frame<=A.duration(action)*240;frame++) {
  const t=frame/240,route=['walk','run'].includes(action)?V.travel(t,action):A.sample(action,t);
  const arms=projectedArms(action,t,route.yaw,route);
  checkArms(action,arms,route.yaw);
  // Running's 1.25-unit swing at up to 16.4 rad/s requires a larger physical
  // speed bound than walking; a universal small displacement rejects speed.
  const maxHandSpeed=action==='run'?25:18;
  if(previous)arms.forEach((arm,i)=>assert.ok(Math.hypot(arm.palm[0]-previous[i].palm[0],arm.palm[1]-previous[i].palm[1])<maxHandSpeed/240,`${action}: projected hand exceeds continuous motion bound`));
  previous=arms;
 }
 const duration=A.duration(action),move=action==='run'?2.3:3;
 const boundaries=['walk','run'].includes(action)?[0,move,duration/2,duration/2+move,duration]:[0,duration/2,duration];
 for(const t of boundaries) {
  const samples=[-1,1].map(sign=>{
   const age=t+sign*1e-6,route=['walk','run'].includes(action)?V.travel(age,action):A.sample(action,age);
   return projectedArms(action,age,route.yaw,route);
  });
  samples[0].forEach((arm,i)=>samePoint(arm.palm,samples[1][i].palm,`${action}: no hand cut at seam/turn ${t}`,1e-4));
 }
}
// The designed bear hug is a three-quarter view. Both requested bear grips
// must actually be reachable; silently clamping a remote grip would float it.
for(let frame=0;frame<=4*240;frame++) {
 const t=frame/240,arms=projectedArms('hug',t,1.15);
 for(const arm of arms) {
  assert.equal(arm.clamped,false,'hug: teddy grip lies inside shoulder reach');
  samePoint(arm.palm,arm.requested,'hug: physical palm reaches requested teddy grip');
  assert.ok(arm.foreground,'hug: real gripping palms render in front of teddy');
 }
 const span=arms[1].palm[0]-arms[0].palm[0];
 assert.ok(span>=1.30&&span<=1.56,'hug: palms hold opposite bear edges');
}
console.log(JSON.stringify({ok:true,travelPeriods:{run:A.duration('run'),walk:A.duration('walk')},armGeometrySamples:armSamples,projectedSamples,actions:actions.length}));
