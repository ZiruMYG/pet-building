import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const context = vm.createContext({});
vm.runInContext(readFileSync('src/yaya-body.js', 'utf8'), context);
const B = context.YayaBody;
assert.ok(B, 'body geometry loads without a graphics runtime');
const outline = B.outline(), bands = B.stripes();
const near = (a, b, label, epsilon = 1e-8) =>
  assert.ok(Math.abs(a - b) <= epsilon, `${label}: ${a} != ${b}`);
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const segmentDistance = (p, a, b) => {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1)));
  return distance(p, [a[0] + dx * t, a[1] + dy * t]);
};
function contains(p, polygon, tolerance = 1e-8) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (segmentDistance(p, a, b) <= tolerance) return true;
    if ((a[1] > p[1]) !== (b[1] > p[1]) &&
        p[0] < (b[0] - a[0]) * (p[1] - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  return inside;
}

assert.ok(outline.length >= 64, 'silhouette is smooth enough for the large preview');
for (const point of outline) {
  assert.ok(point.every(Number.isFinite), 'finite silhouette points');
  assert.ok(outline.some(other => distance(other, [-point[0], point[1]]) < 1e-8), 'body is mirror symmetric');
}
const top = Math.min(...outline.map(p => p[1])), bottom = Math.max(...outline.map(p => p[1]));
near(top, -7, 'shared crown height');
near(bottom, 0, 'shared body baseline');
const bottomIndex = outline.findIndex(p => distance(p, [0, bottom]) < 1e-8);
assert.ok(bottomIndex >= 0, 'rounded base is centered');
const before = outline[(bottomIndex - 1 + outline.length) % outline.length];
const after = outline[(bottomIndex + 1) % outline.length];
for (const point of [before, after]) {
  assert.ok(Math.abs(point[1] / point[0]) < .1, 'bottom approaches a horizontal tangent rather than a pointed tip');
}
const belly = Math.max(...outline.map(p => Math.abs(p[0])));
assert.ok(outline.filter(p => p[1] > -1).every(p => Math.abs(p[0]) < belly * .9), 'lower body rounds inward');
assert.ok(outline.filter(p => p[1] < -6).every(p => Math.abs(p[0]) < belly * .75), 'crown narrows into a cute winter-melon volume');

near(B.constants.sideRatio, .86, 'approved side-width proportion');
near(B.breadth(0), 1, 'front uses full body width');
near(B.breadth(Math.PI), 1, 'back uses full body width');
near(B.breadth(Math.PI / 2), .86, 'right profile retains 86 percent width');
near(B.breadth(Math.PI * 1.5), .86, 'left profile retains 86 percent width');
for (let yaw = -Math.PI * 2; yaw <= Math.PI * 4; yaw += .01) {
  const width = B.breadth(yaw);
  assert.ok(width >= .86 - 1e-8 && width <= 1 + 1e-8, 'turn never flattens or inflates the body');
  near(width, B.breadth(-yaw), 'mirrored view has identical thickness');
  near(width, B.breadth(yaw + Math.PI * 2), 'turn width loops');
  assert.ok(Math.abs(width - B.breadth(yaw + .001)) < .0002, 'turn silhouette changes continuously');
}
for (const yaw of [0, Math.PI / 2, Math.PI, Math.PI * 1.5, Math.PI * 2]) {
  near(B.breadth(yaw - 1e-5), B.breadth(yaw + 1e-5), 'principal view joins smoothly');
}

assert.equal(bands.length, 2, 'exactly two wraparound stripes');
let stripeSamples = 0;
for (const band of bands) {
  assert.ok(band.length > 16, 'markings are continuous bands');
  for (let i = 0; i < band.length; i++) {
    const a = band[i], b = band[(i + 1) % band.length];
    assert.ok(a.every(Number.isFinite), 'finite stripe points');
    assert.ok(a[1] > top + (bottom - top) * .65, 'stripes remain on the lower body');
    assert.ok(band.some(other => distance(other, [-a[0], a[1]]) < 1e-8), 'each marking is mirror symmetric');
    for (let t = 0; t <= 1; t += .125) {
      const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      assert.ok(contains(p, outline), 'stripe edges stay inside the body contour');
      stripeSamples++;
    }
  }
}
assert.ok(Math.max(...bands[0].map(p => p[1])) < Math.min(...bands[1].map(p => p[1])), 'two stripes have a visible separation');

// The chest badge turns with the front surface, and follows the same vertical
// arc as the stripes. Sampling all visible yaw angles catches a collision
// that a front-only layout check misses near profile.
const localHeart = Array.from({ length: 128 }, (_, i) => {
  const a = i * Math.PI * 2 / 128;
  return [.48 * Math.sin(a) ** 3,
    -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * .48 / 16];
});
let heartGap = Infinity;
let badgeAngles = 0;
for (let i = 1; i < 64; i++) {
  const yaw = -Math.PI / 2 + i * Math.PI / 64, facing = Math.cos(yaw), breadth = B.breadth(yaw);
  assert.ok(facing > 0, 'badge test covers the visible front hemisphere');
  const bx = 2.65 * Math.sin(yaw);
  const by = B.constants.heartY + B.surfaceArc(bx / breadth);
  const projectedBody = outline.map(([x, y]) => [x * breadth, y]);
  const projectedBands = bands.map(band => band.map(([x, y]) => [x * breadth, y]));
  const heart = localHeart.map(([x, y]) => [bx + x * facing, by + y]);
  for (const point of heart) {
    assert.ok(contains(point, projectedBody), `chest heart stays within the body at yaw ${yaw}`);
    for (const band of projectedBands) {
      assert.ok(!contains(point, band), `chest heart never overlaps a stripe at yaw ${yaw}`);
      for (let j = 0; j < band.length; j++) heartGap = Math.min(heartGap, segmentDistance(point, band[j], band[(j + 1) % band.length]));
    }
  }
  badgeAngles++;
}
assert.ok(heartGap > .12, 'heart and stripe retain a clear visual gap throughout the turn');

// Both eye centers originate on the face volume. The full ellipse, including
// its narrower crown-side edge, must fit even while a far eye fades out.
let eyeSamples = 0;
for (let i = 0; i <= 96; i++) {
  const yaw = i * Math.PI * 2 / 96, c = Math.cos(yaw), s = Math.sin(yaw);
  const rx = .57 - .13 * Math.abs(s), ry = .9;
  const projectedBody = outline.map(([x, y]) => [x * B.breadth(yaw), y]);
  for (const side of [-1, 1]) {
    const originalX = side * 1.55 * c + 1.35 * s;
    const fittedX = B.fitEllipseX(originalX, -5.15, rx, ry, yaw);
    assert.ok(Number.isFinite(fittedX), 'fitted eye center is finite');
    near(B.fitEllipseX(-originalX, -5.15, rx, ry, yaw), -fittedX, 'eye fitting is mirror symmetric');
    assert.ok(Math.abs(fittedX) <= Math.abs(originalX) + 1e-8, 'eye fitting moves inward only');
    for (let sample = 0; sample < 32; sample++) {
      const a = sample * Math.PI * 2 / 32;
      const point = [fittedX + rx * Math.cos(a), -5.15 + ry * Math.sin(a)];
      assert.ok(contains(point, projectedBody), `complete eye fits inside body at yaw ${yaw}`);
      eyeSamples++;
    }
  }
}

for (const unit of [.5, 50, 70]) {
  const scaledOutline = B.outline(unit), scaledBands = B.stripes(unit);
  outline.forEach((point, i) => point.forEach((value, d) => near(scaledOutline[i][d], value * unit, 'body scales consistently')));
  bands.forEach((band, j) => band.forEach((point, i) => point.forEach((value, d) => near(scaledBands[j][i][d], value * unit, 'markings scale with their body'))));
}
console.log(`PASS Yaya body: symmetric rounded silhouette, 86% profile, continuous turn, ${stripeSamples} contained stripe samples, ${badgeAngles} badge angles with ${heartGap.toFixed(4)}-unit clearance, ${eyeSamples} contained eye samples.`);
