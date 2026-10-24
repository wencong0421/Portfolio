import { Spring } from "./spring.js";
import { burst } from "./bursts.js";
import { INTERACTIVE, MICRO_PRESETS, SPRINGS, BURST } from "./config.js";
import { clamp, hasFinePointer, qsa } from "./utils.js";

// Every interactive element gets three springs (x, y, scale). Their values are written to CSS
// custom properties that drive the independent `translate` and `scale` properties, so they compose
// with any `transform` the scroll animations apply to the same element.

const controllers = new WeakMap();

function haptic(event) {
  if (event.pointerType === "touch" && "vibrate" in navigator) {
    try {
      navigator.vibrate(8);
    } catch {
      /* not allowed in this context */
    }
  }
}

function attach(el, presetName, { ring = false, glow = false } = {}) {
  if (controllers.has(el)) return controllers.get(el);
  const preset = MICRO_PRESETS[presetName];
  const physics = SPRINGS[preset.spring];
  const finePointer = hasFinePointer();

  el.classList.add("fx", `fx--${presetName}`);
  if (ring) el.classList.add("fx-ring");
  if (glow) el.classList.add("fx-glow");

  const state = { hover: false, press: false, focus: false, lastBurst: 0 };

  const setVar = (name, unit) => (v) => el.style.setProperty(name, unit ? `${v.toFixed(2)}${unit}` : v.toFixed(4));
  const x = new Spring({ ...physics, onUpdate: setVar("--fx-x", "px") });
  const y = new Spring({ ...physics, onUpdate: setVar("--fx-y", "px") });
  const s = new Spring({ ...SPRINGS.scale, ...(presetName === "card" ? SPRINGS.card : {}), value: 1, precision: 0.0005, onUpdate: setVar("--fx-s") });

  function restingScale() {
    if (state.press) return preset.pressScale;
    if (state.hover) return preset.hoverScale;
    if (state.focus) return preset.focusScale ?? preset.hoverScale;
    return 1;
  }

  function restingLift() {
    return (state.hover || state.focus) && preset.lift ? preset.lift : 0;
  }

  function update() {
    s.target = restingScale();
    el.classList.toggle("is-fx-active", state.hover || state.press || state.focus);
  }

  function onEnter(event) {
    if (event.pointerType === "touch") return;
    state.hover = true;
    y.target = restingLift();
    update();
    const now = performance.now();
    if (preset.burstHover && now - state.lastBurst > BURST.hoverCooldownMs) {
      state.lastBurst = now;
      burst(event.clientX, event.clientY, { count: preset.burstHover, speed: [40, 140], size: [2, 5], life: [0.35, 0.7], gravity: 0 });
    }
  }

  function onMove(event) {
    if (event.pointerType === "touch") return;
    const rect = el.getBoundingClientRect();
    // Spotlight position for the glow layer.
    el.style.setProperty("--gx", `${event.clientX - rect.left}px`);
    el.style.setProperty("--gy", `${event.clientY - rect.top}px`);
    if (!preset.magnet || !finePointer) return;
    // Use the element's untransformed centre so the pull doesn't feed back on itself.
    const cx = rect.left + rect.width / 2 - x.value;
    const cy = rect.top + rect.height / 2 - y.value;
    x.target = clamp((event.clientX - cx) * preset.magnet, -preset.maxPull, preset.maxPull);
    y.target = clamp((event.clientY - cy) * preset.magnet, -preset.maxPull, preset.maxPull) + restingLift();
  }

  function onLeave() {
    state.hover = false;
    state.press = false;
    x.target = 0;
    y.target = restingLift();
    update();
  }

  function onDown(event) {
    if (event.button !== 0) return;
    state.press = true;
    haptic(event);
    // A small downward nudge makes the press feel physical.
    y.impulse(presetName === "card" ? 30 : 60);
    update();
  }

  function onUp() {
    if (!state.press) return;
    state.press = false;
    update();
  }

  function onClick(event) {
    if (!preset.burstClick) return;
    let px = event.clientX;
    let py = event.clientY;
    if (event.detail === 0 || (!px && !py)) {
      // Keyboard activation: burst from the element's centre.
      const rect = el.getBoundingClientRect();
      px = rect.left + rect.width / 2;
      py = rect.top + rect.height / 2;
    }
    burst(px, py, { count: preset.burstClick });
  }

  function onFocusIn() {
    state.focus = true;
    y.target = restingLift();
    update();
  }

  function onFocusOut(event) {
    if (el.contains(event.relatedTarget)) return;
    state.focus = false;
    y.target = restingLift();
    update();
  }

  el.addEventListener("pointerenter", onEnter);
  el.addEventListener("pointermove", onMove, { passive: true });
  el.addEventListener("pointerleave", onLeave);
  el.addEventListener("pointerdown", onDown);
  el.addEventListener("pointerup", onUp);
  el.addEventListener("pointercancel", onUp);
  el.addEventListener("click", onClick);
  el.addEventListener("focusin", onFocusIn);
  el.addEventListener("focusout", onFocusOut);

  const controller = {
    x,
    y,
    s,
    // Elastic sideways shake, used for invalid form fields.
    shake(strength = 420) {
      x.impulse(Math.random() > 0.5 ? strength : -strength);
      s.impulse(-0.6);
    },
    // A quick elastic pop, used for success states.
    pop(strength = 2.2) {
      s.impulse(strength);
    },
  };
  controllers.set(el, controller);
  return controller;
}

export function initMicro({ reducedMotion = false } = {}) {
  if (reducedMotion) return;
  for (const { selector, preset, ring, glow } of INTERACTIVE) {
    for (const el of qsa(selector)) attach(el, preset, { ring, glow });
  }
}

export function getController(el) {
  return controllers.get(el) ?? null;
}
