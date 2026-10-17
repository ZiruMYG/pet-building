import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({ Math, Number, Object });
vm.runInContext(readFileSync('src/yaya-motion.js', 'utf8'), context);
const M = context.YayaMotion;
assert.equal(typeof M?.sharedPhase, 'function');
assert.equal(typeof M?.transition, 'function');

const finiteTree = value => {
  if (typeof value === 'number') assert.ok(Number.isFinite(value), `non-finite ${value}`);
  else if (value && typeof value === 'object') for (const child of Object.values(value)) finiteTree(child);
};
const near = (a, b, message, epsilon = 1e-9) => assert.ok(Math.abs(a - b) < epsilon, `${message}: ${a} != ${b}`);

// The clock is periodic and the body envelope has a flat tangent at foot
// contacts. This prevents a visible bob snap when a route loops.
for (let i = 0; i < 480; i++) {
  const time = i / 60;
  const gait = time * 2.7;
  const clock = M.sharedPhase(time, { period: 2.4, gait, speed: .8 });
  finiteTree(clock);
  const loop = M.sharedPhase(time + 2.4, { period: 2.4, gait: gait + M.TAU, speed: .8 });
  assert.ok(Math.min(Math.abs(clock.unit - loop.unit), 1 - Math.abs(clock.unit - loop.unit)) < 1e-9, 'phase loop');
  near(clock.bodyBob, loop.bodyBob, 'body loop');
  near(clock.bodySquash, loop.bodySquash, 'squash loop');
  assert.ok(clock.speed >= 0 && clock.speed <= 1);
}
near(M.sharedPhase(0, { gait: 0, speed: 1 }).bodyBob, 0, 'left contact body bob');
near(M.sharedPhase(Math.PI / 1.7, { gait: Math.PI, speed: 1 }).bodyBob, 0, 'right contact body bob');
assert.ok(M.sharedPhase(0, { gait: Math.PI / 2, speed: 1 }).bodyBob < 0, 'mid-step body rises');
near(M.sharedPhase(-.2, { period: 4 }).unit, M.sharedPhase(3.8, { period: 4 }).unit, 'negative time wraps', 1e-12);

// Transition windows are monotonic and bounded. The lead/absorb offsets are
// zero at the endpoints, allowing a queued interaction to be interrupted.
let previous = { anticipation: 0, action: 0, settle: 0 };
for (let i = 0; i <= 1000; i++) {
  const q = M.transition(i / 1000, { anticipation: .16, settle: .2 });
  finiteTree(q);
  for (const field of ['anticipation', 'action', 'settle']) {
    assert.ok(q[field] >= -1e-9 && q[field] <= 1 + 1e-9, `${field} bounded`);
    assert.ok(q[field] + 1e-9 >= previous[field], `${field} monotonic`);
  }
  previous = q;
}
near(M.transition(0).offset, .12, 'anticipation starts with a small lead');
near(M.transition(1).offset, 0, 'settle ends at rest');
assert.ok(M.transition(.08).anticipation > 0 && M.transition(.08).action < 1, 'lead phase precedes action');
assert.ok(M.transition(.94).settle > 0 && M.transition(.94).action > .9, 'settle follows main action');

// Damping converges toward the target and never emits NaN for hostile input.
let state = { value: 0, velocity: 0 };
for (let i = 0; i < 180; i++) state = M.damp(state.value, 1, state.velocity, 1 / 60, 8);
assert.ok(Math.abs(state.value - 1) < 1e-5, `damped value ${state.value}`);
assert.ok(Math.abs(state.velocity) < 1e-4, `damped velocity ${state.velocity}`);
finiteTree(M.damp(NaN, Infinity, NaN, NaN, NaN));
console.log('PASS Yaya motion: periodic shared phase, smooth contacts, anticipation/settle envelopes, and damped convergence.');
