// Room geometry and the shared pet rig meet here, in a depth-sorted scene.
(() => {
 'use strict';
 const D=()=>YayaDrawing;
 function turnFeet(turn){if(!turn)return;const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x);};return {duration:YayaLeaves.period,bob:0,lean:0,squash:0,bodyX:0,bodyZ:0,feet:[-1,1].map((side,i)=>{const q=Math.max(0,Math.min(1,(turn.phase-(i?.5:.04))/.44)),k=smooth(q),yaw=turn.from+(turn.to-turn.from)*k;return {x:side*1.35*Math.cos(yaw)+.1*Math.sin(yaw),z:-side*1.35*Math.sin(yaw)+.1*Math.cos(yaw),yaw,lift:.24*Math.sin(PI*q)};})};}
 function drawItem(key,point,s){push();translate(point.x,point.y);if(key==='book')YayaBedroomArt.drawBook(0,0,s.u*1.25,s.carrying==='book'?s.bookOpen:0,s.bookPage);else YayaBedroomArt.drawTeddy(0,0,s.u*.72);pop();}
 function dish(point,u,kind='bowl'){const d=D();if(kind==='cup'){d.flatPoly([[point.x-u*.35,point.y-u*.62],[point.x+u*.35,point.y-u*.62],[point.x+u*.28,point.y],[point.x-u*.28,point.y]],'#B4DDEE','#36585C',2);d.flatEllipse(point.x,point.y-u*.62,u*.35,u*.12,'#EEFCFF','#36585C',1.7);}else {
  // A visible bowl wall distinguishes it from a flat plate. The spoon still
  // touches the same food socket, exactly .24 rig units above its anchor.
  d.flatPoly([[point.x-.80*u,point.y-.24*u],[point.x-.59*u,point.y+.20*u],[point.x+.59*u,point.y+.20*u],[point.x+.80*u,point.y-.24*u]],'#EFAC91','#36585C',2);
  d.flatEllipse(point.x,point.y-.24*u,.80*u,.23*u,'#FFF4D9','#36585C',1.8);
  d.flatEllipse(point.x,point.y-.24*u,.67*u,.14*u,'#DDA468',null,0);
  for(let i=0;i<4;i++)d.flatEllipse(point.x+(i-1.5)*u*.29,point.y-u*.26,u*.07,u*.05,'#F8EBC4',null,0);
 }}
 function utensil(point,u,kind,angle=0,food=0){const d=D();push();translate(point.x,point.y);rotate(angle);
  if(kind==='spoon'){d.flatPoly([[-.12*u,-.085*u],[1.03*u,-.085*u],[1.03*u,.085*u],[-.12*u,.085*u]],'#91BDD0','#36585C',1.7);d.flatEllipse(1.04*u,0,.30*u,.22*u,'#D5EAF1','#36585C',1.5);if(food>.01)d.flatEllipse(1.04*u,-.05*u,.17*u*food,.13*u*food,'#F8EBC4',null,0);}
  else{d.flatEllipse(-.10*u,.02*u,.32*u,.28*u,'#B4DDEE','#36585C',1.7);d.flatEllipse(-.10*u,.02*u,.17*u,.15*u,'#F7F6EE',null,0);d.flatPoly([[-1.06*u,-.48*u],[-.22*u,-.48*u],[-.29*u,.46*u],[-.99*u,.46*u]],'#B4DDEE','#36585C',1.7);d.flatEllipse(-.64*u,-.48*u,.42*u,.11*u,'#EEFCFF','#36585C',1.5);}
  pop();
 }
 function tableProps(s,r){const u=s.u,M=YayaHomeModel,b=M.project(r.anchors.bowl,r),c=M.project(r.anchors.cup,r);dish(b,u);
  if(s.mealProp?.kind!=='cup')utensil({x:c.x+.64*u,y:c.y-.46*u},u,'cup');
  if(s.mealProp?.kind!=='spoon'){const a=PI+.30;utensil({x:b.x-1.04*Math.cos(a)*u,y:b.y-.24*u-1.04*Math.sin(a)*u},u,'spoon',a);}
 }
 function drawPet(t,s,r){
  const A=YayaHomeArt,M=YayaHomeModel,E=YayaHomeEffects,u=s.u,p=M.project(s.p,r),d=D(),behavior=s.phase.startsWith('wash')?'wash':s.behavior||s.action;
  let mood=['read','page','window','mirror','look'].includes(s.phase)?'curious':s.phase==='hug'?'love':s.sleeping?'sleepy':'idle';
  const state=getYayaEmotionState(mood,t);state.action=s.motion==='walk'?'walk':s.turnStep?'turn':['eat','drink','stretch','wave'].includes(s.phase)?s.phase:'idle';state.sleeping=s.sleeping;state.emote=null;
  state.pose={...state.pose,dy:0,dx:0,rot:0,sq:s.squash||0,left:0,right:0,footL:0,footR:0};
  if(s.sleeping)state.face={...state.face,eyes:'closed',mouth:'small',closed:1};
  if(['read','page'].includes(s.phase)){state.state='idle';state.face={...state.face,eyes:'look',lookX:Math.sin(s.phaseTime)*.2,lookY:.8,mouth:'smile'};}
  if(s.phase==='wipe-feet'){state.pose.footL=.24*Math.max(0,Math.sin(s.phaseTime*5));state.pose.footR=.24*Math.max(0,-Math.sin(s.phaseTime*5));}
  if(s.phase==='hug')state.face={...state.face,eyes:'relieved',mouth:'smile'};
  if(!s.action)state.pose.sq=.018*Math.sin(t*PI/2);
  if(!s.inBed)d.flatEllipse(p.x,p.y+6,3.4*u,.40*u,'rgba(51,76,72,.13)',null,0);
  push();translate(p.x,p.y);rotate(s.rotation||0);
  const gesture=['stretch','wave'].includes(s.phase),tableLayer=r.id==='kitchen'&&s.seated>.99,sinkLayer=behavior==='wash'&&!!s.hands;
  const singleContact=['lamp','wardrobe'].includes(behavior)&&!!s.hands;
  const rinseContact=behavior==='wash'&&!!s.hands&&!s.phase.startsWith('wash-rub');
  const contactSides=s.contactHands|| (singleContact?[1]:rinseContact?[-1]:[]),foreground=Object.fromEntries([-1,1].map(side=>[side,contactSides.includes(side)||(Math.abs(Math.sin(s.yaw))>.18?-side*Math.sin(s.yaw)>.08:Math.cos(s.yaw)>0)]));
  const heldProps=(arms,cols,front)=>{
   if(s.carrying&&((Math.cos(s.yaw)>-.15)===front)){const mid=M.propLocal(s,arms);push();translate(...mid);scale(.5+.5*Math.abs(Math.cos(s.yaw)),1);drawItem(s.carrying,{x:0,y:0},s);pop();}
   if(s.heldObject){const a=arms.find(a=>a.side===s.heldObject.hand);if(!!a?.foreground===front)E.drawHeld(u,s,arms,cols);}
  };
  const view={yaw:s.yaw,gait:s.gait,speed:s.speed,turnPose:turnFeet(s.turnStep),seated:s.seated,seatedDrop:s.seatFurniture?.62:undefined,seatedForward:s.seatFurniture?1.8:0,hideShadow:true,hideFeet:s.sleeping&&s.cover>.6,hideProps:true,
   projectedArmTargets:gesture?undefined:singleContact?{1:s.hands[1]}:rinseContact?{[-1]:s.hands[-1]}:M.defaultHands(s),projectedHandsForeground:foreground,
   drawBackProps({arms,cols}){heldProps(arms,cols,false);},
   drawFurniture(){if(tableLayer){push();translate(-p.x,-p.y);const f=YayaHomeLayout.getFurniture(r,'dining-table');A.drawObject(f,r,s);tableProps(s,r);pop();}},
   drawProps({arms,cols}){
    heldProps(arms,cols,true);
    if(s.mealProp){const a=arms.find(a=>a.side===s.mealProp.side);utensil({x:a.palm[0]*u,y:a.palm[1]*u},u,s.mealProp.kind,s.mealProp.angle,s.mealProp.food);}
    if(s.phase==='wash'||s.phase==='wash-rub'){
     if(s.waterOn){const f=YayaHomeLayout.getFurniture(r,'sink'),a=M.project(f.spout||{x:f.x+f.w/2,z:f.z+f.d/2,h:f.h+.252},r),b=M.project(f.grip,r);d.flatLine([[a.x-p.x,a.y-p.y],[b.x-p.x,b.y-p.y]],'#86CDDB',4);d.flatLine([[a.x-p.x-1,a.y-p.y],[b.x-p.x-1,b.y-p.y]],'#EDFCFF',1.5);}
     for(const a of arms.filter(a=>!rinseContact||a.side===-1)){const x=a.palm[0]*u,y=a.palm[1]*u;for(let i=0;i<3;i++)d.flatEllipse(x+Math.sin(t*3+i)*9,y-4-i*5,3+i,3+i,'rgba(218,252,255,.8)','#8FCECF',1);}
    }
   }
  };
  YayaViews.draw(0,0,u,t,state,s.phaseTime,view);pop();
 }
 function draw(t,s){
  const L=YayaHomeLayout,A=YayaHomeArt,r=L.rooms[s.room],M=YayaHomeModel;
  A.drawArchitecture(r,t,s);
  YayaHomeEffects.drawWorld(r,s,t);
  const tableLayer=r.id==='kitchen'&&s.seated>.99;
  const objects=r.furniture.filter(o=>!o.mounted&&o.kind!=='rug'&&o.kind!=='lamp'&&!(tableLayer&&o.id==='dining-table')).map(o=>({depth:A.objectDepth(o),type:'furniture',o}));
  const actorDepth=s.p.x+s.p.z+.15;
  if(s.inBed||s.support){const b=objects.find(v=>v.o.id===(s.inBed?'bed':s.support));if(b)b.depth=actorDepth-.02;}
  objects.push({depth:actorDepth,type:'pet'});
  for(const [key,item]of Object.entries(s.items))if(item.room===s.room&&item.owner==='shelf')objects.push({depth:item.anchor.x+item.anchor.z+.20,type:'item',key,item});
  for(const item of Object.values(s.roomItems||{}))if(item.room===s.room&&item.owner==='surface'&&!['hand-towel','basket-ball'].includes(item.id))objects.push({depth:item.anchor.x+item.anchor.z+.20,type:'surface',item});
  // Lamps sit on a bedside table, so they sort just in front of their parent.
  for(const o of r.furniture.filter(o=>o.kind==='lamp'))objects.push({depth:A.objectDepth(L.getFurniture(r,o.parent))+ .01,type:'furniture',o});
  objects.sort((a,b)=>a.depth-b.depth);
  for(const item of objects){
   if(item.type==='furniture'){A.drawObject(item.o,r,s);if(item.o.id==='dining-table')tableProps(s,r);}
   else if(item.type==='surface')YayaHomeEffects.drawSurfaceItem(item.item,r,s);
   else if(item.type==='item')drawItem(item.key,M.project(item.item.anchor,r),s);
   else{drawPet(t,s,r);if(s.inBed)A.drawBedCover(L.getFurniture(r,'bed'),r,s.cover,s);}
  }
  A.drawFront(r,s);
  YayaHomeEffects.drawForeground(r,s,t);
  if(s.fade>0){push();noStroke();fill(`rgba(246,247,235,${s.fade})`);rect(0,0,1920,1080);pop();}
  return s;
 }
 window.YayaHome={draw};
})();
