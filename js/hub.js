// The Waiting Room: the hub you return to between rooms, and the Last Curtain,
// where the Waiting Room itself has one thing wrong in it.

import { W, H, room, floorPoint, opening, lamp, chair, table, cassette, queueSign, figure } from './scenery.js';
import * as L from './light.js';

const WARM = [255, 228, 186];
const pick = (a) => a[Math.floor(Math.random() * a.length)];

export function openingsX(n) {
  return n >= 3 ? [104, 180, 256] : [118, 242];
}

export function newHub(run) {
  return { run, mode: 'choose', curtains: [], t: 0, puff: 0, puffTimer: 9, wrong: null, hits: {}, opened: 0, openAt: null, visits: 0 };
}

// The room drifts the deeper you are: the lamp edges towards the curtains, the chair turns round.
function layout(h) {
  const d = Math.min(7, h.run.cleared + 1);
  const c = {
    lamp: { x: -0.72, z: 0.56 + d * 0.035, color: WARM },
    chair: { x: 0.44, z: 0.74, v: d >= 5 ? 'front' : ['back', 'side', 'back', 'side'][h.visits % 4] },
    table: { x: -0.3, z: 0.5 },
    cassette: true, figure: false, tile: null, signText: null, chairUpside: false,
    ghostCurtain: d >= 5,
  };
  if (h.mode === 'last' && h.wrong) {
    switch (h.wrong) {
      case 'lampColour': c.lamp.color = [160, 215, 255]; break;
      case 'lampMoved': c.lamp.x = 0.78; break;
      case 'chairUpside': c.chairUpside = true; break;
      case 'tableMoved': c.table.x = 0.1; break;
      case 'cassette': c.cassette = false; break;
      case 'figure': c.figure = true; break;
      case 'tile': c.tile = { x: 2, z: 2 }; break;
      case 'sign': c.signText = 88; break;
      default: break;
    }
  }
  return c;
}

export const WRONGS = ['lampColour', 'lampMoved', 'chairUpside', 'tableMoved', 'cassette', 'figure', 'tile', 'sign'];
const TARGET_OF = { lampColour: 'lamp', lampMoved: 'lamp', chairUpside: 'chair', tableMoved: 'table', cassette: 'table', figure: 'figure', tile: 'tile', sign: 'sign' };

export function startLast(h) {
  h.mode = 'last';
  h.wrong = pick(WRONGS.filter((w) => w !== h.wrong));
}

// In the Last Curtain: what did the tap land on? Returns 'right', 'wrong' or null.
export function tapLast(h, x, y) {
  let hitName = null;
  for (const [name, r] of Object.entries(h.hits)) {
    if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) { hitName = name; break; }
  }
  if (!hitName) return null;
  if (hitName === TARGET_OF[h.wrong]) { h.opened = 0.001; h.openAt = { x, y }; return 'right'; }
  return 'wrong';
}

export function update(h, dt) {
  h.t += dt;
  h.puffTimer -= dt;
  if (h.puffTimer <= 0) { h.puffTimer = 8 + Math.random() * 10; h.puff = 1; }
  h.puff = Math.max(0, h.puff - dt * 0.8);
  if (h.opened) h.opened += dt;
}

export function draw(h, t, { queue }) {
  const ctx = L.begin(0);
  const c = layout(h);
  room(ctx, t, { wrongTile: c.tile });
  const xs = h.mode === 'choose' ? openingsX(h.curtains.length) : [];
  xs.forEach((x, i) => opening(ctx, x, t + i, { glow: 0.55, open: i === 0 ? h.puff * 0.25 : 0 }));
  if (c.ghostCurtain && h.mode === 'choose' && xs.length < 3) opening(ctx, 180, t, { glow: 0.1 });
  const signY = 150;
  queueSign(ctx, W / 2, signY, c.signText ?? queue);
  h.hits = { sign: { x: W / 2 - 22, y: signY - 8, w: 44, h: 28 } };
  if (c.figure) { figure(ctx, 86, 400, 1.15, 0.6); h.hits.figure = { x: 66, y: 320, w: 40, h: 84 }; }
  if (c.tile) { const p = floorPoint(c.tile.x * 0.125 + 0.06, 1 - c.tile.z * 0.125 - 0.06); h.hits.tile = { x: p.x - 18, y: p.y - 12, w: 36, h: 24 }; }

  let lampHead = null;
  const items = [
    { z: c.lamp.z, draw: () => {
      const p = floorPoint(c.lamp.x, c.lamp.z);
      lampHead = lamp(ctx, p.x, p.y, p.s * 0.72, { color: c.lamp.color });
      h.hits.lamp = { x: p.x - 22 * p.s, y: lampHead.y - 18 * p.s, w: 44 * p.s, h: p.y - lampHead.y + 22 * p.s };
    } },
    { z: c.table.z, draw: () => {
      const p = floorPoint(c.table.x, c.table.z);
      const top = table(ctx, p.x, p.y, p.s * 0.8);
      if (c.cassette) cassette(ctx, top.x, top.y, p.s * 0.8, t, true);
      h.hits.table = { x: p.x - 20 * p.s, y: top.y - 14 * p.s, w: 40 * p.s, h: p.y - top.y + 16 * p.s };
    } },
    { z: c.chair.z, draw: () => {
      const p = floorPoint(c.chair.x, c.chair.z);
      chair(ctx, p.x, p.y, p.s * 0.8, c.chairUpside ? 'upside' : c.chair.v);
      h.hits.chair = { x: p.x - 18 * p.s, y: p.y - 66 * p.s, w: 36 * p.s, h: 70 * p.s };
    } },
  ];
  items.sort((a, b) => b.z - a.z).forEach((i) => i.draw());

  // light: the lamp, the gaps in the curtains, the sign
  const flare = h.run.mods.light;
  const opening_ = h.opened ? Math.min(1, h.opened / 1.6) : 0;
  L.dark(Math.max(0, 0.46 - flare * 0.1 - opening_ * 0.5));
  if (lampHead) L.hole(lampHead.x, lampHead.y + 24, 300 * (1 + flare * 0.25), 0.95);
  for (const x of xs) L.hole(x, 330, 80, 0.5);
  L.hole(W / 2, signY + 6, 50, 0.4);
  if (h.openAt) L.hole(h.openAt.x, h.openAt.y, 80 + opening_ * 700, 1);
  L.lay();
  if (lampHead) L.glow(lampHead.x, lampHead.y + 8, 28, c.lamp.color, 0.45);
  L.glow(W / 2, signY + 6, 22, [232, 48, 42], 0.35);
  for (const x of xs) L.glow(x, 300, 30, [255, 200, 170], 0.08);
  if (h.openAt && opening_ > 0) {
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = `rgba(255,248,236,${opening_ * 0.85})`; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
  }
  return { canvas: L.end(), openings: xs };
}
