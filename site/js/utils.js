export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
export const lerp = (a, b, t) => a + (b - a) * t;
export const rand = (min, max) => min + Math.random() * (max - min);

export const qs = (selector, root = document) => root.querySelector(selector);
export const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

export function debounce(fn, wait = 120) {
  let timer = 0;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}

export const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const hasFinePointer = () => window.matchMedia("(hover: hover) and (pointer: fine)").matches;
export const isSmallScreen = () => window.matchMedia("(max-width: 760px)").matches;

// localStorage can be missing or throw (private mode, blocked storage), so every access is guarded.
export const storage = {
  get(key) {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  },
};

export function navHeight() {
  const nav = document.getElementById("nav");
  return nav ? nav.offsetHeight : 0;
}
