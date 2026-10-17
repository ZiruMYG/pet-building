// Small, dependency-free motion helpers shared by the pet and room models.
// The functions are deliberately pure so a render frame can be replayed from
// the same time/state values without keeping hidden animation state.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
  const smooth = value => {
    const t = clamp(finite(value));
    return t * t * (3 - 2 * t);
  };
  const smoother = value => {
    const t = clamp(finite(value));
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const wrap = (value, period) => {
    const length = Math.max(1e-6, finite(period, 1));
    return ((finite(value) % length) + length) % length;
  };

  // A repeatable phase in [0, 1). Negative time is supported for scrubbing
  // and for the loop seam tests used by the renderers.
  function phase(time, period = 4, offset = 0) {
    const length = Math.max(1e-6, finite(period, 4));
    return wrap(finite(time) + finite(offset), length) / length;
  }

  // One clock feeds foot placement, body bob and leaf wind. `gait` can be
  // supplied by a route solver; otherwise the clock's angular phase is used.
  function sharedPhase(time, options = {}) {
    const period = Math.max(1e-6, finite(options.period, 4));
    const unit = phase(time, period, options.offset);
    const angle = finite(options.gait, unit * TAU);
    const speed = clamp(finite(options.speed, 1));
    const sine = Math.sin(angle);
    const cosine = Math.cos(angle);
    const support = sine * sine;
    return {
      period,
      unit,
      angle,
      sine,
      cosine,
      speed,
      support,
      // The lift envelope is zero at both contact points and has a flat
      // tangent there, so the body does not visibly snap between steps.
      bodyBob: -.075 * support * speed,
      bodySquash: .015 * Math.sin(angle * 2) * speed,
      leafSway: .12 * Math.sin(angle - .55) * speed,
      footPhase: angle,
    };
  }

  // Frame-rate independent critically damped interpolation. This is useful
  // for camera/interaction targets that must settle without overshoot.
  function damp(current, target, velocity = 0, dt = 1 / 60, frequency = 10) {
    const x = finite(current), goal = finite(target), v = finite(velocity);
    const step = clamp(finite(dt, 1 / 60), 0, .25);
    const omega = Math.max(.001, finite(frequency, 10)) * TAU;
    const e = Math.exp(-omega * step);
    const offset = x - goal;
    const next = (offset * (1 + omega * step) + v * step) * e;
    const nextVelocity = (v * (1 - omega * step) - offset * omega * omega * step) * e;
    return { value: goal + next, velocity: nextVelocity };
  }

  // Normalized interaction envelope. `anticipation` and `settle` are phase
  // lengths, not frame counts. The returned values are all in [0, 1], making
  // the result safe to use for a pose, hand target, or prop attachment.
  function transition(progress, options = {}) {
    const p = clamp(finite(progress));
    const a = clamp(finite(options.anticipation, .14), 0, .45);
    const s = clamp(finite(options.settle, .18), 0, .45);
    const span = Math.max(1e-6, 1 - a - s);
    const anticipation = a > 1e-6 ? smooth(p / a) : 1;
    const action = smooth((p - a) / span);
    const settle = s > 1e-6 ? smooth((p - (1 - s)) / s) : 1;
    // A tiny weight shift before the action and a softer return after it. The
    // absorb term returns to zero at the endpoint, so the settled pose has no
    // residual scale or positional impulse.
    const lead = (1 - anticipation) * (1 - action) * finite(options.lead, .12);
    const absorb = settle * (1 - settle) * finite(options.absorb, .08);
    return {
      progress: p,
      anticipation,
      action,
      settle,
      lead,
      absorb,
      offset: lead - absorb,
      scaleX: 1 + absorb,
      scaleY: 1 - absorb * 1.35,
    };
  }

  // Blend a scalar/vector component through the same smooth phase. Keeping
  // this helper here avoids each action module inventing a slightly different
  // easing curve.
  function mix(from, to, progress, easing = smooth) {
    const k = easing(progress);
    return from + (to - from) * k;
  }

  globalThis.YayaMotion = Object.freeze({
    TAU, clamp, smooth, smoother, wrap, phase, sharedPhase, damp, transition, mix,
  });
})();
