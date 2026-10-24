// Entry point: wires the particle background, scroll showcase, progress rail and micro-interactions.
// Each system starts independently, so a failure in one never blocks the others or hides content.

import { gsap, ScrollTrigger, ScrollToPlugin, CustomEase, SplitText } from "../vendor/gsap.min.js";
import { PARTICLES, THEME_OVERRIDES, activeTheme } from "./config.js";
import { registerEases } from "./easing.js";
import { bindSpringTicker } from "./spring.js";
import { createParticleField } from "./particles.js";
import { initBursts } from "./bursts.js";
import { initMicro } from "./micro.js";
import { initContactForm } from "./form.js";
import { initProgress } from "./progress.js";
import { initShowcase } from "./showcase.js";
import { createScroller, initUI } from "./ui.js";
import { initProjectViz } from "./project-viz.js";
import { initChat } from "./chat/chat-ui.js";
import { prefersReducedMotion } from "./utils.js";

gsap.registerPlugin(ScrollTrigger, ScrollToPlugin, CustomEase, SplitText);
ScrollTrigger.config({ ignoreMobileResize: true });

const EASE = registerEases();
const reducedMotion = prefersReducedMotion();
bindSpringTicker(gsap.ticker);

// Returns the system's result (or true), or null if it threw.
function safely(name, fn) {
  try {
    return fn() ?? true;
  } catch (error) {
    console.error(`[portfolio] ${name} failed to start`, error);
    return null;
  }
}

const theme = THEME_OVERRIDES[activeTheme()];
const particleSettings = { ...PARTICLES, ...(theme.particles || {}) };

const created = safely("particles", () =>
  createParticleField({
    canvas: document.getElementById("bgCanvas"),
    ticker: gsap.ticker,
    settings: particleSettings,
    reducedMotion,
    initialMode: PARTICLES.defaultMode,
  })
);
const field = created && created !== true ? created : null;

const scrollToSection = createScroller({ EASE, reducedMotion });

safely("bursts", () =>
  initBursts({
    canvas: document.getElementById("fxCanvas"),
    ticker: gsap.ticker,
    reducedMotion,
    colors: theme.burst?.colors,
    compositeMode: theme.burst?.composite,
  })
);
safely("ui", () => initUI({ scrollToSection }));
safely("contact form", () => initContactForm());
if (safely("showcase", () => initShowcase({ EASE })) === null) {
  // Without the showcase nothing would reveal the hidden content, so show everything as-is.
  document.documentElement.classList.remove("js");
}
safely("progress rail", () => initProgress({ reducedMotion, scrollToSection }));
safely("project visualisations", () => initProjectViz({ reducedMotion }));
safely("chat", () => initChat({ scrollToSection, reducedMotion }));
// After the chat so its launcher gets micro-interactions too.
safely("micro-interactions", () => initMicro({ reducedMotion }));

// Tells the fail-safe in <head> that the motion system is running and content can stay hidden
// until it is revealed.
window.__portfolioReady = true;
document.documentElement.classList.add("fx-ready");

if (new URLSearchParams(location.search).has("debug")) {
  window.portfolioDebug = { field, gsap, ScrollTrigger };
}
