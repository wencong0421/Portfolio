import { gsap, ScrollTrigger, SplitText } from "../vendor/gsap.min.js";
import { debounce, qs, qsa } from "./utils.js";

// Scroll-driven animation for the whole page.
//
// Elements that also have micro-interactions (cards, certificates, skills...) are animated through
// CSS custom properties (--sx, --sy, --ss, --sry, --cp, --cl, --cr, --rad) instead of GSAP's own
// transform. The `.sv` class turns those properties into `transform` and `clip-path`, which leaves the
// independent `translate` / `scale` properties free for the hover and press springs.

const cardRadius = () => getComputedStyle(document.documentElement).getPropertyValue("--radius").trim() || "22px";

const AT_REST = { opacity: 1, "--sx": "0px", "--sy": "0px", "--ss": 1, "--sry": "0deg", "--cp": "0%", "--cl": "0%", "--cr": "0%" };

// Once a scrubbed timeline has fully caught up, drop the transform and clip so hover effects
// (and the glow) aren't clipped. Uses the timeline's own progress, which lags the scroll smoothly.
// Adds a fromTo to the timeline only when the target exists.
function addTween(tl, targets, from, to, position) {
  const list = targets instanceof Element ? [targets] : Array.from(targets || []);
  if (list.length) tl.fromTo(list, from, to, position);
  return tl;
}

function markDoneAtEnd(el) {
  return function onUpdate() {
    el.classList.toggle("sv-done", this.progress() > 0.999);
  };
}

// ---- Hero ----------------------------------------------------------------------------
function heroIntro(EASE) {
  // Split into words as well as characters so lines can only break between words.
  const name = SplitText.create(".hero__name span", { type: "words,chars", mask: "chars" });
  const chips = qsa(".hero__photo .chip");
  const frameRadius = getComputedStyle(qs(".hero__photo .frame")).borderTopLeftRadius || "34px";
  const tl = gsap.timeline({ defaults: { ease: EASE.expoOut }, delay: 0.1 });

  tl.from(".hero .eyebrow", { opacity: 0, y: 16, duration: 0.9 }, 0)
    .from(name.chars, { yPercent: 120, rotate: 8, duration: 1.3, stagger: 0.03 }, 0.05)
    .from(".hero__tag", { opacity: 0, y: 20, duration: 1 }, 0.25)
    .from(".hero__cta", { opacity: 0, y: 26, duration: 1 }, 0.55)
    .fromTo(
      ".hero__photo .frame",
      { clipPath: `inset(100% 0% 0% 0% round ${frameRadius})` },
      { clipPath: `inset(0% 0% 0% 0% round ${frameRadius})`, duration: 1.6, ease: EASE.expoInOut, clearProps: "clipPath" },
      0.1
    )
    .from(".hero__photo .frame img", { scale: 1.35, duration: 1.9 }, 0.1)
    .from(chips, { scale: 0, opacity: 0, duration: 0.9, stagger: 0.12, ease: EASE.pop }, 1.0)
    .add(() => {
      // Gentle idle float once the chips have landed.
      chips.forEach((chip, i) => {
        gsap.to(chip, { y: i % 2 ? 9 : -9, duration: 2.6 + i * 0.5, ease: "sine.inOut", yoyo: true, repeat: -1 });
      });
    });
}

function heroParallax() {
  const trigger = { trigger: ".hero", start: "top top", end: "bottom top", scrub: true };
  gsap.to(".hero__photo", { yPercent: -14, ease: "none", scrollTrigger: trigger });
  gsap.to(".hero__text", { yPercent: -8, opacity: 0.25, ease: "none", scrollTrigger: trigger });
}

// ---- Generic reveals -----------------------------------------------------------------
function genericReveals(EASE) {
  const items = qsa(".reveal");
  items.forEach((el) => el.classList.add("sv"));
  gsap.set(items, { opacity: 0, "--sy": "56px", "--ss": 0.95 });
  const finish = (els) => els.forEach((el) => el.classList.add("sv-done"));
  ScrollTrigger.batch(items, {
    start: "top 90%",
    once: true,
    onEnter: (batch) => {
      // A fast jump (nav link, rail, scrollbar drag) can "enter" dozens of elements at once.
      // Anything already above the viewport snaps into place; the rest share a capped stagger
      // so the element you landed on never waits behind the others.
      const passed = batch.filter((el) => el.getBoundingClientRect().bottom < 0);
      const visible = batch.filter((el) => !passed.includes(el));
      if (passed.length) {
        gsap.set(passed, AT_REST);
        finish(passed);
      }
      if (!visible.length) return;
      gsap.to(visible, {
        ...AT_REST,
        duration: 1.2,
        stagger: Math.min(0.09, 0.5 / visible.length),
        ease: EASE.expoOut,
        overwrite: true,
        onComplete: () => finish(visible),
      });
    },
  });
}

// ---- Projects: alternating, morphing, scrubbed ----------------------------------------
function projectCards(EASE, distance) {
  qsa(".project").forEach((card, i) => {
    card.classList.add("sv");
    const dir = i % 2 === 0 ? -1 : 1;
    const wide = card.classList.contains("project--wide");
    const title = SplitText.create(qs("h3", card), { type: "words", mask: "words" });

    const tl = gsap.timeline({
      defaults: { ease: EASE.expoOut },
      onUpdate: markDoneAtEnd(card),
      scrollTrigger: { trigger: card, start: "top 95%", end: "top 40%", scrub: 0.8 },
    });

    tl.fromTo(
      card,
      {
        opacity: 0,
        "--sx": `${wide ? 0 : dir * distance}px`,
        "--sy": wide ? "90px" : "40px",
        "--ss": 0.82,
        "--sry": `${wide ? 0 : -dir * 16}deg`,
        "--cp": "9%",
        "--rad": "96px",
      },
      { ...AT_REST, "--rad": cardRadius(), duration: 1 },
      0
    );
    addTween(tl, qs(".project__viz", card), { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.8 }, 0.1);
    addTween(tl, qs(".project__no", card), { opacity: 0, x: -dir * 36 }, { opacity: 1, x: 0, duration: 0.7 }, 0.15);
    addTween(tl, title.words, { yPercent: 118 }, { yPercent: 0, duration: 0.8, stagger: 0.06 }, 0.2);
    addTween(tl, qsa(":scope > p:not(.project__result)", card), { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.7, stagger: 0.1 }, 0.35);
    addTween(tl, qs(".project__result", card), { clipPath: "inset(0% 100% 0% 0%)" }, { clipPath: "inset(0% 0% 0% 0%)", duration: 0.7, ease: EASE.smooth }, 0.5);
    addTween(tl, qsa(".tags li", card), { opacity: 0, scale: 0.5 }, { opacity: 1, scale: 1, duration: 0.5, stagger: 0.05, ease: EASE.pop }, 0.6);
  });
}

// ---- Background: timeline line and experience / education cards ------------------------
function backgroundSection(EASE, distance) {
  const journey = qs(".journey");
  if (journey) {
    const steps = qsa("li", journey);
    gsap.fromTo(
      journey,
      { "--p": 0 },
      {
        "--p": 1,
        ease: "none",
        scrollTrigger: {
          trigger: journey,
          start: "top 85%",
          end: "bottom 55%",
          scrub: 0.6,
          onUpdate(self) {
            steps.forEach((li, i) => li.classList.toggle("is-on", self.progress >= i / (steps.length - 1) - 0.001));
          },
        },
      }
    );
  }

  qsa(".bg__col").forEach((column, columnIndex) => {
    const dir = columnIndex === 0 ? -1 : 1;
    qsa(".card", column).forEach((card) => {
      card.classList.add("sv");
      const wipe = dir < 0 ? "--cr" : "--cl";
      const tl = gsap.timeline({
        defaults: { ease: EASE.expoOut },
        onUpdate: markDoneAtEnd(card),
        scrollTrigger: { trigger: card, start: "top 92%", end: "top 50%", scrub: 0.7 },
      });
      tl.fromTo(
        card,
        { opacity: 0, "--sx": `${dir * distance * 0.6}px`, "--ss": 0.9, "--sry": `${-dir * 10}deg`, [wipe]: "100%", "--rad": "60px" },
        { ...AT_REST, "--rad": cardRadius(), duration: 1 },
        0
      );
      addTween(tl, qs(".card__mark", card), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: EASE.pop }, 0.2);
      addTween(tl, qsa("header h4, header .role", card), { opacity: 0, x: dir * 24 }, { opacity: 1, x: 0, duration: 0.6, stagger: 0.08 }, 0.25);
      addTween(tl, qsa("ul li", card), { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.07 }, 0.4);
    });
  });
}

// ---- Certificates: featured degree ---------------------------------------------------
function degreeCard(EASE) {
  const degree = qs(".degree");
  if (!degree) return;
  degree.classList.add("sv");
  const tl = gsap.timeline({
    defaults: { ease: EASE.expoOut },
    onUpdate: markDoneAtEnd(degree),
    scrollTrigger: { trigger: degree, start: "top 92%", end: "top 35%", scrub: 0.8 },
  });
  tl.fromTo(degree, { opacity: 0, "--sy": "90px", "--ss": 0.88, "--cp": "8%", "--rad": "90px" }, { ...AT_REST, "--rad": getComputedStyle(degree).getPropertyValue("--radius-lg").trim() || "34px", duration: 1 }, 0);
  addTween(tl, qs(".degree__thumb", degree), { rotate: -8, y: 50, opacity: 0 }, { rotate: 0, y: 0, opacity: 1, duration: 0.8 }, 0.15);
  addTween(tl, qsa(".degree__body > *", degree), { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.6, stagger: 0.07 }, 0.3);
}

// ---- Statement ------------------------------------------------------------------------
function statementHighlight() {
  const text = qs(".statement__text");
  if (!text) return;
  const split = SplitText.create(text, { type: "words" });
  gsap.fromTo(
    split.words,
    { opacity: 0.14 },
    {
      opacity: 1,
      ease: "none",
      stagger: 0.1,
      scrollTrigger: { trigger: text, start: "top 80%", end: "bottom 45%", scrub: 0.6 },
    }
  );
}

// ---- Count-up numbers -----------------------------------------------------------------
// Animates the leading number in each stat ("~2.5%", "25+", "72 → 1"), keeping the rest of the text.
function countUps(EASE) {
  qsa(".stats strong").forEach((el) => {
    const match = el.textContent.match(/^(\D*?)(\d+(?:\.\d+)?)(.*)$/s);
    if (!match) return;
    const [, prefix, number, suffix] = match;
    const decimals = (number.split(".")[1] || "").length;
    const value = { n: 0 };
    const final = el.textContent;
    el.setAttribute("aria-label", final);
    gsap.to(value, {
      n: parseFloat(number),
      duration: 1.6,
      ease: EASE.expoOut,
      scrollTrigger: { trigger: el, start: "top 92%", once: true },
      onUpdate: () => {
        el.textContent = `${prefix}${value.n.toFixed(decimals)}${suffix}`;
      },
      onComplete: () => {
        el.textContent = final;
      },
    });
  });
}

// ---- Contact headline ----------------------------------------------------------------
function contactLead(EASE) {
  const lead = qs(".contact__lead");
  if (!lead) return;
  const split = SplitText.create(lead, { type: "words", mask: "words" });
  gsap.from(split.words, {
    yPercent: 115,
    duration: 1.1,
    stagger: 0.06,
    ease: EASE.expoOut,
    scrollTrigger: { trigger: lead, start: "top 88%", once: true },
  });
}

export function initShowcase({ EASE }) {
  const mm = gsap.matchMedia();

  // Layout-independent motion: created once, so resizing never replays the intro.
  mm.add("(prefers-reduced-motion: no-preference)", () => {
    heroIntro(EASE);
    heroParallax();
    statementHighlight();
    genericReveals(EASE);
    countUps(EASE);
    contactLead(EASE);
  });

  // Distances depend on the layout, so these are rebuilt when crossing the breakpoint.
  mm.add(
    {
      desktop: "(min-width: 901px) and (prefers-reduced-motion: no-preference)",
      mobile: "(max-width: 900px) and (prefers-reduced-motion: no-preference)",
    },
    (context) => {
      const distance = context.conditions.desktop ? 160 : 44;
      backgroundSection(EASE, distance);
      projectCards(EASE, distance);
      degreeCard(EASE);
    }
  );

  // Fonts, lazy images and dynamic content change the layout after start-up. Recalculate trigger
  // positions whenever the page height changes, otherwise reveals fire at stale scroll offsets.
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh(), { once: true });
  let lastHeight = document.body.scrollHeight;
  const observer = new ResizeObserver(
    debounce(() => {
      const height = document.body.scrollHeight;
      if (Math.abs(height - lastHeight) < 2) return;
      lastHeight = height;
      ScrollTrigger.refresh();
    }, 200)
  );
  observer.observe(document.body);
}
