// The Same Room: look at the room, the tape blinks, then say whether anything changed.
// Four right calls wins. Two wrong calls and you are back in the Waiting Room.

import { W, H, room, floorPoint, opening, lamp, chair, table, phone, clock, picture, queueSign, figure } from '../scenery.js';
import * as L from '../light.js';
import { SAME_CHANGES_TOLD } from '../config.js';

const pick = (a) => a[Math.floor(Math.random() * a.length)];
const WARM = [255, 228, 186];
export const RIGHT_TO_WIN = 4;
export const WRONG_TO_LOSE = 2;

const POOLS = {
  easy: ['chairTurned', 'chairMoved', 'lampOff', 'pictureGone', 'phoneGone', 'extraChair', 'figure', 'tableMoved', 'openingSide', 'lampColour'],
  medium: ['pictureUpside', 'phoneOff', 'clockTime', 'queue', 'lampMoved'],
  hard: ['clockBack', 'tile', 'curtain', 'musicLow', 'tickStop'],
};

// Where each kind of change happens, so the reveal can circle it.
const SPOT_OF = {
  chairTurned: 'chair', chairMoved: 'chair', extraChair: 'chair2', lampOff: 'lamp', lampColour: 'lamp', lampMoved: 'lamp',
  pictureGone: 'picture', pictureUpside: 'picture', phoneGone: 'table', phoneOff: 'table', tableMoved: 'table',
  figure: 'figure', openingSide: 'opening', clockTime: 'clock', clockBack: 'clock', queue: 'sign', tile: 'tile',
};

export function canonical(queue) {
  return {
    chair: { x: 0.36, z: 0.54, v: pick(['front', 'side', 'back']) },
    chair2: null,
    lamp: { x: -0.5, z: 0.5, on: true, color: WARM },
    table: { x: -0.1, z: 0.46 },
    phone: 'on', clock: { back: false, offset: Math.floor(Math.random() * 12) },
    picture: 'ok', opening: 180, queue, figure: false, curtain: 'red', tile: null, musicLow: false, tick: true,
  };
}

const copy = (c) => JSON.parse(JSON.stringify(c));

export function applyChange(c, key) {
  const n = copy(c);
  switch (key) {
    case 'chairTurned': n.chair.v = pick(['front', 'side', 'back'].filter((v) => v !== c.chair.v)); break;
    case 'chairMoved': n.chair.x = c.chair.x > 0.2 ? 0.06 : 0.36; break;
    case 'lampOff': n.lamp.on = false; break;
    case 'lampColour': n.lamp.color = pick([[150, 210, 255], [190, 255, 160], [255, 140, 140]]); break;
    case 'lampMoved': n.lamp.x = 0.58; break;
    case 'pictureGone': n.picture = 'gone'; break;
    case 'pictureUpside': n.picture = 'upside'; break;
    case 'phoneGone': n.phone = 'gone'; break;
    case 'phoneOff': n.phone = 'off'; break;
    case 'extraChair': n.chair2 = { x: -0.46, z: 0.72, v: 'side' }; break;
    case 'figure': n.figure = true; break;
    case 'tableMoved': n.table.x = 0.14; break;
    case 'openingSide': n.opening = 248; break;
    case 'clockTime': n.clock.offset = (c.clock.offset + 4) % 12; break;
    case 'clockBack': n.clock.back = true; break;
    case 'queue': n.queue = (c.queue + 3) % 100; break;
    case 'tile': n.tile = { x: Math.floor(Math.random() * 6) - 3, z: 1 + Math.floor(Math.random() * 3) }; break;
    case 'curtain': n.curtain = 'maroon'; break;
    case 'musicLow': n.musicLow = true; break;
    case 'tickStop': n.tick = false; break;
    default: break;
  }
  return n;
}

// Easy changes only for the first four rooms; subtle ones come in late.
export function poolFor(depth) {
  if (depth <= 4) return POOLS.easy;
  if (depth <= 6) return [...POOLS.easy, ...POOLS.medium];
  return [...POOLS.easy, ...POOLS.medium, ...POOLS.hard];
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
  opening(ctx, c.opening, t, { glow: 0.3 });
  queueSign(ctx, W / 2, 150, c.queue);
  clock(ctx, 112, 206, 13, c.tick ? Math.floor(t) : 0, c.clock);
  picture(ctx, 242, 238, 48, 34, { upside: c.picture === 'upside', missing: c.picture === 'gone' });
  if (c.figure) figure(ctx, 96, 400, 1.2, 0.6);
  const spots = {
    sign: { x: W / 2, y: 156, r: 30 }, clock: { x: 112, y: 206, r: 22 }, picture: { x: 242, y: 238, r: 36 },
    figure: { x: 96, y: 360, r: 46 }, opening: { x: c.opening, y: 300, r: 60 },
  };
  if (c.tile) { const p = floorPoint(c.tile.x * 0.125 + 0.0625, 1 - c.tile.z * 0.125 - 0.0625); spots.tile = { x: p.x, y: p.y, r: 30 }; }
  const items = [
    { z: c.lamp.z, draw: () => {
      const p = floorPoint(c.lamp.x, c.lamp.z);
      c._lampHead = lamp(ctx, p.x, p.y, p.s * 0.7, { on: c.lamp.on, color: c.lamp.color });
      spots.lamp = { x: p.x, y: c._lampHead.y + 20, r: 44 * p.s * 0.7 };
    } },
    { z: c.table.z, draw: () => {
      const p = floorPoint(c.table.x, c.table.z);
      const sc = p.s * 0.8;
      const top = table(ctx, p.x, p.y, sc);
      if (c.phone !== 'gone') phone(ctx, top.x, top.y, sc, { offHook: c.phone === 'off' });
      spots.table = { x: p.x, y: top.y + 8 * sc, r: 30 * sc };
    } },
    { z: c.chair.z, draw: () => {
      const p = floorPoint(c.chair.x, c.chair.z);
      const sc = p.s * 0.8;
      chair(ctx, p.x, p.y, sc, c.chair.v);
      spots.chair = { x: p.x, y: p.y - 30 * sc, r: 38 * sc };
    } },
  ];
  if (c.chair2) items.push({ z: c.chair2.z, draw: () => {
    const p = floorPoint(c.chair2.x, c.chair2.z);
    const sc = p.s * 0.8;
    chair(ctx, p.x, p.y, sc, c.chair2.v);
    spots.chair2 = { x: p.x, y: p.y - 30 * sc, r: 38 * sc };
  } });
  items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());
  c._spots = spots;
}

export default {
  id: 'same',
  start({ depth, run, dark, queue }) {
    const s = { depth, run, queue, right: 0, wrong: 0, t: 0, events: [], dark: dark ? 5 : 0, glitch: 0, lastTick: 0, said: null, soft: true };
    newRound(s);
    return s;
  },

  lookSecs(s) { return Math.max(2.5, 5 - (s.depth - 1) * 0.25 + s.run.mods.look); },

  update(s, dt, input) {
    s.t += dt;
    s.phaseT += dt;
    s.dark = Math.max(0, s.dark - dt);
    s.glitch = Math.max(0, s.glitch - dt * 2);
    s.soft = s.phase !== 'blink';
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
    } else if (s.phase === 'reveal' && s.phaseT > 2) {
      s.said = null;
      if (s.right >= RIGHT_TO_WIN) return 'won';
      if (s.wrong >= WRONG_TO_LOSE) return 'lost';
      newRound(s);
      s.events.push({ sfx: 'blink' });
      s.glitch = 0.6;
    }
    return 'playing';
  },

  timer() { return null; },

  status(s) { return `${s.right}/${RIGHT_TO_WIN} RIGHT · ${s.wrong}/${WRONG_TO_LOSE} WRONG`; },

  ui(s) {
    return {
      buttons: s.phase === 'judge' ? [['same', 'SAME'], ['changed', 'CHANGED']] : [],
      caption: s.phase === 'look' ? `LOOK${s.looks > 1 ? ' (1 OF 2)' : ''}` : s.phase === 'judge' ? 'SAME, OR CHANGED?' : s.said || '',
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
    L.dark(s.dark > 0 ? 0.985 : (scene.lamp.on ? 0.24 : 0.42) - flare * 0.1);
    if (s.dark <= 0) {
      const head = scene._lampHead;
      if (scene.lamp.on && head) L.hole(head.x, head.y + 30, 380 * (1 + flare * 0.3), 0.95);
      L.hole(scene.opening, 330, 170, 0.6);
      L.hole(W / 2, 520, 220, 0.4);
    }
    L.lay();
    if (scene.lamp.on && scene._lampHead) L.glow(scene._lampHead.x, scene._lampHead.y + 8, 30, scene.lamp.color, 0.45);
    L.glow(W / 2, 158, 20, [232, 48, 42], 0.35);
    // after an answer, circle what changed
    if (s.phase === 'reveal' && s.changed && SPOT_OF[s.change]) {
      const sp = scene._spots[SPOT_OF[s.change]];
      if (sp) {
        const pulse = 1 + Math.sin(t * 6) * 0.06;
        ctx.strokeStyle = 'rgba(255,244,220,0.9)'; ctx.lineWidth = 2.5; ctx.setLineDash([6, 5]);
        ctx.beginPath(); ctx.arc(sp.x, sp.y, Math.max(18, sp.r) * pulse, 0, Math.PI * 2); ctx.stroke();
        ctx.setLineDash([]);
      }
    }
    return L.end();
  },
};
