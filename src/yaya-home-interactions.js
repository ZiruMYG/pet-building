// Every selectable object owns a complete approach/use/release sequence.
// Coordinates are shared with the furniture and prop renderers.
(() => {
 'use strict';
 const L=()=>YayaHomeLayout,PI=Math.PI,U=22.8;
 const descriptions={bed:['整理小床','抚平被子，再离开床边'],bedside:['打开床头柜','握住低抽屉，拉开看看，再合好'],wardrobe:['看看衣柜','扶住把手打开，关好再松手'],bookshelf:['翻看书柜','到低柜前打开抽屉，看完轻轻合好'],desk:['在书桌画画','坐到自己的椅子上，用小笔画几笔'],chair:['坐在椅子上','从空着的一侧坐下，小脚自然垂着'],rug:['在地毯上伸展','走到毯子上，站稳后伸个懒腰'],window:['去窗前看看','走到窗边，停下来看看外面的树'],ac:['调节空气','拿起遥控器调节，再放回原处'],picture:['欣赏墙上的画','走近一点，抬头仔细看看'],ceilingLamp:['开关顶灯','用遥控器开关灯，放好再离开'],plant:['给绿植浇水','拿起旁边的小壶，浇一点水，再归位'],lamp:['开关床头灯','短手碰到灯座才切换灯光'],shower:['洗个澡','走进淋浴区，自动帘合拢，冲洗后关水再出来'],toilet:['用洗手间','坐稳使用，结束后冲水，再洗手'],sink:['洗洗小手','伸手接水，搓一搓，再冲洗'],mirror:['照照镜子','面向镜子看看自己的倒影'],towel:['擦干小手','拿下毛巾擦手，挂回原来的位置'],sofa:['坐沙发歇歇','走到沙发边，坐稳休息再站起'],coffeeTable:['擦擦茶几','拿小布沿桌面擦几下，收好小布'],basket:['玩玩小球','从篮子拿球，用短手轻轻托着转转，再放回'],fridge:['看看冰箱','握住门把手打开，看看食物，再关好'],counter:['整理小水果','在备餐台把水果摆整齐'],stove:['搅拌小汤锅','拿起锅旁的勺子，慢慢搅几圈再放回'],cabinet:['看看吊柜','在低处用遥控打开柜门，看完关好'],diningTable:['坐好吃饭','走到餐椅旁坐好，用真实小手和餐具吃饭']};
 function items(roomId){const r=L().rooms[roomId],get=id=>L().getFurniture(r,id),out=[];
  const add=(id,kind,anchor,label,command='object:'+id,parent)=>out.push({id,kind,anchor,label,command,targetId:id,targetType:'item',room:roomId,parent,angle:kind==='pencil'?Math.PI/2:kind==='spoon'?Math.PI*4/3:0});
  if(r.anchors.book)add('book','book',r.anchors.book,'拿绘本来读','object:book','bookshelf');
  if(r.anchors.teddy)add('teddy','teddy',r.anchors.teddy,'抱抱小熊','object:teddy','bookshelf');
  const holder=get('bedside')||get('bookcase')||get('prep-counter')||get('sink');
  if(holder)add('remote','remote',{x:holder.x+holder.w-.09,z:holder.z+holder.d*.65,h:holder.h+.08},'放好遥控器','object:remote',holder.id);
  const plant=get('plant');if(plant)add('watering-can','wateringCan',{x:plant.x-.35,z:plant.z+plant.d+.55,h:.55},'拿小壶浇水','object:watering-can');
  const towel=get('towel');if(towel)add('hand-towel','towel',{x:.19,z:towel.z+towel.d*.5,h:towel.elevation+.50},'拿毛巾擦手','object:towel','towel');
  const basket=get('toy-basket');if(basket)add('basket-ball','ball',{x:basket.x+basket.w*.56,z:basket.z+basket.d*.62,h:basket.h-.10},'拿小球玩','object:toy-basket','toy-basket');
  const desk=get('desk');if(desk)add('pencil','pencil',{x:desk.x+1.23,z:desk.z+desk.d-.12,h:desk.h+.22},'拿小笔画画','object:desk',desk.id);
  const table=get('coffee-table');if(table)add('cloth','cloth',{x:table.x+table.w-.08,z:table.z+table.d-.13,h:table.h+.08},'擦擦茶几','object:coffee-table',table.id);
  const stove=get('stove');if(stove)add('ladle','spoon',{x:stove.x+stove.w-.05,z:stove.z+stove.d*.65,h:stove.h+.40},'搅拌小汤锅','object:stove',stove.id);
  return out;
 }
 function list(roomId){const r=L().rooms[roomId];if(!r)return [];const rows=r.furniture.map(o=>{
   const [label,description]=descriptions[o.kind]||['看看'+o.label,'走近物品再观察'];let alias;
   if(o.id==='bed'&&!r.reserved)alias='sleep';if(o.id==='bookshelf'&&roomId==='bedroom')alias='read';
   if(o.kind==='wardrobe')alias='wardrobe';if(o.kind==='lamp')alias='lamp';if(o.kind==='sofa')alias='sofa';
   if(o.id==='sink'&&['ensuite','bathroom'].includes(roomId))alias='wash';if(o.kind==='mirror')alias='mirror';if(o.kind==='window')alias='window';if(o.kind==='diningTable')alias='eat';
   return {id:o.id,targetId:o.id,targetType:'furniture',command:'object:'+o.id,kind:o.kind,label:alias==='sleep'?'上床睡一会儿':alias==='read'?'拿绘本来读':o.id==='bathmat'?'在垫子上擦擦脚':label,description:alias==='sleep'?'先到床边，坐上床沿，再躺进铺好的被子里休息':alias==='read'?'从低柜拿绘本，到地毯上读一会儿，再放回原位':o.id==='bathmat'?'走到防滑垫上，抬起小脚轻轻擦干':description,alias,objectLabel:o.label};
  });
  for(const item of items(roomId)){if(rows.some(x=>x.command===item.command))continue;rows.push({...item,description:'拿起、使用，再放回它原来的位置',alias:item.id==='book'?'read':item.id==='teddy'?'teddy':undefined});}
  if(roomId==='kitchen')rows.push({id:'water-cup',targetId:'water-cup',targetType:'item',command:'object:water-cup',kind:'cup',label:'坐好喝水',description:'到餐桌边坐下，拿杯子喝一口，再放回',anchor:r.anchors.cup,alias:'drink'});
  return rows;
 }
 function get(roomId,id){return list(roomId).find(v=>v.id===id||v.command===id)||null;}
 function initialize(){const out={};for(const r of L().roomList)for(const item of items(r.id))if(!['book','teddy'].includes(item.id))out[r.id+':'+item.id]={...item,owner:'surface'};return out;}
 function build(spec,c){
  const {s,r,walk,turn,add,hold,hands,pose,sitOn,standFrom,project,restHands,approachSocket,socketHands,ease,mix}=c;
  const f=L().getFurniture(r,spec.targetId),state=id=>(s.objects[r.id+':'+id]??={}),item=id=>s.roomItems[r.id+':'+id];
  const angle=o=>o.wall==='x0'?-2.053765:2.053765;
  const near=(anchor,yaw,side=1,more=[])=>walk(()=>approachSocket(r,[anchor,...more],yaw,side),'走到短手能够碰到的位置');
  const carryHands=()=>s.heldObject?{...restHands(s.yaw),[s.heldObject.hand]:[.9*Math.sin(s.yaw)+s.heldObject.hand*2*Math.cos(s.yaw),-3.55]}:restHands(s.yaw);
  const release=()=>hands(()=>carryHands(),.65,'object-release','用完了，收回小手',()=>{s.hands=null;s.contactHands=s.heldObject?[s.heldObject.hand]:null;});
  function locate(anchors,yaw,side=1){let last;for(const a of [yaw,yaw-.35,yaw+.35,yaw-.7,yaw+.7,yaw-1.1,yaw+1.1,0]){try{return {...approachSocket(r,anchors,a,side),yaw:a};}catch(e){last=e;}}throw Error(last.message+' ['+anchors.map(p=>[p.x,p.z,p.h].map(v=>Number(v).toFixed(2)).join(',')).join(';')+']');}
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
  function transfer(id,take,yaw=-2.053765){const o=item(id);if(!o)throw Error('房间没有这件物品：'+id);const side=1,stance=locate([o.anchor],yaw,side);
   // Put away the previous gesture before a walk or a change of facing. The
   // carried palm then follows the body's projected shoulder during turning.
   release();walk(stance,'走到短手能够碰到的位置');turn(stance.yaw);if(!take)orientProp(o.angle||0);
   hands(()=>handlePose(o.anchor,side),.85,take?'object-grab':'object-put',take?'先碰到物品，再拿稳':'先放到原处，再松手',()=>{o.owner=take?'hand':'surface';s.heldObject=take?{id:o.id,kind:o.kind,hand:side,angle:o.angle||0}:null;if(o.parent&&['towel','basket'].includes(L().getFurniture(r,o.parent)?.kind))state(o.parent).held=take;});
   if(take)hands(()=>carryHands(),.6,'object-lift','拿稳在自己的小手里',()=>{s.hands=null;s.contactHands=[side];});else release();
  }
  const put=id=>transfer(id,false),pick=id=>transfer(id,true);
  function useRemote(target){pick('remote');turn(.35);let before;
   hands(()=>({...restHands(s.yaw),1:[2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw)-.25,-3.55]}),.4,'remote-raise','把遥控器握稳');
   add(1.5,'remote','按一下遥控器',()=>{s.contactHands=[1];before=target.kind==='ac'?!!state(target.id).on:state(target.id).on!==false;},k=>{const press=.045*Math.sin(PI*k)**2;s.hands={...restHands(s.yaw),1:[2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw)-.25,-3.55+press]};if(k>.45){if(target.kind==='cabinet')state(target.id).open=ease(Math.min(1,(k-.45)/.45))*.65;else state(target.id).on=!before;} });
   hold(2,'look',target.kind==='cabinet'?'杯子整齐地放在柜子里':'看看设备的变化');if(target.kind==='cabinet')add(.8,'cabinet-close','再按一下，柜门合好',()=>{},k=>{state(target.id).open=.65*(1-ease(k));});put('remote');
  }
  function drawer(o){const yaw=-2.75,handle=k=>YayaHomeArt.objectHandle(o,k),max=.65,stance=visibleStance([handle(0),handle(max)],yaw,1,-1);walk(stance,'走到把手旁，给门留出打开的空间');turn(stance.yaw);hands(()=>handlePose(handle(0)),.8,'drawer-grab','握住低低的把手');
   add(1,'drawer-open','慢慢打开看看',()=>{},k=>{const a=max*ease(k);state(o.id).open=a;s.hands=socketHands(handle(a),1);});hold(2,'look','看看里面放好的东西');add(1,'drawer-close','扶住把手轻轻合好',()=>{},k=>{const a=max*(1-ease(k));state(o.id).open=a;s.hands=socketHands(handle(a),1);});release();
  }
  function look(o){let target=o.approach;if(!target){const anchor={x:o.x+o.w/2,z:o.z+o.d/2};let best;for(let x=.5;x<r.w-.4;x+=.25)for(let z=.5;z<r.d-.4;z+=.25){if(YayaHomeNav.blocked(r,x,z))continue;const d=Math.hypot(x-anchor.x,z-anchor.z);if(!best||d<best.d)best={x,z,d};}target=best;}
   walk(target,'走近'+o.label);turn(angle(o));hold(3,'look','仔细看看'+o.label,()=>{state(o.id).used=true;});
  }
  function sit(o){sitOn(o,'从空着的一侧坐好');hold(3,'sit-rest','坐稳，轻轻晃晃小脚');standFrom(o);}
  function water(){const plant=L().getFurniture(r,'plant'),can=item('watering-can');pick('watering-can');
   const target={x:plant.x+plant.w*.5,z:plant.z+plant.d*.5,h:plant.h*.44},tip={...target,h:target.h+.56},grip=offsetGrip(tip,1.35,.255,0,tip.h),stance=locate([grip],.85,1);
   walk(stance,'走到小壶能够浇到花盆的位置');turn(stance.yaw);
   hands(()=>handlePose(grip),.8,'water-reach','把小壶口移到花盆上方');add(3,'water-plant','倾斜一点点，给小花浇水',()=>{s.waterTarget=target;},k=>{s.heldObject.angle=-.5*Math.sin(PI*k);state(plant.id).water=Math.sin(PI*k);state(plant.id).wet=true;},()=>{s.waterTarget=null;state(plant.id).water=0;s.heldObject.angle=0;});put(can.id);
  }
  function towel(){pick('hand-towel');turn(.35);hands(()=>({[-1]:[-.7,-3.5],1:[.65,-3.5]}),.8,'towel-hold','两只手扶住软毛巾',()=>{s.contactHands=[-1,1];});add(3,'dry-hands','在毛巾上轻轻擦擦小手',()=>{},k=>{s.hands={[-1]:[-.7+.10*Math.sin(k*PI*8),-3.5],1:[.65,-3.5]};});put('hand-towel');}
  function drawDesk(){const chair=L().getFurniture(r,'desk-chair'),pencil=item('pencil');sitOn(chair,'坐到书桌前');
   // Pencil rests on the near edge of the drawing paper, within the short hand.
   hands(()=>handlePose(pencil.anchor,-1),.7,'pencil-grab','从纸边拿起小笔',()=>{pencil.owner='hand';s.heldObject={id:pencil.id,kind:'pencil',hand:-1,angle:pencil.angle||PI/2};});
   add(3.5,'draw','看着纸，一笔一笔画出小叶子',()=>{},k=>{const p={...pencil.anchor,x:pencil.anchor.x+.10*Math.sin(k*PI*6),z:pencil.anchor.z+.045*(Math.cos(k*PI*6)-1)};s.hands=socketHands(p,-1);state('desk').used=true;state('desk').amount=k;});hands(()=>socketHands(pencil.anchor,-1),.5,'pencil-put','把笔放回纸边',()=>{pencil.owner='surface';s.heldObject=null;});release();standFrom(chair);
  }
  function rubSurface(o,id,kind){pick(id);const prop=item(id),angle=prop.angle||0,tip={x:o.x+o.w*.68,z:o.z+o.d*.67,h:o.h+.366};
   const target=kind==='spoon'?offsetGrip(tip,1.02,0,angle,tip.h+.15):{x:o.x+o.w-.15,z:o.z+o.d*.65,h:o.h+.03},samples=[];
   for(let i=0;i<=12;i++){const q=i/12*PI*2,world=kind==='spoon'?{...tip,x:tip.x+.07*Math.sin(q),z:tip.z+.06*(Math.cos(q)-1)}:{...target,x:target.x+.07*Math.sin(q),z:target.z+.06*(Math.cos(q)-1)};samples.push(kind==='spoon'?offsetGrip(world,1.02,0,angle,tip.h+.15):world);}
   const stance=o.kind==='coffeeTable'?visibleStance(samples,-2.75,1,-1):locate(samples,-2.053765,1);walk(stance,'走到短手和工具都能够触及的位置');turn(stance.yaw);hands(()=>handlePose(target),.8,'surface-reach','把手里的工具放到实际接触面');
   add(3,'surface-use',kind==='spoon'?'握着小勺，沿汤锅慢慢搅一圈':'沿桌面轻轻擦一擦',()=>{},k=>{const q=k*PI*6,world=kind==='spoon'?{...tip,x:tip.x+.07*Math.sin(q),z:tip.z+.06*(Math.cos(q)-1)}:{...target,x:target.x+.07*Math.sin(q),z:target.z+.06*(Math.cos(q)-1)},p=kind==='spoon'?offsetGrip(world,1.02,0,angle,tip.h+.15):world;s.hands=socketHands(p,1);state(o.id).used=true;state(o.id).tidy=k;});put(id);
  }
  function washKitchen(o){const p=o.grip||{x:o.x+o.w-.07,z:o.z+o.d*.5,h:o.h+.04},stance=visibleStance([p],-2.75,1,-1);walk(stance,'站到龙头下面接水的位置');turn(stance.yaw);hands(()=>handlePose(p),.85,'kitchen-sink-reach','把小手伸到水槽边');add(3,'kitchen-wash','打开小水流，洗洗小手',()=>{},k=>{state(o.id).water=Math.sin(PI*k);},()=>{state(o.id).water=0;});release();}
  function enterSupport(o,p,label){let start;walk(o.approach,'走到'+o.label+'外面');turn(angle(o));add(1.2,'support-enter',label,()=>{start={...s.p};s.support=o.id;},k=>{const q=ease(k);s.p={x:mix(start.x,p.x,q),z:mix(start.z,p.z,q),h:mix(start.h,p.h||0,q)};});}
  function leaveSupport(o){let start;add(1.1,'support-leave','慢慢走出来，站稳',()=>{start={...s.p};},k=>{const q=ease(k);s.p={x:mix(start.x,o.approach.x,q),z:mix(start.z,o.approach.z,q),h:start.h*(1-q)};s.seated=1-q;},()=>{s.support=null;s.seated=0;});}
  switch(spec.kind){
   case 'bedside':case 'bookshelf':case 'fridge':drawer(f);break;
   case 'ac':case 'ceilingLamp':case 'cabinet':useRemote(f);break;
   case 'desk':drawDesk();break;
   case 'chair':sit(f);break;
   case 'rug':{const p={x:f.x+f.w*.5,z:f.z+f.d*.5};walk(()=>YayaHomeNav.blocked(r,p.x,p.z)?r.anchors.rest:p,'走到垫子上');turn(0);hold(3,f.id==='bathmat'?'wipe-feet':'stretch',f.id==='bathmat'?'抬起小脚，在垫子上擦擦':'站稳了，伸个懒腰');break;}
   case 'plant':case 'wateringCan':water();break;
   case 'towel':towel();break;
   case 'basket':pick('basket-ball');walk(r.anchors.play||r.anchors.rest,'把小球带到空地');turn(0);hands(()=>({...restHands(0),1:[1.5,-2.7]}),.4,'ball-raise','把小球轻轻托起来');add(4,'play-ball','用小手把球轻轻转一转',()=>{},k=>{s.heldObject.angle=.15*Math.sin(k*PI*6);s.hands={...restHands(0),1:[1.5,-2.7-.08*Math.sin(k*PI*6)]};});put('basket-ball');break;
   case 'coffeeTable':rubSurface(f,'cloth','cloth');break;
   case 'stove':rubSurface(f,'ladle','spoon');break;
   case 'sink':washKitchen(f);break;
   case 'counter':{const target={x:f.x+f.w-.08,z:f.z+f.d*.55,h:f.h+.07};near(target,-2.053765);turn(-2.053765);hands(()=>handlePose(target),.8,'prepare-reach','把小手放到备餐台边');add(3,'prepare','轻轻摆好一盘小水果',()=>{},k=>{state(f.id).used=true;state(f.id).tidy=k;s.hands=socketHands({...target,z:target.z+.08*Math.sin(k*PI*6)},1);});release();break;}
   case 'shower':{const point={x:f.x+f.w*.55,z:f.z+f.d*.58,h:.10};enterSupport(f,point,'沿开着的入口走进淋浴区');add(.8,'curtain-close','站稳后，自动小帘子轻轻合拢',()=>{},k=>{state(f.id).privacy=ease(k);});add(4,'shower','在帘子后面洗个舒服的澡',()=>{},k=>{state(f.id).water=Math.sin(PI*k);});add(.8,'curtain-open','冲洗结束，水停下，自动帘子打开',()=>{state(f.id).water=0;},k=>{state(f.id).privacy=1-ease(k);});leaveSupport(f);towel();break;}
   case 'toilet':{enterSupport(f,{x:f.x+f.w/2,z:f.z+f.d*.64,h:.50},'小脚蹬一下，坐到真实便座上');pose(.35,'toilet-sit','坐稳，让感应屏风轻轻合好',{seated:1});add(.7,'privacy-close','给自己一点安静的空间',()=>{},k=>{state(f.id).privacy=ease(k);});hold(3,'toilet','安静等一会儿');add(.7,'privacy-open','好了，收好屏风',()=>{},k=>{state(f.id).privacy=1-ease(k);});leaveSupport(f);add(1.3,'flush','离开便座，感应器自动冲好水',()=>{},k=>{state(f.id).water=Math.sin(PI*k);},()=>{state(f.id).water=0;});if(c.wash)c.wash();break;}
   case 'bed':{const p={x:f.x+f.w-.14,z:f.z+f.d*.7,h:f.h+.13};const stance=visibleStance([p],-2.75,1,-1);walk(stance,'走到被子边上');turn(stance.yaw);hands(()=>handlePose(p),.8,'bed-pat-reach','扶住被子的边边');add(2,'bed-pat','轻轻抚平小被子',()=>{},k=>{state(f.id).tidy=k;s.hands=socketHands({...p,h:p.h+.10*Math.sin(PI*k*3)**2},1);});release();break;}
   case 'remote':pick('remote');hold(1.2,'remote','看看按钮，再放回原处');put('remote');break;
   default:look(f||L().getFurniture(r,spec.parent));
  }
 }
 globalThis.YayaHomeInteractions={list,get,items,initialize,build};
})();
