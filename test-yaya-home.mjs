import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

// Pure tests consume the very same layout, projection and arm solver as the
// browser. No mock room coordinates or alternative movement implementation.
const context=vm.createContext({console});
context.window=context;
for(const file of ['src/yaya-home-layout.js','src/yaya-home-art.js','src/yaya-rig.js','src/yaya-body.js','src/yaya-home-model.js'])
  vm.runInContext(readFileSync(file,'utf8'),context,{filename:file});
const L=context.YayaHomeLayout,M=context.YayaHomeModel,R=context.YayaRig;
const near=(a,b,label,epsilon=1e-6)=>assert.ok(Math.abs(a-b)<epsilon,`${label}: ${a} != ${b}`);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
let samples=0,transfers=0,doorCrossings=0,mealContacts=0,washContacts=0,washRubs=0,lampContacts=0,wardrobeContacts=0;
const results=[];

for(const room of L.roomList){
  assert.ok(!M.blocked(room,room.spawn.x,room.spawn.z),`${room.id}: spawn occupies open floor`);
  for(const door of room.doors){
    const reverse=L.rooms[door.to].doors.find(item=>item.id===door.toDoor);
    assert.ok(reverse&&reverse.to===room.id,`${door.id}: a physical door has a matching return door`);
    const approach=L.doorPoint(room,door,1);
    assert.ok(!M.blocked(room,approach.x,approach.z),`${door.id}: door landing is clear`);
  }
  for(const item of room.furniture){
    if(item.mounted||item.collision===false)assert.equal(item.blocks,false,`${room.id}/${item.id}: mounted fixtures and rugs do not block feet`);
    if(!item.mounted)assert.ok(item.x>=0&&item.z>=0&&item.x+item.w<=room.w&&item.z+item.d<=room.d,`${room.id}/${item.id}: furniture stays within room bounds`);
  }
}
assert.deepEqual(Array.from(L.rooms.ensuite.doors,door=>door.to),['bedroom'],'Yaya bathroom is private to her bedroom');
assert.deepEqual(Array.from(L.rooms.bathroom.doors,door=>door.to),['guestroom'],'the second bathroom is private to the guest bedroom');
assert.deepEqual(Array.from(L.roomPath('ensuite','bathroom')),['ensuite','bedroom','living','guestroom','bathroom'],'two bathrooms connect through their own bedrooms and the shared living room');

function itemScreen(state,key){
  const item=state.items[key];
  return item.owner==='hand'?state.heldScreen:M.project(item.anchor,L.rooms[item.room]);
}
function utensilSocket(s,offset){
  const prop=s.mealProp,arm=s.grips.find(item=>item.side===prop.side),tf=M.bodyTransform(s),a=prop.angle;
  const local=[arm.palm[0]+offset[0]*Math.cos(a)-offset[1]*Math.sin(a),arm.palm[1]+offset[0]*Math.sin(a)+offset[1]*Math.cos(a)];
  const x=local[0]*s.u*tf.sx,y=local[1]*s.u*tf.sy;
  return {x:tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),y:tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation)};
}
function utensilSupport(s){
  const r=L.rooms[s.room],point=M.project(r.anchors[s.mealProp.kind==='spoon'?'bowl':'cup'],r);
  return s.mealProp.kind==='spoon'?{x:point.x,y:point.y-.24*s.u}:point;
}
function validate(s,old){
  samples++;
  assert.equal(s.error,null,`${s.room}/${s.action}/${s.phase}: ${s.error}`);
  assert.ok([s.time,s.p.x,s.p.z,s.p.h,s.yaw,s.rotation,s.cover,s.gait].every(Number.isFinite),'world pose is finite');
  assert.ok(s.p.x>=0&&s.p.z>=0&&s.p.x<=L.rooms[s.room].w&&s.p.z<=L.rooms[s.room].d,'pet remains within the active room');
  assert.ok(s.cover>=0&&s.cover<=1,'quilt progress remains bounded');
  assert.equal(s.grips.length,2,'the existing rig owns exactly two hands');
  for(const arm of s.grips){
    near(arm.shoulder[0],arm.side*2.28*Math.cos(s.yaw)+.45*Math.sin(s.yaw),'fixed projected cheek-height shoulder X');
    near(arm.shoulder[1],-3.93,'fixed cheek-height shoulder Y');
    near(arm.radius,.64,'palm radius is unchanged');
    assert.ok(!arm.clamped,`${s.room}/${s.action}/${s.phase}: short hand ${arm.side} must be reachable`);
    assert.ok(arm.reach<=R.constants.maxReach+1e-8,'arm reach stays below 2.05 body units');
    assert.ok(Number.isFinite(arm.screen.x)&&Number.isFinite(arm.screen.y),'palm projection remains finite');
  }
  if(s.phase==='walk')assert.ok(!M.blocked(L.rooms[s.room],s.p.x,s.p.z),`${s.room}/${s.action}: walking enters furniture at ${JSON.stringify(s.p)}`);
  const held=Object.entries(s.items).filter(([,item])=>item.owner==='hand');
  assert.equal(held.length,s.carrying?1:0,'items have one owner, without duplicate carried props');
  if(s.carrying){
    assert.equal(held[0][0],s.carrying,'carrying state agrees with actual item ownership');
    const tf=M.bodyTransform(s),prop=M.propLocal(s,s.grips),x=prop[0]*tf.sx,y=prop[1]*tf.sy;
    near(s.heldScreen.x,tf.x+x*Math.cos(tf.rotation)-y*Math.sin(tf.rotation),'held prop follows actual solved palms X');
    near(s.heldScreen.y,tf.y+x*Math.sin(tf.rotation)+y*Math.cos(tf.rotation),'held prop follows actual solved palms Y');
  }
  if(s.sleeping)assert.ok(s.inBed,'sleeping requires support from the bed');
  if(s.phase==='desk')near(Math.sin(s.yaw-L.getFurniture(s.room,'desk-chair').seatYaw),0,'seated pet faces the desk, not the opposite side');
  if(s.mealProp){
    assert.ok(s.hands,'a room meal exposes the same real hand targets that the renderer uses');
    assert.equal(s.mealProp.side,-1,'the visible near hand owns the utensil');
    assert.equal(s.mealProp.kind,s.phase==='eat'?'spoon':'cup','the utensil matches the eating/drinking phase');
    const chair=L.getFurniture(s.room,'spare-chair');
    near(s.p.x,chair.seat.x,'meals use the actual far-side chair X');near(s.p.z,chair.seat.z,'meals use the actual far-side chair Z');near(s.p.h,chair.seat.h,'meals are supported by the seat height');
    near(Math.sin(s.yaw-chair.seatYaw),0,'pet faces forward across the table');
    const cycle=(s.phaseTime/4)%1;
    if(cycle>=.27&&cycle<=.57){
      const touch=utensilSocket(s,s.mealProp.kind==='spoon'?[1.04,0]:[-.64,-.48]);
      const base=M.project(s.p,L.rooms[s.room]);
      const mouth={x:base.x+2.55*Math.sin(s.yaw)*s.u,y:base.y-3.58*s.u};
      assert.ok(dist(touch,mouth)<.05,'the real spoon tip / cup rim reaches the actual turned mouth');mealContacts++;
    }
    if(cycle>=.92||cycle<.0001){
      const touch=utensilSocket(s,s.mealProp.kind==='spoon'?[1.04,0]:[-.64,.46]);
      assert.ok(dist(touch,utensilSupport(s))<.05,'the spoon returns to food / cup bottom rests exactly on the table');mealContacts++;
    }
  }
  if(s.phase==='wash'){
    const sink=L.getFurniture(s.room,'sink'),water=M.project(sink.grip,L.rooms[s.room]);
    assert.equal(s.waterOn,true,'water runs during actual washing');
    near(sink.grip.x,sink.x+sink.w/2,'wash target is under the drawn faucet X');
    near(sink.grip.z,sink.z+sink.d/2,'wash target is under the drawn faucet Z');
    assert.ok(sink.grip.h>sink.h&&sink.grip.h<sink.h+.252,'hands are below the actual spout and above the basin');
    near(Math.sin(s.yaw-sink.washYaw),0,'pet faces the sink and mirror',1e-5);
    const nearHand=s.grips.find(hand=>hand.side===sink.washHand);
    assert.ok(dist(nearHand.screen,water)<.05,'the real near-side palm receives water at the actual faucet');
    assert.ok(nearHand.palm[0]>2.4&&nearHand.palm[0]<3.1&&nearHand.palm[1]>-4.4&&nearHand.palm[1]<-3.4,'the wet hand is visible beside the body, below the eyes');
    const farHand=s.grips.find(hand=>hand.side!==sink.washHand);
    assert.ok(dist(farHand.screen,water)>s.u,'the far hand is not stretched across the head to reach the same water point');washContacts++;
  }
  if(s.phase==='wash-rub'){
    assert.equal(s.waterOn,false,'water stops while the pet rubs hands away from the basin');
    assert.ok(Math.cos(s.yaw)>.5,'the pet turns slightly toward the viewer to show the rubbing gesture');
    for(const hand of s.grips)assert.ok(hand.palm[1]>-3.5&&hand.palm[1]<-3.1,'rubbing stays at chest height rather than covering the eyes');
    assert.ok(dist(s.grips[0].screen,s.grips[1].screen)<1.3*s.u,'both full-size round palms visibly meet during rubbing');washRubs++;
  }
  if(['wardrobe-open','wardrobe','wardrobe-close'].includes(s.phase)){
    const wardrobe=L.getFurniture(s.room,'wardrobe'),amount=s.openFurniture?.amount||0;
    const handle=context.YayaHomeArt.wardrobeHandle(wardrobe,amount,-1),screen=M.project(handle,L.rooms[s.room]);
    const hand=s.grips.find(arm=>arm.side===1);
    assert.ok(dist(hand.screen,screen)<.05,'the actual palm holds the same moving wardrobe handle throughout opening and closing');
    assert.ok(amount>=0&&amount<=.55,'wardrobe opens only as far as the attached short arm can reach');wardrobeContacts++;
  }
  if(s.phase==='lamp'){
    const lamp=L.getFurniture(s.room,'bedside-lamp'),screen=M.project({x:lamp.x+lamp.w/2+.12,z:lamp.z+lamp.d/2,h:lamp.elevation+.10},L.rooms[s.room]);
    assert.ok(dist(s.grips.find(arm=>arm.side===1).screen,screen)<.05,'the held touch stays on the real lamp-base switch');lampContacts++;
  }
  if(old){
    if(s.room!==old.room){
      doorCrossings++;
      assert.equal(old.phase,'leave','room changes only after the actor physically enters a door');
      assert.equal(s.phase,'arrive','the actor arrives through the paired door');
      assert.equal(s.fade,1,'the old and new world projections meet under the doorway fade');
      assert.ok(L.rooms[old.room].doors.some(door=>door.to===s.room),'room changes follow an actual direct connection');
      assert.equal(s.carrying,null,'a room change does not abandon an attached object');
      assert.equal(s.inBed,false,'a sleeping pet cannot teleport between rooms');
    }else{
      assert.ok(dist(M.project(s.p,L.rooms[s.room]),M.project(old.p,L.rooms[old.room]))<5,`${s.action}/${s.phase}: body position is continuous`);
      assert.ok(Math.abs(s.yaw-old.yaw)<.13,`${s.action}/${s.phase}: body/head orientation is continuous`);
      assert.ok(Math.abs(s.rotation-old.rotation)<.09,`${s.action}/${s.phase}: lie-down roll is continuous`);
    }
    for(const key of Object.keys(s.items)){
      if(s.items[key].owner!==old.items[key].owner){
        transfers++;
        assert.ok(dist(itemScreen(s,key),itemScreen(old,key))<.20,`${key}: ownership transfers at actual hand contact, not a teleport`);
      }else if(s.carrying===key&&old.carrying===key&&s.room===old.room)
        assert.ok(dist(itemScreen(s,key),itemScreen(old,key))<6,`${key}: the carried prop moves continuously`);
    }
    if(s.mealProp&&!old.mealProp){
      const touch=utensilSocket(s,s.mealProp.kind==='spoon'?[1.04,0]:[-.64,.46]);
      assert.ok(dist(touch,utensilSupport(s))<.2,'utensil ownership begins at actual table contact');
    }
    if(!s.mealProp&&old.mealProp){
      const touch=utensilSocket(old,old.mealProp.kind==='spoon'?[1.04,0]:[-.64,.46]);
      assert.ok(dist(touch,utensilSupport(old))<.2,'utensil ownership ends only after it returns to the support');
    }
    if(s.lampOn!==old.lampOn){
      assert.equal(old.phase,'lamp-reach','lamp changes only after the hand reaches the switch');
      const lamp=L.getFurniture(s.room,'bedside-lamp'),screen=M.project({x:lamp.x+lamp.w/2+.12,z:lamp.z+lamp.d/2,h:lamp.elevation+.10},L.rooms[s.room]);
      assert.ok(dist(s.grips.find(arm=>arm.side===1).screen,screen)<.05,'lamp switches at exact physical palm contact');
    }
  }
}
function run(model,{maxSeconds=240,onStep}={}){
  let old=model.getState();validate(old);
  const phases=new Set([old.phase]),visited=[old.room];
  for(let i=0;i<120*maxSeconds&&old.action;i++){
    model.step(1/120);const state=model.getState();validate(state,old);phases.add(state.phase);
    if(state.room!==old.room)visited.push(state.room);
    onStep?.(state,old,model);old=state;
  }
  assert.equal(old.action,null,'the complete behavior finishes');
  return {state:old,phases,visited};
}
function freshAt(id){
  const model=M.create({auto:false,random:()=>.5});
  assert.equal(model.setRoom(id),true,`room ${id} can be requested`);
  run(model);assert.equal(model.getState().room,id,'the requested room is reached');
  return model;
}

// Test every directed journey, not merely a switch from the initial bedroom.
for(const from of L.roomOrder)for(const to of L.roomOrder){
  if(from===to)continue;
  const model=freshAt(from);assert.equal(model.setRoom(to),true);
  const {state,visited}=run(model);
  assert.equal(state.room,to,'the destination is actually reached');
  assert.deepEqual(visited,Array.from(L.roomPath(from,to)),'travel follows real room adjacency');
}
for(const room of L.roomList){
  const commands=[...room.activities];
  if(L.getFurniture(room,'bedside')&&!commands.includes('lamp'))commands.push('lamp');
  for(const command of commands){
    const model=freshAt(room.id),started=model.getState().time;
    assert.equal(model.request(command),true,`${room.id}/${command}: the offered activity accepts a request`);
    const {state,phases}=run(model);
    assert.equal(state.carrying,null,'complete activities return held items');
    assert.equal(state.inBed,false,'complete activities finish off the bed');
    assert.equal(state.seated,0,'complete activities finish standing');
    assert.equal(state.room,room.id,'local activities stay in their room');
    if(command==='read')for(const phase of ['reach','pick','open-book','read','page','close-book','place','release'])assert.ok(phases.has(phase),`reading includes ${phase}`);
    if(command==='teddy')for(const phase of ['reach','pick','hug','place','release'])assert.ok(phases.has(phase),`teddy interaction includes ${phase}`);
    if(command==='sleep')for(const phase of ['climb','bed-sit','lie-down','cover','sleep','uncover','sit-up','climb-down'])assert.ok(phases.has(phase),`sleep includes ${phase}`);
    if(command==='wash')for(const phase of ['wash-reach','wash','wash-release','wash-rub-reach','wash-rub','wash-rub-release'])assert.ok(phases.has(phase),`washing separates visible water contact and chest-height rubbing: ${phase}`);
    if(['eat','drink','sofa','desk'].includes(command))for(const phase of ['sit',command,'stand'])assert.ok(phases.has(phase),`${command} uses actual furniture: ${phase}`);
    results.push({room:room.id,command,seconds:Number((state.time-started).toFixed(2))});
  }
}

// A pending destination waits for object return or bed dismount. It must not
// replace a busy action by removing its support surface or carried object.
for(const [first,destination,when] of [
  ['read','kitchen',s=>s.carrying==='book'],
  ['teddy','living',s=>s.carrying==='teddy'],
  ['sleep','ensuite',s=>s.phase==='sleep']
]){
  const model=freshAt('bedroom');model.request(first);let requested=false;
  const {state}=run(model,{onStep(s){if(!requested&&when(s)){assert.equal(model.setRoom(destination),true);requested=true;}}});
  assert.ok(requested,`${first}: interrupt trigger reached`);
  assert.equal(state.room,destination,`${first}: queued journey finishes after safe handoff`);
  assert.equal(state.carrying,null,'interruption returns items before leaving');
  assert.equal(state.inBed,false,'interruption leaves the bed before traveling');
}

// The whole carried-object turn keeps both palms in reach, including the back.
for(let i=0;i<=720;i++){
  const model=M.create({auto:false}),state=model.getState();
  state.yaw=i*Math.PI/360;state.carrying='book';
  for(const arm of M.grips(state))assert.equal(arm.clamped,false,'carrying remains within reach at every yaw');
}
const idle=M.create({auto:false,random:()=>.5});
for(let i=0;i<600;i++)idle.step(1/60);
assert.equal(idle.getState().action,null,'disabled autonomy stays idle');
assert.equal(idle.request('unknown-command'),false,'unknown activity is rejected');
assert.equal(idle.setRoom('unknown-room'),false,'unknown room is rejected');
const kitchen=freshAt('kitchen');
assert.equal(kitchen.request('lamp'),false,'a bedroom lamp cannot be requested in a room without a bedside table');
assert.equal(kitchen.getState().error,null,'rejecting an unavailable object does not damage the active model');
idle.setAuto(true);
for(let i=0;i<120*150;i++){const old=idle.getState();idle.step(1/120);validate(idle.getState(),old);}
assert.ok(idle.getState().completed>=2,'autonomy performs complete purposeful activities');

// A repeatable ten-minute day must contain real door travel while preserving
// the future resident's room ownership. This exercises scheduler behavior,
// not a direct/manual request disguised as an autonomous journey.
let seed=42;
const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/0x100000000;};
const autonomous=M.create({auto:true,random}),visited=new Set(['bedroom']),autoTrips=[];
let prior=autonomous.getState();
for(let i=0;i<120*600;i++){
  autonomous.step(1/120);const state=autonomous.getState();validate(state,prior);visited.add(state.room);
  assert.ok(['bedroom','ensuite','living','kitchen'].includes(state.room),'autonomy respects the future pet bedroom and ensuite');
  if(state.action?.startsWith('room:')&&state.action!==prior.action)autoTrips.push({action:state.action,time:state.time});
  prior=state;
}
assert.ok(visited.size>1&&autoTrips.length>0,'autonomy actually crosses a door into another room');
for(let i=0;i<autoTrips.length;i++)for(let j=i+1;j<autoTrips.length;j++)if(autoTrips[i].action===autoTrips[j].action)
  assert.ok(autoTrips[j].time-autoTrips[i].time>90,'autonomous destinations keep their room cooldown');
for(const roomId of ['guestroom','bathroom']){
  const visitor=freshAt(roomId);visitor.setAuto(true);let old=visitor.getState(),returned=false;
  for(let i=0;i<120*120;i++){
    visitor.step(1/120);const state=visitor.getState();validate(state,old);
    if(['guestroom','bathroom'].includes(state.room))assert.ok(state.action===null||state.action==='room:living','a visitor leaves instead of starting the future pet private routines');
    if(state.room==='living'&&state.action===null){returned=true;break;}old=state;
  }
  assert.ok(returned,`autonomy returns from a manual ${roomId} visit to the living room`);
}
assert.ok(mealContacts>100,'both table and mouth contact plateaus were sampled');
assert.ok(washContacts>100,'real water / palm contact was sampled');
assert.ok(washRubs>100,'chest-height rubbing was sampled separately from faucet contact');
assert.ok(lampContacts>40,'both bedroom lamp switches were tested at their real touch points');
assert.ok(wardrobeContacts>100,'actual wardrobe handle contacts were sampled throughout the door arc');
console.log(JSON.stringify({ok:true,samples,transfers,doorCrossings,mealContacts,washContacts,washRubs,lampContacts,wardrobeContacts,autonomousSeconds:600,autonomousRooms:[...visited],autonomousTrips:autoTrips.length,rooms:L.roomOrder.length,directedJourneys:30,activities:results}));
