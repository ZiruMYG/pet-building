import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

// Load the actual production pose functions and rig. No p5/canvas is required
// to prove attachment, reach, constant palm size or action/prop timing.
const context=createContext({ console });
context.window=context;
for(const file of ['src/config-yaya-pet.js','src/core.js','src/yaya-actions.js','src/yaya-rig.js','src/yaya-pet.js']) {
  runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),context,{filename:file});
}
const {YayaRig:rig,YayaDrawing:drawing,getYayaEmotionState:state}=context;
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const approx=(actual,expected,tolerance=1e-8)=>assert.ok(Math.abs(actual-expected)<tolerance,`${actual} != ${expected}`);
const allStates=[...new Set([...context.YAYA_MOODS,...context.YAYA_ACTIONS])];
let solved=0;
for(const key of allStates) {
  let previous;
  for(let frame=0;frame<=4*240;frame++) {
    const t=frame/240,S=state(key,t),p=drawing.pose(t,S),arms=rig.poseArms(key,t,S,p);
    assert.equal(arms.length,2,`${key}: exactly two physical arms`);
    assert.equal(arms[0].side,-1); assert.equal(arms[1].side,1);
    for(const [i,arm] of arms.entries()) {
      assert.deepEqual(Array.from(arm.shoulder),[arm.side*2.28,-3.93],`${key}: shoulder drift`);
      assert.equal(arm.radius,rig.constants.palmRadius,`${key}: palm changes size`);
      assert.ok(arm.reach<=rig.constants.maxReach+1e-10,`${key}: overextended arm`);
      approx(distance(arm.direction,[0,0]),1);
      approx(arm.direction[0]*arm.normal[0]+arm.direction[1]*arm.normal[1],0);
      assert.ok(arm.band.flat().every(Number.isFinite),`${key}: invalid band`);
      // Both distal corners must be under the filled palm, with generous
      // coverage even at the vertical stretch and all intermediate angles.
      for(const corner of [arm.band[1],arm.band[2]]) {
        assert.ok(distance(corner,arm.palm)<arm.radius-.1,`${key}: arm/palm gap`);
      }
      assert.equal(arm.edges.length,2,`${key}: shoulder must have no closing edge`);
      assert.equal(distance(arm.sockets.grip,arm.palm),0,`${key}: floating grip`);
      if(previous && frame<4*240) {
        assert.ok(distance(arm.palm,previous[i].palm)<.09,`${key}: hand jumps between frames`);
        assert.equal(arm.layer,previous[i].layer,`${key}: hand disappears by switching layer`);
      }
      solved++;
    }
    if(key==='eat'||key==='drink') {
      const prop=rig.propPose(key,t,arms),arm=arms[prop.hand<0?0:1];
      assert.equal(distance(prop.grip,arm.sockets.grip),0,`${key}: detached prop`);
      const local=key==='eat'?[1.04,0]:[-.64,0];
      assert.ok(distance(prop.tip||prop.center,rig.pointAt(arm,...local))<1e-10);
      approx(prop.angle,arm.angle);
      const q=rig.actionCycle(key,t),face=drawing.actionFace(S,key,t).face;
      if(q.mouthOpen>.25) assert.ok(['open','o'].includes(face.mouth),`${key}: mouth ignores prop phase`);
    }
    previous=arms;
  }
}

// Direction sweep covers arbitrary future gestures and custom projected roots,
// not only today's hard-coded poses. Also test zero reach and unreachable IK.
for(const side of [-1,1]) for(const radius of [0,.1,.4,1,2.05,8]) for(let angle=0;angle<Math.PI*2;angle+=.025) {
  const shoulder=[side*2.28,-3.93],target=[shoulder[0]+Math.cos(angle)*radius,shoulder[1]+Math.sin(angle)*radius];
  const arm=rig.solveArm({side,target,shoulder,angle});
  assert.ok(arm.band.flat().every(Number.isFinite));
  approx(distance(arm.palm,shoulder),Math.min(radius,rig.constants.maxReach));
  for(const corner of [arm.band[1],arm.band[2]]) assert.ok(distance(corner,arm.palm)<arm.radius-.1);
}
// A bite touches the mouth; the cup's rim reaches its mouth-side edge. This
// catches a socket that follows the hand but places the utensil somewhere else.
for(const key of ['eat','drink']) {
  const S=state(key,1.5),arms=rig.poseArms(key,1.5,S,drawing.pose(1.5,S)),prop=rig.propPose(key,1.5,arms);
  const contact=prop.tip||prop.rim;
  assert.ok(distance(contact,[0,-3.58])<.5,`${key}: prop never reaches mouth`);
}
// Redesigned daily front hands are continuous at the 4-second loop seam.
for(const key of ['eat','drink','stretch','exercise','dance']) {
  const S=state(key,0),p=drawing.pose(0,S),first=rig.poseArms(key,0,S,p),last=rig.poseArms(key,4-1e-5,S,p);
  for(let i=0;i<2;i++) assert.ok(distance(first[i].palm,last[i].palm)<1e-4,`${key}: loop seam`);
}
// Check the production pose consumer as well as the pure action clock. An
// otherwise valid beat is useless if the renderer still uses the old wobble.
const celebration=drawing.pose(1.78,state('celebrate',1.78));
assert.ok(celebration.dy<-1.5,'celebration renderer must use the high jump at its apex');
assert.equal(celebration.rot,0,'celebration jumps upward without a sideways wobble');
for(const t of [.84,2.24]) {
  const nod=drawing.pose(t,state('nod',t));
  assert.equal(nod.rot,0,'nod never rotates from side to side');
  assert.ok(nod.sq>.14&&nod.dy>.04,'nod lowers and compresses on each distinct beat');
}
const betweenNods=drawing.pose(1.5,state('nod',1.5));
assert.equal(betweenNods.rot,0,'nod rests without lateral tilt');
assert.equal(betweenNods.sq,0,'nod resets upright between beats');
console.log(`Yaya rig PASS: ${allStates.length} states, ${solved} solved arms, reach/overlap/open-root/socket/contact/continuity checks.`);
