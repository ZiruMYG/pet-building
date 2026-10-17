// Every selectable object owns a complete approach/use/release sequence.
// Coordinates are shared with the furniture and prop renderers.
(() => {
 'use strict';
 const L=()=>YayaHomeLayout,PI=Math.PI,U=22.8;
 // The pet's visible body is larger than one floor unit, so even the previous
 // 1.5u buffer could read as touching the furniture. Keep a wider shared
 // focus range, with extra clearance for watering and desk work.
 const TELEKINETIC_DISTANCE=1.8,TELEKINETIC_MIN=1.65,TELEKINETIC_MAX=2.10;
 const TELEKINETIC_WATERING={distance:2.2,min:2.0,max:2.45};
 const TELEKINETIC_PENCIL={distance:2.1,min:1.95,max:2.30};
 const descriptions={bed:['整理小床','抚平被子，再离开床边'],bedside:['打开床头柜','停在柜前，让抽屉自己打开再合好'],wardrobe:['看看衣柜','停在柜前，让柜门自己打开再合好'],bookshelf:['翻看书柜','停在低柜前，让抽屉自己打开再合好'],desk:['在书桌画画','坐到自己的椅子上，让小笔浮起来画几笔'],chair:['坐在椅子上','从空着的一侧坐下，小脚自然垂着'],rug:['在地毯上伸展','走到毯子上，站稳后伸个懒腰'],window:['去窗前看看','走到窗边，停下来看看外面的树'],ac:['调节空气','停在设备前，让遥控器浮到眼前操作，再回到原处'],picture:['欣赏墙上的画','走近一点，抬头仔细看看'],plant:['给绿植浇水','停在水壶前，让小壶飞到花盆旁浇水，再归位'],lamp:['开关床头灯','停在灯座前，让意念切换灯光'],shower:['洗个澡','走进淋浴区，自动帘合拢，冲洗后关水再出来'],toilet:['用洗手间','坐稳使用，结束后冲水，再洗手'],sink:['洗洗小手','伸手接水，搓一搓，再冲洗'],mirror:['照照镜子','面向镜子看看自己的倒影'],towel:['擦干小手','停在毛巾前，让它浮起来擦手，再挂回原处'],sofa:['坐沙发歇歇','走到沙发边，坐稳休息再站起'],coffeeTable:['让小布浮起来擦茶几','停在茶几前，让小布浮起来擦几下，再收好'],basket:['玩玩小球','停在空地边，让小球浮起来转一转，再回篮子'],fridge:['看看冰箱','停在冰箱前，让门自己打开，看看食物，再合好'],counter:['整理小水果','停在备餐台前，让水果自己摆整齐'],stove:['让小勺浮起来搅汤','停在汤锅前，让小勺浮起来慢慢搅几圈再回位'],cabinet:['看看吊柜','停在柜前，让柜门自己打开再合好'],diningTable:['坐好吃饭','坐到餐椅旁，让餐具悬浮着吃饭']};
 function items(roomId){const r=L().rooms[roomId],get=id=>L().getFurniture(r,id),out=[];
  const add=(id,kind,anchor,label,command='object:'+id,parent)=>out.push({id,kind,anchor,label,command,targetId:id,targetType:'item',room:roomId,parent,angle:kind==='pencil'?Math.PI/2:kind==='spoon'?Math.PI*4/3:0});
  if(r.anchors.book)add('book','book',r.anchors.book,'让绘本浮到眼前读','object:book','bookshelf');
  if(r.anchors.teddy)add('teddy','teddy',r.anchors.teddy,'让小熊浮到眼前抱抱','object:teddy','bookshelf');
  const holder=get('bedside')||get('bookcase')||get('prep-counter')||get('sink');
  if(holder)add('remote','remote',{x:holder.x+holder.w-.09,z:holder.z+holder.d*.65,h:holder.h+.08},'让遥控器浮回原处','object:remote',holder.id);
  const plant=get('plant'),shelf=get('watering-shelf');
  if(plant){
   const anchor=shelf?{x:shelf.x+shelf.w*.5,z:shelf.z+shelf.d*.5,h:shelf.h+.34}:{x:plant.x-.35,z:plant.z+plant.d+.55,h:.55};
   add('watering-can','wateringCan',anchor,'让小壶浮起来浇水','object:watering-can',shelf?.id);
  }
  const towel=get('towel');if(towel)add('hand-towel','towel',{x:.19,z:towel.z+towel.d*.5,h:towel.elevation+.50},'让毛巾浮起来擦手','object:towel','towel');
  const basket=get('toy-basket');if(basket)add('basket-ball','ball',{x:basket.x+basket.w*.56,z:basket.z+basket.d*.62,h:basket.h-.10},'让小球浮起来玩','object:toy-basket','toy-basket');
  // Keep the source pencil toward the far back corner of the desktop. The
  // seated pet stays behind the chair, so the authored anchor leaves a clear
  // visual gap before the pencil ever floats to the face.
  const desk=get('desk');if(desk)add('pencil','pencil',{x:desk.x+.55,z:desk.z+.24,h:desk.h+.22},'让小笔浮起来画画','object:desk',desk.id);
  const table=get('coffee-table');if(table)add('cloth','cloth',{x:table.x+table.w-.08,z:table.z+table.d-.13,h:table.h+.08},'让小布浮起来擦茶几','object:coffee-table',table.id);
  const stove=get('stove');if(stove)add('ladle','spoon',{x:stove.x+stove.w-.05,z:stove.z+stove.d*.65,h:stove.h+.40},'让小勺浮起来搅汤','object:stove',stove.id);
  return out;
 }
 function list(roomId){const r=L().rooms[roomId];if(!r)return [];const rows=r.furniture.map(o=>{
   const [label,description]=descriptions[o.kind]||['看看'+o.label,'走近物品再观察'];let alias;
   if(o.id==='bed'&&!r.reserved)alias='sleep';if(o.id==='bookshelf'&&roomId==='bedroom')alias='read';
   if(o.kind==='wardrobe')alias='wardrobe';if(o.kind==='lamp')alias='lamp';if(o.kind==='sofa')alias='sofa';
   if(o.id==='sink'&&['ensuite','bathroom'].includes(roomId))alias='wash';if(o.kind==='mirror')alias='mirror';if(o.kind==='window')alias='window';if(o.kind==='diningTable')alias='eat';
   return {id:o.id,targetId:o.id,targetType:'furniture',command:'object:'+o.id,kind:o.kind,label:alias==='sleep'?'上床睡一会儿':alias==='read'?'让绘本浮到眼前读':o.id==='bathmat'?'在垫子上擦擦脚':label,description:alias==='sleep'?'先到床边，坐上床沿，再躺进铺好的被子里休息':alias==='read'?'从低柜拿绘本，到地毯上读一会儿，再放回原位':o.id==='bathmat'?'走到防滑垫上，抬起小脚轻轻擦干':description,alias,objectLabel:o.label};
  });
  for(const item of items(roomId)){if(rows.some(x=>x.command===item.command))continue;rows.push({...item,description:'停在物体前一段距离，发动意念使用，再让它回到原位',alias:item.id==='book'?'read':item.id==='teddy'?'teddy':undefined});}
  if(roomId==='kitchen')rows.push({id:'water-cup',targetId:'water-cup',targetType:'item',command:'object:water-cup',kind:'cup',label:'坐好喝水',description:'坐在餐桌前，让水杯悬浮到嘴边喝一口，再回到桌上',anchor:r.anchors.cup,alias:'drink'});
  return rows;
 }
 function get(roomId,id){return list(roomId).find(v=>v.id===id||v.command===id)||null;}
 function initialize(){const out={};for(const r of L().roomList)for(const item of items(r.id))if(!['book','teddy'].includes(item.id))out[r.id+':'+item.id]={...item,owner:'surface'};return out;}
 function build(spec,c){
  const {s,r,walk,turn,add,hold,hands,pose,sitOn,standFrom,project,restHands,approachSocket,socketHands,ease,mix}=c;
  // Interaction facing is defined in the room's floor plane.  The renderer's
  // yaw rotates local +z into [sin(yaw), cos(yaw)]; using screen-space
  // projection here mixes the two room axes and can make a focused prop land
  // in front of the body while the face looks away from it.
  const worldYaw=(from,to)=>YayaHomeModel.worldYaw(from,to);
  const aimAt=c.aimAt||((target)=>{if(target&&Number.isFinite(target.x)&&Number.isFinite(target.z))s.yaw=worldYaw(s.p,target);});
  const f=L().getFurniture(r,spec.targetId),state=id=>(s.objects[r.id+':'+id]??={}),item=id=>s.roomItems[r.id+':'+id];
  const angle=o=>o.wall==='x0'?-2.053765:2.053765;
  const near=(anchor,yaw,side=1,more=[])=>walk(()=>approachSocket(r,[anchor,...more],yaw,side),'走到短手能够碰到的位置');
  const carryHands=()=>s.heldObject?{...restHands(s.yaw),[s.heldObject.hand]:[.9*Math.sin(s.yaw)+s.heldObject.hand*2*Math.cos(s.yaw),-3.55]}:restHands(s.yaw);
  const release=()=>{if(!s.heldObject)return;add(.35,'object-release','意念收回，物体回到原处',()=>{s.telekinetic=true;},()=>{s.telekinetic=true;},()=>{s.hands=null;s.contactHands=null;});};
  function locate(anchors,yaw,side=1){let last;for(const a of [yaw,yaw-.35,yaw+.35,yaw-.7,yaw+.7,yaw-1.1,yaw+1.1,0]){try{return {...approachSocket(r,anchors,a,side),yaw:a};}catch(e){last=e;}}throw Error(last.message+' ['+anchors.map(p=>[p.x,p.z,p.h].map(v=>Number(v).toFixed(2)).join(',')).join(';')+']');}
  // A telekinetic interaction stops short of the prop.  Furniture contacts
  // still use approachSocket, while movable props use this wider visual
  // buffer and face the projected target from the chosen floor point.
  // and face the projected target from the chosen floor point.
  function telekineticStance(anchors,yaw=0,preferred=TELEKINETIC_DISTANCE,min=TELEKINETIC_MIN,max=TELEKINETIC_MAX){
    const target=anchors[0],delta=(a,b)=>Math.atan2(Math.sin(a-b),Math.cos(a-b));let best;
    for(let x=.55;x<r.w-.45;x+=.125)for(let z=.55;z<r.d-.45;z+=.125){
      if(YayaHomeNav.blocked(r,x,z))continue;
      const distance=Math.hypot(x-target.x,z-target.z);if(distance<min||distance>max)continue;
      const facing=worldYaw({x,z},target);
      // Verify a clear focus ray up to the furniture edge.  The final prop
      // anchor itself is inside the furniture footprint, so test the last
      // unobstructed point before that footprint rather than falling back to
      // a hand-contact stance.
      const dx=target.x-x,dz=target.z-z,len=Math.hypot(dx,dz)||1;let visible=false;
      for(let q=.92;q>=.12;q-=.04){const fx=x+dx*q,fz=z+dz*q;if(!YayaHomeNav.blocked(r,fx,fz,.43)&&YayaHomeNav.clearLine(r,{x,z},{x:fx,z:fz},.43)){visible=true;break;}}
      if(!visible)continue;
      const score=Math.abs(distance-preferred)+Math.abs(delta(facing,yaw))*.035;
      if(!best||score<best.score)best={x,z,yaw:facing,score};
    }
    if(!best)throw Error(`${r.id}: 物体前没有清晰的意念站位`);return best;
  }
  function mindFocus(target,label='停在物体前一段距离，发动意念'){
    add(.48,'mind-focus',label,()=>{s.telekinetic=true;s.telekineticTarget=target||null;},()=>{s.telekinetic=true;s.telekineticTarget=target||null;aimAt(target);});
  }
  function visibleStance(anchors,yaw,side=1,screenSide=-1){
    const points=anchors.map(a=>project(a,r)),root=[side*2.28*Math.cos(yaw)+.45*Math.sin(yaw),-3.93];let best;
    for(let x=.5;x<r.w-.4;x+=.125)for(let z=.5;z<r.d-.4;z+=.125){if(YayaHomeNav.blocked(r,x,z)||Math.hypot(x-anchors[0].x,z-anchors[0].z)>2.5)continue;const p=project({x,z},r),palms=points.map(q=>[(q.x-p.x)/U,(q.y-p.y)/U]);if(palms.some(q=>q[0]*screenSide<3.36))continue;
      const reach=Math.max(...palms.map(q=>Math.hypot(q[0]-root[0],q[1]-root[1])));if(reach>1.99)continue;const score=Math.abs(palms[0][0]*screenSide-3.65)+reach*.16;if(!best||score<best.score)best={x,z,yaw,score};
    }
    return best||locate(anchors,yaw,side);
  }
  function offsetGrip(tip,dx,dy,angle=0,height=tip.h){const p=project(tip,r),a=dx*Math.cos(angle)-dy*Math.sin(angle),b=dx*Math.sin(angle)+dy*Math.cos(angle),x=p.x-a*U,y=p.y-b*U,ss=(y-355+height*80)/(.43*80),dd=(x-960)/(.82*80)+(r.w-r.d)/2;return {x:(ss+dd)/2,z:(ss-dd)/2,h:height};}
  function orientProp(angle,seconds=.3){let from;add(seconds,'prop-adjust','握稳手里的物品',()=>{from=s.heldObject?.angle||0;},k=>{if(s.heldObject)s.heldObject.angle=mix(from,angle,ease(k));});}

  const handlePose=(p,side=1)=>{s.contactHands=[side];return socketHands(p,side);};
  function transfer(id,take,yaw=-2.053765){const o=item(id);if(!o)throw Error('房间没有这件物品：'+id);const side=1,profile=o.id==='watering-can'?TELEKINETIC_WATERING:{distance:TELEKINETIC_DISTANCE,min:TELEKINETIC_MIN,max:TELEKINETIC_MAX},stance=telekineticStance([o.anchor],yaw,profile.distance,profile.min,profile.max);
   // Stop short, focus, then let the prop float in front of the face.  The
   // body never reaches through the buffer with a physical hand.
   release();walk(stance,take?'走到物体前一段距离':'走到原位前一段距离');turn(stance.yaw);mindFocus(o.anchor,take?'停下来，盯住物体发动意念':'停下来，让物体回到原位');
   add(.72,take?'object-grab':'object-put',take?'物体浮起来了':'物体稳稳放回去了',()=>{o.owner=take?'hand':'surface';s.heldObject=take?{id:o.id,kind:o.kind,hand:side,angle:o.angle||0,telekinetic:true}:null;s.telekineticDistance=take?profile.distance:null;s.telekineticObject=take?{id:o.id,kind:o.kind}:null;s.telekinetic=true;s.telekineticTarget=take?o.anchor:null;s.hands=null;s.contactHands=null;if(o.parent&&['towel','basket'].includes(L().getFurniture(r,o.parent)?.kind))state(o.parent).held=take;},()=>{s.telekinetic=true;},()=>{if(!take){s.heldObject=null;s.telekineticDistance=null;s.telekineticObject=null;s.telekineticTarget=null;s.hands=null;s.contactHands=null;}});
   if(take)add(.45,'object-lift','物体在眼前悬浮，跟着意念走');
  }
  const put=id=>transfer(id,false),pick=id=>transfer(id,true);
  function useRemote(target){pick('remote');let before;const control=target.approach||{x:target.x+target.w/2,z:target.z+target.d/2,h:target.h+.35},face=()=>worldYaw(s.p,control);turn(face);mindFocus(control,'停在设备前一段距离，发动意念');
   add(1.5,'remote','遥控器悬浮在眼前，按一下按钮',()=>{s.telekineticTarget=control;before=target.kind==='ac'?!!state(target.id).on:state(target.id).on!==false;},k=>{if(k>.45){if(target.kind==='cabinet')state(target.id).open=ease(Math.min(1,(k-.45)/.45))*.65;else state(target.id).on=!before;} });
   hold(2,'look',target.kind==='cabinet'?'杯子整齐地放在柜子里':'看看设备的变化');if(target.kind==='cabinet')add(.8,'cabinet-close','再按一下，柜门合好',()=>{},k=>{state(target.id).open=.65*(1-ease(k));});put('remote');
  }
  function drawer(o){const yaw=-2.75,handle=k=>YayaHomeArt.objectHandle(o,k),max=.65,stance=telekineticStance([handle(0)],yaw,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);walk(stance,'走到柜子前一段距离，给门留出空间');turn(stance.yaw);mindFocus(handle(0),'停在柜门前，让柜门响应意念');
   // Keep the gaze on the authored cabinet focus point while the handle moves
   // through its hinge arc. The pet remains in the wider focus buffer from the cabinet;
   // it should not chase a handle that swings toward its feet.
   add(1,'drawer-open','柜门悬浮着慢慢打开',()=>{},k=>{const a=max*ease(k);state(o.id).open=a;s.telekineticTarget=handle(0);aimAt(s.telekineticTarget);});hold(2,'look','看看里面放好的东西');add(1,'drawer-close','让柜门轻轻合好',()=>{},k=>{const a=max*(1-ease(k));state(o.id).open=a;s.telekineticTarget=handle(0);aimAt(s.telekineticTarget);});
  }
  function look(o){let target=o.approach;if(!target){const anchor={x:o.x+o.w/2,z:o.z+o.d/2};let best;for(let x=.5;x<r.w-.4;x+=.25)for(let z=.5;z<r.d-.4;z+=.25){if(YayaHomeNav.blocked(r,x,z))continue;const d=Math.hypot(x-anchor.x,z-anchor.z);if(!best||d<best.d)best={x,z,d};}target=best;}
   walk(target,'走近'+o.label);turn(angle(o));hold(3,'look','仔细看看'+o.label,()=>{state(o.id).used=true;});
  }
  function sit(o){sitOn(o,'从空着的一侧坐好');hold(3,'sit-rest','坐稳，轻轻晃晃小脚');standFrom(o);}
  function water(){const plant=L().getFurniture(r,'plant'),can=item('watering-can');pick('watering-can');
   const target={x:plant.x+plant.w*.5,z:plant.z+plant.d*.5,h:plant.h*.44},face=()=>worldYaw(s.p,target);
   // The pet stops near the watering-can shelf.  The can then travels to the
   // plant on its own; the pet does not walk up to the plant or reach for it.
   turn(face);mindFocus(target,'停在水壶前一段距离，让它飞到花盆旁');
   add(3,'water-plant','水壶悬浮到花盆旁，倾斜一点点浇水',()=>{s.waterTarget=target;s.telekineticTarget=target;},k=>{s.heldObject.angle=-.5*Math.sin(PI*k);s.telekineticTarget=target;aimAt(target);state(plant.id).water=Math.sin(PI*k);state(plant.id).wet=true;},()=>{s.waterTarget=null;s.telekineticTarget=null;state(plant.id).water=0;s.heldObject.angle=0;});put(can.id);
  }
  function towel(){const towelItem=item('hand-towel');pick('hand-towel');turn(()=>worldYaw(s.p,towelItem.anchor));mindFocus(towelItem.anchor,'毛巾悬浮到眼前，擦干两只小手');add(3,'dry-hands','毛巾悬浮着轻轻擦擦小手',()=>{s.telekineticTarget=towelItem.anchor;},k=>{if(s.heldObject)s.heldObject.angle=.08*Math.sin(k*PI*8);s.telekineticTarget=towelItem.anchor;aimAt(towelItem.anchor);});put('hand-towel');}
  function drawDesk(){const chair=L().getFurniture(r,'desk-chair'),pencil=item('pencil');sitOn(chair,'坐到书桌前');turn(()=>worldYaw(s.p,pencil.anchor));mindFocus(pencil.anchor,'坐在书桌前一段距离，发动意念拿起小笔');
   add(.7,'pencil-grab','小笔悬浮到眼前',()=>{pencil.owner='hand';s.heldObject={id:pencil.id,kind:'pencil',hand:-1,angle:pencil.angle||PI/2,telekinetic:true};s.telekineticDistance=TELEKINETIC_PENCIL.distance;s.telekineticObject={id:pencil.id,kind:'pencil'};s.telekinetic=true;s.telekineticTarget=pencil.anchor;},()=>{s.telekinetic=true;});
   add(3.5,'draw','小笔悬浮在纸上，一笔一笔画出小叶子',()=>{},k=>{const p={...pencil.anchor,x:pencil.anchor.x+.10*Math.sin(k*PI*6),z:pencil.anchor.z+.045*(Math.cos(k*PI*6)-1)};s.telekineticTarget=p;aimAt(p);state('desk').used=true;state('desk').amount=k;});
   add(.5,'pencil-put','小笔回到纸边',()=>{s.telekineticTarget=pencil.anchor;},()=>{},()=>{pencil.owner='surface';s.heldObject=null;s.telekineticDistance=null;s.telekineticObject=null;s.telekineticTarget=null;});standFrom(chair);
  }
  function rubSurface(o,id,kind){pick(id);const prop=item(id),angle=prop.angle||0,tip={x:o.x+o.w*.68,z:o.z+o.d*.67,h:o.h+.366};
   const target=kind==='spoon'?offsetGrip(tip,1.02,0,angle,tip.h+.15):{x:o.x+o.w-.15,z:o.z+o.d*.65,h:o.h+.03},samples=[];
   for(let i=0;i<=12;i++){const q=i/12*PI*2,world=kind==='spoon'?{...tip,x:tip.x+.07*Math.sin(q),z:tip.z+.06*(Math.cos(q)-1)}:{...target,x:target.x+.07*Math.sin(q),z:target.z+.06*(Math.cos(q)-1)};samples.push(kind==='spoon'?offsetGrip(world,1.02,0,angle,tip.h+.15):world);}
   const stance=telekineticStance(samples,-2.053765,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);walk(stance,'走到操作面前一段距离');turn(stance.yaw);mindFocus(target,kind==='spoon'?'停在汤锅前，让小勺悬浮':'停在茶几前，让小布悬浮');
   add(3,'surface-use',kind==='spoon'?'小勺悬浮着沿汤锅慢慢搅一圈':'小布悬浮着沿桌面轻轻擦一擦',()=>{},k=>{const q=k*PI*6,world=kind==='spoon'?{...tip,x:tip.x+.07*Math.sin(q),z:tip.z+.06*(Math.cos(q)-1)}:{...target,x:target.x+.07*Math.sin(q),z:target.z+.06*(Math.cos(q)-1)},p=kind==='spoon'?offsetGrip(world,1.02,0,angle,tip.h+.15):world;s.telekineticTarget=p;aimAt(p);state(o.id).used=true;state(o.id).tidy=k;});put(id);
  }
  function washKitchen(o){const p=o.grip||{x:o.x+o.w-.07,z:o.z+o.d*.5,h:o.h+.04},stance=visibleStance([p],-2.75,1,-1);walk(stance,'站到龙头下面接水的位置');turn(stance.yaw);hands(()=>handlePose(p),.85,'kitchen-sink-reach','把小手伸到水槽边');add(3,'kitchen-wash','打开小水流，洗洗小手',()=>{},k=>{state(o.id).water=Math.sin(PI*k);},()=>{state(o.id).water=0;});release();}
  function enterSupport(o,p,label){let start;walk(o.approach,'走到'+o.label+'外面');turn(angle(o));add(1.2,'support-enter',label,()=>{start={...s.p};s.support=o.id;},k=>{const q=ease(k);s.p={x:mix(start.x,p.x,q),z:mix(start.z,p.z,q),h:mix(start.h,p.h||0,q)};});}
  function leaveSupport(o){let start;add(1.1,'support-leave','慢慢走出来，站稳',()=>{start={...s.p};},k=>{const q=ease(k);s.p={x:mix(start.x,o.approach.x,q),z:mix(start.z,o.approach.z,q),h:start.h*(1-q)};s.seated=1-q;},()=>{s.support=null;s.seated=0;});}
  switch(spec.kind){
   case 'bedside':case 'bookshelf':case 'fridge':drawer(f);break;
   case 'ac':case 'cabinet':useRemote(f);break;
   case 'desk':drawDesk();break;
   case 'chair':sit(f);break;
   case 'rug':{const p={x:f.x+f.w*.5,z:f.z+f.d*.5};walk(()=>YayaHomeNav.blocked(r,p.x,p.z)?r.anchors.rest:p,'走到垫子上');turn(0);hold(3,f.id==='bathmat'?'wipe-feet':'stretch',f.id==='bathmat'?'抬起小脚，在垫子上擦擦':'站稳了，伸个懒腰');break;}
   case 'plant':case 'wateringCan':water();break;
   case 'towel':towel();break;
   case 'basket':{const play=r.anchors.play||r.anchors.rest;pick('basket-ball');walk(play,'让小球飞到空地');turn(()=>worldYaw(s.p,play));mindFocus(play,'停在空地边缘，让小球悬浮起来');add(4,'play-ball','小球悬浮着轻轻转一转',()=>{},k=>{s.heldObject.angle=.15*Math.sin(k*PI*6);s.telekineticTarget=play;aimAt(play);});put('basket-ball');break;}
   case 'coffeeTable':rubSurface(f,'cloth','cloth');break;
   case 'stove':rubSurface(f,'ladle','spoon');break;
   case 'sink':washKitchen(f);break;
   case 'counter':{const target={x:f.x+f.w-.08,z:f.z+f.d*.55,h:f.h+.07},stance=telekineticStance([target],-2.053765,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);walk(stance,'走到备餐台前一段距离');turn(stance.yaw);mindFocus(target,'停在备餐台前，让水果自己摆好');add(3,'prepare','水果悬浮着摆放整齐',()=>{},k=>{state(f.id).used=true;state(f.id).tidy=k;s.telekineticTarget={...target,z:target.z+.08*Math.sin(k*PI*6)};aimAt(s.telekineticTarget);});break;}
   case 'shower':{const point={x:f.x+f.w*.55,z:f.z+f.d*.58,h:.10};enterSupport(f,point,'沿开着的入口走进淋浴区');add(.8,'curtain-close','站稳后，自动小帘子轻轻合拢',()=>{},k=>{state(f.id).privacy=ease(k);});add(4,'shower','在帘子后面洗个舒服的澡',()=>{},k=>{state(f.id).water=Math.sin(PI*k);});add(.8,'curtain-open','冲洗结束，水停下，自动帘子打开',()=>{state(f.id).water=0;},k=>{state(f.id).privacy=1-ease(k);});leaveSupport(f);towel();break;}
   case 'toilet':{enterSupport(f,{x:f.x+f.w/2,z:f.z+f.d*.64,h:.50},'小脚蹬一下，坐到真实便座上');pose(.35,'toilet-sit','坐稳，让感应屏风轻轻合好',{seated:1});add(.7,'privacy-close','给自己一点安静的空间',()=>{},k=>{state(f.id).privacy=ease(k);});hold(3,'toilet','安静等一会儿');add(.7,'privacy-open','好了，收好屏风',()=>{},k=>{state(f.id).privacy=1-ease(k);});leaveSupport(f);add(1.3,'flush','离开便座，感应器自动冲好水',()=>{},k=>{state(f.id).water=Math.sin(PI*k);},()=>{state(f.id).water=0;});if(c.wash)c.wash();break;}
   case 'bed':{const p={x:f.x+f.w-.14,z:f.z+f.d*.7,h:f.h+.13},stance=telekineticStance([p],-2.75,TELEKINETIC_DISTANCE,TELEKINETIC_MIN,TELEKINETIC_MAX);walk(stance,'走到被子前一段距离');turn(stance.yaw);mindFocus(p,'停在床前，让被子响应意念');add(2,'bed-pat','被子悬浮着轻轻铺平',()=>{},k=>{state(f.id).tidy=k;s.telekineticTarget={...p,h:p.h+.10*Math.sin(PI*k*3)**2};aimAt(s.telekineticTarget);});break;}
   case 'remote':pick('remote');hold(1.2,'remote','看看按钮，再放回原处');put('remote');break;
   default:look(f||L().getFurniture(r,spec.parent));
  }
 }
 globalThis.YayaHomeInteractions={list,get,items,initialize,build};
})();
