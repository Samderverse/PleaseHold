// The low-resolution canvas every scene draws into, and the darkness over it.
// Scenes draw in the logical 360 x 640 space; this scales it down to 240 x 427.

import { W } from './scenery.js';

export const LOW_W = 240;
export const LOW_H = 427;
export const K = LOW_W / W;

export const scene = document.createElement('canvas');
scene.width = LOW_W; scene.height = LOW_H;
export const sx = scene.getContext('2d');

const mask = document.createElement('canvas');
mask.width = LOW_W; mask.height = LOW_H;
const mx = mask.getContext('2d');

let shake = { x: 0, y: 0 };

// Start a frame. `jolt` shakes the picture a little (0 to 1).
export function begin(jolt = 0) {
  shake = { x: (Math.random() - 0.5) * jolt * 6, y: (Math.random() - 0.5) * jolt * 6 };
  sx.setTransform(K, 0, 0, K, shake.x * K, shake.y * K);
  sx.globalCompositeOperation = 'source-over';
  sx.globalAlpha = 1;
  return sx;
}

// Darkness: fill the mask, then cut lights out of it.
export function dark(level) {
  mx.setTransform(1, 0, 0, 1, 0, 0);
  mx.globalCompositeOperation = 'source-over';
  mx.clearRect(0, 0, LOW_W, LOW_H);
  mx.fillStyle = `rgba(0,0,0,${Math.max(0, Math.min(1, level))})`;
  mx.fillRect(0, 0, LOW_W, LOW_H);
  mx.setTransform(K, 0, 0, K, shake.x * K, shake.y * K);
  mx.globalCompositeOperation = 'destination-out';
}

export function hole(x, y, r, power = 1) {
  if (r <= 0 || power <= 0) return;
  const g = mx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(0,0,0,${power})`);
  g.addColorStop(0.5, `rgba(0,0,0,${power * 0.6})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  mx.fillStyle = g;
  mx.fillRect(x - r, y - r, r * 2, r * 2);
}

// A light that only falls inside a shape, such as a lamp's cone.
export function shapedHole(path, x, y, r, power = 1) {
  mx.save();
  mx.beginPath();
  path(mx);
  mx.clip();
  hole(x, y, r, power);
  mx.restore();
}

// Lay the darkness over the scene.
export function lay() {
  sx.setTransform(1, 0, 0, 1, 0, 0);
  sx.drawImage(mask, 0, 0);
  sx.setTransform(K, 0, 0, K, shake.x * K, shake.y * K);
}

// Things that give off light, drawn after the darkness.
export function glow(x, y, r, color, a) {
  const g = sx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
  g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  const prev = sx.globalCompositeOperation;
  sx.globalCompositeOperation = 'lighter';
  sx.fillStyle = g;
  sx.fillRect(x - r, y - r, r * 2, r * 2);
  sx.globalCompositeOperation = prev;
}

// A warm wash where light falls, so the light has a colour.
export function wash(x, y, r, color, a) {
  const g = sx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${a})`);
  g.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
  const prev = sx.globalCompositeOperation;
  sx.globalCompositeOperation = 'soft-light';
  sx.fillStyle = g;
  sx.fillRect(x - r, y - r, r * 2, r * 2);
  sx.globalCompositeOperation = prev;
}

export function end() {
  sx.setTransform(1, 0, 0, 1, 0, 0);
  return scene;
}

export const W_ = W;
