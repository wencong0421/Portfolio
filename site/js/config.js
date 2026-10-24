// Central configuration for the motion system. Tune the feel of the site from here.

export const SECTIONS = [
  { id: "home", label: "Home" },
  { id: "about", label: "About" },
  { id: "skills", label: "Skills" },
  { id: "background", label: "Background" },
  { id: "projects", label: "Projects" },
  { id: "certificates", label: "Certificates" },
  { id: "contact", label: "Contact" },
];

// Cubic-bezier control points, registered as named GSAP eases in easing.js.
export const EASE_CURVES = {
  expoOut: "0.16, 1, 0.3, 1",
  expoInOut: "0.87, 0, 0.13, 1",
  quartOut: "0.25, 1, 0.5, 1",
  smooth: "0.65, 0, 0.35, 1",
};

export const PARTICLES = {
  count: { desktop: 7000, mobile: 2600, lowPower: 3200 },
  maxPixelRatio: { desktop: 2, mobile: 1.5 },
  camera: { fov: 55, z: 14 },
  depth: { near: 7, far: -12 },
  // Deep slate, neon cyan, violet, magenta and the site's gold.
  palette: ["#334155", "#22d3ee", "#8b5cf6", "#ec4899", "#f5b82e"],
  colorSpeed: 0.03,
  size: [1.4, 4.2], // pixels at the reference depth
  opacity: 0.9,
  drift: { amplitude: [0.35, 1.15], speed: [0.06, 0.2] },
  // Spring pulling every particle back to its drifting home position.
  home: { stiffness: 5.5, damping: 2.6 },
  maxVelocity: 22,
  pointer: {
    radius: 0.24, // fraction of the distance from the camera, so the cursor's reach is constant on screen
    swarmRadius: 0.46, // swarming draws particles in from further away
    scatterForce: 150,
    swarmForce: 170,
    swirl: 40,
    speedForFullEnergy: 2.4, // pointer speed (NDC units per second) that gives maximum energy
    idleAfterMs: 90,
    energySpring: { stiffness: 90, damping: 14 },
  },
  parallax: { pointer: 0.55, scroll: 3.2 },
  // Drop quality when the average frame takes longer than this (ms).
  adaptive: { slowFrameMs: 26, sampleFrames: 90, minFraction: 0.35 },
  defaultMode: "scatter",
};

export const SPRINGS = {
  magnet: { stiffness: 260, damping: 15, mass: 1 },
  scale: { stiffness: 320, damping: 17, mass: 1 },
  card: { stiffness: 220, damping: 22, mass: 1 },
  field: { stiffness: 280, damping: 13, mass: 1 },
  railHead: { stiffness: 90, damping: 16, mass: 1 },
  railBulge: { stiffness: 120, damping: 7, mass: 1 },
};

// How each kind of interactive element behaves.
export const MICRO_PRESETS = {
  button: { magnet: 0.3, maxPull: 12, hoverScale: 1.045, pressScale: 0.93, burstHover: 6, burstClick: 18, spring: "magnet" },
  icon: { magnet: 0.45, maxPull: 10, hoverScale: 1.1, pressScale: 0.88, burstHover: 5, burstClick: 16, spring: "magnet" },
  link: { magnet: 0.24, maxPull: 7, hoverScale: 1.04, pressScale: 0.95, burstHover: 4, burstClick: 10, spring: "magnet" },
  card: { magnet: 0.04, maxPull: 5, hoverScale: 1.012, pressScale: 0.982, focusScale: 1.01, burstHover: 0, burstClick: 10, spring: "card", lift: -4 },
  field: { magnet: 0, maxPull: 0, hoverScale: 1, pressScale: 0.992, focusScale: 1.018, burstHover: 0, burstClick: 0, spring: "field" },
};

// Which elements get which preset. ring = morphing gradient border, glow = cursor spotlight.
export const INTERACTIVE = [
  { selector: ".btn", preset: "button", ring: true, glow: true },
  { selector: ".icon-btn, .nav__brand", preset: "icon", ring: true },
  { selector: ".nav__links a, .cert__links a, .contact__list a, .fx-toggle button, .chat-launcher", preset: "link" },
  {
    selector: ".card, .project, .cert, .skill, .stats li, .contact__list li, .degree",
    preset: "card",
    ring: true,
    glow: true,
  },
  { selector: ".field", preset: "field", ring: true, glow: true },
];

export const BURST = {
  colors: ["#f5b82e", "#22d3ee", "#8b5cf6", "#ec4899", "#ffffff"],
  maxParticles: 500,
  hoverCooldownMs: 260,
};

// Per-theme adjustments. V2 is a light theme, so particles use normal blending (additive
// blending is invisible on white) and calmer, darker colours.
export const THEME_OVERRIDES = {
  v1: {},
  v2: {
    particles: {
      palette: ["#8e9bb0", "#0066cc", "#5e5ce6", "#5ac8fa", "#3a3a3c"],
      opacity: 0.5,
      blending: "normal",
      size: [1.4, 3.6],
    },
    burst: { colors: ["#0066cc", "#5ac8fa", "#5e5ce6", "#86868b"], composite: "source-over" },
  },
};

export function activeTheme() {
  return document.documentElement.dataset.theme === "v2" ? "v2" : "v1";
}

export const STORAGE_KEYS = {
  fxMode: "portfolio:fx-mode",
};
