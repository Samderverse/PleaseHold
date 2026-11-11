// The look of the place, all drawn in code: red curtains, a checkerboard floor in
// one-point perspective, and the furniture. Everything uses the logical 360 x 640 space.

export const W = 360;
export const H = 640;

// ---------- the room's geometry ----------
// The back wall spans x 60..300, y 140..400. Lines run to a vanishing point at (180, 250).
export const ROOM = { vx: 180, vy: 250, backL: 60, backR: 300, backT: 140, backB: 400 };

// A point on the floor: xw across (-1 and 1 are the side walls), zw depth (1 is the back wall).
export function floorPoint(xw, zw) {
  return { x: ROOM.vx + xw * (ROOM.backR - ROOM.vx) / zw, y: ROOM.vy + (ROOM.backB - ROOM.vy) / zw, s: 1 / zw };
}
// How tall the room is, in screen pixels, at a given depth.
export const roomHeight = (zw) => (ROOM.backB - ROOM.backT) / zw;

// ---------- curtain texture ----------

const tex = {};
function curtainTexture(color) {
  if (tex[color]) return tex[color];
  const base = { red: [150, 16, 22], deep: [112, 10, 18], maroon: [118, 22, 40], wrong: [140, 30, 18] }[color] || [150, 16, 22];
  const c = document.createElement('canvas');
  c.width = 180; c.height = 200;
  const x = c.getContext('2d');
  const img = x.createImageData(180, 200);
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const phase = Array.from({ length: 12 }, () => rnd() * 0.8);
  for (let px = 0; px < 180; px++) {
    // folds: an uneven cosine so some are deep and some are shallow
    const k = px / 180 * 12;
    const fold = Math.floor(k);
    const u = k - fold;
    const ph = phase[fold % 12];
    let b = 0.5 + 0.5 * Math.cos((u + ph) * Math.PI * 2);
    b = Math.pow(b, 1.6);
    const hi = Math.max(0, Math.cos((u + ph - 0.08) * Math.PI * 2)) ** 18 * 0.35;
    for (let py = 0; py < 200; py++) {
      const v = py / 200;
      const shade = (0.28 + 0.72 * b) * (1.05 - v * 0.35) + hi;
      const n = (rnd() - 0.5) * 0.05;
      const i = (py * 180 + px) * 4;
      img.data[i] = Math.min(255, base[0] * (shade + n) + hi * 120);
      img.data[i + 1] = Math.min(255, base[1] * (shade + n) + hi * 40);
      img.data[i + 2] = Math.min(255, base[2] * (shade + n) + hi * 40);
      img.data[i + 3] = 255;
    }
  }
  x.putImageData(img, 0, 0);
  tex[color] = c;
  return c;
}

// Curtains hanging in a rectangle, swaying slightly as if air moves that you cannot feel.
export function curtain(ctx, x, y, w, h, t, { color = 'red', sway = 1, bands = 22, shade = 0 } = {}) {
  const T = curtainTexture(color);
  const bh = h / bands;
  for (let i = 0; i < bands; i++) {
    const v = i / bands;
    const off = Math.sin(t * 0.55 + v * 3.2) * 2.2 * sway * v + Math.sin(t * 1.3 + v * 7) * 0.6 * sway * v;
    ctx.drawImage(T, 0, (i / bands) * 200, 180, 200 / bands + 0.5, x + off, y + i * bh, w, bh + 0.6);
  }
  if (shade) { ctx.fillStyle = `rgba(0,0,0,${shade})`; ctx.fillRect(x, y, w, h); }
}

// A wall of curtain inside a four-sided shape (used for the side walls).
function curtainQuad(ctx, pts, t, opts) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (const p of pts.slice(1)) ctx.lineTo(p[0], p[1]);
  ctx.closePath();
  ctx.clip();
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  curtain(ctx, x0, y0, x1 - x0, y1 - y0, t, opts);
  ctx.restore();
}

// ---------- the floor ----------

export function checkerFloor(ctx, { dim = 0, wrongTile = null } = {}) {
  const { vx, vy, backR, backB } = ROOM;
  const half = backR - vx;
  const step = 0.125;
  for (let zi = 0; zi < 6; zi++) {
    const z0 = 1 - zi * step, z1 = 1 - (zi + 1) * step;
    if (z1 <= 0.2) break;
    for (let xi = -24; xi < 24; xi++) {
      const xa = xi * step, xb = (xi + 1) * step;
      const p = [
        [vx + xa * half / z0, vy + (backB - vy) / z0], [vx + xb * half / z0, vy + (backB - vy) / z0],
        [vx + xb * half / z1, vy + (backB - vy) / z1], [vx + xa * half / z1, vy + (backB - vy) / z1],
      ];
      if (p[1][0] < -40 || p[0][0] > W + 40) continue;
      const white = (xi + zi) % 2 === 0;
      const far = 1 - zi / 6;
      let col = white ? 214 - far * 70 : 16;
      let fill = `rgb(${col},${col - 4},${col - 10})`;
      if (wrongTile && wrongTile.x === xi && wrongTile.z === zi) fill = white ? 'rgb(190,40,40)' : 'rgb(90,10,12)';
      ctx.fillStyle = fill;
      ctx.beginPath(); ctx.moveTo(p[0][0], p[0][1]);
      for (const q of p.slice(1)) ctx.lineTo(q[0], q[1]);
      ctx.closePath(); ctx.fill();
    }
  }
  if (dim) { ctx.fillStyle = `rgba(0,0,0,${dim})`; ctx.fillRect(0, backB, W, H - backB); }
}

// The whole room: ceiling, curtained walls, checkerboard floor.
export function room(ctx, t, { color = 'red', wrongTile = null } = {}) {
  const { vx, vy, backL, backR, backT, backB } = ROOM;
  ctx.fillStyle = '#0b0607';
  ctx.fillRect(0, 0, W, H);
  // ceiling
  ctx.fillStyle = '#120809';
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, 0); ctx.lineTo(W, 85); ctx.lineTo(backR, backT); ctx.lineTo(backL, backT); ctx.lineTo(0, 85); ctx.closePath(); ctx.fill();
  // side walls and back wall
  const yl = vy + (backB - vy) * (vx / (vx - backL));
  curtainQuad(ctx, [[0, 85], [backL, backT], [backL, backB], [0, yl]], t, { color, shade: 0.35, bands: 16 });
  curtainQuad(ctx, [[W, 85], [backR, backT], [backR, backB], [W, yl]], t + 1.7, { color, shade: 0.35, bands: 16 });
  curtain(ctx, backL, backT, backR - backL, backB - backT, t + 0.8, { color, bands: 24 });
  // a curtain rail along the top of the back wall
  ctx.fillStyle = '#2a1a12'; ctx.fillRect(backL, backT - 2, backR - backL, 3);
  checkerFloor(ctx, { wrongTile });
  // where the walls meet the floor
  ctx.strokeStyle = 'rgba(0,0,0,0.6)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(backL, backB); ctx.lineTo(backR, backB); ctx.moveTo(backL, backB); ctx.lineTo(0, yl); ctx.moveTo(backR, backB); ctx.lineTo(W, yl); ctx.stroke();
}

// A gap where the curtains part, with a faint light from behind.
export function opening(ctx, cx, t, { glow = 0.5, open = 0 } = {}) {
  const { backT, backB } = ROOM;
  const w = 16 + open * 40;
  const top = backT + 34;
  const g = ctx.createLinearGradient(0, top, 0, backB);
  g.addColorStop(0, `rgba(30,20,18,1)`);
  g.addColorStop(1, `rgba(${40 + glow * 90},${30 + glow * 50},${26 + glow * 30},1)`);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(cx, top);
  ctx.quadraticCurveTo(cx - w / 2 - 4, top + 120, cx - w / 2, backB);
  ctx.lineTo(cx + w / 2, backB);
  ctx.quadraticCurveTo(cx + w / 2 + 4, top + 120, cx, top);
  ctx.fill();
  // the parted edges catch the light
  ctx.strokeStyle = `rgba(230,80,70,${0.25 + glow * 0.25})`; ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(cx, top); ctx.quadraticCurveTo(cx - w / 2 - 4, top + 120, cx - w / 2, backB);
  ctx.moveTo(cx, top); ctx.quadraticCurveTo(cx + w / 2 + 4, top + 120, cx + w / 2, backB);
  ctx.stroke();
}

// ---------- furniture ----------

export function lamp(ctx, x, y, s, { on = true, color = [255, 236, 200] } = {}) {
  const h = 150 * s;
  ctx.fillStyle = '#1a1210';
  ctx.fillRect(x - 10 * s, y - 3 * s, 20 * s, 3 * s);
  ctx.fillRect(x - 1.2 * s, y - h, 2.4 * s, h);
  // fabric shade
  ctx.fillStyle = on ? `rgb(${color[0] * 0.9 | 0},${color[1] * 0.8 | 0},${color[2] * 0.62 | 0})` : '#3a2a22';
  ctx.beginPath();
  ctx.moveTo(x - 10 * s, y - h - 2 * s); ctx.lineTo(x + 10 * s, y - h - 2 * s);
  ctx.lineTo(x + 18 * s, y - h + 20 * s); ctx.lineTo(x - 18 * s, y - h + 20 * s); ctx.closePath(); ctx.fill();
  ctx.fillStyle = 'rgba(0,0,0,0.25)';
  ctx.fillRect(x - 18 * s, y - h + 17 * s, 36 * s, 3 * s);
  return { x, y: y - h + 10 * s };
}

// variant: 'front', 'back', 'side', 'upside'
export function chair(ctx, x, y, s, variant = 'front') {
  ctx.save();
  ctx.translate(x, y);
  if (variant === 'upside') { ctx.translate(0, -60 * s); ctx.scale(1, -1); }
  const wood = '#3b2416', dark = '#22140c';
  const seatY = -26 * s, seatW = 26 * s;
  const legs = () => {
    ctx.fillStyle = dark;
    ctx.fillRect(-seatW / 2, seatY, 2.4 * s, 26 * s); ctx.fillRect(seatW / 2 - 2.4 * s, seatY, 2.4 * s, 26 * s);
  };
  const back = () => {
    ctx.fillStyle = wood;
    ctx.fillRect(-seatW / 2, seatY - 34 * s, 2.6 * s, 34 * s); ctx.fillRect(seatW / 2 - 2.6 * s, seatY - 34 * s, 2.6 * s, 34 * s);
    ctx.fillRect(-seatW / 2, seatY - 34 * s, seatW, 5 * s); ctx.fillRect(-seatW / 2, seatY - 22 * s, seatW, 3 * s);
  };
  const seat = () => { ctx.fillStyle = '#4a2c1a'; ctx.fillRect(-seatW / 2 - 1 * s, seatY, seatW + 2 * s, 4 * s); };
  if (variant === 'side') {
    ctx.fillStyle = dark;
    ctx.fillRect(-11 * s, seatY, 2.4 * s, 26 * s); ctx.fillRect(9 * s, seatY, 2.4 * s, 26 * s);
    ctx.fillStyle = '#4a2c1a'; ctx.fillRect(-12 * s, seatY, 24 * s, 4 * s);
    ctx.fillStyle = wood; ctx.fillRect(9 * s, seatY - 36 * s, 3 * s, 36 * s);
  } else if (variant === 'back') {
    legs(); seat(); back();
  } else {
    back(); legs(); seat();
  }
  ctx.restore();
}

export function table(ctx, x, y, s) {
  ctx.fillStyle = '#22140c';
  ctx.fillRect(x - 14 * s, y - 30 * s, 2.4 * s, 30 * s); ctx.fillRect(x + 12 * s, y - 30 * s, 2.4 * s, 30 * s);
  ctx.fillStyle = '#3b2416'; ctx.fillRect(x - 17 * s, y - 33 * s, 34 * s, 4 * s);
  return { x, y: y - 33 * s };
}

export function cassette(ctx, x, y, s, t, playing = true) {
  ctx.fillStyle = '#151312'; ctx.fillRect(x - 13 * s, y - 11 * s, 26 * s, 11 * s);
  ctx.fillStyle = '#3a3632'; ctx.fillRect(x - 10 * s, y - 9 * s, 20 * s, 6 * s);
  for (const dx of [-5, 5]) {
    ctx.save(); ctx.translate(x + dx * s, y - 6 * s); ctx.rotate(playing ? t * 3 : 0);
    ctx.fillStyle = '#d6ccb4'; ctx.fillRect(-1.6 * s, -1.6 * s, 3.2 * s, 3.2 * s);
    ctx.restore();
  }
  ctx.fillStyle = playing ? '#e0402a' : '#3a1210'; ctx.fillRect(x + 9 * s, y - 10 * s, 1.6 * s, 1.6 * s);
}

// A seven-segment number on the back wall: the queue.
const SEG = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg', '-': 'g' };
export function sevenSeg(ctx, x, y, text, { size = 8, color = '#e8302a', off = 'rgba(60,10,10,0.6)', mirror = false } = {}) {
  const w = size * 0.6, h = size, th = Math.max(1, size * 0.14);
  const chars = String(text).split('');
  if (mirror) chars.reverse();
  chars.forEach((ch, i) => {
    const ox = x + i * (w + size * 0.35);
    const on = SEG[ch] || '';
    const seg = {
      a: [ox, y, w, th], b: [ox + w - th, y, th, h / 2], c: [ox + w - th, y + h / 2, th, h / 2],
      d: [ox, y + h - th, w, th], e: [ox, y + h / 2, th, h / 2], f: [ox, y, th, h / 2], g: [ox, y + h / 2 - th / 2, w, th],
    };
    for (const [k, r] of Object.entries(seg)) {
      ctx.fillStyle = on.includes(k) ? color : off;
      if (mirror) ctx.fillRect(2 * x + chars.length * (w + size * 0.35) - r[0] - r[2] - size * 0.35, r[1], r[2], r[3]);
      else ctx.fillRect(r[0], r[1], r[2], r[3]);
    }
  });
}

export function queueSign(ctx, cx, y, n, opts = {}) {
  const text = String(n).padStart(2, '0');
  ctx.fillStyle = '#060404'; ctx.fillRect(cx - 18, y - 4, 36, 20);
  ctx.strokeStyle = '#2a1a14'; ctx.lineWidth = 1.5; ctx.strokeRect(cx - 18, y - 4, 36, 20);
  sevenSeg(ctx, cx - 11, y, text, { size: 12, ...opts });
}

export function clock(ctx, x, y, r, t, { backwards = false, offset = 0 } = {}) {
  ctx.fillStyle = '#e6dcc4'; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#2a1c12'; ctx.lineWidth = r * 0.16; ctx.stroke();
  const dir = backwards ? -1 : 1;
  const sec = t * dir;
  const hand = (a, len, wdt) => {
    ctx.strokeStyle = '#1a1210'; ctx.lineWidth = wdt;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(a) * len, y - Math.cos(a) * len); ctx.stroke();
  };
  hand((3.3 + offset) * Math.PI / 6, r * 0.5, r * 0.14);
  hand((8 + offset * 2) * Math.PI / 30, r * 0.75, r * 0.1);
  ctx.strokeStyle = '#a0281e'; ctx.lineWidth = 0.6;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.sin(sec * Math.PI / 30) * r * 0.85, y - Math.cos(sec * Math.PI / 30) * r * 0.85); ctx.stroke();
}

export function picture(ctx, x, y, w, h, { upside = false, missing = false } = {}) {
  if (missing) { ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(x - w / 2, y - h / 2, w, h); return; }
  ctx.fillStyle = '#3a2a16'; ctx.fillRect(x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4);
  ctx.fillStyle = '#c7bca0'; ctx.fillRect(x - w / 2, y - h / 2, w, h);
  // a landscape: hills, a house, a pale sky. Upside down when it is wrong.
  ctx.save();
  ctx.translate(x, y);
  if (upside) ctx.scale(1, -1);
  ctx.fillStyle = '#8ea0a6'; ctx.fillRect(-w / 2, -h / 2, w, h * 0.55);
  ctx.fillStyle = '#4c5c3a'; ctx.beginPath(); ctx.moveTo(-w / 2, h * 0.1); ctx.quadraticCurveTo(0, -h * 0.25, w / 2, h * 0.05); ctx.lineTo(w / 2, h / 2); ctx.lineTo(-w / 2, h / 2); ctx.fill();
  ctx.fillStyle = '#e6dcc4'; ctx.fillRect(w * 0.1, -h * 0.05, w * 0.18, h * 0.16);
  ctx.fillStyle = '#5a2418'; ctx.beginPath(); ctx.moveTo(w * 0.08, -h * 0.05); ctx.lineTo(w * 0.19, -h * 0.17); ctx.lineTo(w * 0.3, -h * 0.05); ctx.fill();
  ctx.restore();
}

export function phone(ctx, x, y, s, { offHook = false } = {}) {
  ctx.fillStyle = '#121010'; ctx.fillRect(x - 9 * s, y - 7 * s, 18 * s, 7 * s);
  ctx.fillStyle = '#d6ccb4'; ctx.beginPath(); ctx.arc(x, y - 4 * s, 2.4 * s, 0, Math.PI * 2); ctx.fill();
  if (offHook) {
    ctx.fillStyle = '#121010'; ctx.fillRect(x + 11 * s, y - 3 * s, 14 * s, 3 * s);
    ctx.strokeStyle = '#121010'; ctx.lineWidth = 0.8 * s;
    ctx.beginPath(); ctx.moveTo(x + 9 * s, y - 2 * s); ctx.quadraticCurveTo(x + 14 * s, y + 6 * s, x + 18 * s, y - 1 * s); ctx.stroke();
  } else {
    ctx.fillStyle = '#121010'; ctx.fillRect(x - 11 * s, y - 11 * s, 22 * s, 4 * s);
  }
}

// A shape like a person, made of shadow, against the curtain.
export function figure(ctx, x, y, s, alpha = 0.55) {
  ctx.fillStyle = `rgba(8,2,3,${alpha})`;
  ctx.beginPath(); ctx.ellipse(x, y - 58 * s, 7 * s, 9 * s, 0, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - 14 * s, y - 46 * s); ctx.lineTo(x + 14 * s, y - 46 * s); ctx.lineTo(x + 11 * s, y); ctx.lineTo(x - 11 * s, y); ctx.closePath(); ctx.fill();
}
