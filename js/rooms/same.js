// The Same Room: look at the room, the tape blinks, then say whether anything changed.
// Five right calls wins. Two wrong calls and you are back in the Waiting Room.

import { W, H, room, floorPoint, opening, lamp, chair, table, phone, clock, picture, queueSign, figure } from '../scenery.js';
import * as L from '../light.js';
import { SAME_CHANGES_TOLD } from '../config.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const WARM = [255, 228, 186];

const POOLS = {
  easy: ['chairTurned', 'chairMoved', 'lampOff', 'pictureGone', 'phoneGone', 'extraChair', 'figure', 'tableMoved', 'openingSide'],
  medium: ['lampColour', 'pictureUpside', 'phoneOff', 'clockTime', 'queue', 'lampMoved'],
  hard: ['clockBack', 'tile', 'curtain', 'musicLow', 'tickStop'],
};

export function canonical(queue) {
  return {
    chair: { x: 0.42, z: 0.7, v: pick(['front', 'side', 'back']) },
    chair2: null,
    lamp: { x: -0.72, z: 0.62, on: true, color: WARM },
    table: { x: -0.2, z: 0.52 },
    phone: 'on', clock: { back: false, offset: Math.floor(Math.random() * 12) },
    picture: 'ok', opening: 180, queue, figure: false, curtain: 'red', tile: null, musicLow: false, tick: true,
  };
}

const copy = (c) => JSON.parse(JSON.stringify(c));

export function applyChange(c, key) {
  const n = copy(c);
  switch (key) {
    case 'chairTurned': n.chair.v = pick(['front', 'side', 'back'].filter((v) => v !== c.chair.v)); break;
    case 'chairMoved': n.chair.x = c.chair.x > 0.2 ? -0.02 : 0.42; break;
    case 'lampOff': n.lamp.on = false; break;
    case 'lampColour': n.lamp.color = pick([[150, 210, 255], [190, 255, 160], [255, 140, 140]]); break;
    case 'lampMoved': n.lamp.x = 0.78; break;
    case 'pictureGone': n.picture = 'gone'; break;
    case 'pictureUpside': n.picture = 'upside'; break;
    case 'phoneGone': n.phone = 'gone'; break;
    case 'phoneOff': n.phone = 'off'; break;
    case 'extraChair': n.chair2 = { x: -0.55, z: 0.84, v: 'side' }; break;
    case 'figure': n.figure = true; break;
    case 'tableMoved': n.table.x = 0.12; break;
    case 'openingSide': n.opening = 248; break;
    case 'clockTime': n.clock.offset = (c.clock.offset + 4) % 12; break;
    case 'clockBack': n.clock.back = true; break;
    case 'queue': n.queue = (c.queue + 3) % 100; break;
    case 'tile': n.tile = { x: Math.floor(Math.random() * 10) - 5, z: 1 + Math.floor(Math.random() * 3) }; break;
    case 'curtain': n.curtain = 'maroon'; break;
    case 'musicLow': n.musicLow = true; break;
    case 'tickStop': n.tick = false; break;
    default: break;
  }
  return n;
}

export function poolFor(depth) {
  if (depth <= 2) return POOLS.easy;
  if (depth <= 4) return [...POOLS.easy, ...POOLS.medium];
  if (depth <= 5) return [...POOLS.medium, ...POOLS.medium, ...POOLS.easy.slice(0, 4), ...POOLS.hard];
  return [...POOLS.medium, ...POOLS.hard, ...POOLS.hard];
}

function newRound(s) {
  s.base = canonical(s.queue);
  s.changed = Math.random() < 0.55;
  s.change = s.changed ? pick(poolFor(s.depth)) : null;
  s.candidate = s.changed ? applyChange(s.base, s.change) : copy(s.base);
  s.phase = 'look';
  s.phaseT = 0;
  s.looks = s.run.mods.secondLook ? 2 : 1;
}

export function drawScene(ctx, c, t) {
  room(ctx, t, { color: c.curtain, wrongTile: c.tile });
  opening(ctx, c.opening, t, { glow: 0.25 });
  queueSign(ctx, W / 2, 150, c.queue);
  clock(ctx, 112, 206, 10, c.tick ? Math.floor(t) : 0, c.clock);
  picture(ctx, 240, 236, 40, 28, { upside: c.picture === 'upside', missing: c.picture === 'gone' });
  if (c.figure) figure(ctx, 96, 400, 1.15, 0.6);
  const items = [
    { z: c.lamp.z, draw: () => { const p = floorPoint(c.lamp.x, c.lamp.z); c._lampHead = lamp(ctx, p.x, p.y, p.s * 0.7, { on: c.lamp.on, color: c.lamp.color }); } },
    { z: c.table.z, draw: () => { const p = floorPoint(c.table.x, c.table.z); const top = table(ctx, p.x, p.y, p.s * 0.8); if (c.phone !== 'gone') phone(ctx, top.x, top.y, p.s * 0.8, { offHook: c.phone === 'off' }); } },
    { z: c.chair.z, draw: () => { const p = floorPoint(c.chair.x, c.chair.z); chair(ctx, p.x, p.y, p.s * 0.8, c.chair.v); } },
  ];
  if (c.chair2) items.push({ z: c.chair2.z, draw: () => { const p = floorPoint(c.chair2.x, c.chair2.z); chair(ctx, p.x, p.y, p.s * 0.8, c.chair2.v); } });
  items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());
}

export default {
  id: 'same',
  start({ depth, run, dark, queue }) {
    const s = { depth, run, queue, right: 0, wrong: 0, t: 0, events: [], dark: dark ? 5 : 0, glitch: 0, lastTick: 0, said: null };
    newRound(s);
    return s;
  },

  lookSecs(s) { return Math.max(1.6, 4 - (s.depth - 1) * 0.25 + s.run.mods.look); },

  update(s, dt, input) {
    s.t += dt;
    s.phaseT += dt;
    s.dark = Math.max(0, s.dark - dt);
    s.glitch = Math.max(0, s.glitch - dt * 2);
    const scene = s.phase === 'judge' || s.phase === 'reveal' ? s.candidate : s.base;
    if ((s.phase === 'look' || s.phase === 'judge') && scene.tick && Math.floor(s.t) !== s.lastTick) { s.lastTick = Math.floor(s.t); s.events.push({ sfx: 'tick' }); }

    if (s.phase === 'look' && s.phaseT > this.lookSecs(s)) {
      s.looks--;
      s.phase = 'blink'; s.phaseT = 0; s.glitch = 1;
      s.events.push({ sfx: 'blink' });
    } else if (s.phase === 'blink' && s.phaseT > 0.7) {
      if (s.looks > 0) { s.phase = 'look'; s.phaseT = 0; }
      else {
        s.phase = 'judge'; s.phaseT = 0;
        if (s.candidate.musicLow) s.events.push({ semitone: true });
      }
    } else if (s.phase === 'judge') {
      const ans = input.button || (input.keys.same ? 'same' : input.keys.changed ? 'changed' : null);
      if (ans) {
        const ok = (ans === 'changed') === s.changed;
        s.events.push({ semitone: false });
        if (ok) { s.right++; s.events.push({ sfx: 'right' }); }
        else { s.wrong++; s.glitch = 0.8; s.events.push({ sfx: 'wrong' }); }
        const told = s.changed ? SAME_CHANGES_TOLD[s.change] : 'Nothing changed.';
        s.said = `${ok ? 'Yes.' : 'No.'} ${told}`;
        s.phase = 'reveal'; s.phaseT = 0;
      }
    } else if (s.phase === 'reveal' && s.phaseT > 1.6) {
      s.said = null;
      if (s.right >= 5) return 'won';
      if (s.wrong >= 2) return 'lost';
      newRound(s);
      s.events.push({ sfx: 'blink' });
      s.glitch = 0.6;
    }
    return 'playing';
  },

  timer() { return null; },

  ui(s) {
    return {
      buttons: s.phase === 'judge' ? [['same', 'SAME'], ['changed', 'CHANGED']] : [],
      status: `${s.right}/5 RIGHT · ${s.wrong}/2 WRONG`,
      caption: s.phase === 'look' ? 'LOOK' : s.phase === 'judge' ? 'SAME, OR CHANGED?' : s.said || '',
    };
  },

  draw(s, t) {
    const ctx = L.begin(0);
    if (s.phase === 'blink') {
      ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(200,190,170,0.25)';
      for (let i = 0; i < 6; i++) ctx.fillRect(0, Math.random() * H, W, 1 + Math.random() * 3);
      return L.end();
    }
    const scene = s.phase === 'judge' || s.phase === 'reveal' ? s.candidate : s.base;
    drawScene(ctx, scene, t);
    const flare = s.run.mods.light;
    L.dark(s.dark > 0 ? 0.985 : (scene.lamp.on ? 0.5 : 0.66) - flare * 0.12);
    if (s.dark <= 0) {
      const head = scene._lampHead;
      if (scene.lamp.on && head) L.hole(head.x, head.y + 20, 290 * (1 + flare * 0.3), 0.95);
      L.hole(scene.opening, 330, 70, 0.4);
    }
    L.lay();
    if (scene.lamp.on && scene._lampHead) L.glow(scene._lampHead.x, scene._lampHead.y + 8, 26, scene.lamp.color, 0.45);
    L.glow(W / 2, 158, 18, [232, 48, 42], 0.35);
    return L.end();
  },
};
