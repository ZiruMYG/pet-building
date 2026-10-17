import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('src/yaya-procedural-style.js', 'utf8');
const context = vm.createContext({});
vm.runInContext(source, context);
const S = context.YayaProceduralStyle;
assert.ok(S, 'style module exposes a browser global');
assert.equal(typeof S.noise1D, 'function');
assert.equal(typeof S.environment, 'function');
assert.equal(typeof S.beat, 'function');

const sequence = seed => {
  const rng = S.seeded(seed);
  return Array.from({ length: 8 }, () => rng.next());
};
assert.deepEqual(sequence('bedroom'), sequence('bedroom'), 'seeded values are reproducible');
assert.notDeepEqual(sequence('bedroom'), sequence('kitchen'), 'different streams differ');
for (const seed of [0, 1, 'yaya', 0xffffffff]) {
  const rng = S.seeded(seed);
  for (let i = 0; i < 32; i += 1) assert.ok(rng.next() >= 0 && rng.next() <= 1, 'random values stay in [0, 1]');
}

for (const x of [-4.2, -1.1, -.01, 0, .25, 1.4, 8.8]) {
  const n = S.noise1D(x, 22);
  assert.ok(Number.isFinite(n) && n >= 0 && n <= 1, '1D noise is bounded');
  assert.ok(Math.abs(S.noise1D(Math.floor(x), 22) - S.noise1D(Math.floor(x) + 1, 22)) <= 1, 'lattice values are finite');
}
for (let x = -.5; x < 3; x += .01) {
  const left = S.noise1D(x - 1e-5, 123), right = S.noise1D(x + 1e-5, 123);
  assert.ok(Math.abs(right - left) < .002, '1D noise is continuous');
}
for (let y = -.5; y < 2; y += .17) {
  for (let x = -.5; x < 2; x += .17) {
    const n = S.noise2D(x, y, 123);
    assert.ok(Number.isFinite(n) && n >= 0 && n <= 1, '2D noise is bounded');
  }
}

const p = S.palette('bright');
assert.equal(p.ink, '#26384B');
assert.equal(S.lineWidth('outline', 2), 5.6);
assert.equal(S.material('wood').base, 'wood');
for (const t of [-1, 0, .2, .8, 1, 2]) {
  const b = S.beat(t, { period: 1 });
  assert.ok(b >= 0 && b <= 1, 'beat stays in [0, 1]');
  const pulse = S.pulse(t, { period: 1 });
  assert.ok(pulse >= 0 && pulse <= 1, 'pulse stays in [0, 1]');
}

const a = S.environment('bedroom', { count: 5 });
const b = S.environment('bedroom', { count: 5 });
assert.deepEqual(a, b, 'environment dressing is deterministic');
assert.equal(a.dust.length, 5);
for (const item of a.dust) {
  assert.ok(item.x >= 0 && item.x <= 1 && item.y >= 0 && item.y <= 1, 'dust uses normalized coordinates');
  assert.ok(item.radius > 0 && item.opacity >= 0 && item.opacity <= 1, 'dust ranges are valid');
}
assert.notDeepEqual(a, S.environment('living', { count: 5 }), 'room seeds produce different dressing');

console.log('PASS Yaya procedural style: deterministic PRNG, bounded continuous noise, palettes/materials, beat helpers and environment dressing.');
