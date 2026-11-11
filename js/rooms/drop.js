// The Drop: aim the lamp at the top, fire a ball into the dark, break every red bulb.
// Pegs you hit are cleared after each shot. Land in the bucket and the shot comes back.

import { W, H, room } from '../scenery.js';
import * as L from '../light.js';

const LAUNCH = { x: W / 2, y: 74 };
const G = 700, SPEED = 540, R = 5;
const BUCKET = { y: 606, w: 62 };
const rand = (a, b) => a + Math.random() * (b - a);

export function generate(depth) {
  const pegs = [];
  for (let row = 0; row < 8; row++) {
    const y = 176 + row * 44;
    const off = row % 2 ? 20 : 0;
    for (let x = 30 + off; x < W - 20; x += 40) {
      if (Math.random() < 0.26) continue;
      pegs.push({ x: x + rand(-3, 3), y: y + rand(-3, 3), kind: 'peg', hit: false, gone: false, flash: 0 });
    }
  }
  const targets = Math.min(pegs.length - 2, 3 + Math.floor(depth * 0.8));
  const picks = pegs.slice().sort(() => Math.random() - 0.5);
  for (const p of picks.slice(0, targets)) p.kind = 'target';
  const pipes = [];
  if (depth >= 4) {
    for (let i = 0; i < Math.min(3, depth - 3); i++) {
      pipes.push({ x: rand(40, W - 110), y: 220 + i * 110 + rand(-10, 10), w: 70, h: 8 });
    }
  }
  // no peg inside a pipe
  return { pegs: pegs.filter((p) => !pipes.some((q) => p.x > q.x - 8 && p.x < q.x + q.w + 8 && p.y > q.y - 10 && p.y < q.y + q.h + 10)), pipes };
}

function launchVel(angle) {
  return { vx: Math.sin(angle) * SPEED, vy: Math.cos(angle) * SPEED };
}

// One physics step for a ball. Returns what it touched.
function step(s, b, dt, live = true) {
  b.vy += G * dt;
  b.x += b.vx * dt; b.y += b.vy * dt;
  let touched = null;
  if (b.x < R + 4) { b.x = R + 4; b.vx = Math.abs(b.vx) * 0.85; touched = { wall: true }; }
  if (b.x > W - R - 4) { b.x = W - R - 4; b.vx = -Math.abs(b.vx) * 0.85; touched = { wall: true }; }
  if (b.y < R) { b.y = R; b.vy = Math.abs(b.vy) * 0.8; }
  for (const p of s.pegs) {
    if (p.gone) continue;
    const dx = b.x - p.x, dy = b.y - p.y;
    const d = Math.hypot(dx, dy);
    const rr = R + (p.kind === 'target' ? 6 : 5);
    if (d < rr && d > 0) {
      const nx = dx / d, ny = dy / d;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx = (b.vx - 2 * dot * nx) * 0.78 + (live ? rand(-12, 12) : 0);
        b.vy = (b.vy - 2 * dot * ny) * 0.78;
      }
      b.x = p.x + nx * rr; b.y = p.y + ny * rr;
      touched = { peg: p };
      break;
    }
  }
  for (const q of s.pipes) {
    const nx = Math.max(q.x, Math.min(b.x, q.x + q.w)), ny = Math.max(q.y, Math.min(b.y, q.y + q.h));
    const dx = b.x - nx, dy = b.y - ny;
    if (dx * dx + dy * dy < R * R) {
      if (Math.abs(dx) > Math.abs(dy)) { b.vx = Math.sign(dx || 1) * Math.abs(b.vx) * 0.8; b.x = nx + Math.sign(dx || 1) * R; }
      else { b.vy = Math.sign(dy || -1) * Math.abs(b.vy) * 0.7; b.y = ny + Math.sign(dy || -1) * R; }
      touched = { pipe: q };
    }
  }
  return touched;
}

function bucketX(s) {
  return s.run.mods.bucketStill ? 40 : W / 2 + Math.sin(s.t * 0.9) * 118;
}

// The dotted aim line: follow the ball until it touches something (twice with Steady Hand).
function preview(s) {
  const b = { x: LAUNCH.x, y: LAUNCH.y, ...launchVel(s.angle) };
  const pts = [];
  let touches = 0;
  const need = s.run.mods.twoBounces ? 2 : 1;
  for (let i = 0; i < 260 && b.y < H; i++) {
    const hit = step(s, b, 1 / 120, false);
    if (i % 4 === 0) pts.push([b.x, b.y]);
    if (hit && (hit.peg || hit.pipe)) { touches++; if (touches >= need) { pts.push([b.x, b.y]); break; } }
  }
  return pts;
}

export default {
  id: 'drop',
  start({ depth, run, dark }) {
    const { pegs, pipes } = generate(depth);
    const shots = Math.max(2, 5 - (depth >= 5 ? 1 : 0) + run.mods.shots);
    return { pegs, pipes, shots, angle: 0, ball: null, t: 0, run, events: [], dark: dark ? 5 : 0, done: 0, failed: 0, shotT: 0, trail: [] };
  },

  update(s, dt, input) {
    s.t += dt;
    s.dark = Math.max(0, s.dark - dt);
    for (const p of s.pegs) p.flash = Math.max(0, p.flash - dt * 2);
    if (s.done) { s.done += dt; return s.done > 1.2 ? 'won' : 'playing'; }
    if (s.failed) { s.failed += dt; return s.failed > 0.8 ? 'lost' : 'playing'; }

    // aiming: drag anywhere, point with a mouse, or use the arrow keys
    if (!s.ball) {
      const max = 1.3;
      if (input.drag) s.angle = Math.max(-max, Math.min(max, s.angle + input.drag * 0.008));
      if (input.aimAt && input.aimAt.y > LAUNCH.y + 10) s.angle = Math.max(-max, Math.min(max, Math.atan2(input.aimAt.x - LAUNCH.x, input.aimAt.y - LAUNCH.y)));
      if (input.keys.left) s.angle = Math.max(-max, s.angle - dt * 1.2);
      if (input.keys.right) s.angle = Math.min(max, s.angle + dt * 1.2);
      if ((input.anyTap || input.keys.fire) && s.shots > 0) {
        s.ball = { x: LAUNCH.x, y: LAUNCH.y, ...launchVel(s.angle) };
        s.shots--; s.shotT = 0; s.trail = [];
        s.events.push({ sfx: 'fire' });
      }
      return 'playing';
    }

    s.shotT += dt;
    const sub = 4;
    for (let k = 0; k < sub; k++) {
      const b = s.ball;
      const hit = step(s, b, dt / sub);
      if (hit && hit.peg) {
        const p = hit.peg;
        if (p.kind === 'target' && !p.gone) {
          p.gone = true; p.flash = 1;
          s.events.push({ sfx: 'target', x: p.x });
          if (!s.pegs.some((q) => q.kind === 'target' && !q.gone)) { s.done = 0.001; s.events.push({ sfx: 'power' }); }
        } else if (!p.hit) { p.hit = true; p.flash = 1; s.events.push({ sfx: 'peg', x: p.x }); }
      } else if (hit && hit.pipe) s.events.push({ sfx: 'pipe', x: b.x });
      // the bucket
      const bx = bucketX(s);
      if (b.y > BUCKET.y - 4 && b.y < BUCKET.y + 6 && Math.abs(b.x - bx) < BUCKET.w / 2 && b.vy > 0) {
        s.shots++; s.events.push({ sfx: 'bucket' }); this.endShot(s); break;
      }
      if (b.y > H + 10 || s.shotT > 14) { s.events.push({ sfx: 'drain' }); this.endShot(s); break; }
    }
    if (s.ball) { s.trail.push(s.ball.x, s.ball.y); if (s.trail.length > 16) s.trail.splice(0, 2); }
    if (!s.ball && !s.done && s.shots <= 0 && s.pegs.some((q) => q.kind === 'target' && !q.gone)) s.failed = 0.001;
    return 'playing';
  },

  endShot(s) {
    s.ball = null;
    for (const p of s.pegs) if (p.hit) p.gone = true;
  },

  timer(s) { return null; },

  draw(s, t) {
    const ctx = L.begin(0);
    room(ctx, t);
    ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(0, 0, W, H);
    // pipes
    for (const q of s.pipes) {
      const g = ctx.createLinearGradient(0, q.y, 0, q.y + q.h);
      g.addColorStop(0, '#9a5a38'); g.addColorStop(1, '#22130c');
      ctx.fillStyle = g; ctx.fillRect(q.x, q.y, q.w, q.h);
    }
    // pegs: brass studs; targets: small red bulbs
    for (const p of s.pegs) {
      if (p.gone && !p.flash) continue;
      if (p.kind === 'target') {
        ctx.fillStyle = p.gone ? `rgba(255,200,190,${p.flash})` : '#c42a22';
        ctx.beginPath(); ctx.arc(p.x, p.y, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a1a12'; ctx.fillRect(p.x - 2, p.y - 8, 4, 3);
      } else {
        ctx.fillStyle = p.hit ? '#e8c27a' : '#8a7448';
        ctx.beginPath(); ctx.arc(p.x, p.y, 4.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(255,240,210,0.35)'; ctx.fillRect(p.x - 2, p.y - 3, 2, 2);
      }
    }
    // launcher: a lamp head on a chain
    ctx.strokeStyle = '#2a1e16'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(LAUNCH.x, 0); ctx.lineTo(LAUNCH.x, LAUNCH.y - 14); ctx.stroke();
    ctx.save(); ctx.translate(LAUNCH.x, LAUNCH.y); ctx.rotate(-s.angle);
    ctx.fillStyle = '#3a2a1e'; ctx.beginPath(); ctx.moveTo(-12, -14); ctx.lineTo(12, -14); ctx.lineTo(7, 6); ctx.lineTo(-7, 6); ctx.closePath(); ctx.fill();
    ctx.restore();
    // bucket
    const bx = bucketX(s);
    ctx.fillStyle = '#4a4440'; ctx.beginPath(); ctx.moveTo(bx - BUCKET.w / 2, BUCKET.y - 8); ctx.lineTo(bx + BUCKET.w / 2, BUCKET.y - 8); ctx.lineTo(bx + BUCKET.w / 2 - 6, BUCKET.y + 14); ctx.lineTo(bx - BUCKET.w / 2 + 6, BUCKET.y + 14); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6a625a'; ctx.fillRect(bx - BUCKET.w / 2, BUCKET.y - 9, BUCKET.w, 2);
    // ball
    if (s.ball) {
      for (let i = 0; i < s.trail.length; i += 2) { ctx.fillStyle = `rgba(230,220,200,${i / s.trail.length * 0.25})`; ctx.fillRect(s.trail[i] - 2, s.trail[i + 1] - 2, 4, 4); }
      const g = ctx.createRadialGradient(s.ball.x - 1.5, s.ball.y - 1.5, 0.5, s.ball.x, s.ball.y, R);
      g.addColorStop(0, '#f6f0e4'); g.addColorStop(1, '#4a4440');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(s.ball.x, s.ball.y, R, 0, Math.PI * 2); ctx.fill();
    }

    const flare = s.run.mods.light;
    L.dark(s.dark > 0 ? 0.985 : 0.84 - flare * 0.15);
    if (s.dark <= 0) {
      // the launcher's lamp shines down the way it is pointing
      const a = -s.angle;
      L.shapedHole((m) => {
        m.moveTo(LAUNCH.x, LAUNCH.y);
        m.lineTo(LAUNCH.x + Math.sin(-a - 0.45) * 420, LAUNCH.y + Math.cos(-a - 0.45) * 420);
        m.lineTo(LAUNCH.x + Math.sin(-a + 0.45) * 420, LAUNCH.y + Math.cos(-a + 0.45) * 420);
        m.closePath();
      }, LAUNCH.x, LAUNCH.y, 330 * (1 + flare * 0.3), 0.85);
      if (s.ball) L.hole(s.ball.x, s.ball.y, 90 * (1 + flare * 0.4), 0.95);
      for (const p of s.pegs) if (!p.gone && p.kind === 'target') L.hole(p.x, p.y, 20, 0.5);
      for (const p of s.pegs) if (p.flash) L.hole(p.x, p.y, 40 * p.flash, 0.7);
      L.hole(bx, BUCKET.y, 46, 0.45);
    }
    L.lay();
    // the aim line and the launcher's lamp glow through the dark
    if (!s.ball && s.shots > 0 && !s.done) {
      ctx.fillStyle = 'rgba(240,226,200,0.7)';
      for (const [x, y] of preview(s)) ctx.fillRect(x - 1, y - 1, 2, 2);
    }
    L.glow(LAUNCH.x + Math.sin(s.angle) * 6, LAUNCH.y + 6, 16, [255, 220, 170], 0.55);
    for (const p of s.pegs) {
      if (p.kind === 'target' && !p.gone) L.glow(p.x, p.y, 11, [255, 70, 50], 0.4 + Math.sin(t * 4 + p.x) * 0.15);
      if (p.flash) L.glow(p.x, p.y, 16, [255, 210, 160], p.flash * 0.6);
    }
    return L.end();
  },
};
