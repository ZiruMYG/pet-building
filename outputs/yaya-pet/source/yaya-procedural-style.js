// Deterministic visual style helpers for Yaya's procedural 2.5D scenes.
//
// This file intentionally has no p5/DOM dependency. It can be loaded before
// the drawing modules in a browser with a normal <script> tag, or required by
// Node render/test scripts. Every helper is pure: the same arguments produce
// the same result and no global random state is consumed.
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const DEFAULT_SEED = 0x59415941; // "YAYA" in a stable, readable form.
  const EPSILON = 1e-9;

  const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
  const mix = (a, b, amount) => a + (b - a) * amount;
  const smoothstep = value => {
    const t = clamp(value);
    return t * t * (3 - 2 * t);
  };
  const smootherstep = value => {
    const t = clamp(value);
    return t * t * t * (t * (t * 6 - 15) + 10);
  };
  const frac = value => value - Math.floor(value);
  const wrap = (value, period = 1) => {
    const p = Math.abs(period) || 1;
    return ((value % p) + p) % p;
  };

  function hashString(value) {
    const text = String(value);
    let hash = 2166136261;
    for (let i = 0; i < text.length; i += 1) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function normalizeSeed(seed = DEFAULT_SEED) {
    if (typeof seed === 'number' && Number.isFinite(seed)) return (seed >>> 0);
    if (typeof seed === 'bigint') return Number(seed & 0xffffffffn) >>> 0;
    return hashString(seed);
  }

  // A local PRNG object is safer than Math.random: callers can make several
  // independent texture/decor streams without changing one another.
  function seeded(seed = DEFAULT_SEED) {
    let state = normalizeSeed(seed) || DEFAULT_SEED;
    const next = () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let value = state;
      value = Math.imul(value ^ (value >>> 15), value | 1);
      value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
      return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    };
    return Object.freeze({
      seed: state,
      next,
      float: (min = 0, max = 1) => mix(min, max, next()),
      int: (min, max) => Math.floor(mix(min, max + 1, next())),
      pick: values => values[Math.floor(next() * values.length) % values.length],
      fork: label => seeded((state ^ hashString(label)) >>> 0)
    });
  }

  // Integer lattice hashing and smooth interpolation make noise continuous at
  // cell boundaries while retaining stable, seed-specific variation.
  function lattice1D(index, seed = DEFAULT_SEED) {
    let h = (normalizeSeed(seed) ^ Math.imul(index | 0, 0x45d9f3b)) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    h = Math.imul(h, 0x45d9f3b) >>> 0;
    h = (h ^ (h >>> 16)) >>> 0;
    return h / 4294967295;
  }
  function lattice2D(ix, iy, seed = DEFAULT_SEED) {
    const h = Math.imul((ix | 0) ^ Math.imul(iy | 0, 0x27d4eb2d), 0x45d9f3b) ^ normalizeSeed(seed);
    return lattice1D(h | 0, seed ^ 0x9e3779b9);
  }
  function noise1D(x, seed = DEFAULT_SEED) {
    const value = Number.isFinite(x) ? x : 0;
    const i = Math.floor(value), t = smootherstep(value - i);
    return mix(lattice1D(i, seed), lattice1D(i + 1, seed), t);
  }
  function noise2D(x, y, seed = DEFAULT_SEED) {
    const xx = Number.isFinite(x) ? x : 0, yy = Number.isFinite(y) ? y : 0;
    const ix = Math.floor(xx), iy = Math.floor(yy), tx = smootherstep(xx - ix), ty = smootherstep(yy - iy);
    const a = lattice2D(ix, iy, seed), b = lattice2D(ix + 1, iy, seed);
    const c = lattice2D(ix, iy + 1, seed), d = lattice2D(ix + 1, iy + 1, seed);
    return mix(mix(a, b, tx), mix(c, d, tx), ty);
  }
  function fbm1D(x, options = {}) {
    const octaves = Math.max(1, Math.floor(options.octaves ?? 4));
    const lacunarity = options.lacunarity ?? 2;
    const gain = options.gain ?? 0.5;
    const seed = options.seed ?? DEFAULT_SEED;
    let frequency = options.frequency ?? 1, amplitude = 1, total = 0, weight = 0;
    for (let i = 0; i < octaves; i += 1) {
      total += noise1D(x * frequency, normalizeSeed(seed) + i * 1013) * amplitude;
      weight += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }
    return total / (weight || 1);
  }
  function fbm2D(x, y, options = {}) {
    const octaves = Math.max(1, Math.floor(options.octaves ?? 4));
    const lacunarity = options.lacunarity ?? 2;
    const gain = options.gain ?? 0.5;
    const seed = options.seed ?? DEFAULT_SEED;
    let frequency = options.frequency ?? 1, amplitude = 1, total = 0, weight = 0;
    for (let i = 0; i < octaves; i += 1) {
      total += noise2D(x * frequency, y * frequency, normalizeSeed(seed) + i * 1013) * amplitude;
      weight += amplitude;
      frequency *= lacunarity;
      amplitude *= gain;
    }
    return total / (weight || 1);
  }

  const PALETTES = Object.freeze({
    bright: Object.freeze({
      // A high-chroma, warm daylight palette keeps the rooms lively without
      // turning every surface into the same green.  Room metadata can still
      // supply its own accent/wall/floor, while these tokens cover shared
      // furniture, linework and the workbench UI.
      body: '#F6C84A', light: '#FFE7A0', shade: '#D99B27', leaf: '#45B978',
      leafLight: '#B6E995', leafShade: '#2A805C', ink: '#26384B', eye: '#1F3042',
      cheek: '#FF7F76', blush: '#FFAD95', heart: '#F05E79', mint: '#63D0B1',
      carpet: '#65C9C0', paper: '#FFF8E8', wall: '#FFEBC5', floor: '#E8B86D',
      wood: '#D28A5B', ceramic: '#E8F2F3', metal: '#74B9C4', shadow: '#6B7377',
      sky: '#DDF3FF', surface: '#FFFDF6', surfaceAlt: '#FFF0D9',
      wallEdge: '#D27B65', floorLine: '#D09654', woodTop: '#F3CA84',
      woodSide: '#AD684D', accent: '#3DA77D', accentWarm: '#F08D47',
      accentBlue: '#61B4E5', highlight: '#FFE270'
    }),
    paper: Object.freeze({
      body: '#F7D878', light: '#FFE9A8', shade: '#E8B84F', leaf: '#83C985',
      leafLight: '#B7E49A', leafShade: '#4F9C6B', ink: '#60402B', eye: '#513522',
      cheek: '#F39A7D', blush: '#F7B18D', heart: '#F47F79', mint: '#B9DED0',
      carpet: '#9CCEBE', paper: '#FBF1DA', wall: '#F7EED7', floor: '#EAD0A6',
      wood: '#B98A62', ceramic: '#EEE5C4', metal: '#B7C8BC', shadow: '#877A68',
      sky: '#FFF8E9', surface: '#FFFCF3', surfaceAlt: '#F7F1DF',
      wallEdge: '#AE9878', floorLine: '#D3B98F', woodTop: '#E8CAA2',
      woodSide: '#9D7656', accent: '#6DAA86', accentWarm: '#D6AC58',
      accentBlue: '#9EC8D0', highlight: '#FFF1C8'
    })
  });
  const MATERIALS = Object.freeze({
    paper: Object.freeze({ base: 'paper', grain: .26, grainScale: 1.8, opacity: .18, roughness: .86 }),
    wall: Object.freeze({ base: 'wall', grain: .10, grainScale: 1.2, opacity: .10, roughness: .60 }),
    floor: Object.freeze({ base: 'floor', grain: .22, grainScale: 2.8, opacity: .18, roughness: .72 }),
    wood: Object.freeze({ base: 'wood', grain: .34, grainScale: 3.4, opacity: .22, roughness: .78 }),
    fabric: Object.freeze({ base: 'carpet', grain: .25, grainScale: 4.8, opacity: .20, roughness: .92 }),
    leaf: Object.freeze({ base: 'leaf', grain: .18, grainScale: 2.2, opacity: .16, roughness: .68 }),
    ceramic: Object.freeze({ base: 'ceramic', grain: .06, grainScale: 1.3, opacity: .08, roughness: .28 }),
    metal: Object.freeze({ base: 'metal', grain: .08, grainScale: 1.6, opacity: .09, roughness: .35 })
  });
  const LINE_WEIGHTS = Object.freeze({ outline: 2.8, silhouette: 3.3, detail: 1.55, hatch: .86, vein: 1.25, texture: .62, shadow: 1.6 });

  function palette(name = 'bright', overrides = {}) {
    const base = PALETTES[name] || PALETTES.bright;
    return Object.freeze({ ...base, ...overrides });
  }
  function material(name = 'paper', options = {}) {
    const base = MATERIALS[name] || MATERIALS.paper;
    return Object.freeze({ ...base, ...options });
  }
  function lineWeights(scale = 1, options = {}) {
    const s = Number.isFinite(scale) ? Math.max(0, scale) : 1;
    const result = {};
    for (const [key, value] of Object.entries(LINE_WEIGHTS)) result[key] = Math.max(.25, value * s);
    return Object.freeze({ ...result, ...options });
  }
  function lineWidth(kind = 'detail', scale = 1) {
    return Math.max(.25, (LINE_WEIGHTS[kind] ?? LINE_WEIGHTS.detail) * Math.max(0, scale || 1));
  }

  // Stable room dressing. Geometry is deliberately expressed as normalized
  // values so a renderer can map it onto any room size and camera scale.
  function environment(seed = DEFAULT_SEED, options = {}) {
    const rng = seeded(seed);
    const density = clamp(options.density ?? 1, 0, 3);
    const count = Math.max(0, Math.round((options.count ?? 10) * density));
    const dust = [];
    for (let i = 0; i < count; i += 1) {
      dust.push(Object.freeze({
        x: rng.float(0.04, .96), y: rng.float(0.05, .94),
        radius: rng.float(.35, 1.25), opacity: rng.float(.04, .13),
        phase: rng.float(0, TAU), drift: rng.float(.15, .65)
      }));
    }
    const plant = Object.freeze({
      x: rng.float(.78, .94), z: rng.float(.07, .18),
      scale: rng.float(.78, 1.08), sway: rng.float(.015, .045), leaves: rng.int(4, 7)
    });
    const picture = Object.freeze({
      x: rng.float(.18, .82), y: rng.float(.18, .44),
      scale: rng.float(.82, 1.08), tilt: rng.float(-.035, .035),
      motif: rng.pick(['leaf', 'sun', 'cloud', 'star'])
    });
    const rug = Object.freeze({
      x: rng.float(.42, .58), z: rng.float(.53, .70),
      rx: rng.float(.28, .38), rz: rng.float(.13, .19),
      weave: rng.float(.55, .85), phase: rng.float(0, TAU)
    });
    return Object.freeze({
      seed: normalizeSeed(seed), density, dust: Object.freeze(dust), plant, picture, rug,
      grain: Object.freeze({ seed: rng.int(0, 0xffffffff), scale: rng.float(.8, 1.35), opacity: rng.float(.06, .16) })
    });
  }
  const decorations = environment;

  // Motion helpers use phase in seconds or cycles while preserving continuous
  // derivatives at the most visible action boundaries.
  function beat(time = 0, options = {}) {
    const period = Math.max(EPSILON, Math.abs(options.period ?? 1));
    const phase = wrap((Number.isFinite(time) ? time : 0) + (options.offset ?? 0), period) / period;
    const waveform = options.waveform || 'sine';
    const cycles = options.cycles ?? 1;
    const q = phase * cycles;
    if (waveform === 'triangle') return 1 - Math.abs(2 * frac(q) - 1);
    if (waveform === 'pulse') return smoothstep(frac(q));
    return .5 + .5 * Math.sin(q * TAU + (options.phase ?? 0));
  }
  function pulse(time = 0, options = {}) {
    const period = Math.max(EPSILON, Math.abs(options.period ?? 1));
    const phase = wrap((Number.isFinite(time) ? time : 0) + (options.offset ?? 0), period) / period;
    const attack = clamp(options.attack ?? .18, 0, .49);
    const release = clamp(options.release ?? .18, 0, .49);
    if (phase < attack) return smootherstep(phase / Math.max(attack, EPSILON));
    if (phase > 1 - release) return smootherstep((1 - phase) / Math.max(release, EPSILON));
    return 1;
  }
  function breath(time = 0, options = {}) {
    const amount = options.amount ?? .5;
    return mix(1 - amount, 1 + amount, beat(time, { ...options, waveform: 'sine' }));
  }

  const api = Object.freeze({
    TAU, DEFAULT_SEED, clamp, mix, smoothstep, smootherstep, frac, wrap,
    hashString, normalizeSeed, seeded, noise1D, noise2D, fbm1D, fbm2D,
    PALETTES, MATERIALS, LINE_WEIGHTS, palette, material, lineWidth, lineWeights,
    environment, decorations, beat, pulse, breath
  });
  const root = typeof globalThis !== 'undefined' ? globalThis : this;
  root.YayaProceduralStyle = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})();
