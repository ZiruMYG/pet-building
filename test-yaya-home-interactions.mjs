import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console});context.window=context;
for(const file of ['src/yaya-home-layout.js','src/yaya-home-art.js','src/yaya-rig.js','src/yaya-body.js','src/yaya-home-nav.js','src/yaya-home-interactions.js','src/yaya-home-model.js'])vm.runInContext(readFileSync(file,'utf8'),context,{filename:file});
const L=context.YayaHomeLayout,N=context.YayaHomeNav,M=context.YayaHomeModel,I=context.YayaHomeInteractions,R=context.YayaRig;
const dt=1/30,results=[],failures=[];let frames=0,transfers=0,contactChecks=0,continuityChecks=0;
const screenDistance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
// Two visible reference points per prop also catch an angle or grip-offset
// discontinuity. Merely following a stored prop origin would miss that jump.
const propReference={ball:[0,.1],towel:[0,1.16],remote:[0,.32],wateringCan:[.06,1.1],spoon:[1.02,0],fruit:[0,.1],cloth:[.47,.36],pencil:[.72,-.49]};
function propPoint(s,item,reference=[0,0]){
  const obj=item.owner==='hand'?s.heldObject:item;
  if(!obj)return null;
  const angle=obj.angle||0,dx=reference[0]*Math.cos(angle)-reference[1]*Math.sin(angle)+(obj.gripOffset?.[0]||0),dy=reference[0]*Math.sin(angle)+reference[1]*Math.cos(angle)+(obj.gripOffset?.[1]||0);
  if(item.owner!=='hand'){const a=M.project(item.anchor,L.rooms[item.room]);return {x:a.x+dx*s.u,y:a.y+dy*s.u};}
  const side=obj.hand??obj.side??1;
  const palm=side==='both'||obj.twoHands?[(s.grips[0].palm[0]+s.grips[1].palm[0])/2,(s.grips[0].palm[1]+s.grips[1].palm[1])/2]:s.grips.find(a=>a.side===side)?.palm;
  if(!palm)return null;
  const tf=M.bodyTransform(s),x=(palm[0]+dx)*s.u*tf.sx,y=(palm[1]+dy)*s.u*tf.sy;
  return {x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)};
}

function simulate(model,label,{inspect=true,maxSeconds=180}={}){
  const problems=new Map(),phases=new Set(),initial=model.getState(),maxFrames=Math.ceil(maxSeconds/dt);
  let previous=initial,finished=false,maxReach=0,worst=null;
  const report=(code,message,state,detail={})=>{
    const key=code+':'+state.phase+':'+(detail.side??'');
    if(!problems.has(key))problems.set(key,{code,message,phase:state.phase,time:Number(state.phaseTime.toFixed(3)),p:state.p,yaw:state.yaw,...detail});
  };
  for(let tick=0;tick<maxFrames;tick++){
    model.step(dt);const s=model.getState();frames++;phases.add(s.phase);
    if(s.error){report('model-error',s.error,s);break;}
    if(inspect){
      if(![s.p.x,s.p.z,s.p.h,s.yaw,s.rotation,s.time].every(Number.isFinite))report('non-finite','Non-finite body state',s);
      if(s.phase==='walk'&&N.blocked(L.rooms[s.room],s.p.x,s.p.z))report('furniture-collision','Walking position is inside expanded furniture',s);
      if(s.grips.length!==2)report('hand-count','The body must own exactly two hands',s);
      for(const hand of s.grips){
        const reach=Math.hypot(hand.requested[0]-hand.shoulder[0],hand.requested[1]-hand.shoulder[1]);
        if(reach>maxReach){maxReach=reach;worst={phase:s.phase,time:s.phaseTime,side:hand.side,requested:hand.requested,shoulder:hand.shoulder,p:s.p,yaw:s.yaw};}
        if(reach>R.constants.maxReach+1e-7||hand.clamped)report('hand-unreachable',`Hand ${hand.side} requires ${reach.toFixed(4)} body units; maximum is ${R.constants.maxReach}`,s,{side:hand.side,reach,requested:hand.requested,shoulder:hand.shoulder});
        if(Math.abs(hand.radius-R.constants.palmRadius)>1e-8)report('hand-size','Palm changed size',s,{side:hand.side});
        if(Math.abs(hand.shoulder[1]+3.93)>1e-8)report('shoulder-anchor','Shoulder root moved',s,{side:hand.side});
      }
      const fixedBody=s.room===previous.room&&screenDistance(M.bodyTransform(s),M.bodyTransform(previous))<1e-6&&Math.abs(s.yaw-previous.yaw)<1e-6&&Math.abs(s.rotation-previous.rotation)<1e-6&&Math.abs(s.squash-previous.squash)<1e-6&&!['walk','turn'].includes(s.phase)&&!['walk','turn'].includes(previous.phase);
      const boundary=s.phase!==previous.phase||previous.phaseTime<1e-8;
      if(fixedBody)for(const hand of s.grips){
        const prior=previous.grips.find(a=>a.side===hand.side),jump=screenDistance(hand.screen,prior.screen),limit=boundary?3:7;
        continuityChecks++;
        if(jump>limit)report('hand-jump',`Stationary body hand ${hand.side} jumps ${jump.toFixed(2)} pixels in one frame`,s,{side:hand.side,pixels:jump,fromPhase:previous.phase,from:prior.screen,to:hand.screen});
      }
      const held=Object.entries(s.roomItems).filter(([,o])=>o.owner==='hand');
      if(held.length!==(s.heldObject?1:0))report('prop-owner-count','Held prop and actual item ownership disagree',s,{held:held.map(([key])=>key),heldObject:s.heldObject});
      if(s.heldObject&&held.length===1&&held[0][1].id!==s.heldObject.id)report('prop-owner-id','The visible held prop is a different item',s);
      for(const [key,o] of Object.entries(s.roomItems)){
        if(JSON.stringify(o.anchor)!==JSON.stringify(initial.roomItems[key].anchor))report('anchor-drift','A movable prop lost its original surface anchor',s,{item:key});
        const prior=previous.roomItems[key];
        if(o.owner!==prior.owner){
          transfers++;contactChecks++;
          const holder=s.heldObject||previous.heldObject,hand=s.grips.find(a=>a.side===(holder?.hand??1)),anchor=M.project(o.anchor,L.rooms[o.room]),error=hand?screenDistance(hand.screen,anchor):Infinity;
          if(error>.1)report('transfer-no-contact',`Owner changes while the real hand is ${error.toFixed(2)} pixels from the surface grip anchor`,s,{item:key,side:holder?.hand,error,hand:hand?.screen,anchor,fromOwner:prior.owner,toOwner:o.owner});
          // Compare both possible owners at this exact body pose. It isolates
          // a drawing jump from the legitimate subpixel final approach step.
          const heldState={...s,heldObject:holder},heldItem={...o,owner:'hand'},restItem={...o,owner:'surface'};
          for(const reference of [[0,0],propReference[o.kind]||[0,0]]){
            const held=propPoint(heldState,heldItem,reference),rest=propPoint(s,restItem,reference),gap=held&&rest?screenDistance(held,rest):Infinity;
            if(gap>.1)report('transfer-prop-jump',`Changing ownership moves visible prop ${gap.toFixed(2)} pixels`,s,{item:key,gap,reference,held,rest});
          }
        }
        if(o.room===s.room&&s.room===previous.room&&(o.owner==='hand'||prior.owner==='hand'))for(const reference of [[0,0],propReference[o.kind]||[0,0]]){
          const a=propPoint(previous,prior,reference),b=propPoint(s,o,reference),jump=a&&b?screenDistance(a,b):0,limit=fixedBody?(boundary?3:7):20;
          continuityChecks++;
          if(jump>limit)report('held-prop-jump',`Visible held prop jumps ${jump.toFixed(2)} pixels in one frame`,s,{item:key,reference,pixels:jump,fromPhase:previous.phase,from:a,to:b});
        }
      }
      const oldHeld=Object.values(s.items).filter(o=>o.owner==='hand');
      if(oldHeld.length!==(s.carrying?1:0))report('legacy-prop-owner','Book/teddy owner is inconsistent',s);
    }
    if(!s.action&&!s.pending){finished=true;break;}
    previous=s;
  }
  const last=model.getState();
  if(!finished&&!last.error)report('timeout',`Interaction did not finish within ${maxSeconds} seconds`,last);
  if(finished&&inspect){
    for(const [key,o] of Object.entries(last.roomItems))if(o.owner!=='surface')report('prop-not-returned','Room prop was not returned to its original surface',last,{item:key,owner:o.owner});
    for(const [key,o] of Object.entries(last.items))if(o.owner!=='shelf')report('legacy-prop-not-returned','Book/teddy was not returned',last,{item:key,owner:o.owner});
    if(last.heldObject||last.carrying||last.mealProp)report('prop-still-held','Interaction ended with a prop still attached',last);
    if(last.hands||last.contactHands)report('hands-not-released','Interaction ended with hand contact still active',last);
    if(last.support||last.inBed||last.seated>.001)report('support-not-released','Interaction ended while still on furniture',last);
    if(last.interactionBusy)report('interaction-lock','Interaction lock was not released',last);
    if(N.blocked(L.rooms[last.room],last.p.x,last.p.z))report('end-inside-furniture','Interaction ended inside furniture instead of on clear floor',last);
    for(const [key,value] of Object.entries(last.objects))for(const field of ['open','privacy','water'])if(Number(value[field]||0)>1e-6)report('object-not-restored',`${field} did not close/stop after use`,last,{item:key,value:value[field]});
  }
  return {label,finished,seconds:Number((last.time-initial.time).toFixed(2)),maxReach:Number(maxReach.toFixed(5)),worst,phases:[...phases],problems:[...problems.values()]};
}

for(const room of L.roomList){
  const specs=I.list(room.id);
  assert.equal(new Set(specs.map(s=>s.command)).size,specs.length,`${room.id}: commands must be unique`);
  for(const f of room.furniture)assert.ok(specs.some(s=>s.targetId===f.id),`${room.id}: missing furniture interaction ${f.id}`);
  for(const spec of specs){
    const label=room.id+'/'+spec.command,model=M.create({auto:false,random:()=>.4});
    if(room.id!=='bedroom'){
      assert.equal(model.setRoom(room.id),true,`${label}: room journey accepted`);
      const travel=simulate(model,label+'/setup',{inspect:false});
      if(!travel.finished||travel.problems.length){results.push(travel);failures.push(travel);continue;}
      assert.equal(model.getState().room,room.id,`${label}: arrived through real doors`);
    }
    const accepted=model.request(spec.command);
    const result=simulate(model,label);
    if(!accepted)result.problems.unshift({code:'request-rejected',message:model.getState().error||'Valid visible object command rejected'});
    results.push(result);if(result.problems.length)failures.push(result);
  }
}

const summary={ok:failures.length===0,rooms:L.roomList.length,interactions:results.length,passed:results.length-failures.length,failed:failures.length,frames,transfers,contactChecks,continuityChecks,maxReach:Math.max(...results.map(r=>r.maxReach)),failures};
mkdirSync('out/home-qa',{recursive:true});
writeFileSync('out/home-qa/interactions-report.json',JSON.stringify({...summary,results},null,2));
console.log(JSON.stringify({...summary,failures:failures.map(f=>({label:f.label,finished:f.finished,maxReach:f.maxReach,codes:[...new Set(f.problems.map(p=>p.code))]})),details:'out/home-qa/interactions-report.json'},null,2));
if(failures.length)process.exitCode=1;
