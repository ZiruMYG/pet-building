import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createContext,runInContext} from 'node:vm';

// Exercise the production scheduler with its actual catalog, without a DOM,
// timers or fake copies of its plans. Visible playback time is the only clock.
const context=createContext({console});
for(const file of ['src/yaya-catalog.js','src/yaya-life.js']) {
  runInContext(readFileSync(new URL(file,import.meta.url),'utf8'),context,{filename:file});
}
const {YayaLife:life,YayaCatalog:catalog}=context;
const plain=value=>JSON.parse(JSON.stringify(value));
const clamp=value=>Math.max(0,Math.min(100,value));
const rates={hunger:.10,thirst:.13,fatigue:.07,boredom:.16};
const near=(actual,expected,label)=>assert.ok(Math.abs(actual-expected)<1e-7,`${label}: ${actual} != ${expected}`);
function seeded(seed=12345) {
  return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}
function advance(pet,seconds,options={}) {
  const commands=[];
  while(seconds>1e-9) {
    const dt=Math.min(.25,seconds),command=pet.tick(dt,options);
    if(command)commands.push(plain(command));
    seconds-=dt;
  }
  return commands;
}
function checkNeeds(actual,previous,seconds,effect={},label='needs') {
  for(const key of Object.keys(rates)) {
    near(actual[key],clamp(clamp(previous[key]+rates[key]*seconds)+(effect[key]||0)),`${label}/${key}`);
  }
}
function assertPlayable(clip) {
  if(clip==='idle'||clip.startsWith('emotion:')) {
    const key=clip==='idle'?'idle':clip.slice('emotion:'.length);
    assert.equal(catalog.getEmotion(key)?.implemented,true,`${clip}: missing implemented expression`);
  } else {
    const entry=catalog.getAction(clip);
    assert.equal(entry?.implemented,true,`${clip}: planned or unknown action cannot run`);
    assert.equal(entry.autonomous,true,`${clip}: action is not marked for autonomous use`);
  }
}

let stepCount=0;
for(const [key,plan] of Object.entries(life.plans)) {
  assert.ok(plan.reason&&plan.label&&plan.steps.length>1,`${key}: purposeful multi-step plan`);
  for(const step of plan.steps) {
    assertPlayable(step.clip);
    assert.ok(Number.isFinite(step.seconds)&&step.seconds>0,`${key}: finite playback duration`);
  }
  const pet=life.create({random:seeded(),needs:{hunger:50,thirst:50,fatigue:50,boredom:50}});
  const original=pet.getState();
  let command=pet.begin(key);
  assert.deepEqual(plain(pet.getState().needs),plain(original.needs),`${key}: starting a plan cannot satisfy needs`);
  for(const [index,step] of plan.steps.entries()) {
    assert.equal(command.clip,step.clip,`${key}/${index}: sequence order`);
    assert.equal(command.index,index,`${key}: step index`);
    assert.equal(command.total,plan.steps.length,`${key}: sequence length`);
    const before=pet.getState();
    assert.deepEqual(advance(pet,step.seconds-.25),[],`${key}/${index}: step ended too early`);
    checkNeeds(pet.getState().needs,before.needs,step.seconds-.25,{},`${key}: no reward before completion`);
    const almost=pet.getState();
    command=pet.tick(.25);
    assert.ok(command,`${key}/${index}: completed step must advance exactly once`);
    checkNeeds(pet.getState().needs,almost.needs,.25,step.effect,`${key}: completed step feedback`);
    stepCount++;
  }
  const done=pet.getState();
  assert.equal(command.clip,'idle',`${key}: return to peaceful idle after the sequence`);
  assert.equal(command.rest,true);
  assert.equal(done.completed,1);
  assert.equal(done.plan,null);assert.equal(done.current,null);assert.equal(done.index,-1);
  assert.ok(done.waiting>=9,`${key}: leave breathing room before another activity`);
  const beforeIdle=done.needs;
  advance(pet,.5);
  checkNeeds(pet.getState().needs,beforeIdle,.5,{},`${key}: reward must not repeat while idle`);
}

// Needs override a random leisure selection. Fatigue wins over thirst, which
// wins over hunger when several care needs are high at the same time.
for(const [needs,expected] of [
  [{hunger:80,thirst:20,fatigue:20},'meal'],
  [{hunger:20,thirst:80,fatigue:20},'water'],
  [{hunger:20,thirst:20,fatigue:80},'rest'],
  [{hunger:85,thirst:85,fatigue:85},'rest'],
  [{hunger:85,thirst:85,fatigue:20},'water'],
  [{hunger:20,thirst:20,fatigue:20,boredom:80},'play']
]) {
  const pet=life.create({wait:0,random:()=>.999,needs});
  const command=pet.tick(.25);
  assert.equal(command?.plan,expected,`need priority: ${JSON.stringify(needs)}`);
}

// Long sessions use the real automatic path. Care is allowed to repeat if a
// need warrants it, while casual activities must respect the cooldown.
const autonomous=life.create({wait:0,random:seeded(76231),needs:{hunger:10,thirst:10,fatigue:10,boredom:10}});
const lastLeisure=new Map(),seen=new Set();
let automaticStarts=0;
for(let frame=0;frame<2400*4;frame++) {
  const command=autonomous.tick(.25);
  if(!command)continue;
  assertPlayable(command.clip);
  if(command.index!==0)continue;
  automaticStarts++;seen.add(command.plan);
  const state=autonomous.getState();
  if(!['meal','water','rest'].includes(command.plan)) {
    if(lastLeisure.has(command.plan))assert.ok(state.clock-lastLeisure.get(command.plan)>100,`${command.plan}: repeated inside cooldown`);
    lastLeisure.set(command.plan,state.clock);
  }
  for(const value of Object.values(state.needs))assert.ok(value>=0&&value<=100,'needs stay bounded');
  assert.ok(state.history.length<=6,'history remains bounded');
}
assert.ok(automaticStarts>40&&seen.size>=8,'long session must cover varied leisure and care');

// Rapidly pressing "next" can exhaust every leisure candidate before time
// advances. It must settle into idle, not bypass cooldown with a fallback or
// preserve the last cancelled sequence and its pending rewards.
const skipped=life.create({random:()=>0,needs:{hunger:5,thirst:5,fatigue:5,boredom:5}});
const rapidPlans=[];
for(let i=0;i<6;i++)rapidPlans.push(skipped.begin().plan);
assert.equal(new Set(rapidPlans).size,6,'rapid next uses each available plan at most once');
const exhausted=plain(skipped.getState());
for(let i=0;i<4;i++) {
  const command=skipped.begin(),state=skipped.getState();
  assert.equal(command.clip,'idle');assert.equal(command.rest,true);
  assert.equal(state.plan,null);assert.equal(state.current,null);assert.equal(state.index,-1);assert.equal(state.remaining,0);
  assert.equal(state.waiting,10,'cooldown exhaustion waits before trying again');
  assert.deepEqual(plain(state.needs),exhausted.needs,'skipping cannot award unmet needs');
  assert.deepEqual(plain(state.recent),exhausted.recent,'cooldown exhaustion cannot restart cooldown timestamps');
}
const cooling=advance(skipped,100);
assert.ok(cooling.length>0&&cooling.every(command=>command.clip==='idle'&&command.rest),'automatic retry respects exhausted cooldown');
assert.equal(skipped.getState().completed,0,'cancelled steps never count as completed plans');
checkNeeds(skipped.getState().needs,exhausted.needs,100,{},'cooldown does not reward cancelled activities');
skipped.tick(.25);
assert.equal(skipped.begin()?.plan,rapidPlans[0],'a plan becomes available again after its cooldown expires');

// User interaction cancels all queued steps and their pending rewards. It
// leaves a quiet interval before a fresh plan can start.
const interrupted=life.create({random:()=>0,needs:{hunger:70,thirst:20,fatigue:20,boredom:20}});
interrupted.begin('meal');advance(interrupted,4);advance(interrupted,3);
assert.equal(interrupted.getState().current.clip,'eat');
const beforeInterrupt=interrupted.getState();
interrupted.interrupt('先回应用户');
const cleared=interrupted.getState();
assert.equal(cleared.plan,null);assert.equal(cleared.current,null);assert.equal(cleared.index,-1);assert.equal(cleared.remaining,0);
assert.deepEqual(plain(cleared.needs),plain(beforeInterrupt.needs));
assert.deepEqual(advance(interrupted,15),[],'cancelled meal must not resume or reward');
checkNeeds(interrupted.getState().needs,cleared.needs,15,{},'interrupted meal');
assert.equal(interrupted.getState().completed,0);

// Hidden tabs and paused playback pass blocked=true. Neither timers, needs,
// rewards nor waiting periods can advance while playback is blocked.
for(const active of [false,true]) {
  const pet=life.create({wait:2,random:seeded()});
  if(active){pet.begin('rest');advance(pet,5);}
  const before=plain(pet.getState());
  assert.deepEqual(advance(pet,120,{blocked:true}),[]);
  assert.equal(pet.tick(86400,{blocked:true}),null);
  assert.deepEqual(plain(pet.getState()),before,'hidden/paused playback must freeze the entire simulation');
  pet.tick(.25);
  near(pet.getState().clock,before.clock+.25,'resume advances only visible time');
}

// A resumed wall-clock gap is bounded once, never stored as a debt. The next
// normal tick must not fast-forward old animations or add offline deprivation.
const resumed=life.create({wait:100,random:seeded()});
const beforeResume=resumed.getState();
assert.equal(resumed.tick(86400),null);
near(resumed.getState().clock,.5,'one long elapsed tick is bounded');
checkNeeds(resumed.getState().needs,beforeResume.needs,.5,{},'no offline needs');
resumed.tick(.25);
near(resumed.getState().clock,.75,'no saved elapsed-time debt');
checkNeeds(resumed.getState().needs,beforeResume.needs,.75,{},'no delayed offline needs');
for(const dt of [0,-1,NaN,Infinity]) {
  const before=plain(resumed.getState());assert.equal(resumed.tick(dt),null);assert.deepEqual(plain(resumed.getState()),before);
}

const disabled=life.create({enabled:false,wait:0});
assert.equal(disabled.begin('play'),null);assert.equal(disabled.tick(.25),null);
assert.equal(disabled.getState().plan,null,'disabled autonomy cannot start activities');
const beforeUnknown=plain(disabled.getState());
assert.equal(disabled.begin('read'),null);assert.deepEqual(plain(disabled.getState()),beforeUnknown,'planned action cannot become a life plan');
const toggled=life.create({random:seeded()});toggled.begin('play');toggled.setEnabled(false);
assert.equal(toggled.getState().current,null,'disabling cancels the running plan');
toggled.setEnabled(true);assert.deepEqual(advance(toggled,2.75),[],'reenabling allows a short quiet interval');
assert.ok(toggled.tick(.25)?.index===0,'reenabling resumes with a new first step');

console.log(`Yaya life PASS: ${Object.keys(life.plans).length} plans, ${stepCount} ordered steps, ${automaticStarts} autonomous starts; catalog, need priority, completion feedback, cooldown, interrupt and visible-time checks.`);
