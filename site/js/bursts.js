import { BURST } from "./config.js";
import { debounce, rand } from "./utils.js";

// A full-screen 2D canvas that draws short-lived glowing sparks for hover and click feedback.
// The draw loop only runs while sparks are alive.

let canvas = null;
let ctx = null;
let ticker = null;
let enabled = false;
let running = false;
let dpr = 1;
let palette = BURST.colors;
let composite = "lighter";
const sparks = [];
const sprites = new Map();

function sprite(color) {
  if (sprites.has(color)) return sprites.get(color);
  const size = 64;
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const g = c.getContext("2d");
  const gradient = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, color);
  gradient.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gradient;
  g.fillRect(0, 0, size, size);
  sprites.set(color, c);
  return c;
}

// Size the buffer from the canvas's CSS box (which excludes the scrollbar), so sparks land
// exactly under the cursor.
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.round(canvas.clientWidth * dpr);
  canvas.height = Math.round(canvas.clientHeight * dpr);
}

function frame(_time, deltaMs) {
  const dt = Math.min(deltaMs / 1000, 1 / 30);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.globalCompositeOperation = composite;

  for (let i = sparks.length - 1; i >= 0; i--) {
    const s = sparks[i];
    s.life -= dt;
    if (s.life <= 0) {
      sparks[i] = sparks[sparks.length - 1];
      sparks.pop();
      continue;
    }
    const drag = Math.exp(-s.drag * dt);
    s.vx *= drag;
    s.vy = s.vy * drag + s.gravity * dt;
    s.x += s.vx * dt;
    s.y += s.vy * dt;

    const t = s.life / s.maxLife;
    const size = s.size * (0.35 + 0.65 * t);
    ctx.globalAlpha = Math.pow(t, 0.8);
    ctx.drawImage(sprite(s.color), s.x - size, s.y - size, size * 2, size * 2);
  }
  ctx.globalAlpha = 1;

  if (sparks.length === 0) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ticker.remove(frame);
    running = false;
  }
}

export function initBursts({ canvas: target, ticker: gsapTicker, reducedMotion = false, colors, compositeMode }) {
  canvas = target;
  if (colors?.length) palette = colors;
  if (compositeMode) composite = compositeMode;
  ticker = gsapTicker;
  ctx = canvas?.getContext("2d") ?? null;
  enabled = Boolean(ctx) && !reducedMotion;
  if (!enabled) return;
  resize();
  window.addEventListener("resize", debounce(resize, 120));
}

// Emit sparks at a viewport position (clientX / clientY).
export function burst(x, y, { count = 12, speed = [80, 260], size = [3, 8], life = [0.45, 0.95], gravity = 60, colors = palette } = {}) {
  if (!enabled || count <= 0) return;
  const room = BURST.maxParticles - sparks.length;
  const n = Math.min(count, room);
  for (let i = 0; i < n; i++) {
    const angle = rand(0, Math.PI * 2);
    const v = rand(speed[0], speed[1]);
    const maxLife = rand(life[0], life[1]);
    sparks.push({
      x,
      y,
      vx: Math.cos(angle) * v,
      vy: Math.sin(angle) * v - v * 0.15,
      size: rand(size[0], size[1]),
      life: maxLife,
      maxLife,
      drag: rand(2.6, 4),
      gravity,
      color: colors[(Math.random() * colors.length) | 0],
    });
  }
  if (!running && sparks.length) {
    running = true;
    ticker.add(frame);
  }
}
