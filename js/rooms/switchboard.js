// The Switchboard: Lights Out. Tapping a bulb flips it and its four neighbours.
// Turn them all off before the lamp in the corner burns out.

import { W, H, room, lamp } from '../scenery.js';
import * as L from '../light.js';
import { timerSecs } from '../run.js';

// Generated backwards from a dark board, so every puzzle can be solved.
// `solution` holds the taps that would solve it from here; a player's tap flips its own entry.
export function generate(n, depth) {
  const size = n * n;
  for (;;) {
    const board = new Array(size).fill(0);
    const solution = new Array(size).fill(0);
    // few lit bulbs to start: 2 to 4 on a 3 x 3 board, 4 to 6 on a 4 x 4
    const k = Math.min(size - 1, n === 3 ? 2 + Math.floor(depth / 2) : 4 + Math.floor((depth - 4) / 2));
    const cells = [...Array(size).keys()].sort(() => Math.random() - 0.5).slice(0, k);
    for (const i of cells) { press(board, n, i); solution[i] ^= 1; }
    if (board.some((v) => v)) return { board, solution };
  }
}

export function press(board, n, i) {
  const r = Math.floor(i / n), c = i % n;
  const flip = (rr, cc) => { if (rr >= 0 && rr < n && cc >= 0 && cc < n) board[rr * n + cc] ^= 1; };
  flip(r, c); flip(r - 1, c); flip(r + 1, c); flip(r, c - 1); flip(r, c + 1);
}

function layout(n) {
  const cell = Math.min(62, 260 / n);
  const size = cell * n;
  return { cell, x: W / 2 - size / 2, y: 330 - size / 2, size };
}

export default {
  id: 'switchboard',
  start({ depth, run, dark }) {
    const n = depth <= 4 ? 3 : 4;
    const { board, solution } = generate(n, depth);
    const total = timerSecs(run, 120);
    return { n, board, solution, total, left: total, t: 0, done: 0, warned: false, events: [], run, dark: dark ? 5 : 0, flash: new Array(n * n).fill(0), soft: true };
  },

  update(s, dt, input) {
    s.t += dt;
    s.dark = Math.max(0, s.dark - dt);
    for (let i = 0; i < s.flash.length; i++) s.flash[i] = Math.max(0, s.flash[i] - dt * 3);
    if (s.done) { s.done += dt; return s.done > 0.9 ? 'won' : 'playing'; }
    s.left -= dt;
    if (!s.warned && s.left < s.total * 0.25) { s.warned = true; s.events.push({ warn: true }); }
    if (s.left <= 0) return 'lost';
    const g = layout(s.n);
    for (const tap of input.taps) {
      const c = Math.floor((tap.x - g.x) / g.cell), r = Math.floor((tap.y - g.y) / g.cell);
      if (c < 0 || r < 0 || c >= s.n || r >= s.n) continue;
      const i = r * s.n + c;
      press(s.board, s.n, i);
      s.solution[i] ^= 1;
      s.flash[i] = 1;
      s.events.push({ sfx: 'switch', x: tap.x });
      if (!s.board.some((v) => v)) { s.done = 0.001; s.events.push({ sfx: 'power' }); }
    }
    return 'playing';
  },

  timer(s) { return 1 - s.left / s.total; },

  status(s) { return `LIT ${s.board.filter((v) => v).length}`; },

  draw(s, t, opts) {
    const ctx = L.begin(0);
    const p = Math.min(1, 1 - s.left / s.total);
    room(ctx, t);
    ctx.fillStyle = 'rgba(0,0,0,0.45)'; ctx.fillRect(0, 0, W, H);
    const g = layout(s.n);
    // the panel: bakelite, screwed to a board
    ctx.fillStyle = '#1e1310'; ctx.fillRect(g.x - 22, g.y - 34, g.size + 44, g.size + 56);
    ctx.fillStyle = '#2f1d15'; ctx.fillRect(g.x - 16, g.y - 28, g.size + 32, g.size + 44);
    ctx.fillStyle = '#7c6a52';
    for (const [dx, dy] of [[-10, -22], [g.size + 8, -22], [-10, g.size + 12], [g.size + 8, g.size + 12]]) ctx.fillRect(g.x + dx, g.y + dy, 3, 3);
    ctx.fillStyle = '#c9b48a'; ctx.fillRect(g.x + g.size / 2 - 26, g.y - 24, 52, 9);
    ctx.fillStyle = '#2a1a10'; ctx.font = '7px monospace'; ctx.textAlign = 'center'; ctx.fillText('MAINS', g.x + g.size / 2, g.y - 17);
    const hint = s.run.mods.hint ? s.solution.findIndex((v) => v) : -1;
    for (let i = 0; i < s.n * s.n; i++) {
      const cx = g.x + (i % s.n + 0.5) * g.cell, cy = g.y + (Math.floor(i / s.n) + 0.5) * g.cell;
      const rr = g.cell * 0.28;
      ctx.fillStyle = '#120b08'; ctx.beginPath(); ctx.arc(cx, cy, rr + 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = s.board[i] ? '#ffd79a' : '#3a302a';
      ctx.beginPath(); ctx.arc(cx, cy, rr, 0, Math.PI * 2); ctx.fill();
      if (i === hint && !s.done) { ctx.strokeStyle = 'rgba(232,224,202,0.8)'; ctx.lineWidth = 1.5; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.arc(cx, cy, rr + 8, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); }
    }
    // the lamp in the corner, burning down
    const lp = lamp(ctx, 46, 612, 1.05, { on: p < 1, color: [255, 220 - p * 80, 170 - p * 100] });

    const flare = s.run.mods.light;
    L.dark(s.dark > 0 ? 0.985 : 0.55 + p * 0.38 - flare * 0.12);
    if (s.dark <= 0) {
      L.hole(lp.x, lp.y, 300 * (1 - p * 0.75) * (1 + flare * 0.3), 0.95);
      for (let i = 0; i < s.n * s.n; i++) if (s.board[i]) L.hole(g.x + (i % s.n + 0.5) * g.cell, g.y + (Math.floor(i / s.n) + 0.5) * g.cell, g.cell * 0.9, 0.7);
    }
    L.lay();
    for (let i = 0; i < s.n * s.n; i++) {
      const cx = g.x + (i % s.n + 0.5) * g.cell, cy = g.y + (Math.floor(i / s.n) + 0.5) * g.cell;
      if (s.board[i]) L.glow(cx, cy, g.cell * 0.55, [255, 200, 130], 0.5);
      if (s.flash[i]) L.glow(cx, cy, g.cell * 0.7, [255, 240, 220], s.flash[i] * 0.4);
    }
    if (p < 1 && s.dark <= 0) L.glow(lp.x, lp.y, 30 * (1 - p * 0.6), [255, 210, 150], 0.5 * (1 - p * 0.5));
    return L.end();
  },
};

