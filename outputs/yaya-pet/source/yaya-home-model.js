// One actor moves through a connected house. Furniture footprints constrain
// routes, doors own room changes, and the same solved palms own held objects.
(() => {
 'use strict';
 const L=YayaHomeLayout,PI=Math.PI,U=22.8;
 const clamp=x=>Math.max(0,Math.min(1,x)),ease=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,k)=>a+(b-a)*k;
 const labels={sleep:'上床休息',read:'看绘本',teddy:'抱抱小熊',desk:'坐到书桌旁',window:'看看窗外',wardrobe:'看看衣柜',lamp:'开关床头灯',wander:'在房间走走',wash:'洗洗小手',mirror:'照照镜子',sofa:'坐沙发休息',stretch:'伸个懒腰',wave:'挥手打招呼',eat:'坐下吃饭',drink:'坐下喝水'};
 const room=id=>L.rooms[id],get=(r,id)=>L.getFurniture(r,id);
 const project=(p,r)=>{const q=YayaHomeArt.project(p.x,p.z,p.h||0,r);return Array.isArray(q)?{x:q[0],y:q[1]}:q;};
 const nearYaw=(from,to)=>{while(to-from>PI)to-=2*PI;while(to-from< -PI)to+=2*PI;return to;};
 const restHands=yaw=>Object.fromEntries([-1,1].map(side=>[side,[side*3.48*Math.cos(yaw)+.45*Math.sin(yaw),-3.54]]));
 const holdHands=yaw=>Object.fromEntries([-1,1].map(side=>[side,[Math.sin(yaw)*1.25+side*1.4*Math.cos(yaw),-3.05]]));
 const defaultHands=s=>s.hands||(s.carrying?holdHands(s.yaw):s.heldObject?{...restHands(s.yaw),[s.heldObject.hand]:[.9*Math.sin(s.yaw)+s.heldObject.hand*2*Math.cos(s.yaw),-3.55]}:restHands(s.yaw));
 const blocked=(...a)=>YayaHomeNav.blocked(...a),pathfind=(...a)=>YayaHomeNav.pathfind(...a);
 function bodyTransform(s){const p=project(s.p,room(s.room)),walk=s.motion==='walk',speed=s.speed||0,bob=walk?-.075*Math.abs(Math.sin(s.gait))*speed:0,lean=walk?Math.sin(s.yaw)*.025*speed:0,sq=walk?.015*Math.sin(s.gait*2)*speed:s.squash||0;return {x:p.x,y:p.y+bob*U,rotation:(s.rotation||0)+lean,sx:1+sq*.25,sy:1-sq*.45};}
 function grips(s){const targets=defaultHands(s),tf=bodyTransform(s);return [-1,1].map(side=>{const a=YayaRig.solveArm({side,shoulder:[side*2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw),-3.93],target:targets[side],layer:'front'}),x=a.palm[0]*U*tf.sx,y=a.palm[1]*U*tf.sy;return {...a,screen:{x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)}};});}
 function propLocal(s,arms){if(s.carrying==='book'&&s.phase==='page'){const a=arms.find(a=>a.side===-1);return [(a.palm[0]+1.4)*U,a.palm[1]*U+8];}return [(arms[0].palm[0]+arms[1].palm[0])*U/2,(arms[0].palm[1]+arms[1].palm[1])*U/2+8];}
 function heldScreen(s){const tf=bodyTransform(s),p=propLocal(s,grips(s)),x=p[0]*tf.sx,y=p[1]*tf.sy;return {x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)};}
 function approachItem(r,anchor){
  const target=project(anchor,r);let best=null;
  for(let x=.5;x<r.w-.4;x+=.125)for(let z=.5;z<r.d-.4;z+=.125){if(Math.hypot(x-anchor.x,z-anchor.z)>3||blocked(r,x,z))continue;const p=project({x,z},r);
   for(const yaw of [0,.55,-.55,1.05,-1.05]){let max=0;for(const side of [-1,1]){const dx=(target.x-p.x)/U+side*.9-(side*2.28*Math.cos(yaw)+.45*Math.sin(yaw)),dy=(target.y-8-p.y)/U+3.93;max=Math.max(max,Math.hypot(dx,dy));}
    if(max>2.00)continue;const score=max+Math.abs(yaw)*.15+Math.hypot(x-anchor.x,z-anchor.z)*.09;if(!best||score<best.score)best={x,z,yaw,score};
   }
  }
  if(!best)throw Error(`${r.id}: 物品必须放在短手能触到的柜沿`);return best;
 }
 function approachSocket(r,anchors,yaw,side){
  const root=[side*2.28*Math.cos(yaw)+.45*Math.sin(yaw),-3.93],points=anchors.map(a=>project(a,r));let best;
  for(let x=.5;x<r.w-.4;x+=.125)for(let z=.5;z<r.d-.4;z+=.125){if(blocked(r,x,z)||Math.hypot(x-anchors[0].x,z-anchors[0].z)>2.5)continue;const p=project({x,z},r),reach=Math.max(...points.map(q=>Math.hypot((q.x-p.x)/U-root[0],(q.y-p.y)/U-root[1])));if(reach>1.97)continue;const score=reach+.06*Math.hypot(x-anchors[0].x,z-anchors[0].z);if(!best||score<best.score)best={x,z,score};}
  if(!best)throw Error(`${r.id}: 触控点不在短手可达位置`);return best;
 }
 function create({auto=true,random=Math.random}={}){
  const items={book:{room:'bedroom',anchor:{...room('bedroom').anchors.book},owner:'shelf'},teddy:{room:'bedroom',anchor:{...room('bedroom').anchors.teddy},owner:'shelf'}};
  const s={time:0,room:'bedroom',p:{...room('bedroom').spawn,h:0},yaw:0,gait:0,speed:0,motion:'idle',rotation:0,squash:0,seated:0,hands:null,carrying:null,items,phase:'idle',phaseTime:0,action:null,label:'欢迎来到芽芽的家',auto,pending:null,wait:6,completed:0,doorOpen:{},openFurniture:null,inBed:false,cover:0,sleeping:false,lampOn:true,bookOpen:0,bookPage:0,fade:0,recent:{},history:[],error:null};
  Object.assign(s,{objects:{},roomItems:YayaHomeInteractions.initialize(),heldObject:null,interactionBusy:false,contactHands:null,support:null,notice:null});
  let queue=[],current=null,lastDt=1/60;
  const add=(duration,phase,label,enter,update,finish)=>queue.push({duration,phase,label,enter,update,finish});
  function hold(seconds,phase,label,finish){add(seconds,phase,label,()=>{s.motion='idle';s.speed=0;},()=>{},finish);queue.at(-1).isHold=true;}
  function turn(yaw){let a,b;add(.65,'turn','迈一步，转向要去的地方',()=>{a=s.yaw;b=nearYaw(a,yaw);},k=>{s.yaw=mix(a,b,ease(k));s.turnStep={from:a,to:b,phase:k};},()=>{s.turnStep=null;});}
  function walk(target,label='沿空出来的过道走过去'){
   let route,base,initialYaw,firstYaw,turnTime;
   add(null,'walk',label,()=>{const r=room(s.room),end=typeof target==='function'?target():target;route=YayaHomeNav.buildRoute(r,pathfind(r,s.p,end));base=s.gait;initialYaw=s.yaw;const sample=YayaHomeNav.sampleRoute(route,0),a=project(sample,r),b=project({x:sample.x+sample.dx,z:sample.z+sample.dz},r);firstYaw=route.length<1e-6?s.yaw:nearYaw(s.yaw,Math.atan2(b.x-a.x,b.y-a.y));turnTime=Math.abs(firstYaw-s.yaw)>.1?.65:0;current.duration=route.length<1e-6?.03:turnTime+.3+route.length/1.15;s.motion='walk';s.route=route.points;},k=>{
    const elapsed=k*current.duration,moveTime=current.duration-turnTime,progress=clamp((elapsed-turnTime)/moveTime),distance=ease(progress)*route.length,q=YayaHomeNav.sampleRoute(route,distance);s.p={x:q.x,z:q.z,h:0};
    if(elapsed<turnTime){const ph=elapsed/turnTime;s.yaw=mix(initialYaw,firstYaw,ease(ph));s.turnStep={from:initialYaw,to:firstYaw,phase:ph};}
    else if(route.length>1e-6){s.turnStep=null;const r=room(s.room),a=project(q,r),b=project({x:q.x+q.dx,z:q.z+q.dz},r),heading=nearYaw(s.yaw,Math.atan2(b.x-a.x,b.y-a.y));s.yaw+=Math.max(-6.5*lastDt,Math.min(6.5*lastDt,heading-s.yaw));}
    s.gait=base+distance*PI/.49;s.speed=Math.sin(PI*progress);
   },()=>{s.motion='idle';s.speed=0;s.turnStep=null;s.route=null;});
  }
  function pose(seconds,phase,label,target){let start;add(seconds,phase,label,()=>{start={};for(const key of Object.keys(target))start[key]=s[key];},k=>{for(const key of Object.keys(target))s[key]=mix(start[key],target[key],ease(k));});}
  function hands(target,seconds,phase,label,finish){let a,b;add(seconds,phase,label,()=>{a=defaultHands(s);b=typeof target==='function'?target():target;},k=>{s.hands={};for(const side of [-1,1])s.hands[side]=a[side].map((n,i)=>mix(n,b[side][i],ease(k)));},finish);}
  const contact=key=>{const a=project(s.items[key].anchor,room(s.room)),p=project(s.p,room(s.room));return Object.fromEntries([-1,1].map(side=>[side,[(a.x-p.x)/U+side*.9,(a.y-8-p.y)/U]]));};
  function pick(key){let stance;walk(()=>{stance=approachItem(room(s.room),s.items[key].anchor);return stance;});add(.65,'turn','站稳，看看要拿的东西',()=>{current.from=s.yaw;},k=>{s.yaw=mix(current.from,nearYaw(current.from,stance.yaw),ease(k));});hands(()=>contact(key),1.1,'reach',key==='book'?'两只短手扶住书边':'轻轻扶住小熊',()=>{s.items[key].owner='hand';s.carrying=key;});hands(()=>holdHands(s.yaw),.8,'pick','拿稳了，收进怀里',()=>{s.hands=null;});}
  function put(key){let stance;walk(()=>{stance=approachItem(room(s.room),s.items[key].anchor);return stance;},'带回原来的柜子');add(.65,'turn','转向放东西的位置',()=>{current.from=s.yaw;},k=>{s.yaw=mix(current.from,nearYaw(current.from,stance.yaw),ease(k));});hands(()=>contact(key),1.1,'place','放到柜面，先扶稳',()=>{s.items[key].owner='shelf';s.carrying=null;});hands(()=>restHands(s.yaw),.7,'release','放稳后再收手',()=>{s.hands=null;});}
  function travel(to){const ids=L.roomPath(s.room,to);for(let i=1;i<ids.length;i++){const from=ids[i-1],dest=ids[i],d=room(from).doors.find(d=>d.to===dest),other=room(dest).doors.find(x=>x.id===d.toDoor);const hand=d.wall==='z0'?-1:1,yaw=d.wall==='z0'?2.30:-2.30;
    walk(()=>approachSocket(room(from),[L.doorHandle(d,0),L.doorHandle(d,.10)],yaw,hand),`走到门把手旁，准备${d.label}`);turn(yaw);
    hands(()=>{s.contactHands=[hand];return socketHands(L.doorHandle(d,0),hand);},.7,'door-reach','先握住自己的门把手');
    add(.45,'door-push','小手推开门',()=>{},k=>{s.doorOpen[d.id]=.10*ease(k);s.hands=socketHands(L.doorHandle(d,s.doorOpen[d.id]),hand);});
    hands(()=>restHands(s.yaw),.5,'door-release','松开把手，让门继续打开',()=>{s.hands=null;s.contactHands=null;});
    add(.55,'open-door',d.label,()=>{},k=>{s.doorOpen[d.id]=.10+.90*ease(k);});turn(d.wall==='z0'?2.05:-2.05);let start;
    add(.7,'leave','穿过打开的门',()=>{start={...s.p};},k=>{const target=L.doorPoint(room(from),d,.12),q=ease(k);s.p={x:mix(start.x,target.x,q),z:mix(start.z,target.z,q),h:0};s.motion='walk';s.speed=.4;s.gait+=.05;s.fade=clamp((k-.55)/.45);},()=>{s.room=dest;s.p={...L.doorPoint(room(dest),other,.15),h:0};s.yaw=other.wall==='z0'?-1.08:1.08;s.doorOpen={[other.id]:1};s.fade=1;});
    add(.75,'arrive',`来到${room(dest).label}`,()=>{},k=>{const a=L.doorPoint(room(dest),other,.15),b=L.doorPoint(room(dest),other,1);s.p={x:mix(a.x,b.x,ease(k)),z:mix(a.z,b.z,ease(k)),h:0};s.fade=1-clamp(k/.45);s.motion='walk';s.speed=.4;s.gait+=.05;},()=>{s.motion='idle';s.speed=0;});
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
  function touch(furniture,phase,label){walk(furniture.approach,label);turn(furniture.wall==='x0'?-2.053765:2.053765);hold(2.5,phase,label);}
  // Room meals use real table sockets, never the detached preview's bowl.
  function meal(key){
   const r=room(s.room),chair=get(r,'spare-chair');let low,high,angleLow,angleHigh;
   sitOn(chair,'到自己的餐椅旁坐好');
   const endpoints=()=>{const p=project(s.p,r),b=project(r.anchors[key==='eat'?'bowl':'cup'],r),mouth=[2.55*Math.sin(s.yaw),-3.58];
    angleLow=key==='eat'?PI+.30:0;angleHigh=key==='eat'?PI+.12:-.30;
    const socket=key==='eat'?[1.04,0]:[-.64,-.48];
    const rotate=(v,a)=>[v[0]*Math.cos(a)-v[1]*Math.sin(a),v[0]*Math.sin(a)+v[1]*Math.cos(a)];
    const lo=key==='eat'?[(b.x-p.x)/U,(b.y-p.y)/U-.24]:[(b.x-p.x)/U,(b.y-p.y)/U-.94],off=rotate(socket,angleLow),top=rotate(socket,angleHigh);
    low=[lo[0]-off[0],lo[1]-off[1]];high=[mouth[0]-top[0],mouth[1]-top[1]];
    return {...restHands(s.yaw),[-1]:low};
   };
   hands(endpoints,.9,'meal-reach',key==='eat'?'握住桌边的小勺':'握住水杯的把手',()=>{s.mealProp={kind:key==='eat'?'spoon':'cup',side:-1,angle:angleLow,food:0};});
   add(8,key,key==='eat'?'舀一小勺，送到嘴边，再放回碗里':'拿起自己的杯子，小口喝水，再放回桌上',()=>{},k=>{
    const cycle=(k*2)%1,raise=ease(cycle/.26)*(1-ease((cycle-.58)/.33));
    s.hands={...restHands(s.yaw),[-1]:low.map((n,i)=>mix(n,high[i],raise))};
    s.mealProp={kind:key==='eat'?'spoon':'cup',side:-1,angle:mix(angleLow,angleHigh,raise),food:cycle<.48?raise:0};
   },()=>{s.mealProp=null;s.hands={...restHands(s.yaw),[-1]:low};});
   hands(()=>restHands(s.yaw),.8,'meal-release','把餐具放稳，再收回小手',()=>{s.hands=null;});standFrom(chair);
  }
  function wash(){const r=room(s.room),sink=get(r,'sink'),yaw=sink.washYaw??2.13;
   const rub=(offset=0)=>Object.fromEntries([-1,1].map(side=>[side,[Math.sin(s.yaw)*.85+side*(.64+offset)*Math.cos(s.yaw),-3.30+side*offset*.4]]));
   const rinse=label=>{hands(()=>socketHands(sink.grip,-1),.9,'wash-reach','把侧面的小手伸到水流下');hold(1.4,'wash',label,()=>{s.waterOn=false;});const segment=queue.at(-1),enter=segment.enter;segment.enter=()=>{enter();s.waterOn=true;};hands(()=>restHands(s.yaw),.7,'wash-release','接好水，把小手收回来',()=>{s.hands=null;});};
   walk(sink.approach,'站到自己的低洗手台前');turn(yaw);rinse('一只小手在龙头下面接水');
   turn(.85);hands(()=>rub(),.7,'wash-rub-reach','把湿湿的两只手放在一起');add(2.2,'wash-rub','手心对手心，轻轻搓一搓',()=>{},k=>{s.hands=rub(.09*Math.sin(k*PI*12));});hands(()=>restHands(s.yaw),.6,'wash-rub-release','搓好了，再冲一下',()=>{s.hands=null;});
   turn(yaw);rinse('再冲一下，洗干净了');
  }
  function socketHands(anchor,side=1){const a=project(anchor,room(s.room)),p=project(s.p,room(s.room));return {...restHands(s.yaw),[side]:[(a.x-p.x)/U,(a.y-p.y)/U]};}
  function lamp(){const r=room(s.room),f=get(r,'bedside-lamp'),point={x:f.x+f.w/2+.12,z:f.z+f.d/2,h:f.elevation+.10},yaw=-2.053765;
   walk(()=>approachSocket(r,[point],yaw,1),'走近床头灯的触控底座');turn(yaw);hands(()=>socketHands(point),.9,'lamp-reach','短手轻轻碰到灯座',()=>{s.lampOn=!s.lampOn;});hold(.4,'lamp','灯光轻轻变了');hands(()=>restHands(s.yaw),.7,'lamp-release','收回小手',()=>{s.hands=null;});
  }
  function wardrobe(){const r=room(s.room),f=get(r,'wardrobe'),yaw=-2.053765,max=.55,handle=amount=>YayaHomeArt.wardrobeHandle(f,amount,-1);
   walk(()=>approachSocket(r,[0,.25,max].map(handle),yaw,1),'走近低低的衣柜把手');turn(yaw);hands(()=>socketHands(handle(0)),.9,'wardrobe-reach','握住自己的柜门把手');
   add(1,'wardrobe-open','小手带着柜门打开一点',()=>{},k=>{const amount=max*ease(k);s.openFurniture={id:f.id,amount};s.hands=socketHands(handle(amount));});hold(2,'wardrobe','看看整齐挂好的衣物');
   add(1,'wardrobe-close','扶住把手，轻轻合上柜门',()=>{},k=>{const amount=max*(1-ease(k));s.openFurniture={id:f.id,amount};s.hands=socketHands(handle(amount));},()=>{s.openFurniture=null;});hands(()=>restHands(s.yaw),.7,'wardrobe-release','关好柜门，再松开小手',()=>{s.hands=null;});
  }
  function build(command){queue=[];const spec=command.startsWith('object:')?YayaHomeInteractions.get(s.room,command.slice(7)):null,action=spec?.alias||command;s.action=command;s.behavior=action;s.activeObject=spec?.id||null;s.error=null;s.notice=null;s.recent[command]=s.time;s.recent[action]=s.time;s.history.unshift(spec?.label||(action.startsWith('room:')?`去${room(action.slice(5)).label}`:labels[action]||'走到这里'));s.history=s.history.slice(0,6);
   if(action.startsWith('goto:')){const [x,z]=action.slice(5).split(',').map(Number);walk({x,z},'沿空地直接走过去');return;}
   if(action.startsWith('room:')){s.interactionBusy=true;travel(action.slice(5));hold(.05,'settle','走进房间，站稳了',()=>{s.interactionBusy=false;});return;}
   const r=room(s.room);
   if(spec&&!spec.alias){s.interactionBusy=true;YayaHomeInteractions.build(spec,{s,r,walk,turn,add,hold,hands,pose,sitOn,standFrom,project,restHands,approachSocket,socketHands,ease,mix,wash});hold(.4,'settle','用好了，在这里歇一会儿',()=>{s.interactionBusy=false;s.contactHands=null;s.hands=null;});return;}
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
   else if(action==='mirror'){touch(get(r,'sink'),action,'抬起脸，看看镜子里的自己');hold(.2,'mirror','镜子里的芽芽也在看着你',()=>{(s.objects[r.id+':mirror']??={}).used=true;});}
   else if(action==='window'){const f=get(r,'window');touch(f,'window','走到窗边，看看外面的树');}
   else if(action==='lamp')lamp();
   else if(action==='wave'||action==='stretch'){turn(0);hold(4,action,labels[action]);}
   else{const targets=[{x:7.3,z:6.2},{x:8.0,z:3.5},{x:5.9,z:6.3},{x:3.0,z:7.1}].filter(p=>!blocked(r,p.x,p.z));for(const p of targets.slice(0,2)){walk(p);hold(1,'look','停一下，看看自己的家');}}
   hold(.4,'settle','做完了，在这里歇一会儿');
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
 globalThis.YayaHomeModel={create,labels,project,blocked,pathfind,approachItem,bodyTransform,grips,propLocal,restHands,holdHands,defaultHands,U};
})();
