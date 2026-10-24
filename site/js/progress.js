import { gsap, ScrollTrigger } from "../vendor/gsap.min.js";
import { Spring } from "./spring.js";
import { SECTIONS, SPRINGS } from "./config.js";
import { clamp, navHeight } from "./utils.js";

// Sticky sidebar that tracks the reader's journey through the page sections.
// The filled line is redrawn as a liquid: scroll velocity drives an under-damped spring that
// bulges the line around a droplet at its head, which then wobbles back into shape.

const SVG_NS = "http://www.w3.org/2000/svg";
const LINE_X = 14;

function el(tag, attrs = {}, ns) {
  const node = ns ? document.createElementNS(ns, tag) : document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

export function initProgress({ reducedMotion = false, scrollToSection }) {
  const rail = document.getElementById("rail");
  const topBar = document.getElementById("progressTop");
  const sections = SECTIONS.map((s) => ({ ...s, node: document.getElementById(s.id) })).filter((s) => s.node);
  if (!rail || sections.length < 2) return;

  // ---- Build the DOM -------------------------------------------------------------------
  const svg = el("svg", { class: "rail__svg", "aria-hidden": "true" }, SVG_NS);
  const track = el("path", { class: "rail__track" }, SVG_NS);
  const fill = el("path", { class: "rail__fill" }, SVG_NS);
  const drop = el("circle", { class: "rail__drop", r: "5" }, SVG_NS);
  svg.append(track, fill, drop);

  const list = el("ol", { class: "rail__list" });
  const items = sections.map((s, i) => {
    const li = el("li", { class: "rail__item" });
    li.style.setProperty("--y", String(i / (sections.length - 1)));
    const link = el("a", { class: "rail__node", href: `#${s.id}` });
    link.innerHTML = `<span class="rail__dot" aria-hidden="true"></span><span class="rail__label">${s.label}</span>`;
    link.addEventListener("click", (event) => {
      event.preventDefault();
      scrollToSection(s.id);
    });
    li.append(link);
    list.append(li);
    return { li, link };
  });
  rail.append(svg, list);
  rail.hidden = false;

  // ---- Measurements --------------------------------------------------------------------
  let height = 0;
  let tops = [];
  let maxScroll = 1;
  let offset = 0;

  function measure() {
    height = rail.clientHeight;
    svg.setAttribute("viewBox", `0 0 40 ${height}`);
    track.setAttribute("d", `M${LINE_X} 0 V${height}`);
    maxScroll = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    offset = navHeight() + window.innerHeight * 0.3;
    tops = sections.map((s) => s.node.getBoundingClientRect().top + window.scrollY);
    dirty = true;
  }

  // Map the scroll position to "node space": 0 at the first section, 1 at the last, with each
  // section taking an equal share of the line however tall it is.
  function progressAt(scrollY) {
    const y = scrollY + offset;
    const last = tops.length - 1;
    // The last section is often too short to reach the reading line, so the very bottom counts as it.
    if (scrollY >= maxScroll - 2) return { position: 1, active: last };
    const end = maxScroll + offset;
    for (let i = last; i >= 0; i--) {
      if (y >= tops[i]) {
        const next = i < last ? tops[i + 1] : end;
        const span = Math.max(1, next - tops[i]);
        const f = i < last ? clamp((y - tops[i]) / span, 0, 1) : 0;
        return { position: (i + f) / last, active: i };
      }
    }
    return { position: 0, active: 0 };
  }

  // ---- Springs -------------------------------------------------------------------------
  const head = new Spring({ ...SPRINGS.railHead, auto: false });
  const bulge = new Spring({ ...SPRINGS.railBulge, auto: false });
  let velocity = 0;
  let activeIndex = -1;
  let dirty = true;
  let time = 0;

  function setActive(index) {
    if (index === activeIndex) return;
    const direction = index > activeIndex ? 1 : -1;
    activeIndex = index;
    items.forEach(({ li, link }, i) => {
      li.classList.toggle("is-active", i === index);
      li.classList.toggle("is-passed", i < index);
      if (i === index) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    });
    // Passing a node sends a ripple through the liquid.
    if (!reducedMotion) bulge.impulse(direction * 90);
  }

  function buildPath(headY, amp) {
    const sigma = 42 + Math.abs(amp) * 1.4;
    let d = `M${LINE_X} 0`;
    for (let y = 6; y < headY; y += 6) {
      const g = Math.exp(-(((y - headY) / sigma) ** 2));
      const wave = 0.65 + 0.35 * Math.sin(y * 0.07 - time * 4);
      d += ` L${(LINE_X + amp * g * wave).toFixed(2)} ${y}`;
    }
    d += ` L${(LINE_X + amp).toFixed(2)} ${headY.toFixed(2)}`;
    return d;
  }

  function render(dt) {
    const { position, active } = progressAt(window.scrollY);
    setActive(active);
    const target = position * height;

    if (reducedMotion) {
      head.jump(target);
      bulge.jump(0);
    } else {
      time += dt;
      head.target = target;
      head.step(dt);
      // Velocity is in px/s; scale it to a sideways bulge in SVG units.
      velocity *= Math.exp(-dt * 6);
      bulge.target = clamp(velocity / 55, -24, 24);
      bulge.step(dt);
    }

    const moving = Math.abs(head.value - target) > 0.05 || Math.abs(bulge.value) > 0.05 || Math.abs(bulge.velocity) > 0.05;
    if (!moving && !dirty) return;
    dirty = false;

    const headY = clamp(head.value, 0, height);
    const amp = bulge.value;
    fill.setAttribute("d", buildPath(headY, amp));
    drop.setAttribute("cx", (LINE_X + amp).toFixed(2));
    drop.setAttribute("cy", headY.toFixed(2));
    drop.setAttribute("r", (5 + Math.min(Math.abs(amp) * 0.12, 3)).toFixed(2));
  }

  // ---- Wiring --------------------------------------------------------------------------
  ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate(self) {
      velocity = self.getVelocity();
      dirty = true;
      if (topBar) topBar.style.setProperty("--progress", self.progress.toFixed(4));
    },
  });
  ScrollTrigger.addEventListener("refresh", measure);

  measure();
  const { position } = progressAt(window.scrollY);
  head.jump(position * height);
  gsap.ticker.add((_t, deltaMs) => render(Math.min(deltaMs / 1000, 1 / 30)));
}
