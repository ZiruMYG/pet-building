import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({Math,Number,Object});
vm.runInContext(fs.readFileSync(new URL('./src/yaya-turns.js',import.meta.url),'utf8'),context);
const T=context.YayaTurns;
const close=(a,b,tolerance=1e-7)=>assert.ok(Math.abs(a-b)<tolerance,`${a} != ${b}`);
const finiteTree=value=>{
  for(const v of Object.values(value)) {
    if(typeof v==='number') assert.ok(Number.isFinite(v));
    else if(v&&typeof v==='object') finiteTree(v);
  }
};
let count=0;
for(const key of ['turn','spin']) {
  const duration=T.duration(key),plan=T.plans[key];
  assert.equal(duration,key==='spin'?6:4);
  let peakLift=0,peakLead=0,peakLag=0;
  for(let n=0;n<duration*600;n++) {
    const t=n/600,q=T.sample(key,t);count++;
    finiteTree(q);
    assert.equal(q.feet.length,2);
    assert.ok(q.feet.some(f=>f.contact),'a turning step must retain support');
    assert.ok(Math.abs(q.lean)<=.050001);
    peakLead=Math.max(peakLead,Math.abs(q.faceYaw-q.yaw));
    peakLag=Math.max(peakLag,Math.abs(q.leafYaw-q.yaw));
    for(const f of q.feet) {
      assert.ok(f.lift>=0&&f.lift<=.400001);
      if(f.contact) close(f.lift,0);
      peakLift=Math.max(peakLift,f.lift);
    }
    // The body transfers its weight inside the current support span.
    const minX=Math.min(...q.feet.map(f=>f.x)),maxX=Math.max(...q.feet.map(f=>f.x));
    const minZ=Math.min(...q.feet.map(f=>f.z)),maxZ=Math.max(...q.feet.map(f=>f.z));
    assert.ok(q.bodyX>=minX-1e-8&&q.bodyX<=maxX+1e-8);
    assert.ok(q.bodyZ+.1>=minZ-1e-8&&q.bodyZ+.1<=maxZ+1e-8);
  }
  assert.ok(peakLift>.39&&peakLead>.16&&peakLag>.10);

  for(const step of plan) {
    const before=T.sample(key,step.start),after=T.sample(key,step.end);
    const plantedSide=-step.side;
    const planted=before.feet.find(f=>f.side===plantedSide);
    for(let i=1;i<100;i++) {
      const q=T.sample(key,step.start+(step.end-step.start)*i/100);
      const f=q.feet.find(f=>f.side===plantedSide);
      assert.equal(f.contact,true);
      close(f.x,planted.x);close(f.z,planted.z);close(f.yaw,planted.yaw);
      assert.equal(q.feet.find(f=>f.side===step.side).contact,false);
    }
    for(const endpoint of [step.start,step.end]) {
      const left=T.sample(key,endpoint-1e-6),right=T.sample(key,endpoint+1e-6);
      for(const field of ['yaw','faceYaw','leafYaw','bodyX','bodyZ','bob','lean','squash','armSwing']) close(left[field],right[field],1e-5);
      for(let i=0;i<2;i++) for(const field of ['x','z','lift','yaw']) close(left.feet[i][field],right.feet[i][field],1e-5);
    }
    assert.equal(after.feet.find(f=>f.side===step.side).contact,true);
  }

  // A closed animation loop has the same contacts, position and orientation.
  const first=T.sample(key,0),last=T.sample(key,duration-1e-6);
  for(const field of ['bodyX','bodyZ','bob','lean','squash','armSwing']) close(first[field],last[field],1e-6);
  for(const field of ['yaw','faceYaw','leafYaw']) {
    close(Math.cos(first[field]),Math.cos(last[field]),1e-6);
    close(Math.sin(first[field]),Math.sin(last[field]),1e-6);
  }
  for(let i=0;i<2;i++) for(const field of ['x','z','lift']) close(first.feet[i][field],last.feet[i][field],1e-6);
  close(T.sample(key,-.2).yaw,T.sample(key,duration-.2).yaw);
  finiteTree(T.sample(key,NaN));
}
// The side pose has a deliberate hold; the spin pauses between replanted steps.
close(T.sample('turn',1.7).yaw,Math.PI/2);
close(T.sample('turn',2.1).yaw,Math.PI/2);
close(T.sample('spin',1.18).yaw,T.sample('spin',1.22).yaw);
assert.ok(T.sample('spin',.8).yaw>T.sample('spin',.65).yaw+.15);
console.log(`Yaya turns: ${count} frames; planted contacts, swing clearance, loop and gaze/leaf timing passed.`);
