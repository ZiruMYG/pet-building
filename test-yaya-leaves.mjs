import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Exercise the production geometry directly. This detects detached stems,
// folding blades that cut through themselves, and jumps when seeking/turning.
const context=vm.createContext({console});
context.window=context;
for(const file of ['src/config-yaya-pet.js','src/core.js','src/yaya-leaves.js','src/yaya-actions.js','src/yaya-rig.js','src/yaya-pet.js']) {
  vm.runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),context,{filename:file});
}
const L=context.YayaLeaves;
assert.ok(L,'leaf rig loads independently of a graphics runtime');
const distance=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
const near=(a,b,label,eps=1e-8)=>assert.ok(Math.abs(a-b)<=eps,`${label}: ${a} != ${b}`);
const same=(a,b,label,eps=1e-8)=>a.forEach((n,i)=>near(n,b[i],`${label}[${i}]`,eps));
const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
const crossing=(a,b,c,d)=>cross(a,b,c)*cross(a,b,d)<-1e-12 && cross(c,d,a)*cross(c,d,b)<-1e-12;
function selfIntersection(polygon) {
  for(let i=0;i<polygon.length;i++) for(let j=i+2;j<polygon.length;j++) {
    if(i===0&&j===polygon.length-1)continue;
    if(crossing(polygon[i],polygon[(i+1)%polygon.length],polygon[j],polygon[(j+1)%polygon.length]))return [i,j];
  }
  return null;
}
function segmentDistance(p,a,b) {
  const dx=b[0]-a[0],dy=b[1]-a[1],q=Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/(dx*dx+dy*dy||1)));
  return distance(p,[a[0]+q*dx,a[1]+q*dy]);
}
function contains(p,polygon) {
  let inside=false;
  for(let i=0,j=polygon.length-1;i<polygon.length;j=i++) {
    const a=polygon[i],b=polygon[j];
    if(segmentDistance(p,a,b)<1e-8)return true;
    if((a[1]>p[1])!==(b[1]>p[1])&&p[0]<(b[0]-a[0])*(p[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;
  }
  return inside;
}
const failures=[];
let geometries=0;
for(const shape of L.shapes)for(const motion of L.motions)for(const side of [-1,1]) {
  for(let frame=0;frame<16;frame++)for(let view=0;view<12;view++) {
    const t=frame/16*L.period,yaw=view/12*Math.PI*2;
    const p=L.pose(t,'idle',side,{leafShape:shape,leafMotion:motion});
    const g=L.geometry(side,p,yaw),label=`${shape}/${motion} side=${side} time=${t} yaw=${yaw.toFixed(3)}`;
    assert.ok(g.outline.length>=96,`${label}: enough samples for a smooth large preview`);
    for(const point of [...g.outline,...g.vein,g.root,g.tip])assert.ok(point.every(Number.isFinite),`${label}: finite coordinates`);
    same(g.root,L.root,`${label}: fixed root`);
    same(g.outline[0],L.root,`${label}: silhouette attached to root`);
    same(g.vein[0],L.root,`${label}: vein attached to root`);
    assert.ok(g.outline.some(point=>distance(point,g.tip)<1e-8),`${label}: blade reaches its own tip`);
    assert.ok(g.outline.every(point=>distance(point,L.root)<5.5),`${label}: bounded character proportions`);
    const intersection=selfIntersection(g.outline);
    if(intersection&&failures.length<12)failures.push(`${label}: outline edges ${intersection} cross`);
    else if(!intersection)for(const point of g.vein)assert.ok(contains(point,g.outline),`${label}: vein remains in its blade`);
    geometries++;
  }
}
assert.deepEqual(failures,[],'leaf must not fold through itself at any selectable shape, motion or turn');

// The neutral front pair has the same volume. Mirroring changes position,
// not the silhouette or the shared origin.
for(const shape of L.shapes) {
  const a=L.geometry(-1,L.pose(0,'idle',-1,{leafShape:shape,leafMotion:'still'}));
  const b=L.geometry(1,L.pose(0,'idle',1,{leafShape:shape,leafMotion:'still'}));
  same(a.tip,[-b.tip[0],b.tip[1]],`${shape}: mirrored tips`);
  for(const point of a.outline)assert.ok(b.outline.some(other=>distance(point,[-other[0],other[1]])<1e-8),`${shape}: mirrored volume`);
}

const keys=[...new Set([...context.YAYA_MOODS,...context.YAYA_ACTIONS])];
let samples=0;
for(const key of keys)for(const side of [-1,1]) {
  const state=context.getYayaEmotionState(key,0);
  let last;
  for(let frame=0;frame<=480;frame++) {
    const t=frame/120,p=L.pose(t,key,side,state),g=L.geometry(side,p,.7);
    assert.ok(L.shapes.includes(p.shape)&&L.motions.includes(p.motion),`${key}: automatic mapping resolves`);
    same(g.root,L.root,`${key}: automatic pose retains root`);
    if(last)assert.ok(distance(g.tip,last.tip)<.13,`${key}: no jump between adjacent animation frames`);
    last=g;samples++;
  }
  for(const t of [-4.1,-.01,0,.9,2.5,3.999,1e4]) {
    const a=L.geometry(side,L.pose(t,key,side,state),.7),b=L.geometry(side,L.pose(t+L.period,key,side,state),.7);
    a.outline.forEach((point,i)=>same(point,b.outline[i],`${key}: deterministic loop seam`,1e-8));
  }
}
for(const shape of L.shapes)for(const motion of L.motions)for(const side of [-1,1]) {
  const p=L.pose(1.1,'idle',side,{leafShape:shape,leafMotion:motion});
  for(const yaw of [0,Math.PI/2,Math.PI,Math.PI*1.5,Math.PI*2]) {
    const a=L.geometry(side,p,yaw-1e-5),b=L.geometry(side,p,yaw+1e-5);
    a.outline.forEach((point,i)=>assert.ok(distance(point,b.outline[i])<.0002,'continuous contour through principal turn angles'));
    const base=L.geometry(side,p,yaw),loop=L.geometry(side,p,yaw+Math.PI*2);
    base.outline.forEach((point,i)=>same(point,loop.outline[i],'full turn returns to the same blade'));
  }
}
for(const side of [-1,1]) {
  const first=L.geometry(side,L.pose(0,'run',side,{action:'run',speed:0,gait:0}),Math.PI/2);
  const other=L.geometry(side,L.pose(2,'run',side,{action:'run',speed:0,gait:10}),Math.PI/2);
  first.outline.forEach((point,i)=>same(point,other.outline[i],'wind settles when running speed is zero'));
  const upright=L.geometry(side,L.pose(0,'idle',side,{leafShape:'upright',leafMotion:'still'}));
  const droop=L.geometry(side,L.pose(0,'sad',side,{leafShape:'droop',leafMotion:'still'}));
  assert.ok(droop.tip[1]>upright.tip[1]+1,'sad tip visibly lowers rather than only narrowing');
  const early=L.geometry(side,L.pose(.25,'idle',side,{leafMotion:'alternate'}));
  const later=L.geometry(side,L.pose(1.25,'idle',side,{leafMotion:'alternate'}));
  assert.ok(distance(early.tip,later.tip)>.1,'alternating motion visibly changes the leaf');
}
console.log(`PASS Yaya leaves: ${geometries} shape/motion/view geometries, ${keys.length} states, ${samples} continuity samples; fixed stem, contained veins, non-intersecting rounded blades, mirrored volume, seekable loops and run wind settling.`);
