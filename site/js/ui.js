import { gsap, ScrollTrigger } from "../vendor/gsap.min.js";
import { SECTIONS } from "./config.js";
import { navHeight } from "./utils.js";

// Page chrome: mobile menu, smooth anchor scrolling, active nav link, certificate lightbox,
// footer year and the background-particle mode switch.

export function createScroller({ EASE, reducedMotion }) {
  return function scrollToSection(id, { updateHash = true } = {}) {
    const target = id === "home" ? 0 : document.getElementById(id);
    if (target === null) return;
    const y = target === 0 ? 0 : target.getBoundingClientRect().top + window.scrollY - navHeight();
    const finish = () => {
      if (updateHash) history.replaceState(null, "", `#${id}`);
      // Move focus for keyboard and screen-reader users without jumping the page.
      if (target !== 0) {
        if (!target.hasAttribute("tabindex")) target.setAttribute("tabindex", "-1");
        target.focus({ preventScroll: true });
      }
    };
    if (reducedMotion) {
      window.scrollTo(0, y);
      finish();
      return;
    }
    const distance = Math.abs(window.scrollY - y);
    gsap.to(window, {
      scrollTo: { y, autoKill: true },
      duration: Math.min(1.8, 0.7 + distance / 4000),
      ease: EASE.expoInOut,
      onComplete: finish,
    });
  };
}

function initMenu() {
  const toggle = document.getElementById("navToggle");
  const links = document.getElementById("navLinks");
  if (!toggle || !links) return () => {};
  const setMenu = (open) => {
    toggle.setAttribute("aria-expanded", String(open));
    links.classList.toggle("open", open);
  };
  toggle.addEventListener("click", () => setMenu(toggle.getAttribute("aria-expanded") !== "true"));
  return () => setMenu(false);
}

function initAnchors(scrollToSection, closeMenu) {
  document.addEventListener("click", (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link || event.defaultPrevented) return;
    const id = link.getAttribute("href").slice(1);
    if (!id || !(id === "home" || document.getElementById(id))) return;
    event.preventDefault();
    closeMenu();
    scrollToSection(id);
  });
}

function initActiveNav() {
  const links = new Map(Array.from(document.querySelectorAll(".nav__links a")).map((a) => [a.getAttribute("href").slice(1), a]));
  const setActive = (id) => links.forEach((a, key) => a.classList.toggle("active", key === id));
  for (const { id } of SECTIONS) {
    const section = document.getElementById(id);
    if (!section) continue;
    ScrollTrigger.create({
      trigger: section,
      start: "top 45%",
      end: "bottom 45%",
      onToggle: (self) => self.isActive && setActive(id),
    });
  }
  setActive("home");
}

function initLightbox() {
  const box = document.getElementById("lightbox");
  if (!box || typeof box.showModal !== "function") return;
  const img = document.getElementById("lightboxImg");
  const img2 = document.getElementById("lightboxImg2");
  const title = document.getElementById("lightboxTitle");
  const pdf = document.getElementById("lightboxPdf");
  document.querySelectorAll(".cert__thumb").forEach((button) => {
    button.addEventListener("click", () => {
      img.src = button.dataset.full;
      img.alt = `Certificate: ${button.dataset.title}`;
      // A button with data-full2 opens a pair, e.g. both certificates of a dual-award degree.
      const pair = Boolean(button.dataset.full2);
      box.classList.toggle("lightbox--pair", pair);
      img2.hidden = !pair;
      if (pair) {
        img2.src = button.dataset.full2;
        img2.alt = `Certificate: ${button.dataset.title2}`;
      }
      title.textContent = pair ? `${button.dataset.title} · ${button.dataset.title2}` : button.dataset.title;
      if (button.dataset.pdf) {
        pdf.href = button.dataset.pdf;
        pdf.hidden = false;
      } else {
        pdf.hidden = true;
      }
      box.showModal();
      gsap.fromTo(pair ? [img, img2] : img, { scale: 0.9, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.6, ease: "expoOut", stagger: 0.08 });
    });
  });
  document.getElementById("lightboxClose").addEventListener("click", () => box.close());
  box.addEventListener("click", (event) => {
    if (event.target === box) box.close();
  });
}

export function initUI({ scrollToSection }) {
  const closeMenu = initMenu();
  initAnchors(scrollToSection, closeMenu);
  initActiveNav();
  initLightbox();
  const year = document.getElementById("year");
  if (year) year.textContent = String(new Date().getFullYear());
}
