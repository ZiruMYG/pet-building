import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import vm from 'node:vm';

const context=vm.createContext({console});context.window=context;
for(const file of ['src/yaya-home-layout.js','src/yaya-home-art.js','src/yaya-rig.js','src/yaya-body.js','src/yaya-home-nav.js','src/yaya-home-interactions.js','src/yaya-home-model.js'])vm.runInContext(readFileSync(file,'utf8'),context,{filename:file});
const L=context.YayaHomeLayout,N=context.YayaHomeNav,M=context.YayaHomeModel,I=context.YayaHomeInteractions,R=context.YayaRig;
const dt=1/30,failures=[],sequence=[],interruptions=[],autonomous=[];
let frames=0,doorContactFrames=0,roomCrossings=0,transfers=0,maxReach=0;
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
function cleanProps(s){
  assert.equal(s.heldObject,null,'held object was returned');assert.equal(s.carrying,null,'book/teddy was returned');assert.ok(!s.mealProp,'meal utensil was returned');
  for(const [id,o] of Object.entries(s.roomItems))assert.equal(o.owner,'surface',`${id} has returned to its own surface`);
  for(const [id,o] of Object.entries(s.items))assert.equal(o.owner,'shelf',`${id} has returned to its own shelf`);
}
function validate(s,old){
  frames++;assert.equal(s.error,null,`${s.room}/${s.action}/${s.phase}: ${s.error}`);
  assert.ok([s.p.x,s.p.z,s.p.h,s.yaw,s.time,s.rotation].every(Number.isFinite),'finite world state');
  if(s.phase==='walk')assert.ok(!N.blocked(L.rooms[s.room],s.p.x,s.p.z),`${s.room}/${s.action}: walked into furniture`);
  for(const hand of s.grips){
    const reach=Math.hypot(hand.requested[0]-hand.shoulder[0],hand.requested[1]-hand.shoulder[1]);maxReach=Math.max(maxReach,reach);
    assert.ok(!hand.clamped&&reach<=R.constants.maxReach+1e-7,`${s.room}/${s.action}/${s.phase}: hand ${hand.side} requires ${reach}`);
  }
  const held=Object.entries(s.roomItems).filter(([,o])=>o.owner==='hand');
  assert.equal(held.length,s.heldObject?1:0,'each held object has exactly one owner');
  for(const [key,o] of Object.entries(s.roomItems)){
    assert.deepEqual(o.anchor,old.roomItems[key].anchor,`${key}: surface anchor did not move`);
    if(o.owner!==old.roomItems[key].owner){
      transfers++;const holder=s.heldObject||old.heldObject,hand=s.grips.find(h=>h.side===holder.hand),anchor=M.project(o.anchor,L.rooms[o.room]);
      assert.ok(distance(hand.screen,anchor)<.1,`${key}: ownership changes only at actual palm contact`);
    }
  }
  if(s.phase==='door-push'){
    assert.equal(s.contactHands?.length,1,'door is pushed by one of the real hands');
    const hand=s.grips.find(h=>h.side===s.contactHands[0]),doors=L.rooms[s.room].doors;
    const candidates=doors.map(d=>({id:d.id,point:M.project(L.doorHandle(d,s.doorOpen[d.id]||0),L.rooms[s.room])}));
    const nearest=candidates.reduce((a,b)=>distance(hand.screen,a.point)<distance(hand.screen,b.point)?a:b);
    assert.ok(distance(hand.screen,nearest.point)<.1,`${s.room}/${nearest.id}: palm follows the actual moving door handle`);doorContactFrames++;
  }
  if(s.room!==old.room){
    cleanProps(s);cleanProps(old);assert.equal(s.support,null,'leave support before crossing a doorway');
    assert.equal(s.inBed,false,'leave bed before crossing a doorway');assert.ok(s.fade>=.99,'room replacement happens at the doorway fade');
    assert.ok(L.rooms[old.room].doors.some(d=>d.to===s.room),'room changes follow a real adjacent door');roomCrossings++;
  }
}
function tick(model){const old=model.getState();model.step(dt);const s=model.getState();validate(s,old);return s;}
function finish(model,seconds,label,onFrame){
  const start=model.getState().time;
  for(let i=0;i<Math.ceil(seconds/dt);i++){
    const s=tick(model);onFrame?.(s);
    if(!s.action&&!s.pending){cleanProps(s);assert.equal(s.hands,null,'completed action releases hand targets');assert.equal(s.contactHands,null,'completed action releases contact');assert.ok(!s.support&&!s.inBed&&s.seated<.001,'completed action steps off support');assert.ok(!N.blocked(L.rooms[s.room],s.p.x,s.p.z),'completed action ends on clear floor');return {seconds:Number((s.time-start).toFixed(3)),state:s};}
  }
  throw Error(`${label}: did not safely finish in ${seconds}s (${model.getState().phase})`);
}
function travel(model,id){
  const s=model.getState();if(s.room===id)return;
  const edges=L.roomPath(s.room,id).length-1;assert.equal(model.setRoom(id),true,'valid room request accepted');
  finish(model,edges*18+12,`travel ${s.room} -> ${id}`);assert.equal(model.getState().room,id,'arrived at requested room');
}
function capture(label,run){try{run();}catch(error){failures.push({label,message:error.message,stack:error.stack?.split('\n').slice(0,5)});}}

// One uninterrupted instance: every next activity starts where the previous
// one left the pet. Nothing resets yaw, prop ownership or furniture state.
capture('all objects in one continuous model',()=>{
  const model=M.create({auto:false,random:()=>.4});
  for(const room of L.roomList){
    travel(model,room.id);
    for(const spec of I.list(room.id)){
      const before=model.getState(),label=room.id+'/'+spec.command;
      assert.equal(model.request(spec.command),true,label+' accepted');
      const result=finish(model,spec.kind==='shower'?55:45,label);
      sequence.push({label,seconds:result.seconds,from:before.p,to:result.state.p});
    }
  }
  assert.equal(sequence.length,L.roomList.reduce((n,r)=>n+I.list(r.id).length,0),'every visible item completed in the same model');
});

// Ask to leave in the middle of holding an item, once in every room. The
// pending room request must wait for physical return, then follow real doors.
const interruptCommand={bedroom:'object:book',ensuite:'object:towel',guestroom:'object:remote',bathroom:'object:towel',living:'object:toy-basket',kitchen:'object:stove'};
for(const room of L.roomList)capture('held-prop room change '+room.id,()=>{
  const model=M.create({auto:false,random:()=>.4});travel(model,room.id);
  assert.equal(model.request(interruptCommand[room.id]),true,'start the item activity');
  let held;
  for(let i=0;i<30/dt;i++){const s=tick(model);if(s.heldObject||s.carrying){held=s;break;}}
  assert.ok(held,room.id+': activity must actually pick something up');
  const target=room.doors[0].to,requestedAt=held.time;assert.equal(model.setRoom(target),true,'queue a room change while holding');
  let returnedAt=null,departedAt=null;
  const result=finish(model,65,'held-prop queued trip '+room.id,s=>{
    if(returnedAt===null&&!s.heldObject&&!s.carrying){cleanProps(s);returnedAt=s.time;}
    if(s.room!==room.id&&departedAt===null){departedAt=s.time;assert.ok(returnedAt!==null&&returnedAt<=departedAt,'item returns before room change');}
    if(returnedAt===null)assert.equal(s.room,room.id,'cannot leave while holding the room object');
  });
  assert.equal(result.state.room,target,'queued destination is eventually reached');assert.ok(departedAt!==null&&returnedAt>requestedAt,'return and departure happened after the request');
  interruptions.push({room:room.id,command:interruptCommand[room.id],target,returnAfter:Number((returnedAt-requestedAt).toFixed(3)),leaveAfter:Number((departedAt-requestedAt).toFixed(3)),completeAfter:result.seconds});
});

// Ten deterministic minutes exercise the scheduler and previous-action state.
// Validate policy outcomes (cooldown and varied use), not private queue code.
capture('seeded autonomous life for 600 seconds',()=>{
  let seed=0x5ea1b0d;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
  const model=M.create({auto:true,random}),seenExtras=new Map(),visited=new Set(['bedroom']);
  let previousAction=null,startAt=0;
  for(let i=0;i<600/dt;i++){
    const s=tick(model);visited.add(s.room);
    if(s.action&&s.action!==previousAction){
      startAt=s.time;autonomous.push({room:s.room,action:s.action,time:Number(s.time.toFixed(3)),completedBefore:s.completed});
      if(s.action.startsWith('object:')){
        const previous=seenExtras.get(s.action);if(previous!==undefined)assert.ok(s.time-previous>=180,'new routines respect the 180 second cooldown');seenExtras.set(s.action,s.time);
      }
    }
    if(s.action)assert.ok(s.time-startAt<65,'autonomous activity cannot remain stuck');
    previousAction=s.action;
  }
  model.setAuto(false);finish(model,65,'finish final autonomous activity');
  assert.ok(autonomous.length>=12,'pet did at least twelve distinct activity starts');
  assert.ok(visited.size>=2,'pet used more than one room');
  assert.ok(seenExtras.size>=2,'pet autonomously used at least two new object interactions');
});

const summary={ok:failures.length===0,sequenceCompleted:sequence.length,interruptions:interruptions.length,autonomousSeconds:600,autonomousStarts:autonomous.length,autonomousRooms:[...new Set(autonomous.map(a=>a.room))],autonomousObjectKinds:[...new Set(autonomous.filter(a=>a.action.startsWith('object:')).map(a=>a.action))],frames,doorContactFrames,roomCrossings,transfers,maxReach:Number(maxReach.toFixed(5)),failures};
mkdirSync('out/home-qa',{recursive:true});writeFileSync('out/home-qa/continuous-report.json',JSON.stringify({...summary,sequence,interruptions,autonomous},null,2));
console.log(JSON.stringify({...summary,details:'out/home-qa/continuous-report.json'},null,2));if(failures.length)process.exitCode=1;
