// The run: where you are in the queue, your bulbs and deals, and which curtains are on offer.
// No DOM, so it can be tested in Node.

import { START_BULBS, MAX_BULBS, RUN_LENGTH, DEALS, ROOM_TYPES } from './config.js';

const shuffle = (arr) => {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

export function newRun() {
  return {
    length: RUN_LENGTH, cleared: 0, attempts: 0,
    bulbs: START_BULBS, bulbsShown: START_BULBS,
    deals: [], mods: computeMods([]),
    keys: 0, hostPicksNext: false, darkNext: false,
    history: [], time: 0, outcome: null, firstVisit: true,
  };
}

export function computeMods(ids) {
  const m = { timerMul: 0, shots: 0, light: 0, look: 0, secondLook: 0, bucketStill: 0, twoBounces: 0, warp: 0, hint: 0, third: 0, quiet: 0 };
  for (const id of ids) {
    const d = DEALS.find((x) => x.id === id);
    if (d && d.mods) for (const [k, v] of Object.entries(d.mods)) m[k] += v;
  }
  return m;
}

// Depth runs from 1 for the first room. Rooms read it to set their difficulty.
export const depth = (run) => Math.min(7, run.cleared + 1);
export const queue = (run) => run.length - run.cleared;
export const atLastCurtain = (run) => run.cleared >= run.length;

// Curtains on offer: different room types, and never one type three times running.
export function curtains(run) {
  const n = run.mods.third ? 3 : 2;
  let types = Object.keys(ROOM_TYPES);
  const h = run.history;
  if (h.length >= 2 && h[h.length - 1] === h[h.length - 2]) types = types.filter((t) => t !== h[h.length - 1]);
  return shuffle(types).slice(0, n);
}

export function roomWon(run, type) {
  run.cleared++;
  run.history.push(type);
}

export function roomLost(run, type) {
  run.bulbs--;
  run.history.push(type);
  if (run.bulbs <= 0) run.outcome = 'dead';
}

export function useKey(run) {
  if (run.keys <= 0) return false;
  run.keys--;
  run.cleared++;
  run.hostPicksNext = true;
  return true;
}

export function offerDeals(run) {
  const open = DEALS.filter((d) => !run.deals.includes(d.id));
  return shuffle(open).slice(0, 3).map((d) => ({ ...d, affordable: !d.needsBulbs || run.bulbs >= d.needsBulbs }));
}

export function takeDeal(run, id) {
  const d = DEALS.find((x) => x.id === id);
  if (!d) return;
  run.deals.push(id);
  run.mods = computeMods(run.deals);
  if (d.now === 'spare') { run.bulbs = Math.min(MAX_BULBS, run.bulbs + 1); run.darkNext = true; }
  if (d.now === 'loseBulb') run.bulbs = Math.max(1, run.bulbs - 1);
  if (d.now === 'key') run.keys++;
  if (d.now === 'longer') run.length++;
  run.bulbsShown = Math.max(run.bulbsShown, run.bulbs);
}

// Puzzle timers, after deals.
export const timerSecs = (run, base) => base * Math.max(0.5, 1 + run.mods.timerMul);
