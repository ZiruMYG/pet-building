/* Continuous floor navigation for the home. Room units, not screen pixels.
 * Unobstructed trips are a single straight segment. Furniture is expanded by
 * the actor's floor clearance; a visibility graph supplies arbitrary-angle
 * detours. No grid snapping is applied to actual hand-contact or door stances.
 */
(() => {
  'use strict';
  const PAD=.43,WALL=.40,EPS=1e-8,CORNER_SPACE=.08;
  const distance=(a,b)=>Math.hypot(b.x-a.x,b.z-a.z);
  const point=p=>({x:p.x,z:p.z});
  const obstacles=r=>r.furniture.filter(o=>o.collision!==false&&o.blocks!==false&&!o.mounted);
  const bounds=(o,pad)=>({x0:o.x-pad,x1:o.x+o.w+pad,z0:o.z-pad,z1:o.z+o.d+pad});
  function blocked(r,x,z,pad=PAD){
    if(!Number.isFinite(x)||!Number.isFinite(z)||x<WALL-EPS||z<WALL-EPS||x>r.w-WALL+EPS||z>r.d-WALL+EPS)return true;
    return obstacles(r).some(o=>x>o.x-pad+EPS&&x<o.x+o.w+pad-EPS&&z>o.z-pad+EPS&&z<o.z+o.d+pad-EPS);
  }
  // An exact slab test, including very short segments and diagonal corner
  // crossings. Open obstacle boundaries permit a mathematically tangent path.
  function entersBox(a,b,q){
    let lo=0,hi=1;
    for(const [axis,min,max] of [['x',q.x0,q.x1],['z',q.z0,q.z1]]){
      const d=b[axis]-a[axis];
      if(Math.abs(d)<EPS){if(a[axis]<=min+EPS||a[axis]>=max-EPS)return false;continue;}
      let near=(min-a[axis])/d,far=(max-a[axis])/d;
      if(near>far)[near,far]=[far,near];
      lo=Math.max(lo,near);hi=Math.min(hi,far);
      if(lo>=hi-EPS)return false;
    }
    return hi>EPS&&lo<1-EPS&&hi-lo>EPS;
  }
  function clearLine(r,a,b,pad=PAD){
    if(blocked(r,a.x,a.z,pad)||blocked(r,b.x,b.z,pad))return false;
    return !obstacles(r).some(o=>entersBox(a,b,bounds(o,pad)));
  }
  function corners(r,pad,space){
    const vertices=[];
    for(const o of obstacles(r)){
      const q=bounds(o,pad+space);
      for(const p of [{x:q.x0,z:q.z0},{x:q.x1,z:q.z0},{x:q.x1,z:q.z1},{x:q.x0,z:q.z1}]){
        if(!blocked(r,p.x,p.z,pad)&&!vertices.some(v=>distance(p,v)<EPS))vertices.push(p);
      }
    }
    return vertices;
  }
  function graphPath(r,start,end,pad,space){
    const nodes=[point(start),point(end),...corners(r,pad,space)],cost=nodes.map(()=>Infinity),previous=[],closed=new Set();
    cost[0]=0;
    while(closed.size<nodes.length){
      let current=-1,best=Infinity;
      for(let i=0;i<nodes.length;i++){
        const estimate=cost[i]+distance(nodes[i],end);
        if(!closed.has(i)&&estimate<best){current=i;best=estimate;}
      }
      if(current<0)break;
      if(current===1){const route=[];for(let at=1;at!==undefined;at=previous[at])route.unshift(nodes[at]);return route;}
      closed.add(current);
      for(let next=0;next<nodes.length;next++){
        if(closed.has(next))continue;
        const candidate=cost[current]+distance(nodes[current],nodes[next]);
        if(candidate+EPS>=cost[next]||!clearLine(r,nodes[current],nodes[next],pad))continue;
        cost[next]=candidate;previous[next]=current;
      }
    }
    return null;
  }
  function pathfind(r,start,end,options={}){
    const pad=options.pad??PAD;
    for(const [name,p] of [['起点',start],['目标',end]])if(blocked(r,p.x,p.z,pad))throw Error(`${r.id}: ${name}位于家具内或房间外 (${p.x.toFixed(2)},${p.z.toFixed(2)})`);
    // Important: do this before choosing navigation vertices. Open-floor walks
    // must never inherit orthogonal segments or a detour through room.spawn.
    if(clearLine(r,start,end,pad))return [point(start),point(end)];
    const space=Math.max(.0001,options.cornerSpace??CORNER_SPACE);
    const result=graphPath(r,start,end,pad,space)||graphPath(r,start,end,pad,.0001);
    if(!result)throw Error(`${r.id}: 家具之间没有可走的路线`);
    return result;
  }
  function lerp(a,b,t){return {x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t};}
  // The rounded route is deliberately stored as verified straight segments.
  // Every rendered interpolation is therefore covered by the exact slab test,
  // rather than relying on a handful of collision-free curve samples.
  function buildRoute(r,points,options={}){
    const pad=options.pad??PAD,radius=Math.max(0,options.radius??.28),out=[point(points[0])];
    for(let i=1;i<points.length-1;i++){
      const a=points[i-1],b=points[i],c=points[i+1],incoming=distance(a,b),outgoing=distance(b,c);
      let rounded=null,size=Math.min(radius,incoming*.34,outgoing*.34);
      for(let attempt=0;attempt<7&&size>.002;attempt++,size*=.5){
        const entry=lerp(b,a,size/incoming),exit=lerp(b,c,size/outgoing),curve=[entry];
        for(let n=1;n<=10;n++){const t=n/10,u=1-t;curve.push({x:u*u*entry.x+2*u*t*b.x+t*t*exit.x,z:u*u*entry.z+2*u*t*b.z+t*t*exit.z});}
        const chain=[out.at(-1),...curve,c];
        if(chain.slice(1).every((p,n)=>clearLine(r,chain[n],p,pad))){rounded=curve;break;}
      }
      if(rounded)out.push(...rounded);else out.push(point(b));
    }
    if(points.length>1)out.push(point(points.at(-1)));
    const compact=out.filter((p,i)=>!i||distance(p,out[i-1])>EPS),segments=[];
    let length=0;
    for(let i=1;i<compact.length;i++){
      const a=compact[i-1],b=compact[i],d=distance(a,b);
      if(!clearLine(r,a,b,pad))throw Error(`${r.id}: 圆滑路线没有足够净空`);
      segments.push({a,b,start:length,length:d});length+=d;
    }
    return {points:compact,segments,length,total:length};
  }
  function sampleRoute(route,travelled){
    const d=Math.max(0,Math.min(route.length,Number.isFinite(travelled)?travelled:0));
    const segment=route.segments.find(s=>d<=s.start+s.length+EPS)||route.segments.at(-1);
    if(!segment)return {...route.points[0],dx:0,dz:0,distance:0,progress:1};
    const t=Math.max(0,Math.min(1,(d-segment.start)/segment.length)),p=lerp(segment.a,segment.b,t);
    return {...p,dx:(segment.b.x-segment.a.x)/segment.length,dz:(segment.b.z-segment.a.z)/segment.length,distance:d,progress:route.length?d/route.length:1};
  }
  globalThis.YayaHomeNav={blocked,clearLine,pathfind,buildRoute,sampleRoute,constants:{pad:PAD,wall:WALL,cornerSpace:CORNER_SPACE}};
})();
