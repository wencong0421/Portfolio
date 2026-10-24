// A damped harmonic oscillator, integrated with fixed sub-steps so it behaves the same at any frame rate.
//
// Springs that run automatically ("auto", the default) register themselves with a shared ticker when
// their target changes and unregister once they settle, so idle springs cost nothing.
// Springs created with { auto: false } are stepped manually by their owner (e.g. the particle loop).

const SUB_STEP = 1 / 240;
const active = new Set();
let ticker = null;
let ticking = false;

export function bindSpringTicker(gsapTicker) {
  ticker = gsapTicker;
}

function tick(_time, deltaMs) {
  const dt = Math.min(deltaMs / 1000, 1 / 20);
  for (const spring of active) {
    spring.step(dt);
    if (spring.settled) {
      spring.snap();
      active.delete(spring);
    }
  }
  if (active.size === 0 && ticking) {
    ticker.remove(tick);
    ticking = false;
  }
}

function wake(spring) {
  if (!spring.auto) return;
  active.add(spring);
  if (!ticking && ticker) {
    ticker.add(tick);
    ticking = true;
  }
}

export class Spring {
  constructor({ value = 0, stiffness = 170, damping = 26, mass = 1, precision = 0.002, auto = true, onUpdate = null } = {}) {
    this.value = value;
    this.velocity = 0;
    this._target = value;
    this.stiffness = stiffness;
    this.damping = damping;
    this.mass = mass;
    this.precision = precision;
    this.auto = auto;
    this.onUpdate = onUpdate;
  }

  get target() {
    return this._target;
  }

  set target(next) {
    if (next === this._target && this.settled) return;
    this._target = next;
    wake(this);
  }

  // Kick the spring, e.g. for a shake or wobble, without moving its rest position.
  impulse(velocity) {
    this.velocity += velocity;
    wake(this);
  }

  // Jump straight to a value with no animation.
  jump(value) {
    this.value = value;
    this._target = value;
    this.velocity = 0;
    this.onUpdate?.(value);
  }

  get settled() {
    return Math.abs(this.value - this._target) < this.precision && Math.abs(this.velocity) < this.precision * 10;
  }

  snap() {
    this.value = this._target;
    this.velocity = 0;
    this.onUpdate?.(this.value);
  }

  step(dt) {
    let remaining = dt;
    while (remaining > 0) {
      const h = Math.min(SUB_STEP, remaining);
      const force = -this.stiffness * (this.value - this._target) - this.damping * this.velocity;
      this.velocity += (force / this.mass) * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    this.onUpdate?.(this.value);
    return this.value;
  }
}
