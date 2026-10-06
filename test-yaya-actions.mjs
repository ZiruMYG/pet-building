import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

const ctx=createContext({console});
for(const file of ['src/yaya-actions.js','src/yaya-rig.js']) runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),ctx,{filename:file});
const actions=ctx.YayaActions,rig=ctx.YayaRig;
const keys=['idle','walk','run','sleep','stretch','celebrate','wave','hello','reach','hug','cuddle','nod','spin','turn'];
const gap=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
let armCount=0;
for(const key of keys) {
  const duration=actions.duration(key),start=actions.sample(key,0),end=actions.sample(key,duration-1e-7);
  for(const field of ['jump','crouch','energy','nod','yawn','reach','wave','lift']) assert.ok(Math.abs(start[field]-end[field])<1e-5,`${key} ${field}: seam`);
  assert.ok(Math.abs(Math.cos(start.yaw)-Math.cos(end.yaw))<1e-5,`${key} yaw cosine seam`);
  assert.ok(Math.abs(Math.sin(start.yaw)-Math.sin(end.yaw))<1e-5,`${key} yaw sine seam`);
  let previous;
  for(let frame=0;frame<=duration*240;frame++) {
    const t=frame/240,q=actions.sample(key,t);
    for(const [field,value] of Object.entries(q)) assert.ok(Number.isFinite(value),`${key}/${field}: non-finite`);
    for(const field of ['crouch','energy','nod','yawn','reach','lift']) assert.ok(q[field]>=0&&q[field]<=1,`${key}/${field}: out of range`);
    for(const direction of [-1,1]) {
      const arms=rig.poseArms(key,t,{action:key,direction},{});
      assert.equal(arms.length,2);
      for(const arm of arms) {
        assert.ok(arm.reach<=rig.constants.maxReach+1e-9);
        assert.equal(arm.radius,rig.constants.palmRadius);
        assert.deepEqual(Array.from(arm.shoulder),[arm.side*rig.constants.shoulderX,rig.constants.shoulderY]);
        for(const corner of [arm.band[1],arm.band[2]]) assert.ok(gap(corner,arm.palm)<arm.radius-.1,`${key}: detached wrist`);
        assert.ok(gap(arm.sockets.grip,arm.palm)<1e-9);
        armCount++;
      }
      if(direction===1) {
        if(previous) for(let i=0;i<2;i++) assert.ok(gap(arms[i].palm,previous[i].palm)<.065,`${key}: hand discontinuity`);
        previous=arms;
      }
    }
  }
}
assert.equal(actions.duration('run'),6); assert.equal(actions.duration('walk'),8); assert.equal(actions.duration('sleep'),8);
assert.ok(actions.sample('stretch',1.5).yawn>.99,'stretch needs clearly open yawn');
assert.ok(actions.sample('stretch',1.5).lift>.99,'hands must reach up during yawn');
const apex=actions.sample('celebrate',1.78),prepare=actions.sample('celebrate',.75),land=actions.sample('celebrate',2.66);
assert.ok(apex.jump>1.6&&apex.energy>.99&&apex.lift>.99,'celebration apex must visibly cheer');
assert.ok(prepare.crouch>.7&&prepare.jump===0&&land.crouch>.5,'jump needs anticipation and landing');
for(const direction of [-1,1]) {
  const hand=rig.poseArms('reach',1.6,{action:'reach',direction},{})[direction<0?0:1];
  assert.ok(hand.reach>2,'reach arm must extend beyond default pose');
  assert.equal(Math.sign(hand.palm[0]),direction);
}
// Raised hand makes three full, visible shoulder waves, not a wrist tremor.
const waves=[];
for(let i=0;i<6;i++) waves.push(actions.sample('wave',.65+(i+.5)*2.55/6).wave);
assert.deepEqual(waves.map(Math.sign),[1,-1,1,-1,1,-1]);
assert.ok(waves.every(v=>Math.abs(v)>.95));
const low=rig.poseArms('wave',.65+1.5*2.55/6,{action:'wave'},{}),high=rig.poseArms('wave',.65+.5*2.55/6,{action:'wave'},{});
assert.ok(gap(low[1].palm,high[1].palm)>.95,'wave swing too small');
assert.ok(actions.sample('nod',.84).nod>.99&&actions.sample('nod',2.24).nod>.99,'two nod beats');
assert.equal(actions.sample('nod',1.5).nod,0,'nod beats need clear reset');
assert.ok(Math.abs(actions.sample('turn',1.8).yaw-Math.PI/2)<1e-8,'turn holds side view');
assert.ok(Math.abs(actions.sample('spin',2).yaw-Math.PI)<1e-8,'spin reaches back view');
console.log(`Yaya action timing PASS: ${keys.length} actions, ${armCount} connected hands, periodic timing, clear reach/wave/yawn/jump/nod beats.`);
