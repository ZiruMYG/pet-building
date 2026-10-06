import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console});context.window=context;
for(const file of ['src/yaya-home-layout.js','src/yaya-home-art.js','src/yaya-rig.js','src/yaya-body.js','src/yaya-home-model.js','src/yaya-home-nav.js'])vm.runInContext(readFileSync(file,'utf8'),context,{filename:file});
const L=context.YayaHomeLayout,N=context.YayaHomeNav,M=context.YayaHomeModel;
const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-8,`${message}: ${a} != ${b}`);
let routes=0,direct=0,samples=0,rounded=0;

// Independent continuous collision oracle. It finds whether any interior
// interval of a rendered line enters a footprint, including between samples.
function safeSegment(room,a,b){
  for(const p of [a,b])assert.ok(p.x>=.4-1e-8&&p.x<=room.w-.4+1e-8&&p.z>=.4-1e-8&&p.z<=room.d-.4+1e-8,'walk stays within room floor');
  for(const f of room.furniture.filter(f=>f.collision!==false&&f.blocks!==false&&!f.mounted)){
    const changes=[0,1];
    for(const [axis,min,max] of [['x',f.x-.43,f.x+f.w+.43],['z',f.z-.43,f.z+f.d+.43]])if(Math.abs(b[axis]-a[axis])>1e-10)for(const edge of [min,max]){const t=(edge-a[axis])/(b[axis]-a[axis]);if(t>0&&t<1)changes.push(t);}
    changes.sort((a,b)=>a-b);
    for(let i=1;i<changes.length;i++){
      const t=(changes[i-1]+changes[i])/2,x=a.x+(b.x-a.x)*t,z=a.z+(b.z-a.z)*t;
      assert.ok(!(x>f.x-.43+1e-8&&x<f.x+f.w+.43-1e-8&&z>f.z-.43+1e-8&&z<f.z+f.d+.43-1e-8),`${room.id}/${f.id}: continuous route clips furniture at ${x},${z}`);
    }
  }
}
function check(room,start,end){
  const points=N.pathfind(room,start,end),route=N.buildRoute(room,points);routes++;
  close(points[0].x,start.x,'preserve exact start X');close(points[0].z,start.z,'preserve exact start Z');
  close(points.at(-1).x,end.x,'preserve exact end X');close(points.at(-1).z,end.z,'preserve exact end Z');
  if(N.clearLine(room,start,end)){
    assert.equal(points.length,2,'unobstructed trips use exactly one diagonal segment');
    close(route.length,distance(start,end),'unobstructed route has Euclidean length');direct++;
  }
  if(route.points.length>points.length)rounded++;
  for(const segment of route.segments)safeSegment(room,segment.a,segment.b);
  for(let i=0;i<=32;i++){
    const p=N.sampleRoute(route,route.length*i/32);samples++;
    assert.ok(!N.blocked(room,p.x,p.z),'arc-length sampling stays clear');
    if(route.length)close(Math.hypot(p.dx,p.dz),1,'heading is a normalized continuous-world direction');
  }
  close(N.sampleRoute(route,0).x,start.x,'sampling begins at actual stance');
  close(N.sampleRoute(route,route.length).z,end.z,'sampling ends at actual target');
  return {points,route};
}

for(const room of L.roomList){
  const targets=[room.spawn,...room.doors.map(d=>L.doorPoint(room,d,1)),...room.furniture.filter(f=>f.approach).map(f=>f.approach),...Object.values(room.anchors).filter(p=>!p.h)];
  if(room.id==='bedroom')for(const key of ['book','teddy'])targets.push(M.approachItem(room,room.anchors[key]));
  const unique=targets.filter((p,i)=>!targets.slice(0,i).some(q=>distance(p,q)<1e-8));
  for(const p of unique)assert.ok(!N.blocked(room,p.x,p.z),`${room.id}: named interaction stance must be on open floor ${JSON.stringify(p)}`);
  for(const start of unique)for(const end of unique)check(room,start,end);
}

const empty={id:'empty',w:10,d:8,furniture:[]};
const diagonal=check(empty,{x:1.027,z:1.018},{x:8.999,z:6.723});
assert.equal(diagonal.points.length,2,'no artificial turn or spawn waypoint in open floor');
check(empty,{x:1.12345,z:1.12345},{x:1.12345,z:1.12345});

const obstacle={id:'obstacle',w:10,d:8,furniture:[{id:'table',x:4,z:2,w:2,d:3}]};
const detour=check(obstacle,{x:1,z:3.6},{x:9,z:3.7});
assert.ok(detour.points.length>2,'a solid table forces a real detour');
assert.ok(detour.route.points.length>detour.points.length,'clear obstacle corners get a rounded turn');
assert.ok(detour.route.length<10.8,'the detour is compact rather than a grid or a trip through the room spawn');
assert.throws(()=>N.pathfind(obstacle,{x:1,z:3},{x:4.7,z:3}),/目标/,'reject a target inside furniture');
assert.throws(()=>N.pathfind(obstacle,{x:4.7,z:3},{x:1,z:3}),/起点/,'reject a blocked starting point rather than tunnelling out');
assert.equal(N.clearLine(obstacle,{x:3.50,z:1.56},{x:3.70,z:1.75}),false,'small diagonal corner clipping must be detected');

// Large overlapping rectangles are one composite obstacle. Traversal may go
// around their union but must not use hidden corners inside the other object.
const overlap={id:'overlap',w:10,d:8,furniture:[{id:'sofa',x:3,z:2,w:2,d:3},{id:'table',x:4,z:4,w:3,d:1}]};
check(overlap,{x:1,z:3},{x:9,z:6});
const contactStance={id:'continuous-contact',w:10,d:8,furniture:[{id:'cabinet',x:4.10,z:2,w:2,d:3}]};
const exactStart={x:3.669,z:3.113};
assert.ok(N.blocked(contactStance,Math.round(exactStart.x/.25)*.25,Math.round(exactStart.z/.25)*.25),'rounding this real contact stance would put it inside the cabinet');
check(contactStance,exactStart,{x:8.3,z:6.7});
const divided={id:'divided',w:10,d:8,furniture:[{id:'barrier',x:4,z:0,w:2,d:8}]};
assert.throws(()=>N.pathfind(divided,{x:1,z:3},{x:8,z:3}),/没有可走/,'do not cross an impassable full-room barrier');

// Decorations never become invisible foot obstacles.
const decorated={...empty,id:'decorated',furniture:[{id:'rug',x:0,z:0,w:10,d:8,collision:false},{id:'lamp',x:0,z:0,w:10,d:8,mounted:true}]};
assert.equal(check(decorated,{x:.7,z:1},{x:9,z:7}).points.length,2);

console.log(JSON.stringify({ok:true,rooms:L.roomList.length,routes,direct,rounded,samples,checks:['exact continuous stances','all ordered interaction and door routes','straight open-floor movement','arc-length speed','every complete segment collision-checked','safe rounded corners','overlapping furniture','blocked route rejection']},null,2));
