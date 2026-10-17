// One actor moves through a connected house. Furniture footprints constrain
// routes, doors own room changes, and the same solved palms own held objects.
(() => {
 'use strict';
 const L=YayaHomeLayout,PI=Math.PI,U=22.8;
 // The pet's body is intentionally oversized relative to the floor grid, so
 // a one-unit focus point reads as arm's length on the screen. Keep the
 // telekinetic presentation farther out where the child can see the whole
 // prop clearly without it touching the face or torso.
 const TELEKINETIC_DISTANCE=1.5,TELEKINETIC_MIN=1.35,TELEKINETIC_MAX=1.75;
 // Keep the route solver in world units per second.  The previous 1.15
 // value made even short room crossings feel sluggish on the workbench.
 const WALK_SPEED=1.55;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,k)=>a+(b-a)*k;
 const motionEase=k=>globalThis.YayaMotion?.transition?YayaMotion.transition(k,{anticipation:.10,settle:.14}).action:ease(k);
 const labels={sleep:'上床休息',read:'看绘本',teddy:'抱抱小熊',desk:'坐到书桌旁',window:'看看窗外',wardrobe:'看看衣柜',lamp:'开关床头灯',wander:'在房间走走',wash:'洗洗小手',mirror:'照照镜子',sofa:'坐沙发休息',stretch:'伸个懒腰',wave:'挥手打招呼',eat:'坐下吃饭',drink:'坐下喝水'};
 const room=id=>L.rooms[id],get=(r,id)=>L.getFurniture(r,id);
 const project=(p,r)=>{const q=YayaHomeArt.project(p.x,p.z,p.h||0,r);return Array.isArray(q)?{x:q[0],y:q[1]}:q;};
 // YayaViews yaw is a floor-plane heading: local +z points toward
 // [sin(yaw), cos(yaw)] in room coordinates.  Do not derive this angle from
 // an isometric screen projection.  Screen atan2 folds the room's x/z axes
 // together (and also includes target height), which can make a pet stop at
 // the correct spot while visibly looking away from the prop.
 const worldYaw=(from,to)=>Math.atan2((to.x||0)-(from.x||0),(to.z||0)-(from.z||0));
 const nearYaw=(from,to)=>{while(to-from>PI)to-=2*PI;while(to-from< -PI)to+=2*PI;return to;};
 const restHands=yaw=>Object.fromEntries([-1,1].map(side=>[side,[side*3.48*Math.cos(yaw)+.45*Math.sin(yaw),-3.54]]));
 const holdHands=yaw=>Object.fromEntries([-1,1].map(side=>[side,[Math.sin(yaw)*1.25+side*1.4*Math.cos(yaw),-3.05]]));
 const defaultHands=s=>s.hands||(s.carrying?holdHands(s.yaw):s.heldObject?{...restHands(s.yaw),[s.heldObject.hand]:[.9*Math.sin(s.yaw)+s.heldObject.hand*2*Math.cos(s.yaw),-3.55]}:restHands(s.yaw));
 const blocked=(...a)=>YayaHomeNav.blocked(...a),pathfind=(...a)=>YayaHomeNav.pathfind(...a);
 function bodyTransform(s){const p=project(s.p,room(s.room)),walk=s.motion==='walk',speed=s.speed||0,motion=walk&&globalThis.YayaMotion?.sharedPhase?YayaMotion.sharedPhase(0,{gait:s.gait,speed}):null,bob=motion?.bodyBob??(walk?-.075*Math.abs(Math.sin(s.gait))*speed:0),lean=walk?Math.sin(s.yaw)*.025*speed:0,sq=walk?(motion?.bodySquash??(.015*Math.sin(s.gait*2)*speed)):s.squash||0;return {x:p.x,y:p.y+bob*U,rotation:(s.rotation||0)+lean,sx:1+sq*.25,sy:1-sq*.45};}
 // Return the screen/local position for a controlled prop 1.5 scene units in
 // front of the pet's gaze. The floor-plane heading is the same convention
 // used by YayaViews: local +z points to [sin(yaw), cos(yaw)]. Keeping this
 // conversion here prevents each renderer from inventing its own projected
 // "front" offset, which used to place a prop beside or behind the face at
 // diagonal yaws. `world` remains available as the logical presentation
 // point, while callers keep their actual interaction target separate.
 function frontPresentation(s,r,distance=TELEKINETIC_DISTANCE,height=1.63){
  const yaw=s.yaw||0,from={x:s.p.x,z:s.p.z,h:s.p.h||0};
  // `height` is relative to the pet's current support plane.  This keeps a
  // seated or bed-supported pet's presentation on the same eye line as a
  // standing pet instead of dropping the prop toward the floor.
  const world={x:from.x+Math.sin(yaw)*distance,z:from.z+Math.cos(yaw)*distance,h:from.h+height};
  const a=project(from,r),b=project(world,r),dx=(b.x-a.x)/U,dy=(b.y-a.y)/U,rotation=s.rotation||0;
  // YayaHome.drawPet rotates the local presentation layer with the body while
  // YayaHomeArt.project already accounts for world depth. Undo that small
  // body rotation so the point stays exactly 1.5 scene units along gaze.
  return {x:dx*Math.cos(rotation)+dy*Math.sin(rotation),y:-dx*Math.sin(rotation)+dy*Math.cos(rotation),world,distance,height};
 }
 function grips(s){const targets=defaultHands(s),tf=bodyTransform(s);return [-1,1].map(side=>{const a=YayaRig.solveArm({side,shoulder:[side*2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw),-3.93],target:targets[side],layer:'front'}),x=a.palm[0]*U*tf.sx,y=a.palm[1]*U*tf.sy;return {...a,screen:{x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)}};});}
 function propLocal(s,arms){if(s.carrying==='book'&&s.phase==='page'){const a=arms.find(a=>a.side===-1);return [(a.palm[0]+1.4)*U,a.palm[1]*U+8];}return [(arms[0].palm[0]+arms[1].palm[0])*U/2,(arms[0].palm[1]+arms[1].palm[1])*U/2+8];}
 function heldScreen(s){
  const tf=bodyTransform(s);
  // Legacy book/teddy state is still exposed to the harness, but the visible
  // presentation is now a front-of-face telekinetic float rather than a palm.
  if(s.telekinetic&&s.carrying){const front=frontPresentation(s,room(s.room),TELEKINETIC_DISTANCE,1.63),x=front.x*U*tf.sx,y=front.y*U*tf.sy;return {x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)};}
  const p=propLocal(s,grips(s)),x=p[0]*tf.sx,y=p[1]*tf.sy;return {x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)};
 }
 function approachItem(r,anchor){
  const target=project(anchor,r);let best=null;
  for(let x=.5;x<r.w-.4;x+=.125)for(let z=.5;z<r.d-.4;z+=.125){if(Math.hypot(x-anchor.x,z-anchor.z)>3||blocked(r,x,z))continue;const p=project({x,z},r);
   for(const yaw of [0,.55,-.55,1.05,-1.05]){let max=0;for(const side of [-1,1]){const dx=(target.x-p.x)/U+side*.9-(side*2.28*Math.cos(yaw)+.45*Math.sin(yaw)),dy=(target.y-8-p.y)/U+3.93;max=Math.max(max,Math.hypot(dx,dy));}
    if(max>2.00)continue;const score=max+Math.abs(yaw)*.15+Math.hypot(x-anchor.x,z-anchor.z)*.09;if(!best||score<best.score)best={x,z,yaw,score};
   }
  }
  if(!best)throw Error(`${r.id}: 物品必须放在短手能触到的柜沿`);return best;
 }
 // Aim for the wider 1.5-unit focus buffer. The 1.75u ceiling preserves a
 // usable focus ray when a target sits directly beside a wall or cabinet edge.
 function telekineticItemApproach(r,anchor,preferred=TELEKINETIC_DISTANCE,min=TELEKINETIC_MIN,max=TELEKINETIC_MAX){
  const target=project(anchor,r);let best;
  for(let x=.55;x<r.w-.45;x+=.125)for(let z=.55;z<r.d-.45;z+=.125){
   if(blocked(r,x,z))continue;const distance=Math.hypot(x-anchor.x,z-anchor.z);if(distance<min||distance>max)continue;
   const p=project({x,z},r),yaw=worldYaw({x,z},anchor),dx=anchor.x-x,dz=anchor.z-z;let visible=false;
   for(let q=.92;q>=.12;q-=.04){const fx=x+dx*q,fz=z+dz*q;if(!blocked(r,fx,fz,.43)&&globalThis.YayaHomeNav.clearLine(r,{x,z},{x:fx,z:fz},.43)){visible=true;break;}}
   if(!visible)continue;
   const score=Math.abs(distance-preferred)+Math.abs(Math.atan2(Math.sin(yaw),Math.cos(yaw)))*.015;
   if(!best||score<best.score)best={x,z,yaw,score};
  }
  if(!best)throw Error(`${r.id}: 物品前没有可停下的意念距离`);return best;
 }
 function approachSocket(r,anchors,yaw,side){
  const root=[side*2.28*Math.cos(yaw)+.45*Math.sin(yaw),-3.93],points=anchors.map(a=>project(a,r));let best;
  for(let x=.5;x<r.w-.4;x+=.125)for(let z=.5;z<r.d-.4;z+=.125){if(blocked(r,x,z)||Math.hypot(x-anchors[0].x,z-anchors[0].z)>2.5)continue;const p=project({x,z},r),reach=Math.max(...points.map(q=>Math.hypot((q.x-p.x)/U-root[0],(q.y-p.y)/U-root[1])));if(reach>1.97)continue;const score=reach+.06*Math.hypot(x-anchors[0].x,z-anchors[0].z);if(!best||score<best.score)best={x,z,score};}
  if(!best)throw Error(`${r.id}: 触控点不在短手可达位置`);return best;
 }
  function create({auto=true,random:providedRandom}={}){
  const random=providedRandom||globalThis.YayaProceduralStyle?.seeded('yaya-home-autonomy').next||Math.random;
  const items={book:{room:'bedroom',anchor:{...room('bedroom').anchors.book},owner:'shelf'},teddy:{room:'bedroom',anchor:{...room('bedroom').anchors.teddy},owner:'shelf'}};
  const s={time:0,room:'bedroom',p:{...room('bedroom').spawn,h:0},yaw:0,gait:0,speed:0,motion:'idle',rotation:0,squash:0,seated:0,hands:null,carrying:null,telekinetic:false,telekineticTarget:null,telekineticObject:null,items,phase:'idle',phaseTime:0,action:null,label:'欢迎来到芽芽的家',auto,pending:null,wait:6,completed:0,doorOpen:{},openFurniture:null,inBed:false,cover:0,sleeping:false,lampOn:true,bookOpen:0,bookPage:0,fade:0,recent:{},history:[],error:null};
  Object.assign(s,{objects:{},roomItems:YayaHomeInteractions.initialize(),heldObject:null,interactionBusy:false,contactHands:null,support:null,notice:null});
  let queue=[],current=null,lastDt=1/60;
  const add=(duration,phase,label,enter,update,finish)=>queue.push({duration,phase,label,enter,update,finish});
  function hold(seconds,phase,label,finish){add(seconds,phase,label,()=>{s.motion='idle';s.speed=0;},()=>{},finish);queue.at(-1).isHold=true;}
  function turn(yaw){let a,b;add(.65,'turn','迈一步，转向要去的地方',()=>{a=s.yaw;b=nearYaw(a,typeof yaw==='function'?yaw():yaw);},k=>{s.yaw=mix(a,b,motionEase(k));s.turnStep={from:a,to:b,phase:k};},()=>{s.turnStep=null;});}
  // Keep the gaze vector attached to a moving telekinetic target (for example
  // a drawer handle as the drawer opens). This is deliberately an exact
  // floor-plane aim; the presentation layer may still place the prop one
  // metre in front of the face while the logical target remains elsewhere.
  function aimAt(target){if(!target||!Number.isFinite(target.x)||!Number.isFinite(target.z))return;s.yaw=nearYaw(s.yaw,worldYaw(s.p,target));}
  function walk(target,label='沿空出来的过道走过去'){
   let route,base,initialYaw,firstYaw,turnTime;
   add(null,'walk',label,()=>{const r=room(s.room),end=typeof target==='function'?target():target;route=YayaHomeNav.buildRoute(r,pathfind(r,s.p,end));base=s.gait;initialYaw=s.yaw;const sample=YayaHomeNav.sampleRoute(route,0);firstYaw=route.length<1e-6?s.yaw:nearYaw(s.yaw,worldYaw(sample,{x:sample.x+sample.dx,z:sample.z+sample.dz}));turnTime=Math.abs(firstYaw-s.yaw)>.1?.65:0;current.duration=route.length<1e-6?.03:turnTime+.3+route.length/WALK_SPEED;s.motion='walk';s.route=route.points;},k=>{
    const elapsed=k*current.duration,moveTime=current.duration-turnTime,progress=clamp((elapsed-turnTime)/moveTime),distance=ease(progress)*route.length,q=YayaHomeNav.sampleRoute(route,distance);s.p={x:q.x,z:q.z,h:0};
    if(elapsed<turnTime){const ph=elapsed/turnTime;s.yaw=mix(initialYaw,firstYaw,ease(ph));s.turnStep={from:initialYaw,to:firstYaw,phase:ph};}
    else if(route.length>1e-6){s.turnStep=null;const heading=nearYaw(s.yaw,worldYaw(q,{x:q.x+q.dx,z:q.z+q.dz}));s.yaw+=Math.max(-6.5*lastDt,Math.min(6.5*lastDt,heading-s.yaw));}
    // The gait remains arc-length based, while the speed envelope is bounded
    // and smooth at both ends of the route. This keeps faster travel from
    // making the feet or body pop when a walk starts/ends.
    s.gait=base+distance*PI/.49;s.speed=Math.sin(PI*progress);
   },()=>{s.motion='idle';s.speed=0;s.turnStep=null;s.route=null;});
  }
  function pose(seconds,phase,label,target){let start;add(seconds,phase,label,()=>{start={};for(const key of Object.keys(target))start[key]=s[key];},k=>{for(const key of Object.keys(target))s[key]=mix(start[key],target[key],ease(k));});}
  function hands(target,seconds,phase,label,finish){let a,b;add(seconds,phase,label,()=>{a=defaultHands(s);b=typeof target==='function'?target():target;},k=>{const q=motionEase(k);s.hands={};for(const side of [-1,1])s.hands[side]=a[side].map((n,i)=>mix(n,b[side][i],q));},finish);}
  const contact=key=>{const a=project(s.items[key].anchor,room(s.room)),p=project(s.p,room(s.room));return Object.fromEntries([-1,1].map(side=>[side,[(a.x-p.x)/U+side*.9,(a.y-8-p.y)/U]]));};
  function pick(key){let stance;walk(()=>{stance=telekineticItemApproach(room(s.room),s.items[key].anchor);return stance;},'走到物体前一段距离');add(.65,'turn','站稳，看看要拿的东西',()=>{current.from=s.yaw;},k=>{s.yaw=mix(current.from,nearYaw(current.from,stance.yaw),ease(k));});add(.48,'mind-focus','停下来，盯住物体发动意念',()=>{s.telekinetic=true;s.telekineticTarget=s.items[key].anchor;},()=>{s.telekinetic=true;s.telekineticTarget=s.items[key].anchor;});add(.72,'reach','物体浮到眼前',()=>{s.items[key].owner='hand';s.carrying=key;s.telekineticObject={id:key,kind:key};s.telekinetic=true;s.telekineticTarget=s.items[key].anchor;s.hands=null;},()=>{s.telekinetic=true;});}
  function put(key){let stance;walk(()=>{stance=telekineticItemApproach(room(s.room),s.items[key].anchor);return stance;},'带着物体走到原位前一段距离');add(.65,'turn','转向放东西的位置',()=>{current.from=s.yaw;},k=>{s.yaw=mix(current.from,nearYaw(current.from,stance.yaw),ease(k));});add(.48,'mind-focus','停下来，让物体回到原位',()=>{s.telekinetic=true;s.telekineticTarget=s.items[key].anchor;},()=>{s.telekinetic=true;s.telekineticTarget=s.items[key].anchor;});add(.72,'place','物体稳稳回到柜面',()=>{s.items[key].owner='shelf';s.carrying=null;s.telekineticObject=null;s.telekineticTarget=null;s.hands=null;},()=>{s.telekinetic=true;});}
  // The direction of a doorway is derived from its actual floor threshold.
  // Hard-coded diagonal yaws made z1 crossings face back toward the old room,
  // so the actor appeared to reverse through the opening.  The renderer and
  // walk controller both use screen-projected headings; keeping this helper
  // here makes the crossing pose agree with the path on every room edge.
  function doorInwardYaw(r,d,inset=.68,inner=1){
    const a=project(L.doorPoint(r,d,inset),r),b=project(L.doorPoint(r,d,inner),r);
    return worldYaw({x:L.doorPoint(r,d,inset).x,z:L.doorPoint(r,d,inset).z},{x:L.doorPoint(r,d,inner).x,z:L.doorPoint(r,d,inner).z});
  }
  function travel(to){const ids=L.roomPath(s.room,to);for(let i=1;i<ids.length;i++){const from=ids[i-1],dest=ids[i],d=room(from).doors.find(d=>d.to===dest),other=room(dest).doors.find(x=>x.id===d.toDoor),edgeInfo=wall=>{const axis=wall[0],max=wall.endsWith('1');return {hand:axis==='z'?(max?1:-1):(max?-1:1),yaw:axis==='z'?(max?-2.30:2.30):(max?2.30:-2.30)};},entry=edgeInfo(d.wall),arrival=edgeInfo(other.wall),hand=entry.hand,yaw=entry.yaw,arrivalYaw=doorInwardYaw(room(dest),other),entryStance={};
    walk(()=>{const stance=approachSocket(room(from),[L.doorHandle(d,0),L.doorHandle(d,.10)],yaw,hand);entryStance.x=stance.x;entryStance.z=stance.z;return stance;},`走到门把手旁，准备${d.label}`);turn(yaw);
    hands(()=>{s.contactHands=[hand];return socketHands(L.doorHandle(d,0),hand);},.7,'door-reach','先握住自己的门把手');
    add(.45,'door-push','小手推开门',()=>{},k=>{s.doorOpen[d.id]=.10*ease(k);s.hands=socketHands(L.doorHandle(d,s.doorOpen[d.id]),hand);});
    hands(()=>restHands(s.yaw),.5,'door-release','松开把手，让门继续打开',()=>{s.hands=null;s.contactHands=null;});
    add(.55,'open-door',d.label,()=>{},k=>{s.doorOpen[d.id]=.10+.90*ease(k);});
    // Face the threshold while leaving the source room.  The handle stance
    // can be offset diagonally from the opening, so derive this heading from
    // the actual stance-to-threshold segment instead of a wall-name constant.
    // The paired room gets its own inward heading after the fade.
    turn(()=>worldYaw(entryStance,L.doorPoint(room(from),d,.68)));let start;
    // Keep the actor just inside the collision-safe floor boundary while
    // crossing an exposed-edge threshold. The visual door still opens at the
    // edge, but navigation never asks the solver to stand in the wall band.
    add(.7,'leave','穿过打开的门',()=>{start={...s.p};},k=>{const target=L.doorPoint(room(from),d,.68),q=ease(k);s.p={x:mix(start.x,target.x,q),z:mix(start.z,target.z,q),h:0};s.motion='walk';s.speed=.4;s.gait+=.05;s.fade=clamp((k-.55)/.45);},()=>{s.room=dest;s.p={...L.doorPoint(room(dest),other,.68),h:0};
      // Preserve the continuous angle branch at the room hand-off.  The
      // paired doorway can have an equivalent ±2π heading, but selecting the
      // nearest representative prevents an apparent snap or backward pivot.
      s.yaw=nearYaw(s.yaw,arrivalYaw);s.doorOpen={[other.id]:1};s.fade=1;});
    add(.75,'arrive',`来到${room(dest).label}`,()=>{},k=>{const a=L.doorPoint(room(dest),other,.68),b=L.doorPoint(room(dest),other,1);s.p={x:mix(a.x,b.x,ease(k)),z:mix(a.z,b.z,ease(k)),h:0};s.fade=1-clamp(k/.45);s.motion='walk';s.speed=.4;s.gait+=.05;},()=>{s.motion='idle';s.speed=0;});
    add(.4,'close-door','门缓缓回合，站稳再走',()=>{},k=>{s.doorOpen[other.id]=1-ease(k);},()=>{s.doorOpen={};});
   }turn(0);
  }
  function sitOn(furniture,label){let a,b;walk(furniture.approach,label);turn(furniture.seatYaw??0);add(1.0,'sit',label,()=>{a={...s.p};s.seatFurniture=furniture.id;b=furniture.seat||{x:furniture.x+furniture.w/2,z:furniture.z+furniture.d/2,h:furniture.h};},k=>{const q=ease(k);s.p={x:mix(a.x,b.x,q),z:mix(a.z,b.z,q),h:mix(0,b.h,q)+.15*Math.sin(PI*k)};s.seated=q;});}
  function standFrom(furniture){let a;add(1,'stand','小脚落地，站稳再走',()=>{a={...s.p};},k=>{const q=ease(k);s.p={x:mix(a.x,furniture.approach.x,q),z:mix(a.z,furniture.approach.z,q),h:a.h*(1-q)};s.seated=1-q;},()=>{s.seatFurniture=null;});}
  function sleep(){const bed=get(s.room,'bed');walk(bed.approach,'走到自己的床边');turn(-1.08);let start,startYaw,endYaw;
   add(1.2,'climb','蹬一下小脚，坐到床沿',()=>{start={...s.p};s.inBed=true;s.cover=1;},k=>{const q=ease(k),b=bed.sit;s.p={x:mix(start.x,b.x,q),z:mix(start.z,b.z,q),h:mix(0,b.h,q)+.22*Math.sin(PI*k)};s.seated=q;});
   turn(0);hold(.6,'bed-sit','在床边坐稳');
   add(1.8,'lie-down','后脑慢慢靠上枕头',()=>{start={...s.p};startYaw=s.yaw;endYaw=nearYaw(startYaw,1.28);},k=>{const q=ease(k);s.p={x:mix(start.x,bed.x+bed.w-.62,q),z:mix(start.z,bed.z+bed.d/2,q),h:mix(start.h,bed.h+.50,q)};s.rotation=-Math.atan2(.82,.43)*q;s.yaw=mix(startYaw,endYaw,q);s.seated=1-q;},()=>{s.sleeping=true;});
   hold(1.2,'cover','小脚已经藏进铺好的被子里');hold(7,'sleep','躺在枕头上，安静睡一会儿');hold(1.1,'uncover','醒来了，准备从被子里坐起来');
   add(1.7,'sit-up','慢慢坐起来',()=>{start={...s.p};startYaw=s.yaw;endYaw=nearYaw(startYaw,0);s.sleeping=false;},k=>{const q=ease(k),b=bed.sit;s.p={x:mix(start.x,b.x,q),z:mix(start.z,b.z,q),h:mix(start.h,b.h,q)};s.rotation=-Math.atan2(.82,.43)*(1-q);s.yaw=mix(startYaw,endYaw,q);s.seated=q;});hold(.6,'bed-sit','坐稳了再下床');
   add(1.15,'climb-down','小脚落回地面',()=>{start={...s.p};},k=>{const q=ease(k),b=bed.approach;s.p={x:mix(start.x,b.x,q),z:mix(start.z,b.z,q),h:start.h*(1-q)+.12*Math.sin(PI*k)};s.seated=1-q;},()=>{s.inBed=false;});
  }
  function touch(furniture,phase,label){
   const r=room(s.room),anchor={x:furniture.x+furniture.w*.5,z:furniture.z+furniture.d*.5,h:(furniture.h||1)+.35};
   // Wall-mounted windows and mirrors already own a safe viewing approach;
   // use it instead of searching through the wall's collision slab.
   const approach=furniture.approach||(furniture.kind==='mirror'?get(r,'sink')?.approach:null);
   const stance=approach?{...approach,yaw:worldYaw(approach,anchor)}:telekineticItemApproach(r,anchor,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);
   walk(stance,label);turn(stance.yaw);
   add(.48,'mind-focus','停在目标前一段距离，发动意念',()=>{s.telekinetic=true;s.telekineticTarget=anchor;},()=>{s.telekinetic=true;s.telekineticTarget=anchor;});
   hold(2.5,phase,label,()=>{s.telekineticTarget=null;});
  }
  // Room meals use real table sockets, never the detached preview's bowl.
  function meal(key){
   const r=room(s.room),chair=get(r,'spare-chair'),anchor=r.anchors[key==='eat'?'bowl':'cup'];let angleLow=key==='eat'?PI+.30:0,angleHigh=key==='eat'?PI+.12:-.30;
   sitOn(chair,'到自己的餐椅旁坐好');
   // The cup and bowl occupy different sockets on the table. Re-aim after
   // sitting so the face follows the utensil rather than inheriting the
   // chair's generic forward direction.
   turn(()=>worldYaw(s.p,anchor));
   add(.55,'meal-reach','停在餐桌前，让餐具悬浮起来',()=>{s.telekinetic=true;s.telekineticTarget=anchor;s.mealProp={kind:key==='eat'?'spoon':'cup',side:-1,angle:angleLow,food:0};},()=>{s.telekinetic=true;s.telekineticTarget=anchor;});
   add(8,key,key==='eat'?'小勺悬浮着舀一口，送到嘴边，再回到碗里':'水杯悬浮着送到嘴边，小口喝水，再回到桌上',()=>{},k=>{
    const cycle=(k*2)%1,raise=ease(cycle/.26)*(1-ease((cycle-.58)/.33));
    s.telekinetic=true;s.telekineticTarget=anchor;
    s.mealProp={kind:key==='eat'?'spoon':'cup',side:-1,angle:mix(angleLow,angleHigh,raise),food:cycle<.48?raise:0};
   },()=>{s.mealProp=null;s.telekineticTarget=null;});
   add(.8,'meal-release','餐具回到桌面，再收回意念',()=>{},()=>{},()=>{s.mealProp=null;s.telekineticTarget=null;s.hands=null;});standFrom(chair);
  }
  function wash(){const r=room(s.room),sink=get(r,'sink'),yaw=sink.washYaw??2.13;
   const rub=(offset=0)=>Object.fromEntries([-1,1].map(side=>[side,[Math.sin(s.yaw)*.85+side*(.64+offset)*Math.cos(s.yaw),-3.30+side*offset*.4]]));
   const rinse=label=>{hands(()=>socketHands(sink.grip,-1),.9,'wash-reach','把侧面的小手伸到水流下');hold(1.4,'wash',label,()=>{s.waterOn=false;});const segment=queue.at(-1),enter=segment.enter;segment.enter=()=>{enter();s.waterOn=true;};hands(()=>restHands(s.yaw),.7,'wash-release','接好水，把小手收回来',()=>{s.hands=null;});};
   walk(sink.approach,'站到自己的低洗手台前');turn(yaw);rinse('一只小手在龙头下面接水');
   turn(.85);hands(()=>rub(),.7,'wash-rub-reach','把湿湿的两只手放在一起');add(2.2,'wash-rub','手心对手心，轻轻搓一搓',()=>{},k=>{s.hands=rub(.09*Math.sin(k*PI*12));});hands(()=>restHands(s.yaw),.6,'wash-rub-release','搓好了，再冲一下',()=>{s.hands=null;});
   turn(yaw);rinse('再冲一下，洗干净了');
  }
  function socketHands(anchor,side=1){const a=project(anchor,room(s.room)),p=project(s.p,room(s.room));return {...restHands(s.yaw),[side]:[(a.x-p.x)/U,(a.y-p.y)/U]};}
  function lamp(){const r=room(s.room),f=get(r,'bedside-lamp'),point={x:f.x+f.w/2+.12,z:f.z+f.d/2,h:f.elevation+.10},stance=telekineticItemApproach(r,point,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);
   walk(stance,'走到床头灯前一段距离');turn(stance.yaw);
   add(.48,'mind-focus','停在灯前，发动意念',()=>{s.telekinetic=true;s.telekineticTarget=point;},()=>{s.telekinetic=true;s.telekineticTarget=point;});
   add(.9,'lamp','灯光响应意念，轻轻亮起',()=>{s.lampOn=!s.lampOn;},()=>{s.telekinetic=true;s.telekineticTarget=point;},()=>{s.telekineticTarget=null;});
   add(.45,'mind-release','收回意念',()=>{},()=>{s.telekinetic=true;},()=>{s.telekinetic=false;s.telekineticTarget=null;s.hands=null;});
  }
  function wardrobe(){const r=room(s.room),f=get(r,'wardrobe'),max=.55,handle=amount=>YayaHomeArt.wardrobeHandle(f,amount,-1),point=handle(0),stance=telekineticItemApproach(r,point,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);
   walk(stance,'走到衣柜前一段距离');turn(stance.yaw);
   add(.48,'mind-focus','停在衣柜前，发动意念',()=>{s.telekinetic=true;s.telekineticTarget=point;},()=>{s.telekinetic=true;s.telekineticTarget=point;});
   // The moving door handle is an animation detail, not the focus point. Keep
   // the gaze and wider standoff anchored to the wardrobe face while the
   // authored handle arc plays in the furniture layer.
   add(1,'wardrobe-open','柜门响应意念打开一点',()=>{},k=>{const amount=max*ease(k);s.openFurniture={id:f.id,amount};s.telekineticTarget=point;aimAt(point);});hold(2,'wardrobe','看看整齐挂好的衣物');
   add(1,'wardrobe-close','柜门响应意念轻轻合好',()=>{},k=>{const amount=max*(1-ease(k));s.openFurniture={id:f.id,amount};s.telekineticTarget=point;aimAt(point);},()=>{s.openFurniture=null;});
   add(.45,'mind-release','收回意念',()=>{},()=>{s.telekinetic=true;},()=>{s.telekinetic=false;s.telekineticTarget=null;s.hands=null;});
  }
  function build(command){queue=[];const spec=command.startsWith('object:')?YayaHomeInteractions.get(s.room,command.slice(7)):null,action=spec?.alias||command;s.action=command;s.behavior=action;s.activeObject=spec?.id||null;s.error=null;s.notice=null;s.recent[command]=s.time;s.recent[action]=s.time;s.history.unshift(spec?.label||(action.startsWith('room:')?`去${room(action.slice(5)).label}`:labels[action]||'走到这里'));s.history=s.history.slice(0,6);
   if(action.startsWith('goto:')){const [x,z]=action.slice(5).split(',').map(Number);walk({x,z},'沿空地直接走过去');return;}
   if(action.startsWith('room:')){s.interactionBusy=true;travel(action.slice(5));hold(.05,'settle','走进房间，站稳了',()=>{s.interactionBusy=false;});return;}
   const r=room(s.room);
   if(spec&&!spec.alias){s.interactionBusy=true;YayaHomeInteractions.build(spec,{s,r,walk,turn,aimAt,add,hold,hands,pose,sitOn,standFrom,project,restHands,approachSocket,socketHands,ease,mix,wash});hold(.4,'settle','用好了，在这里歇一会儿',()=>{s.interactionBusy=false;s.contactHands=null;s.hands=null;s.telekinetic=false;s.telekineticTarget=null;s.telekineticObject=null;s.waterTarget=null;});return;}
   if(action==='read'||action==='teddy'){
    const key=action==='read'?'book':'teddy';pick(key);walk(r.anchors.read||r.anchors.rest,'带到柔软的地毯上');turn(0);pose(.7,'sit','在地毯上坐好',{seated:1,squash:.12});
    if(key==='book'){pose(.7,'open-book','打开绘本',{bookOpen:1});hold(3,'read','低头看看书里的图画');add(1.5,'page','一只手托住书，另一只手翻页',()=>{},k=>{s.bookPage=ease(k);s.hands=holdHands(s.yaw);s.hands[1][0]-=.56*Math.sin(PI*k)**2;s.hands[1][1]-=.24*Math.sin(PI*k)**2;},()=>{s.hands=null;});hold(3,'read','再看看这一页');pose(.7,'close-book','把绘本合好',{bookOpen:0});}
    else add(5,'hug','把小熊轻轻抱在怀里',()=>{},k=>{const q=Math.sin(PI*k*2)**2;s.hands=holdHands(s.yaw);s.hands[-1][0]+=.16*q;s.hands[1][0]-=.16*q;s.rotation=.025*Math.sin(PI*k*2);},()=>{s.rotation=0;s.hands=null;});
    pose(.7,'stand','抱好东西，站起来',{seated:0,squash:0});put(key);
   }else if(action==='sleep')sleep();
   else if(action==='desk'||action==='sofa'){const f=get(r,action==='desk'?'desk-chair':'sofa');sitOn(f,action==='desk'?'走到书桌前，坐好':'走到沙发旁，坐下来');hold(5,action,action==='desk'?'坐在自己的书桌前，安静看看':'靠着软软的沙发歇一会儿');standFrom(f);}
   else if(action==='eat'||action==='drink')meal(action);
   else if(action==='wardrobe')wardrobe();
   else if(action==='wash')wash();
   else if(action==='mirror'){touch(get(r,'mirror')||get(r,'sink'),action,'抬起脸，看看镜子里的自己');hold(.2,'mirror','镜子里的芽芽也在看着你',()=>{(s.objects[r.id+':mirror']??={}).used=true;});}
   else if(action==='window'){const f=get(r,'window');touch(f,'window','走到窗边，看看外面的树');}
   else if(action==='lamp')lamp();
   else if(action==='wave'||action==='stretch'){turn(0);hold(4,action,labels[action]);}
   else{const targets=[{x:7.3,z:6.2},{x:8.0,z:3.5},{x:5.9,z:6.3},{x:3.0,z:7.1}].filter(p=>!blocked(r,p.x,p.z));for(const p of targets.slice(0,2)){walk(p);hold(1,'look','停一下，看看自己的家');}}
   hold(.4,'settle','做完了，在这里歇一会儿',()=>{s.telekinetic=false;s.telekineticTarget=null;s.telekineticObject=null;s.waterTarget=null;s.contactHands=null;s.hands=null;});
  }
  function enter(){if(s.pending&&!s.carrying&&!s.heldObject&&!s.interactionBusy&&!s.support&&!s.inBed&&!s.hands&&s.seated<.01){const key=s.pending;s.pending=null;build(key);}current=queue.shift();if(!current){s.action=null;s.behavior=null;s.activeObject=null;s.phase='idle';s.label='在家里安静歇一会儿';s.wait=7+random()*7;s.motion='idle';s.speed=0;s.completed++;return;}s.phase=current.phase;s.label=current.label;s.phaseTime=0;current.enter?.();}
  function fail(error){s.error=error.message;s.label='这里的通道暂时走不过去';s.auto=false;current=null;queue=[];s.action=null;s.motion='idle';s.speed=0;}
  function request(key){if(typeof key!=='string')return false;if(key===s.action||key===s.pending)return true;const object=key.startsWith('object:')&&YayaHomeInteractions.get(s.room,key.slice(7)),destination=key.startsWith('goto:');if(!object&&!destination&&!key.startsWith('room:')&&!room(s.room).activities.includes(key)&&!(key==='lamp'&&get(s.room,'bedside')))return false;if((object||destination)&&s.action?.startsWith('room:')){s.notice='先走进目的房间，再选择这里的物品';return false;}if(destination){const v=key.slice(5).split(',').map(Number);if(v.length!==2||!v.every(Number.isFinite)||blocked(room(s.room),v[0],v[1])){s.notice='那里有家具挡住，选一块空地吧';return false;}}if(key.startsWith('room:')&&!L.rooms[key.slice(5)])return false;try{if(current){s.pending=key;if(current.isHold)current.duration=Math.min(current.duration,s.phaseTime+.4);for(const task of queue)if(task.isHold)task.duration=Math.min(task.duration,.4);}else{build(key);enter();}return true;}catch(error){fail(error);return false;}}
  function step(dt){if(!Number.isFinite(dt)||dt<=0)return;dt=Math.min(.05,dt);lastDt=dt;s.time+=dt;try{if(!current){s.wait-=dt;if(s.auto&&s.wait<=0){
    const routines={bedroom:['object:desk','object:plant'],ensuite:['object:towel','object:shower','object:toilet'],living:['object:toy-basket','object:coffee-table','object:plant'],kitchen:['object:prep-counter','object:sink-counter','object:stove']};
    const extras=(routines[s.room]||[]).filter(k=>s.recent[k]===undefined||s.time-s.recent[k]>180),base=room(s.room).activities.filter(k=>!['wardrobe','mirror','desk','wander'].includes(k)&&(s.recent[k]===undefined||s.time-s.recent[k]>60));
    const choices=extras.length&&(s.completed%3===2||!base.length)?extras:base;
    const neighbors=room(s.room).doors.map(d=>d.to).filter(id=>['bedroom','ensuite','living','kitchen'].includes(id)&&(s.recent['room:'+id]===undefined||s.time-s.recent['room:'+id]>90));
    if(['guestroom','bathroom'].includes(s.room))request('room:living');
    else if(s.completed>1&&neighbors.length&&(!choices.length||random()<.20))request('room:'+neighbors[Math.floor(random()*neighbors.length)]);
    else if(choices.length)request(choices[Math.floor(random()*choices.length)]);else s.wait=4;
   }return;}s.phaseTime=Math.min(current.duration,s.phaseTime+dt);current.update?.(clamp(s.phaseTime/current.duration));if(s.phaseTime>=current.duration-1e-8){current.finish?.();enter();}}catch(error){fail(error);}}
  function getState(){const out=JSON.parse(JSON.stringify(s));out.u=U;out.grips=grips(s);out.heldScreen=s.carrying?heldScreen(s):null;out.remaining=current?current.duration-s.phaseTime:0;out.queueLength=queue.length;return out;}
  return {step,request,setRoom:id=>request('room:'+id),setAuto:value=>{s.auto=!!value;s.wait=Math.min(s.wait,3);},getState};
 }
  globalThis.YayaHomeModel={create,labels,project,worldYaw,blocked,pathfind,approachItem,bodyTransform,frontPresentation,grips,propLocal,restHands,holdHands,defaultHands,U,telekineticRange:{distance:TELEKINETIC_DISTANCE,min:TELEKINETIC_MIN,max:TELEKINETIC_MAX}};
})();
