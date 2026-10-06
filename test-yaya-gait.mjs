import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync('src/yaya-gait.js', 'utf8'), context);
const G = context.YayaGait;
assert.equal(typeof G?.foot, 'function', 'gait loads without p5 or browser globals');
const near = (a, b, label, epsilon = 1e-8) =>
  assert.ok(Math.abs(a - b) < epsilon, `${label}: ${a} != ${b}`);
const fields = ['forward', 'lift', 'angle'];
const delta = 1e-5;
let samples = 0;

for (const side of [-1, 1]) {
  const offset = side < 0 ? 0 : Math.PI;
  for (let i = 1; i < 360; i++) {
    const localPhase = i / 360 * G.period;
    const gait = localPhase - offset;
    const now = G.foot(gait, side, 1);
    const before = G.foot(gait - delta, side, 1);
    const after = G.foot(gait + delta, side, 1);
    const velocity = (after.forward - before.forward) / (2 * delta);
    if (localPhase < Math.PI) {
      near(now.lift, 0, 'grounded foot stays on ground');
      near(now.angle, 0, 'grounded sole stays level');
      assert.ok(velocity < 0, 'grounded foot pushes backward in local forward space');
      for (const facing of [-1, 1]) {
        const screenVelocity = velocity * facing;
        assert.ok(screenVelocity * facing < 0,
          'ground contact sweeps opposite travel when facing either screen direction');
      }
    } else if (localPhase > Math.PI) {
      assert.ok(now.lift > 0, 'recovering foot clears the ground');
      assert.ok(velocity > 0, 'raised foot recovers forward');
    }
    for (const field of fields) {
      assert.ok(Number.isFinite(now[field]), `finite ${field}`);
      near(G.foot(gait + G.period, side, 1)[field], now[field], `periodic ${field}`);
      near(G.foot(gait, side, 0)[field], 0, `stopped ${field}`);
      near(G.foot(gait, side, .5)[field], now[field] * .5, `speed envelopes ${field}`);
      near(G.foot(gait, side, -1)[field], 0, `negative speed cannot reverse ${field}`);
    }
    samples++;
  }
  for (const phase of [0, Math.PI, G.period]) {
    const before = G.foot(phase - offset - delta, side, 1);
    const after = G.foot(phase - offset + delta, side, 1);
    for (const field of fields) near(before[field], after[field], `${field} contact continuity`, 1e-7);
    near((after.lift - before.lift) / (2 * delta), 0, 'smooth vertical contact', 1e-5);
  }
}

for (let phase = 0; phase < G.period; phase += .025) {
  const left = G.foot(phase, -1, 1), right = G.foot(phase, 1, 1);
  near(left.forward, -right.forward, 'feet alternate opposite fore/aft positions');
  assert.ok(Math.min(left.lift, right.lift) < 1e-8, 'one foot supports each half cycle');
  for (const field of fields) near(right[field], G.foot(phase + Math.PI, -1, 1)[field], `opposite leg phase ${field}`);
}

// At rear toe-off the toe points down; before front touchdown it points up.
assert.ok(G.foot(Math.PI * 1.25, -1, 1).angle > 0, 'rear recovery points toe downward');
assert.ok(G.foot(Math.PI * 1.75, -1, 1).angle < 0, 'front recovery raises toe for touchdown');
console.log(`PASS Yaya gait: ${samples} sampled poses, contact direction, recovery, both facings, stop and loop continuity.`);
