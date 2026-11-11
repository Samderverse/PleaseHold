// Please Hold audio. Built on the same pattern as Tilt's and Breakroom's engines.
// The Waiting Rooms theme never stops; what changes is how wrong it sounds:
//  - a second copy runs slightly sharp and a little late (the sour double)
//  - slow wow and fast flutter wobble the pitch like a warped tape
//  - behind a curtain it is muffled, as if playing in the next room
//  - in puzzle rooms it sags in pitch as the timer runs down
//  - now and then the tape drags and catches up
// Browsers only allow sound after a tap, so unlock() runs from a tap.

const TRACKS = { waiting: 'audio/waiting.mp3', title: 'audio/title.mp3', drone: 'audio/drone.mp3' };
const CLIPS = ['thud-a', 'thud-b', 'glass', 'chain', 'clunk', 'tape-click', 'tape-tick', 'glitch',
  'drip-1', 'drip-2', 'drip-3', 'drip-4', 'switch-1', 'switch-2', 'switch-3', 'chime-1', 'chime-2', 'hangup'];

let ctx = null;
let master, sfxBus, titleBus, droneBus, lodgeBus, lodgeFilter, gainA, gainB;
let srcA = null, srcB = null, wowGain, flutGain;
const raw = {}, buf = {};
let murmurBuf = null, noiseBuf = null;
let enabled = true;
let state = { place: 'title', depth: 1, warp: 0, sag: 0, semi: 0 };
let skipTimer = 30;
let pending = null;

export function preload() {
  const get = (u) => fetch(u).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
  for (const [k, u] of Object.entries(TRACKS)) raw[k] = get(u);
  for (const k of CLIPS) raw[k] = get(`audio/sfx/${k}.mp3`);
}

export async function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0; master.connect(ctx.destination);
  sfxBus = ctx.createGain(); sfxBus.gain.value = 0.85; sfxBus.connect(master);
  titleBus = ctx.createGain(); titleBus.gain.value = 0; titleBus.connect(master);
  droneBus = ctx.createGain(); droneBus.gain.value = 0; droneBus.connect(master);
  lodgeFilter = ctx.createBiquadFilter(); lodgeFilter.type = 'lowpass'; lodgeFilter.frequency.value = 15000;
  lodgeBus = ctx.createGain(); lodgeBus.gain.value = 0;
  lodgeFilter.connect(lodgeBus); lodgeBus.connect(master);
  gainA = ctx.createGain(); gainA.gain.value = 1; gainA.connect(lodgeFilter);
  gainB = ctx.createGain(); gainB.gain.value = 0.32;
  const delay = ctx.createDelay(0.2); delay.delayTime.value = 0.028;
  delay.connect(gainB); gainB.connect(lodgeFilter);
  gainB._in = delay;

  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

  for (const k of [...Object.keys(TRACKS), ...CLIPS]) {
    try { const ab = await raw[k]; if (ab) buf[k] = await ctx.decodeAudioData(ab.slice(0)); } catch (e) { /* missing: stay quiet */ }
  }
  startTracks();
  if (pending) place(pending);
}

function loop(b, dest) {
  const s = ctx.createBufferSource();
  s.buffer = b; s.loop = true;
  s.connect(dest); s.start();
  return s;
}

function startTracks() {
  if (buf.title) loop(buf.title, titleBus);
  if (buf.drone) loop(buf.drone, droneBus);
  if (!buf.waiting) return;
  srcA = loop(buf.waiting, gainA);
  srcB = ctx.createBufferSource(); srcB.buffer = buf.waiting; srcB.loop = true;
  srcB.connect(gainB._in); srcB.start();
  // the tape wobble, wired into both copies' pitch
  const wow = ctx.createOscillator(); wow.frequency.value = 0.31;
  wowGain = ctx.createGain(); wowGain.gain.value = 10;
  wow.connect(wowGain); wowGain.connect(srcA.detune); wowGain.connect(srcB.detune); wow.start();
  const flut = ctx.createOscillator(); flut.frequency.value = 6.3;
  flutGain = ctx.createGain(); flutGain.gain.value = 3;
  flut.connect(flutGain); flutGain.connect(srcA.detune); flutGain.connect(srcB.detune); flut.start();
  // a reversed scrap of the theme, for the Host's voice
  const len = Math.floor(ctx.sampleRate * 2.4), from = Math.floor(ctx.sampleRate * 31);
  murmurBuf = ctx.createBuffer(buf.waiting.numberOfChannels, len, ctx.sampleRate);
  for (let c = 0; c < buf.waiting.numberOfChannels; c++) {
    const src = buf.waiting.getChannelData(c), dst = murmurBuf.getChannelData(c);
    for (let i = 0; i < len; i++) dst[i] = src[from + len - 1 - i] || 0;
  }
  retune();
}

const set = (param, v, t = 0.4) => { if (param) param.setTargetAtTime(v, ctx.currentTime, t); };

function retune() {
  if (!srcA) return;
  const base = -state.sag * 190 + state.semi;
  set(srcA.detune, base, 0.3);
  set(srcB.detune, base + 30 + state.warp * 18, 0.3);
  set(wowGain.gain, 8 + state.depth * 3 + state.warp * 14, 0.5);
  set(gainB.gain, 0.26 + state.depth * 0.025 + state.warp * 0.12, 0.5);
}

export function setEnabled(on) {
  enabled = on;
  if (ctx) set(master.gain, on ? 0.9 : 0, 0.05);
}

// Where you are decides how the music reaches you.
export function place(name) {
  if (!ctx || !lodgeBus) { pending = name; return; }
  pending = null;
  state.place = name;
  const loud = state.warp ? 0.15 : 0;
  const P = {
    title: { title: 0.7, lodge: 0, f: 15000, drone: 0.25 },
    hub: { title: 0, lodge: 0.75 + loud, f: 14000, drone: 0.12 },
    room: { title: 0, lodge: 0.5 + loud, f: 1100, drone: 0.32 },
    deal: { title: 0, lodge: 0.55 + loud, f: 2600, drone: 0.15 },
    pause: { title: 0, lodge: 0.28, f: 700, drone: 0.1 },
    over: { title: 0, lodge: 0.32, f: 480, drone: 0.4 },
  }[name] || {};
  set(titleBus.gain, P.title, 0.8);
  set(lodgeBus.gain, P.lodge, 0.8);
  set(lodgeFilter.frequency, P.f, 0.5);
  set(droneBus.gain, P.drone, 0.8);
}

export function setDepth(depth, warp) {
  state.depth = depth; state.warp = warp ? 1 : 0;
  if (ctx) { retune(); place(state.place); }
}

// 0 to 1: how close a puzzle room is to failing. The music sags as it rises.
export function sag(x) {
  const v = Math.round(Math.max(0, Math.min(1, x)) * 40) / 40;
  if (v === state.sag) return;
  state.sag = v;
  if (ctx) retune();
}

// The Same Room's sound change: the music a semitone lower.
export function semitone(on) {
  state.semi = on ? -100 : 0;
  if (ctx) retune();
}

export function murmur(secs = 1.6) {
  if (!ctx || !murmurBuf) return;
  const s = ctx.createBufferSource(); s.buffer = murmurBuf;
  s.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 0.9;
  const g = ctx.createGain();
  const t = ctx.currentTime;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.55, t + 0.08);
  g.gain.setValueAtTime(0.55, t + Math.max(0.1, secs - 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + secs);
  s.connect(f); f.connect(g); g.connect(sfxBus);
  s.start(t, Math.random() * 0.6); s.stop(t + secs + 0.05);
}

export function clip(name, { gain = 1, rate = 1, pan = 0, delay = 0 } = {}) {
  if (!ctx || !buf[name]) return;
  const s = ctx.createBufferSource(); s.buffer = buf[name]; s.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = gain;
  let out = g;
  if (pan && ctx.createStereoPanner) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, pan)); g.connect(p); out = p; }
  s.connect(g); out.connect(sfxBus);
  s.start(ctx.currentTime + delay);
}

export function tone(freq, dur, { type = 'sine', vol = 0.15, slide = 0, delay = 0 } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, slide), t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(sfxBus); o.start(t); o.stop(t + dur + 0.05);
}

export function noise(dur, { vol = 0.12, freq = 800, type = 'lowpass' } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f); f.connect(g); g.connect(sfxBus); s.start(t); s.stop(t + dur + 0.05);
}

// Every few seconds: drips in the rooms, and the occasional tape drag.
let dripTimer = 6;
export function tick(dt, { drips = false, live = true } = {}) {
  if (!ctx || !srcA || !live) return;
  skipTimer -= dt;
  if (skipTimer <= 0) {
    skipTimer = 22 + Math.random() * 26;
    const t = ctx.currentTime;
    for (const s of [srcA, srcB]) {
      s.playbackRate.cancelScheduledValues(t);
      s.playbackRate.setValueAtTime(1, t);
      s.playbackRate.linearRampToValueAtTime(0.8, t + 0.14);
      s.playbackRate.linearRampToValueAtTime(1, t + 0.55);
    }
  }
  if (drips) {
    dripTimer -= dt;
    if (dripTimer <= 0) {
      dripTimer = 5 + Math.random() * 8;
      clip(`drip-${1 + Math.floor(Math.random() * 4)}`, { gain: 0.25 + Math.random() * 0.3, rate: 0.9 + Math.random() * 0.2, pan: Math.random() * 1.6 - 0.8 });
    }
  }
}

const rnd = (a, b) => a + Math.random() * (b - a);

// One place that maps moments to sounds.
export function play(name, x) {
  if (!ctx) return;
  const pan = x !== undefined ? (x / 360) * 1.4 - 0.7 : 0;
  switch (name) {
    case 'ui': clip('tape-tick', { gain: 0.5 }); break;
    case 'select': clip('tape-click', { gain: 0.6, rate: 1.15 }); break;
    case 'take': clip('tape-click', { gain: 0.9 }); clip('clunk', { gain: 0.3, rate: 1.6, delay: 0.08 }); break;
    case 'type': clip('tape-tick', { gain: 0.1, rate: rnd(1.6, 2.1) }); break;
    case 'curtain': noise(0.9, { vol: 0.16, freq: 900, type: 'bandpass' }); clip('chain', { gain: 0.25, rate: 0.6 }); break;
    case 'enter': clip('glitch', { gain: 0.35, rate: 1.2 }); break;
    case 'won': clip('chime-1', { gain: 0.8 }); clip('chime-2', { gain: 0.5, rate: 0.94, delay: 0.18 }); break;
    case 'lost': clip('glass', { gain: 0.9, rate: 1.6 }); clip('glitch', { gain: 0.7, rate: 0.9 }); break;
    case 'warn': tone(3100, 1.6, { vol: 0.02 }); break;
    case 'fire': clip('tape-click', { gain: 0.6, rate: 0.8 }); noise(0.15, { vol: 0.08, freq: 2000, type: 'bandpass' }); break;
    case 'peg': clip('thud-b', { gain: 0.35, rate: rnd(1.5, 1.9), pan }); break;
    case 'target': clip('glass', { gain: 0.55, rate: rnd(1.1, 1.3), pan }); break;
    case 'pipe': clip('clunk', { gain: 0.4, rate: 2.3, pan }); break;
    case 'wall': clip('thud-b', { gain: 0.15, rate: 1.7, pan }); break;
    case 'bucket': clip('chime-2', { gain: 0.6, rate: 1.2 }); break;
    case 'drain': clip('thud-a', { gain: 0.4, rate: 0.7 }); break;
    case 'switch': clip(`switch-${1 + Math.floor(Math.random() * 3)}`, { gain: 0.7, pan }); break;
    case 'turn': clip('switch-2', { gain: 0.45, rate: rnd(1.2, 1.4), pan }); break;
    case 'power': clip('clunk', { gain: 0.7, rate: 0.9 }); noise(0.4, { vol: 0.08, freq: 3000, type: 'highpass' }); break;
    case 'hint': clip('chime-2', { gain: 0.35, rate: 1.5 }); break;
    case 'tick': clip('tape-tick', { gain: 0.22, rate: 0.7 }); break;
    case 'blink': clip('glitch', { gain: 0.45, rate: rnd(1.3, 1.6) }); break;
    case 'right': clip('chime-1', { gain: 0.45, rate: 1.1 }); break;
    case 'wrong': clip('clunk', { gain: 0.8, rate: 0.7 }); clip('glitch', { gain: 0.4 }); break;
    case 'open': noise(1.4, { vol: 0.2, freq: 700, type: 'bandpass' }); clip('chime-1', { gain: 0.6, rate: 0.8 }); break;
    case 'hangup': clip('hangup', { gain: 0.9 }); clip('glitch', { gain: 0.6, rate: 0.6 }); break;
    case 'key': clip('chain', { gain: 0.5, rate: 1.4 }); clip('clunk', { gain: 0.5, rate: 1.8, delay: 0.1 }); break;
    default: break;
  }
}
