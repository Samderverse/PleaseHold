// Please Hold: screens, input and the loop. The run lives in run.js, the hub in hub.js,
// and each room in js/rooms/.

import { W } from './scenery.js';
import { ROOM_TYPES, HOST, MAX_BULBS } from './config.js';
import * as R from './run.js';
import * as Hub from './hub.js';
import { createPostFx } from './postfx.js';
import * as A from './audio.js';
import drop from './rooms/drop.js';
import switchboard from './rooms/switchboard.js';
import wiring from './rooms/wiring.js';
import same from './rooms/same.js';

const ROOMS = { drop, switchboard, wiring, same };
const $ = (id) => document.getElementById(id);
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const el = {
  stage: $('stage'), frame: $('frame'), canvas: $('screen'), fade: $('fade'),
  osd: $('osd'), clock: $('clock'), where: $('where'), bulbs: $('bulbs'), status: $('status'), hintLine: $('hintLine'),
  host: document.querySelector('#host p'), banner: $('banner'), curtains: $('curtains'), keyBtn: $('keyBtn'),
  caption: $('caption'), buttons: $('buttons'),
  title: $('title'), deal: $('deal'), pause: $('pause'), over: $('over'),
  dealSay: $('dealSay'), cards: $('cards'), dealBulbs: $('dealBulbs'), dealQueue: $('dealQueue'), refuse: $('refuse'),
  overTitle: $('overTitle'), overSay: $('overSay'), overStats: $('overStats'), overClock: $('overClock'), pauseClock: $('pauseClock'),
  best: $('best'), credits: $('credits'), pad: $('pad'), padLabel: $('padLabel'),
  brief: $('brief'), briefRoom: $('briefRoom'), briefName: $('briefName'), briefGoal: $('briefGoal'), briefHow: $('briefHow'),
};

// ---------- settings ----------

const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } },
};
const reducedPref = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
const settings = Object.assign({ sound: true, reduce: reducedPref }, store.get('pleasehold.settings', {}));
let best = store.get('pleasehold.best', null);

function applySettings() {
  for (const id of ['soundVal', 'soundVal2']) $(id).textContent = settings.sound ? 'ON' : 'OFF';
  for (const id of ['reduceVal', 'reduceVal2']) $(id).textContent = settings.reduce ? 'ON' : 'OFF';
  document.documentElement.classList.toggle('reduce', settings.reduce);
  A.setEnabled(settings.sound);
  store.set('pleasehold.settings', settings);
}

const CREDITS = [
  ['Game', 'Please Hold by Samderverse'],
  ['Waiting room music', 'Waiting Rooms theme (add artist / source)'],
  ['Title music', 'Potential Theme (add artist / source)'],
  ['Drone and drips', 'Dread Ambience and Water Drip Echo (add sources), via Breakroom'],
  ['Switches, chimes, hang-up', 'adapted from Tilt (sonidosKMD, Webiverse Vids)'],
  ['Thuds, chain, clunk, tape buttons', 'adapted from sonidosKMD, via Tilt and Breakroom'],
  ['Glass', 'adapted from Epic Sound Effects, via Tilt'],
  ['Tape glitch', 'adapted from Edwardo Ching, via Tilt'],
];
el.credits.innerHTML = CREDITS.map(([a, b]) => `<li>${a}: ${b}</li>`).join('');

function fmt(t) {
  const s = Math.max(0, Math.floor(t));
  return `${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}
function showBest() {
  if (!best) { el.best.textContent = ''; return; }
  el.best.textContent = best.win ? `BEST: CONNECTED IN ${fmt(best.time)}` : `BEST: ${best.cleared} ROOMS`;
}

// ---------- sizing, with a touch pad under the game on phones ----------

const touchFirst = matchMedia('(pointer: coarse)').matches;
document.documentElement.classList.toggle('has-pad', touchFirst);
const fx = createPostFx(el.canvas);
function fit() {
  const cs = getComputedStyle(el.stage);
  const w = el.stage.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const h = el.stage.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
  const padMin = touchFirst ? Math.max(84, h * 0.13) : 0;
  const fw = Math.floor(Math.min(w, (h - padMin) * 9 / 16));
  const fh = Math.floor(fw * 16 / 9);
  el.frame.style.width = fw + 'px'; el.frame.style.height = fh + 'px';
  if (touchFirst) { el.pad.style.width = fw + 'px'; el.pad.style.height = Math.floor(h - fh) + 'px'; }
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  el.canvas.width = Math.round(fw * dpr); el.canvas.height = Math.round(fh * dpr);
}
window.addEventListener('resize', fit);
fit();

// ---------- state ----------

let screen = 'title';      // title | hub | room | deal | pause | over
let paused = null;         // the screen to go back to after pausing
let run = R.newRun();
let hub = Hub.newHub(run);
let room = null, roomType = null, rs = null;
let busy = false;
let glitch = 0;
let tape = 0;              // the REC timer: forwards in rooms, backwards in the Waiting Room
hub.curtains = ['drop', 'same'];

function show(name) {
  screen = name;
  el.title.hidden = name !== 'title';
  el.deal.hidden = name !== 'deal';
  el.pause.hidden = name !== 'pause';
  el.over.hidden = name !== 'over';
  el.osd.hidden = !(name === 'hub' || name === 'room' || name === 'pause');
  if (name !== 'hub') { el.curtains.innerHTML = ''; el.keyBtn.hidden = true; }
  if (name !== 'room') { el.caption.textContent = ''; el.buttons.innerHTML = ''; lastUi = ''; }
  if (name !== 'room' && name !== 'hub' && name !== 'pause') pad('');
  if (name !== 'room' && name !== 'pause') { el.brief.hidden = true; briefing = false; }
}

function bulbsHtml() {
  let s = '';
  for (let i = 0; i < Math.min(MAX_BULBS, Math.max(run.bulbs, run.bulbsShown)); i++) s += i < run.bulbs ? '<span class="on">●</span>' : '<span class="off">○</span>';
  return s;
}

function pad(text) { el.padLabel.textContent = text; el.hintLine.textContent = text; }

// ---------- the Host ----------

let sayToken = 0;
async function say(target, text, { hold = 2800, clear = true, force = false } = {}) {
  if (!text) return;
  if (run.mods.quiet && !force && target === el.host) return;
  const token = ++sayToken;
  target.textContent = '';
  target.classList.add('caret');
  A.murmur(Math.min(3.2, 0.6 + text.length * 0.035));
  for (let i = 0; i < text.length; i++) {
    if (token !== sayToken) return;
    target.textContent = text.slice(0, i + 1);
    if (i % 2 === 0 && text[i] !== ' ') A.play('type');
    await wait(text[i] === '.' || text[i] === ',' ? 120 : 26);
  }
  target.classList.remove('caret');
  if (clear && hold > 0) {
    await wait(hold);
    if (token === sayToken && target === el.host) target.textContent = '';
  }
}
const hostSays = (text, hold, force) => say(el.host, text, { hold, force });

let bannerTimer = 0;
function banner(main, sub = '', ms = 1400) {
  el.banner.innerHTML = `<b>${main}</b>${sub ? `<span>${sub}</span>` : ''}`;
  el.banner.className = ''; void el.banner.offsetWidth; el.banner.className = 'show';
  clearTimeout(bannerTimer);
  if (ms) bannerTimer = setTimeout(() => { el.banner.innerHTML = ''; }, ms);
}

async function fadeThrough(fn) {
  el.fade.classList.add('on');
  glitch = 1;
  await wait(380);
  fn();
  await wait(60);
  el.fade.classList.remove('on');
}

// ---------- the Waiting Room ----------

async function startRun() {
  await A.unlock();
  A.setEnabled(settings.sound);
  run = R.newRun();
  hub = Hub.newHub(run);
  tape = 0;
  A.setDepth(1, 0);
  A.sag(0);
  await fadeThrough(() => toHub());
}

function toHub(line) {
  show('hub');
  A.place('hub');
  A.sag(0);
  A.semitone(false);
  hub.mode = 'choose';
  hub.visits++;
  el.where.textContent = `THE WAITING ROOM · IN QUEUE ${String(R.queue(run)).padStart(2, '0')}`;
  if (R.atLastCurtain(run)) return lastCurtain();
  hub.curtains = run.history.length === 0 ? ['drop', 'wiring'].sort(() => Math.random() - 0.5) : R.curtains(run);
  renderCurtains();
  pad('TAP A CURTAIN');
  const text = line || (run.firstVisit ? HOST.first : null);
  run.firstVisit = false;
  if (run.hostPicksNext) {
    run.hostPicksNext = false;
    el.curtains.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    hostSays(pick(HOST.picks), 1600, true);
    setTimeout(() => enterRoom(pick(hub.curtains)), 2400);
    return;
  }
  if (text) hostSays(text, 3000);
  else hostSays(pick(HOST.choose), 2400);
}

function renderCurtains() {
  const xs = Hub.openingsX(hub.curtains.length);
  el.curtains.innerHTML = hub.curtains.map((type, i) => `
    <button class="curtain" data-type="${type}" style="left:${(xs[i] / W) * 100}%" aria-label="Go through to ${ROOM_TYPES[type].name}">
      <span>${ROOM_TYPES[type].card}</span>
    </button>`).join('');
  el.keyBtn.hidden = !(run.keys > 0);
}

el.curtains.addEventListener('click', (e) => {
  const b = e.target.closest('.curtain');
  if (!b || b.disabled || busy || screen !== 'hub') return;
  enterRoom(b.dataset.type);
});

el.keyBtn.addEventListener('click', () => {
  if (busy || screen !== 'hub' || !R.useKey(run)) return;
  A.play('key');
  hostSays(HOST.key, 1800, true);
  el.keyBtn.hidden = true;
  setTimeout(() => toHub(HOST.back[0].replace('{n}', R.queue(run))), 1600);
});

// ---------- rooms ----------

async function enterRoom(type) {
  if (busy) return;
  busy = true;
  A.play('curtain');
  sayToken++;
  el.host.textContent = '';
  await fadeThrough(() => {
    roomType = type;
    room = ROOMS[type];
    rs = room.start({ depth: R.depth(run), run, dark: run.darkNext, queue: R.queue(run) });
    run.darkNext = false;
    show('room');
    A.place('room');
    A.play('enter');
    el.where.textContent = `${ROOM_TYPES[type].name.toUpperCase()} · ROOM ${R.depth(run)}`;
    pad(ROOM_TYPES[type].hint);
    brief(type);
  });
  busy = false;
}

// The goal card: the room waits, clock stopped, until you tap to begin.
let briefing = false;
function brief(type) {
  const t = ROOM_TYPES[type];
  briefing = true;
  el.briefRoom.textContent = `ROOM ${R.depth(run)} · IN QUEUE ${String(R.queue(run)).padStart(2, '0')}`;
  el.briefName.textContent = t.name;
  el.briefGoal.textContent = t.goal;
  el.briefHow.textContent = t.how;
  el.brief.hidden = false;
}
function begin() {
  if (!briefing) return;
  briefing = false;
  el.brief.hidden = true;
  A.play('select');
  hostSays(HOST.rooms[roomType], 2600);
}
el.brief.addEventListener('click', begin);

async function roomOver(result) {
  busy = true;
  A.sag(0);
  A.semitone(false);
  if (result === 'won') {
    A.play('won');
    banner('Cleared', '', 1200);
    R.roomWon(run, roomType);
    await wait(1300);
    A.setDepth(R.depth(run), run.mods.warp);
    await fadeThrough(() => {
      show('hub'); A.place('hub');
      if (R.atLastCurtain(run)) { busy = false; toHub(); return; }
      openDeal();
    });
  } else {
    A.play('lost');
    glitch = 1;
    banner('Line dropped', '', 1300);
    R.roomLost(run, roomType);
    await wait(1400);
    if (run.outcome === 'dead') { busy = false; return endRun('dead'); }
    await fadeThrough(() => toHub(pick(HOST.sorry)));
  }
  busy = false;
}

// ---------- deals ----------

let offers = [], selected = -1, dealLocked = false;

function openDeal() {
  show('deal');
  sayToken++;
  el.host.textContent = '';
  A.place('deal');
  offers = R.offerDeals(run);
  selected = -1; dealLocked = false;
  el.dealQueue.textContent = `QUEUE ${String(R.queue(run)).padStart(2, '0')}`;
  el.dealBulbs.innerHTML = `BULBS ${bulbsHtml()}`;
  if (!offers.length) { toHub(); return; }
  el.cards.innerHTML = offers.map((d, i) => `
    <button class="card" data-i="${i}" style="--tilt:${[-0.8, 0.6, -0.4][i]}deg" ${d.affordable ? '' : 'disabled'}>
      <h3>${d.name}</h3><p class="boon">${d.boon}</p><p class="cost">${d.cost}</p>
      <span class="hint">${d.affordable ? 'TAP AGAIN TO TAKE IT' : 'NOT ENOUGH BULBS'}</span>
    </button>`).join('');
  say(el.dealSay, pick(HOST.deal), { clear: false, force: true });
  const first = el.cards.querySelector('.card:not([disabled])');
  if (first) first.focus({ preventScroll: true });
}

function select(i) {
  selected = i;
  el.cards.querySelectorAll('.card').forEach((c, k) => c.classList.toggle('sel', k === i));
  A.play('select');
}

async function take(i) {
  const d = offers[i];
  if (!d || !d.affordable || dealLocked) return;
  dealLocked = true;
  R.takeDeal(run, d.id);
  A.setDepth(R.depth(run), run.mods.warp);
  A.play('take');
  el.dealBulbs.innerHTML = `BULBS ${bulbsHtml()}`;
  await say(el.dealSay, pick(HOST.take), { clear: false, force: true });
  await wait(500);
  await fadeThrough(() => toHub(HOST.back[Math.floor(Math.random() * HOST.back.length)].replace('{n}', R.queue(run))));
}

async function refuse() {
  if (dealLocked) return;
  dealLocked = true;
  A.play('select');
  await say(el.dealSay, pick(HOST.refuse), { clear: false, force: true });
  await wait(400);
  await fadeThrough(() => toHub(HOST.back[0].replace('{n}', R.queue(run))));
}

el.cards.addEventListener('click', (e) => {
  const c = e.target.closest('.card');
  if (!c || c.disabled || dealLocked) return;
  const i = Number(c.dataset.i);
  if (selected === i) take(i); else select(i);
});
el.refuse.addEventListener('click', refuse);

// ---------- the Last Curtain ----------

function lastCurtain() {
  Hub.startLast(hub);
  el.curtains.innerHTML = '';
  el.keyBtn.hidden = true;
  el.where.textContent = 'THE WAITING ROOM · NOW SERVING';
  pad('TAP WHAT IS WRONG');
  banner('Now serving', 'You', 1600);
  setTimeout(() => hostSays(HOST.last, 4000, true), 900);
}

async function lastTap(x, y) {
  if (busy) return;
  const res = Hub.tapLast(hub, x, y);
  if (!res) return;
  if (res === 'right') {
    busy = true;
    A.play('open');
    sayToken++; el.host.textContent = '';
    await wait(2300);
    busy = false;
    return endRun('win');
  }
  A.play('lost');
  glitch = 1;
  run.bulbs--;
  if (run.bulbs <= 0) { run.outcome = 'dead'; return endRun('dead'); }
  hostSays(pick(HOST.lastWrong), 1800, true);
  Hub.startLast(hub);
}

// ---------- the end ----------

async function endRun(outcome) {
  busy = true;
  run.outcome = outcome;
  if (outcome === 'dead') { A.play('hangup'); glitch = 1; banner('Cut off', '', 1400); await wait(1500); }
  el.over.classList.toggle('win', outcome === 'win');
  el.overTitle.textContent = outcome === 'win' ? 'Connected' : 'Cut off';
  el.overClock.textContent = fmt(run.time);
  el.overStats.innerHTML = [
    ['TAPE LENGTH', fmt(run.time)],
    ['ROOMS CLEARED', `${Math.min(run.cleared, run.length)}/${run.length}`],
    ['QUEUE REACHED', outcome === 'win' ? 'THE FRONT' : String(R.queue(run)).padStart(2, '0')],
    ['DEALS TAKEN', run.deals.length],
    ['BULBS LEFT', Math.max(0, run.bulbs)],
  ].map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  const score = { win: outcome === 'win', cleared: run.cleared, time: run.time };
  const better = !best || (score.win && (!best.win || score.time < best.time)) || (!score.win && !best.win && score.cleared > best.cleared);
  if (better) { best = score; store.set('pleasehold.best', best); }
  showBest();
  show('over');
  A.place('over');
  sayToken++; el.host.textContent = '';
  busy = false;
  say(el.overSay, outcome === 'win' ? HOST.win : HOST.dead, { clear: false, force: true });
  $('againBtn').focus({ preventScroll: true });
}

function toTitle() {
  sayToken++;
  el.host.textContent = ''; el.banner.innerHTML = '';
  run = R.newRun(); hub = Hub.newHub(run); hub.curtains = ['drop', 'same'];
  show('title');
  A.place('title');
  showBest();
  $('playBtn').focus({ preventScroll: true });
}

// ---------- input ----------

const input = { taps: [], anyTap: false, drag: 0, aimAt: null, button: null, keys: { left: false, right: false, fire: false, same: false, changed: false } };

function fieldPoint(cx, cy) {
  const r = el.canvas.getBoundingClientRect();
  const x = ((cx - r.left) / r.width) * W, y = ((cy - r.top) / r.height) * 640;
  return x >= 0 && x <= W && y >= 0 && y <= 640 ? { x, y } : null;
}

let ptr = null;
el.stage.addEventListener('pointerdown', (e) => {
  if (e.target.closest('button') || (screen !== 'room' && screen !== 'hub')) return;
  ptr = { id: e.pointerId, x: e.clientX, y: e.clientY, t: performance.now(), moved: 0 };
  try { el.stage.setPointerCapture(e.pointerId); } catch (err) { /* fine */ }
});
el.stage.addEventListener('pointermove', (e) => {
  if (e.pointerType === 'mouse') input.aimAt = fieldPoint(e.clientX, e.clientY);
  if (!ptr || ptr.id !== e.pointerId) return;
  const dx = e.clientX - ptr.x;
  ptr.moved += Math.abs(dx) + Math.abs(e.clientY - ptr.y);
  ptr.x = e.clientX; ptr.y = e.clientY;
  if (e.pointerType !== 'mouse') input.drag += (dx / el.canvas.getBoundingClientRect().width) * W;
});
el.stage.addEventListener('pointerup', (e) => {
  if (!ptr || ptr.id !== e.pointerId) return;
  const tap = ptr.moved < 12 && performance.now() - ptr.t < 400;
  ptr = null;
  if (tap && screen === 'room' && briefing) { begin(); return; }
  if (!tap) return;
  const p = fieldPoint(e.clientX, e.clientY);
  if (screen === 'hub' && hub.mode === 'last' && p) { lastTap(p.x, p.y); return; }
  if (screen !== 'room') return;
  input.anyTap = true;
  if (p) input.taps.push(p);
});
el.stage.addEventListener('pointercancel', () => { ptr = null; });

el.buttons.addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (b) input.button = b.dataset.id;
});

const KEYMAP = { ArrowLeft: 'left', a: 'left', A: 'left', ArrowRight: 'right', d: 'right', D: 'right', ' ': 'fire', ArrowUp: 'fire', s: 'same', S: 'same', c: 'changed', C: 'changed' };
window.addEventListener('keydown', (e) => {
  if (screen === 'room' && briefing && (e.key === ' ' || e.key === 'Enter')) { begin(); e.preventDefault(); return; }
  if (screen === 'room' && KEYMAP[e.key]) { input.keys[KEYMAP[e.key]] = true; e.preventDefault(); return; }
  if ((screen === 'room' || screen === 'hub') && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) { pause(); e.preventDefault(); return; }
  if (screen === 'pause' && (e.key === 'Escape' || e.key === 'p' || e.key === 'P')) { resume(); e.preventDefault(); return; }
  if (screen === 'hub' && hub.mode === 'choose' && !busy && e.key >= '1' && e.key <= '3') { const t = hub.curtains[Number(e.key) - 1]; if (t) enterRoom(t); }
  if (screen === 'deal' && !dealLocked) {
    if (e.key >= '1' && e.key <= '3') { const i = Number(e.key) - 1; const c = el.cards.children[i]; if (c && !c.disabled) { if (selected === i) take(i); else { select(i); c.focus(); } } }
    else if (e.key === 'x' || e.key === 'X') refuse();
  }
  if (screen === 'over' && (e.key === 'r' || e.key === 'R')) startRun();
});
window.addEventListener('keyup', (e) => { if (KEYMAP[e.key]) input.keys[KEYMAP[e.key]] = false; });

function pause() {
  if (busy || (screen !== 'room' && screen !== 'hub')) return;
  paused = screen;
  show('pause');
  el.pauseClock.textContent = fmt(run.time);
  A.place('pause');
  A.play('ui');
  $('resumeBtn').focus({ preventScroll: true });
}
function resume() {
  const back = paused || 'hub';
  paused = null;
  show(back);
  A.place(back === 'room' ? 'room' : 'hub');
  if (back === 'hub' && hub.mode === 'choose') renderCurtains();
  A.play('ui');
}
document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });

$('playBtn').addEventListener('click', startRun);
$('againBtn').addEventListener('click', startRun);
$('titleBtn').addEventListener('click', toTitle);
$('quitBtn').addEventListener('click', toTitle);
$('resumeBtn').addEventListener('click', resume);
$('pauseBtn').addEventListener('click', pause);
for (const id of ['soundBtn', 'soundBtn2']) $(id).addEventListener('click', async () => { settings.sound = !settings.sound; await A.unlock(); applySettings(); A.play('ui'); });
for (const id of ['reduceBtn', 'reduceBtn2']) $(id).addEventListener('click', () => { settings.reduce = !settings.reduce; applySettings(); A.play('ui'); });
el.title.addEventListener('pointerdown', () => { A.unlock(); }, { once: true });

// ---------- loop ----------

let lastUi = '';
function roomUi() {
  const ui = room.ui ? room.ui(rs) : null;
  el.status.textContent = room.status ? room.status(rs) : '';
  const key = JSON.stringify(ui ? [ui.caption, ui.buttons] : null);
  if (key === lastUi) return;
  lastUi = key;
  el.caption.textContent = ui ? ui.caption : '';
  el.buttons.innerHTML = ui ? ui.buttons.map(([id, label]) => `<button data-id="${id}">${label}</button>`).join('') : '';
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  glitch = Math.max(0, glitch - dt * 1.5);
  let img;

  if (screen === 'room' || (screen === 'pause' && paused === 'room')) {
    if (screen === 'room' && !busy && !briefing) {
      run.time += dt; tape += dt;
      const res = room.update(rs, dt, input);
      for (const ev of rs.events) {
        if (ev.sfx) A.play(ev.sfx, ev.x);
        if (ev.warn && !run.mods.quiet) { A.play('warn'); hostSays(pick(HOST.warn), 1600); }
        if (ev.semitone !== undefined) A.semitone(ev.semitone);
      }
      rs.events.length = 0;
      const tm = room.timer(rs);
      A.sag(tm == null ? 0 : tm);
      if (res !== 'playing') roomOver(res);
      roomUi();
    }
    if (briefing) roomUi();
    img = room.draw(rs, now / 1000, { reduce: settings.reduce });
  } else {
    if (screen === 'hub') { run.time += dt; tape = Math.max(0, tape - dt); }
    Hub.update(hub, dt);
    img = Hub.draw(hub, now / 1000, { queue: R.queue(run) }).canvas;
  }
  input.taps.length = 0; input.anyTap = false; input.drag = 0; input.button = null;

  if (screen === 'hub' || screen === 'room' || screen === 'pause') {
    el.clock.textContent = fmt(tape);
    el.bulbs.innerHTML = bulbsHtml();
    if (screen === 'hub') el.status.textContent = '';
  }
  A.tick(dt, { drips: screen === 'room' && roomType === 'same', live: screen !== 'pause' });
  const g = Math.min(1, glitch + (rs && screen === 'room' ? rs.glitch || 0 : 0) + (screen === 'over' ? 0.12 : 0));
  const softTape = settings.reduce || (screen === 'room' && rs && rs.soft);
  fx.draw(img, { time: now / 1000, glitch: g, soft: softTape });
  requestAnimationFrame(frame);
}

// a small handle for testing from the browser console
window.__ph = {
  get run() { return run; }, get hub() { return hub; }, get rs() { return rs; }, get screen() { return screen; },
  go(type) { enterRoom(type); },
  win() { if (screen === 'room') roomOver('won'); },
  lose() { if (screen === 'room') roomOver('lost'); },
  last() { run.cleared = run.length; toHub(); },
};

A.preload();
applySettings();
showBest();
show('title');
A.place('title');
requestAnimationFrame(frame);
