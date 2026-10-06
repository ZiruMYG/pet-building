import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

// Pure geometry regression: no browser, p5 or drawing stubs are needed.
const context = vm.createContext({ console });
context.window = context;
for (const file of ['src/yaya-rig.js', 'src/yaya-views.js']) {
  vm.runInContext(readFileSync(file, 'utf8'), context, { filename: file });
}
const R = context.YayaRig, V = context.YayaViews;
assert.ok(R && V, 'both shared geometry APIs must load without a graphics runtime');
const near = (a, b, message, tolerance = 1e-8) => assert.ok(Math.abs(a-b) <= tolerance, `${message}: ${a} != ${b}`);
const samePoint = (a, b, message, tolerance) => a.forEach((n, i) => near(n, b[i], `${message}[${i}]`, tolerance));
const angleEqual = (a, b, message, tolerance) => {
  near(Math.sin(a), Math.sin(b), `${message} sin`, tolerance);
  near(Math.cos(a), Math.cos(b), `${message} cos`, tolerance);
};

// A complete loop must return to the same position, facing and stride phase.
for (const t of [-8, -1, 0, .1, 1.5, 3, 3.5, 4, 5.5, 7, 7.5, 8]) {
  const a = V.travel(t), b = V.travel(t + V.period);
  near(a.x, b.x, 'loop position');
  near(a.speed, b.speed, 'loop speed');
  angleEqual(a.yaw, b.yaw, 'loop facing');
  angleEqual(a.gait, b.gait, 'loop gait');
}
const epsilon = 1e-5;
for (const boundary of [0, 3, 4, 7, 8]) {
  const a = V.travel(boundary-epsilon), b = V.travel(boundary+epsilon);
  near(a.x, b.x, `position continuity at ${boundary}`, 1e-6);
  near(a.speed, b.speed, `speed continuity at ${boundary}`, 2e-5);
  angleEqual(a.yaw, b.yaw, `facing continuity at ${boundary}`, 1e-6);
  angleEqual(a.gait, b.gait, `stride continuity at ${boundary}`, 1e-6);
  near(V.travel(boundary).speed, 0, `feet stop at boundary ${boundary}`);
}
for (let t=0; t<8; t+=1/120) {
  const p=V.travel(t);
  for (const key of ['x', 'yaw', 'gait', 'speed']) assert.ok(Number.isFinite(p[key]), `finite travel ${key}`);
  assert.ok(p.x>=-1-1e-8 && p.x<=1+1e-8, 'runner stays inside track');
  assert.ok(p.speed>=0 && p.speed<=1+1e-8, 'speed envelope stays bounded');
  if (t<2.99) assert.ok(V.travel(t+.005).x>=p.x, 'rightward leg progresses right');
  if (t>4 && t<6.99) assert.ok(V.travel(t+.005).x<=p.x, 'leftward leg progresses left');
}
for (const start of [3,7]) {
  const first=V.travel(start+.1), last=V.travel(start+.9);
  near(first.x,last.x,'turn stays planted');
  near(first.gait,last.gait,'turn does not cycle feet');
  near(first.speed,0,'turn has zero travel speed');
  assert.ok(Math.abs(last.yaw-first.yaw)>1,'turn actually changes facing');
}

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
const actions=['idle','eat','drink','stretch','exercise','dance','ball','run'];
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
  const a=R.poseArms(action,0,{action},{}),b=R.poseArms(action,4,{action},{});
  a.forEach((arm,i)=>samePoint(arm.palm,b[i].palm,`${action} arm loop closure`));
}
console.log(JSON.stringify({ok:true,travelPeriod:V.period,armGeometrySamples:armSamples,actions:actions.length}));
