import { gsap, ScrollTrigger } from "../vendor/gsap.min.js";

// Animated diagrams for the Notable Projects cards.
//
// Each diagram explains the *mechanism* of a project (what broke, what was built, what changed)
// using only figures from the resume. Where proportions are not real data, the panel says
// "Illustrative". Diagrams are themed through CSS classes (.v-node, .v-text, ...) in themes.css,
// play only while visible, and show their resolved end state when motion is reduced.

const SVG_NS = "http://www.w3.org/2000/svg";

// ---- Small SVG builders ------------------------------------------------------------------
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");

function box(x, y, w, h, label, sub = "", { cls = "", nodeCls = "", id = "", r = 10 } = {}) {
  const subs = Array.isArray(sub) ? sub : sub ? [sub] : [];
  const ly = subs.length ? h / 2 - 2 - (subs.length - 1) * 5.5 : h / 2 + 4;
  return `<g class="vb ${cls}" ${id ? `data-id="${id}"` : ""} transform="translate(${x} ${y})">
    <rect class="v-node ${nodeCls}" width="${w}" height="${h}" rx="${r}"/>
    <text class="v-text" x="${w / 2}" y="${ly}" text-anchor="middle">${esc(label)}</text>
    ${subs.map((line, i) => `<text class="v-sub" x="${w / 2}" y="${ly + 13 + i * 11}" text-anchor="middle">${esc(line)}</text>`).join("")}
  </g>`;
}

const line = (x1, y1, x2, y2, cls = "") => `<line class="v-link ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"/>`;
const text = (x, y, value, cls = "v-sub", anchor = "start", id = "") =>
  `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}" ${id ? `data-id="${id}"` : ""}>${esc(value)}</text>`;
const caption = (value) => `<div class="viz-caption">${esc(value)}</div>`;

// Two overlaid status lines that cross-fade.
function status(x, y, id, anchor = "start") {
  return `<text class="v-text" data-id="${id}-a" x="${x}" y="${y}" text-anchor="${anchor}"></text>
          <text class="v-text" data-id="${id}-b" x="${x}" y="${y}" text-anchor="${anchor}" opacity="0"></text>`;
}

// Returns a function that swaps the status text with a short cross-fade.
function statusSwapper(root, id) {
  const a = root.querySelector(`[data-id="${id}-a"]`);
  const b = root.querySelector(`[data-id="${id}-b"]`);
  let front = a;
  return (tl, value, position, cls = "v-text") => {
    tl.add(() => {
      const back = front === a ? b : a;
      back.textContent = value;
      back.setAttribute("class", cls);
      gsap.to(back, { opacity: 1, duration: 0.35 });
      gsap.to(front, { opacity: 0, duration: 0.35 });
      front = back;
    }, position);
  };
}

const $ = (root, id) => root.querySelector(`[data-id="${id}"]`);
const $$ = (root, selector) => Array.from(root.querySelectorAll(selector));

// ---- 01 Enterprise Data Platform Recovery ---------------------------------------------------
const recovery = {
  viewBox: "0 0 480 200",
  markup: () => `
    ${status(14, 34, "st")}
    ${line(106, 98, 136, 98)} ${line(228, 98, 258, 98)} ${line(350, 98, 380, 98)}
    ${box(14, 75, 92, 46, "SharePoint", "Source files")}
    <g data-id="auth">
      ${box(136, 75, 92, 46, "Legacy auth", "SharePoint app")}
      <g data-id="auth-new" opacity="0">${box(136, 75, 92, 46, "Entra ID", "Certificate", { nodeCls: "v-node--good" })}</g>
    </g>
    ${box(258, 75, 92, 46, "Azure Function", "Weekly job", { id: "fn" })}
    ${box(380, 75, 86, 46, "Forecast", "Ops · Prod · Purch.", { id: "out" })}
    <g data-id="x" opacity="0" transform="translate(121 98)">
      <circle r="9" class="v-bad"/>
      <path d="M-3.5 -3.5 L3.5 3.5 M3.5 -3.5 L-3.5 3.5" stroke="#fff" stroke-width="2" stroke-linecap="round"/>
    </g>
    <circle data-id="ring" cx="304" cy="98" r="30" fill="none" class="v-link v-link--accent" opacity="0"/>
    ${[0, 1, 2].map((i) => `<circle class="v-accent" data-id="p${i}" cx="106" cy="98" r="4" opacity="0"/>`).join("")}
    <rect x="14" y="160" width="452" height="4" rx="2" class="v-dim" opacity="0.35"/>
    <rect data-id="weeks" x="14" y="160" width="0" height="4" rx="2" class="v-bad"/>
    ${text(14, 182, "", "v-sub", "start", "weeks-label")}
    <g data-id="ok" opacity="0" transform="translate(452 75)"><circle r="9" class="v-good"/>
      <path d="M-4 0 L-1 3 L4 -3" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/></g>`,
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power2.inOut", immediateRender: false } });
    const say = statusSwapper(root, "st");
    const packets = [0, 1, 2].map((i) => $(root, `p${i}`));
    const flow = (position, until = 380) => {
      packets.forEach((p, i) => {
        tl.fromTo(p, { attr: { cx: 106 }, opacity: 0 }, { attr: { cx: until }, opacity: 1, duration: 1.1, ease: "none" }, position + i * 0.25);
        tl.to(p, { opacity: 0, duration: 0.2 }, position + i * 0.25 + 1.1);
      });
    };
    tl.set($(root, "auth-new"), { opacity: 0 }).set($(root, "x"), { opacity: 0, scale: 0.4, transformOrigin: "50% 50%" });
    tl.set($(root, "weeks"), { attr: { width: 0 } }).set($(root, "ok"), { opacity: 0 }).set($(root, "ring"), { opacity: 0 });
    tl.add(() => ($(root, "weeks-label").textContent = ""), 0);
    say(tl, "Weekly forecast pipeline running", 0);
    flow(0.1);
    say(tl, "Microsoft retires the legacy SharePoint auth", 2.2, "v-text v-bad");
    tl.to($(root, "x"), { opacity: 1, scale: 1, duration: 0.4, ease: "back.out(2.5)" }, 2.3);
    packets.forEach((p, i) => {
      tl.fromTo(p, { attr: { cx: 106 }, opacity: 1 }, { attr: { cx: 118 }, duration: 0.4, ease: "power2.out" }, 2.6 + i * 0.15);
      tl.to(p, { opacity: 0, duration: 0.3 }, 3.0 + i * 0.15);
    });
    tl.add(() => ($(root, "weeks-label").textContent = "Manual fallback for ~3.5 weeks"), 3.2);
    tl.to($(root, "weeks"), { attr: { width: 452 }, duration: 1.6, ease: "none" }, 3.2);
    say(tl, "Root cause found · auth migrated to Entra ID", 5.0, "v-text");
    tl.to($(root, "x"), { opacity: 0, scale: 0.4, duration: 0.3 }, 5.0);
    tl.to($(root, "auth-new"), { opacity: 1, duration: 0.5 }, 5.1);
    tl.fromTo($(root, "ring"), { opacity: 0.9, attr: { r: 26 } }, { opacity: 0, attr: { r: 52 }, duration: 0.9, ease: "power1.out" }, 5.7);
    tl.add(() => ($(root, "weeks-label").textContent = "Azure Function redeployed via Cloud Shell"), 5.7);
    say(tl, "Forecast automated again", 6.6, "v-text v-accent-text");
    flow(6.6);
    tl.to($(root, "ok"), { opacity: 1, duration: 0.4 }, 7.6);
    tl.addLabel("final", 8.2);
    return tl;
  },
};

// ---- 02 Silent pipeline failure -------------------------------------------------------------
const pipeline = {
  viewBox: "0 0 480 200",
  markup: () => `
    ${status(14, 26, "st")}
    ${[90, 184, 278, 372].map((x) => line(x, 63, x + 18, 63)).join("")}
    ${box(14, 42, 76, 42, "Source", "POS data")}
    ${box(108, 42, 76, 42, "Ingest", "Pipeline")}
    <g data-id="cat">${box(202, 42, 76, 42, "Category", "Transform")}</g>
    <g data-id="cat-bad" opacity="0">${box(202, 42, 76, 42, "Category", "Failing silently", { nodeCls: "v-node--bad" })}</g>
    ${box(296, 42, 76, 42, "SQL pool", "Warehouse")}
    ${box(390, 42, 76, 42, "Reports", "Power BI", { id: "rep" })}
    ${[0, 1, 2, 3].map((i) => `<circle data-id="d${i}" cx="52" cy="63" r="4" class="v-accent" opacity="0"/>`).join("")}
    <path class="v-link" d="M24 150 H456"/>
    <path data-id="branch" class="v-link v-link--accent" d="M150 150 C 175 150 175 176 200 176 H300 C 325 176 325 150 350 150" fill="none"/>
    <circle cx="150" cy="150" r="5" class="v-dim"/>
    <circle data-id="c1" cx="225" cy="176" r="5" class="v-accent" opacity="0"/>
    <circle data-id="c2" cx="275" cy="176" r="5" class="v-accent" opacity="0"/>
    <circle data-id="merge" cx="350" cy="150" r="6" class="v-accent" opacity="0"/>
    <circle data-id="rel" cx="420" cy="150" r="6" class="v-good" opacity="0"/>
    ${text(205, 194, "fix/category branch", "v-sub", "start", "bl")}
    ${text(350, 138, "PR review", "v-sub", "middle", "prl")}
    ${text(420, 138, "Release", "v-sub", "middle", "rell")}
    ${text(24, 140, "main", "v-sub")}`,
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power2.inOut", immediateRender: false } });
    const say = statusSwapper(root, "st");
    const branch = $(root, "branch");
    const length = branch.getTotalLength();
    const drops = [0, 1, 2, 3].map((i) => $(root, `d${i}`));
    const run = (position, broken) => {
      drops.forEach((d, i) => {
        const t = position + i * 0.3;
        tl.set(d, { attr: { class: "v-accent" } }, t);
        tl.fromTo(d, { attr: { cx: 52 }, opacity: 0 }, { attr: { cx: 428 }, opacity: 1, duration: 1.6, ease: "none" }, t);
        if (broken) tl.set(d, { attr: { class: "v-dim" } }, t + 0.95);
        tl.to(d, { opacity: 0, duration: 0.2 }, t + 1.6);
      });
    };
    tl.set(branch, { strokeDasharray: length, strokeDashoffset: length });
    tl.set([$(root, "c1"), $(root, "c2"), $(root, "merge"), $(root, "rel")], { opacity: 0 });
    tl.set([$(root, "bl"), $(root, "prl"), $(root, "rell")], { opacity: 0 });
    tl.set($(root, "cat-bad"), { opacity: 0 });
    say(tl, "Category transform fails, but no alert fires", 0, "v-text");
    tl.to($(root, "cat-bad"), { opacity: 1, duration: 0.4 }, 0.2);
    run(0.3, true);
    say(tl, "6 weeks of wrong product categories", 2.4, "v-text v-bad");
    say(tl, "Isolated fix on its own Git branch", 3.6, "v-text");
    tl.to(branch, { strokeDashoffset: length * 0.45, duration: 1, ease: "power1.inOut" }, 3.6);
    tl.to($(root, "bl"), { opacity: 1, duration: 0.3 }, 3.8);
    tl.to($(root, "c1"), { opacity: 1, duration: 0.3, ease: "back.out(3)" }, 3.9);
    tl.to($(root, "c2"), { opacity: 1, duration: 0.3, ease: "back.out(3)" }, 4.3);
    say(tl, "Validated through PR review, then released", 4.8, "v-text");
    tl.to(branch, { strokeDashoffset: 0, duration: 0.8 }, 4.8);
    tl.to([$(root, "merge"), $(root, "prl")], { opacity: 1, duration: 0.3 }, 5.5);
    tl.to([$(root, "rel"), $(root, "rell")], { opacity: 1, duration: 0.3 }, 6.0);
    tl.to($(root, "cat-bad"), { opacity: 0, duration: 0.4 }, 6.0);
    say(tl, "Category data correct across the catalogue", 6.3, "v-text v-accent-text");
    run(6.3, false);
    tl.addLabel("final", 8.4);
    return tl;
  },
};

// ---- 03 Revenue reconciliation (~2.5% gap) ----------------------------------------------------------------
const reconcile = {
  viewBox: "0 0 480 200",
  markup: () => `
    ${status(14, 26, "st")}
    <rect x="60" y="50" width="70" height="120" rx="8" class="v-bar--ref"/>
    ${text(95, 186, "POS (record)", "v-sub", "middle")}
    <rect data-id="pbi" x="160" y="78" width="70" height="92" rx="8" class="v-bar"/>
    <rect data-id="gap" x="160" y="50" width="70" height="28" rx="6" fill="none" class="v-link v-link--dash" style="stroke: var(--danger)"/>
    ${text(195, 68, "~2.5% gap", "v-sub v-bad", "middle", "gapl")}
    ${text(195, 186, "Power BI", "v-sub", "middle")}
    <g transform="translate(272 46)">
      <rect class="v-node" width="194" height="124" rx="10"/>
      ${text(12, 18, "Azure SQL script", "v-text")}
      ${[0, 1, 2, 3, 4, 5].map((i) => `<rect data-id="ln${i}" x="12" y="${30 + i * 14}" width="${[150, 120, 160, 110, 140, 90][i]}" height="6" rx="3" class="v-dim"/>`).join("")}
      <rect data-id="scan" x="6" y="26" width="182" height="14" rx="4" class="v-accent" opacity="0"/>
      ${text(12, 116, "", "v-sub", "start", "codel")}
    </g>`,
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, defaults: { ease: "power2.inOut", immediateRender: false } });
    const say = statusSwapper(root, "st");
    const lines = [0, 1, 2, 3, 4, 5].map((i) => $(root, `ln${i}`));
    tl.set($(root, "pbi"), { attr: { y: 78, height: 92 } }).set($(root, "gap"), { opacity: 1 });
    tl.set(lines, { attr: { class: "v-dim" } }).set($(root, "scan"), { opacity: 0, attr: { y: 26 } });
    tl.add(() => {
      $(root, "gapl").textContent = "~2.5% gap";
      $(root, "gapl").setAttribute("class", "v-sub v-bad");
      $(root, "codel").textContent = "";
    }, 0);
    say(tl, "Power BI disagrees with the system of record", 0, "v-text");
    tl.fromTo($(root, "gap"), { opacity: 0.3 }, { opacity: 1, duration: 0.5, repeat: 3, yoyo: true }, 0.3);
    say(tl, "Tracing the gap through the SQL script", 2.2, "v-text");
    tl.to($(root, "scan"), { opacity: 0.18, duration: 0.2 }, 2.3);
    tl.to($(root, "scan"), { attr: { y: 26 + 14 * 5 }, duration: 1.4, ease: "power1.inOut" }, 2.4);
    tl.to($(root, "scan"), { attr: { y: 26 + 14 * 2 }, duration: 0.6 }, 3.8);
    tl.set([lines[2], lines[3]], { attr: { class: "v-bad" } }, 4.4);
    tl.add(() => ($(root, "codel").textContent = "Hard-coded category exclusions"), 4.4);
    say(tl, "Replaced with a governed category mapping", 5.4, "v-text");
    tl.set(lines, { attr: { class: "v-bar" } }, 5.6);
    tl.to($(root, "scan"), { opacity: 0, duration: 0.3 }, 5.6);
    tl.add(() => ($(root, "codel").textContent = "Governed mapping standard"), 5.6);
    tl.to($(root, "pbi"), { attr: { y: 50, height: 120 }, duration: 1.1, ease: "power3.out" }, 6.0);
    tl.to($(root, "gap"), { opacity: 0, duration: 0.4 }, 6.4);
    tl.add(() => {
      $(root, "gapl").textContent = "Matches ✓";
      $(root, "gapl").setAttribute("class", "v-sub v-good");
    }, 6.9);
    say(tl, "Numbers reconciled", 6.9, "v-text v-accent-text");
    tl.addLabel("final", 7.6);
    return tl;
  },
  caption: "Illustrative proportions",
};

// ---- 04 Multi-branch DAX and RLS --------------------------------------------------------------
const rls = {
  viewBox: "0 0 480 200",
  markup: () => {
    const dots = [];
    for (let r = 0; r < 5; r++) {
      for (let c = 0; c < 5; c++) dots.push(`<circle data-dot="${r * 5 + c}" cx="${36 + c * 30}" cy="${50 + r * 28}" r="8" class="v-dim"/>`);
    }
    return `
    ${status(14, 26, "st")}
    ${dots.join("")}
    <circle data-id="new" cx="186" cy="162" r="8" class="v-accent" opacity="0"/>
    ${text(186, 186, "New outlet", "v-sub", "middle", "newl")}
    <g transform="translate(232 44)">
      <rect class="v-node" width="234" height="40" rx="10"/>
      ${text(12, 25, "Slicer", "v-sub")}
      <g data-id="s1"><rect x="56" y="9" width="76" height="22" rx="11" class="v-node"/>${text(94, 24, "Region", "v-sub", "middle")}</g>
      <g data-id="s2"><rect x="140" y="9" width="84" height="22" rx="11" class="v-node"/>${text(182, 24, "Branch", "v-sub", "middle")}</g>
    </g>
    <g transform="translate(232 96)">
      <rect class="v-node" width="234" height="60" rx="10"/>
      ${text(12, 22, "Row-Level Security", "v-text")}
      ${text(12, 42, "", "v-sub", "start", "user")}
      <path data-id="lock" transform="translate(206 22)" d="M-6 0 h12 v10 h-12 z M-4 0 v-4 a4 4 0 0 1 8 0 v4" class="v-link v-link--accent" fill="none"/>
    </g>
    ${text(232, 178, "TREATAS bridges fact / dimension gaps", "v-sub")}`;
  },
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { immediateRender: false } });
    const say = statusSwapper(root, "st");
    const dots = $$(root, "[data-dot]");
    const light = (indices, position) => {
      dots.forEach((d, i) => tl.set(d, { attr: { class: indices.includes(i) ? "v-accent" : "v-dim" } }, position + (indices.includes(i) ? i * 0.012 : 0)));
    };
    const all = dots.map((_, i) => i);
    const region = [0, 1, 5, 6, 10, 11, 15, 16];
    const manager = [2, 3, 7, 8, 12, 13];
    const user = $(root, "user");
    tl.set($(root, "new"), { opacity: 0, scale: 0, transformOrigin: "50% 50%" }).set($(root, "newl"), { opacity: 0 });
    tl.add(() => (user.textContent = "Signed in as: HQ · sees all branches"), 0);
    light(all, 0);
    say(tl, "25+ branches on one governed model", 0, "v-text");
    say(tl, "One slicer filters every report consistently", 1.6, "v-text");
    tl.fromTo($(root, "s1"), { opacity: 0.4 }, { opacity: 1, duration: 0.3, repeat: 1, yoyo: true }, 1.6);
    light(region, 1.9);
    tl.fromTo($(root, "s2"), { opacity: 0.4 }, { opacity: 1, duration: 0.3, repeat: 1, yoyo: true }, 2.9);
    light([5, 6], 3.2);
    say(tl, "RLS: each manager sees only their branches", 4.3, "v-text");
    tl.add(() => (user.textContent = "Signed in as: Area manager · 6 branches"), 4.3);
    tl.fromTo($(root, "lock"), { scale: 0.6, transformOrigin: "50% 50%" }, { scale: 1, duration: 0.5, ease: "back.out(3)" }, 4.3);
    light(manager, 4.4);
    tl.add(() => (user.textContent = "Signed in as: HQ · sees all branches"), 5.8);
    light(all, 5.8);
    say(tl, "Extended to a newly onboarded outlet", 6.5, "v-text v-accent-text");
    tl.to($(root, "new"), { opacity: 1, scale: 1, duration: 0.6, ease: "back.out(3)" }, 6.6);
    tl.to($(root, "newl"), { opacity: 1, duration: 0.3 }, 6.8);
    tl.addLabel("final", 7.6);
    return tl;
  },
};

// ---- 05 From manual reporting to automation ----------------------------------------------------
const automation = {
  viewBox: "0 0 480 200",
  markup: () => {
    const files = [];
    for (let i = 0; i < 72; i++) {
      const c = i % 12;
      const r = Math.floor(i / 12);
      files.push(`<rect data-file="${i}" x="${14 + c * 11}" y="${46 + r * 14}" width="8" height="10" rx="1.5" class="v-bar" opacity="${[1, 0.75, 0.55, 0.35][i % 4]}"/>`);
    }
    return `
    ${status(14, 26, "st")}
    ${files.join("")}
    ${text(14, 144, "72 files · 4 formats", "v-sub")}
    ${text(14, 157, "2024–2026", "v-sub")}
    ${line(150, 80, 168, 80)} ${line(246, 80, 262, 80)} ${line(340, 80, 356, 80)}
    ${box(168, 58, 78, 44, "Python", "Google Colab")}
    ${box(262, 58, 78, 44, "1 dataset", "Governed", { id: "ds" })}
    ${box(356, 58, 110, 44, "Synapse → Power BI", "Auto-refresh")}
    ${text(180, 146, "72", "v-big", "start", "count")}
    ${text(216, 146, "files to process", "v-sub", "start", "countl")}
    ${text(318, 146, "863", "v-big", "start", "errs")}
    ${text(366, 146, "formula errors", "v-sub", "start", "errl")}
    ${text(180, 176, "Plus a 53-sheet data dictionary: 45+ pipelines, 49 SQL tables", "v-sub")}`;
  },
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, defaults: { immediateRender: false } });
    const say = statusSwapper(root, "st");
    const files = $$(root, "[data-file]");
    const counter = { files: 72, errors: 863 };
    const count = $(root, "count");
    const errs = $(root, "errs");
    const render = () => {
      count.textContent = String(Math.round(counter.files));
      errs.textContent = String(Math.round(counter.errors));
    };
    tl.set(files, { x: 0, y: 0, scale: 1, opacity: (i) => [1, 0.75, 0.55, 0.35][i % 4], transformOrigin: "50% 50%" });
    tl.set(counter, { files: 72, errors: 863, onUpdate: render, onComplete: render });
    tl.set($(root, "ds"), { scale: 1, transformOrigin: "50% 50%" });
    tl.add(() => ($(root, "countl").textContent = "files to process"), 0);
    say(tl, "A fully manual quarterly file-processing job", 0, "v-text");
    say(tl, "Python consolidates every file automatically", 1.4, "v-text");
    files.forEach((f, i) => {
      const fx = 14 + (i % 12) * 11;
      const fy = 46 + Math.floor(i / 12) * 14;
      tl.to(f, { x: 205 - fx, y: 76 - fy, scale: 0.2, opacity: 0, duration: 0.8, ease: "power3.in" }, 1.5 + i * 0.022);
    });
    tl.to(counter, { files: 1, duration: 1.6, ease: "power2.inOut", onUpdate: render }, 1.6);
    tl.fromTo($(root, "ds"), { scale: 1 }, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1, ease: "power2.out" }, 3.4);
    tl.add(() => ($(root, "countl").textContent = "governed dataset"), 3.3);
    say(tl, "Manual Excel report → auto-refreshing dashboard", 4.0, "v-text");
    tl.to(counter, { errors: 0, duration: 1.4, ease: "power2.inOut", onUpdate: render }, 4.1);
    say(tl, "Manual work eliminated", 5.7, "v-text v-accent-text");
    tl.addLabel("final", 6.2);
    return tl;
  },
};

// ---- 06 Asset Portfolio System and GenAI tools -------------------------------------------------
const ocr = {
  viewBox: "0 0 480 200",
  markup: () => `
    ${status(14, 26, "st")}
    <g transform="translate(14 40)">
      <rect class="v-node" width="104" height="142" rx="8"/>
      ${text(10, 18, "SSM filing (PDF)", "v-sub")}
      ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<rect data-ln="${i}" x="10" y="${30 + i * 15}" width="${[80, 60, 84, 70, 56, 78, 64][i]}" height="5" rx="2.5" class="v-dim"/>`).join("")}
      <rect data-id="beam" x="4" y="26" width="96" height="10" rx="3" class="v-accent" opacity="0"/>
    </g>
    ${line(118, 110, 128, 110)} ${line(246, 110, 254, 110)}
    ${box(128, 80, 118, 60, "AI Builder", ["OCR extraction", "+ Power Automate"])}
    <g transform="translate(254 40)">
      <rect class="v-node" width="212" height="104" rx="10"/>
      ${text(12, 20, "Asset Portfolio System · Dataverse", "v-sub")}
      ${["Total assets", "Total liabilities", "Equity"]
        .map((label, i) => `${text(12, 44 + i * 22, label, "v-text")}<rect data-cell="${i}" x="112" y="${35 + i * 22}" width="0" height="12" rx="4" class="v-bar"/>`)
        .join("")}
    </g>
    <g transform="translate(254 154)"><g data-id="chat" opacity="0">
      <rect class="v-node v-node--accent" width="212" height="30" rx="15"/>
      ${text(14, 19, "GenAI legal assistant", "v-text")}
      ${[0, 1, 2].map((i) => `<circle data-typing="${i}" cx="${170 + i * 10}" cy="15" r="3" class="v-accent"/>`).join("")}
    </g></g>`,
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { immediateRender: false } });
    const say = statusSwapper(root, "st");
    const beam = $(root, "beam");
    const lines = $$(root, "[data-ln]");
    const cells = $$(root, "[data-cell]");
    tl.set(beam, { opacity: 0, attr: { y: 26 } }).set(lines, { attr: { class: "v-dim" } }).set(cells, { attr: { width: 0 } });
    tl.set($(root, "chat"), { opacity: 0, y: 8 });
    say(tl, "Balance-sheet figures buried in PDF filings", 0, "v-text");
    say(tl, "OCR reads the filing", 1.2, "v-text");
    tl.to(beam, { opacity: 0.22, duration: 0.2 }, 1.2);
    tl.to(beam, { attr: { y: 26 + 15 * 6 }, duration: 1.8, ease: "power1.inOut" }, 1.3);
    [1, 3, 5].forEach((ln, i) => tl.set(lines[ln], { attr: { class: "v-bar" } }, 1.6 + i * 0.5));
    tl.to(beam, { opacity: 0, duration: 0.2 }, 3.1);
    say(tl, "Figures land in the asset tracker, no retyping", 3.2, "v-text");
    cells.forEach((c, i) => tl.to(c, { attr: { width: [84, 64, 46][i] }, duration: 0.6, ease: "power3.out" }, 3.3 + i * 0.25));
    say(tl, "Plus a GenAI assistant for recovery documents", 4.8, "v-text v-accent-text");
    tl.to($(root, "chat"), { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" }, 4.9);
    tl.fromTo($$(root, "[data-typing]"), { y: 0 }, { y: -4, duration: 0.3, stagger: 0.12, yoyo: true, repeat: 3, ease: "sine.inOut" }, 5.3);
    tl.addLabel("final", 6.4);
    return tl;
  },
  caption: "Field names only, no client data",
};

// ---- 07 Final year project: web-based Power BI reporting with data upload ----------------------
// Story: the report is live on the web -> the user clicks "Upload data" and picks a CSV / XLSX ->
// the file uploads -> the report refreshes with current + new data (a new month appears).
const BAR_HEIGHTS = [62, 74, 58, 86, 92, 80, 98, 104, 96];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
const DONUT = { cx: 826, cy: 150, r: 38 };
const CIRC = 2 * Math.PI * DONUT.r;
const SHARES_BEFORE = [0.52, 0.3, 0.18, 0];
const SHARES_AFTER = [0.47, 0.27, 0.16, 0.1];

function donutArcs(shares) {
  let offset = 0;
  return shares.map((share) => {
    const arc = { dash: `${(share * CIRC).toFixed(2)} ${CIRC.toFixed(2)}`, offset: (-offset * CIRC).toFixed(2) };
    offset += share;
    return arc;
  });
}

const webapp = {
  viewBox: "0 0 960 240",
  markup: () => {
    const bars = BAR_HEIGHTS.map((h, i) => `<rect data-bar="${i}" class="v-bar" x="${276 + i * 44}" y="${206 - h}" width="26" height="${h}" rx="4"/>`).join("");
    const months = MONTH_LABELS.map((m, i) => `<text class="v-sub" ${i === 9 ? 'data-id="oct"' : ""} x="${289 + i * 44}" y="220" text-anchor="middle">${m}</text>`).join("");
    const arcs = donutArcs(SHARES_BEFORE)
      .map((a, i) => `<circle data-arc="${i}" cx="${DONUT.cx}" cy="${DONUT.cy}" r="${DONUT.r}" fill="none" stroke-width="13" class="${["v-arc", "v-arc v-arc--2", "v-arc v-arc--3", "v-arc v-arc--new"][i]}" stroke-dasharray="${a.dash}" stroke-dashoffset="${a.offset}" transform="rotate(-90 ${DONUT.cx} ${DONUT.cy})"/>`)
      .join("");
    return `
    <rect class="v-node" x="24" y="8" width="912" height="226" rx="14"/>
    <circle cx="44" cy="27" r="4.5" class="v-dim"/><circle cx="58" cy="27" r="4.5" class="v-dim"/><circle cx="72" cy="27" r="4.5" class="v-dim"/>
    <rect x="92" y="18" width="270" height="18" rx="9" class="v-dim" opacity="0.35"/>
    ${text(104, 31, "power-bi-reporting.netlify.app", "v-sub")}
    <g transform="translate(410 16)"><g data-id="toast" opacity="0">
      <rect class="v-node v-node--good" width="300" height="22" rx="11"/>
      ${text(150, 15, "✓ Report refreshed with current + new data", "v-sub v-good-text", "middle")}
    </g></g>
    <g data-id="btn" transform="translate(790 15)">
      <rect class="v-bar" width="128" height="24" rx="12"/>
      <path d="M18 16 v-8 M14 11.5 l4 -4 4 4 M13 18 h10" class="v-on-accent-stroke" fill="none" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      ${text(72, 16.5, "Upload data", "v-text v-on-accent", "middle")}
    </g>
    <circle data-id="ripple" cx="854" cy="27" r="0" class="v-accent" opacity="0"/>
    <line x1="24" y1="44" x2="936" y2="44" class="v-link"/>
    <rect data-id="prog" x="24" y="43" width="0" height="3" class="v-accent"/>

    ${text(44, 66, "Sales performance", "v-text")}
    ${text(44, 80, "", "v-sub", "start", "refreshed")}
    ${["Rows loaded", "Months of data", "Latest upload"]
      .map((label, i) => `<g transform="translate(44 ${90 + i * 46})">
        <rect class="v-node" width="190" height="40" rx="9"/>
        ${text(12, 15, label, "v-sub")}
        ${text(12, 32, "", "v-mid", "start", `kpi${i}`)}
      </g>`)
      .join("")}

    <rect class="v-node" x="252" y="56" width="468" height="172" rx="10"/>
    ${text(266, 74, "Monthly sales", "v-text")}
    <rect x="606" y="66" width="10" height="10" rx="2" class="v-new"/>
    ${text(622, 75, "New upload", "v-sub")}
    <line x1="266" y1="206" x2="706" y2="206" class="v-link"/>
    ${bars}
    <rect data-id="newbar" class="v-new" x="${276 + 9 * 44}" y="206" width="26" height="0" rx="4"/>
    ${months}

    <rect class="v-node" x="734" y="56" width="182" height="172" rx="10"/>
    ${text(748, 74, "Share by channel", "v-text")}
    ${arcs}
    ${text(DONUT.cx, DONUT.cy + 5, "", "v-mid", "middle", "share")}
    ${text(DONUT.cx, 218, "Illustrative data", "v-sub", "middle")}

    <g transform="translate(744 50)"><g data-id="dialog" opacity="0">
      <rect class="v-node v-node--accent" width="176" height="70" rx="10"/>
      ${text(12, 19, "Upload CSV or XLSX", "v-text")}
      <rect x="12" y="30" width="152" height="28" rx="7" class="v-dim" opacity="0.25"/>
      <path d="M22 36 h9 l4 4 v12 h-13 z" class="v-link v-link--accent" fill="none"/>
      ${text(42, 48, "new_sales.xlsx", "v-sub", "start", "file")}
    </g></g>
    <path data-id="cursor" d="M0 0 L0 16 L4.5 12 L7.5 19 L10 18 L7 11 L12.5 11 Z" class="v-cursor" transform="translate(600 196)"/>`;
  },
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power3.inOut", immediateRender: false } });
    const cursor = $(root, "cursor");
    const bars = $$(root, "[data-bar]");
    const arcs = $$(root, "[data-arc]");
    const kpi = [0, 1, 2].map((i) => $(root, `kpi${i}`));
    const refreshed = $(root, "refreshed");
    const share = $(root, "share");
    const data = { rows: 12480, months: 9, share: 52 };
    const render = () => {
      kpi[0].textContent = Math.round(data.rows).toLocaleString("en-US");
      kpi[1].textContent = String(Math.round(data.months));
      share.textContent = `${Math.round(data.share)}%`;
    };
    const setArcs = (shares, position, duration = 0) => {
      donutArcs(shares).forEach((a, i) => {
        tl.to(arcs[i], { attr: { "stroke-dasharray": a.dash, "stroke-dashoffset": a.offset }, duration }, position);
      });
    };

    // Reset to the "current data" report.
    tl.set(data, { rows: 12480, months: 9, share: 52, onComplete: render }, 0);
    tl.add(() => {
      render();
      kpi[2].textContent = "—";
      refreshed.textContent = "Data: Jan – Sep · current dataset";
    }, 0);
    tl.set([$(root, "dialog"), $(root, "toast")], { opacity: 0, y: 0 }, 0);
    tl.set($(root, "prog"), { attr: { width: 0 }, opacity: 1 }, 0);
    tl.set($(root, "newbar"), { attr: { y: 206, height: 0 } }, 0);
    tl.set($(root, "oct"), { opacity: 0 }, 0);
    tl.set(bars, { scaleY: 1, opacity: 1, transformOrigin: "50% 100%" }, 0);
    tl.set(cursor, { x: 0, y: 0, opacity: 1 }, 0);
    setArcs(SHARES_BEFORE, 0);

    // The visitor moves to "Upload data" and clicks.
    tl.to(cursor, { x: 250, y: -170, duration: 1.2 }, 0.4);
    tl.to($(root, "btn"), { scale: 0.94, transformOrigin: "50% 50%", duration: 0.12, yoyo: true, repeat: 1, ease: "power2.out" }, 1.65);
    tl.fromTo($(root, "ripple"), { attr: { r: 4 }, opacity: 0.35 }, { attr: { r: 30 }, opacity: 0, duration: 0.6, ease: "power2.out" }, 1.65);

    // Picks a file.
    tl.fromTo($(root, "dialog"), { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.4, ease: "power3.out" }, 1.9);
    tl.to(cursor, { x: 160, y: -132, duration: 0.6 }, 2.2);
    tl.fromTo($(root, "file"), { opacity: 0.4 }, { opacity: 1, duration: 0.2, yoyo: true, repeat: 1 }, 2.8);

    // Uploads, then refreshes the dataset.
    tl.add(() => (refreshed.textContent = "Uploading new_sales.xlsx…"), 3.1);
    tl.to($(root, "dialog"), { opacity: 0, y: -6, duration: 0.3 }, 3.2);
    tl.to(cursor, { x: 110, y: -40, duration: 0.8 }, 3.2);
    tl.to($(root, "prog"), { attr: { width: 912 }, duration: 1.3, ease: "power1.inOut" }, 3.1);
    tl.add(() => (refreshed.textContent = "Refreshing report…"), 4.1);
    tl.to(bars, { scaleY: 0.88, opacity: 0.45, duration: 0.3, stagger: 0.02, ease: "power2.in" }, 4.2);
    tl.to(bars, { scaleY: 1, opacity: 1, duration: 0.6, stagger: 0.03, ease: "back.out(1.6)" }, 4.6);

    // The report now shows current + new data.
    tl.to($(root, "newbar"), { attr: { y: 206 - 110, height: 110 }, duration: 0.7, ease: "back.out(1.4)" }, 4.9);
    tl.to($(root, "oct"), { opacity: 1, duration: 0.3 }, 5.0);
    tl.to(data, { rows: 14016, months: 10, share: 47, duration: 0.9, ease: "power2.out", onUpdate: render }, 4.9);
    setArcs(SHARES_AFTER, 4.9, 0.8);
    tl.add(() => {
      kpi[2].textContent = "new_sales.xlsx";
      refreshed.textContent = "Data: Jan – Oct · current + new upload";
    }, 4.9);
    tl.to($(root, "prog"), { opacity: 0, duration: 0.4 }, 5.4);
    tl.fromTo($(root, "toast"), { opacity: 0, y: -4 }, { opacity: 1, y: 0, duration: 0.4, ease: "back.out(2)" }, 5.5);
    tl.addLabel("final", 6.3);
    return tl;
  },
};

// ---- 07 Loyalty analytics, built from scratch -------------------------------------------------
const LOYALTY_STAGES = [
  ["Loyalty API", "Members · points"],
  ["Function", "Flex · Key Vault"],
  ["ADLS", "Raw files"],
  ["Serverless SQL", "Synapse"],
  ["Power BI", "Semantic model"],
  ["Dashboard", "8 pages"],
];
const LOYALTY_CHECKS = ["Join keys match POS bills", "Mis-keyed outlier excluded", "Test account excluded"];

const loyalty = {
  viewBox: "0 0 480 200",
  markup: () => `
    ${status(14, 30, "st")}
    ${LOYALTY_STAGES.slice(1).map((_, i) => line(80 + i * 76, 82, 90 + i * 76, 82)).join("")}
    ${LOYALTY_STAGES.map(([label, sub], i) => `<g data-stage="${i}">${box(14 + i * 76, 58, 66, 48, label, sub)}</g>`).join("")}
    ${[0, 1, 2].map((i) => `<circle data-id="p${i}" cx="47" cy="82" r="4" class="v-accent" opacity="0"/>`).join("")}
    ${LOYALTY_CHECKS.map(
      (label, i) => `<g transform="translate(${14 + i * 152} 132)"><g data-check="${i}" opacity="0">
        <rect class="v-node v-node--good" width="146" height="26" rx="13"/>
        <circle cx="16" cy="13" r="7" class="v-good"/>
        <path d="M12.5 13 L15 15.5 L19.5 10.5" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>
        ${text(30, 17, label, "v-sub")}
      </g></g>`
    ).join("")}
    ${text(14, 186, "Kept separate from the daily sales pipeline, so neither can slow the other down", "v-sub")}`,
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, defaults: { ease: "power2.inOut", immediateRender: false } });
    const say = statusSwapper(root, "st");
    const stages = $$(root, "[data-stage] rect");
    const checks = $$(root, "[data-check]");
    const packets = [0, 1, 2].map((i) => $(root, `p${i}`));
    tl.set(stages, { attr: { class: "v-node" } }, 0);
    tl.set(checks, { opacity: 0, y: 6 }, 0);
    say(tl, "Membership data locked in the loyalty platform", 0, "v-text");
    say(tl, "Built the pipeline stage by stage", 1.2, "v-text");
    stages.forEach((rect, i) => tl.set(rect, { attr: { class: "v-node v-node--accent" } }, 1.3 + i * 0.35));
    packets.forEach((p, i) => {
      tl.fromTo(p, { attr: { cx: 47 }, opacity: 0 }, { attr: { cx: 427 }, opacity: 1, duration: 1.6, ease: "none" }, 3.4 + i * 0.3);
      tl.to(p, { opacity: 0, duration: 0.2 }, 5.0 + i * 0.3);
    });
    say(tl, "Validated before release", 3.6, "v-text");
    checks.forEach((c, i) => tl.to(c, { opacity: 1, y: 0, duration: 0.45, ease: "back.out(2)" }, 3.8 + i * 0.45));
    say(tl, "Fresh member insight every morning", 5.6, "v-text v-accent-text");
    tl.addLabel("final", 6.4);
    return tl;
  },
};

// ---- 08 Azure cost review -------------------------------------------------------------------
const COST_LEVERS = [
  ["SQL pool runs only when needed", 0.34],
  ["Idle ML workspace retired", 0.12],
  ["Functions moved to Flex plan", 0.14],
  ["Unused pipelines and tables cut", 0.1],
];
const COST_BASE = 150; // bar height at 100% (illustrative)
const COST_FLOOR = 180; // baseline y

const cost = {
  viewBox: "0 0 480 200",
  markup: () => {
    let y = COST_FLOOR - COST_BASE;
    const segments = COST_LEVERS.map(([, share], i) => {
      const h = share * COST_BASE;
      const seg = `<rect data-seg="${i}" x="40" y="${y.toFixed(1)}" width="70" height="${h.toFixed(1)}" class="${i % 2 ? "v-bar" : "v-bar v-seg-alt"}"/>`;
      y += h;
      return seg;
    });
    const remaining = COST_FLOOR - y;
    return `
    ${status(14, 22, "st")}
    ${segments.join("")}
    <rect data-id="keep" x="40" y="${y.toFixed(1)}" width="70" height="${remaining.toFixed(1)}" class="v-bar--ref"/>
    ${text(75, 194, "Before", "v-sub", "middle")}
    <rect data-id="after" x="140" y="${COST_FLOOR}" width="70" height="0" class="v-bar--ref"/>
    ${text(175, 194, "After (plan)", "v-sub", "middle")}
    ${text(175, 40, "", "v-big", "middle", "pct")}
    ${COST_LEVERS.map(
      ([label], i) => `<g data-lever="${i}" opacity="0.35" transform="translate(240 ${40 + i * 34})">
        <rect class="v-node" width="226" height="26" rx="8"/>
        <circle cx="14" cy="13" r="6" class="v-dim" data-dot="${i}"/>
        ${text(28, 17, label, "v-sub")}
      </g>`
    ).join("")}
    ${text(240, 182, "Cost-impacting changes held for formal approval", "v-sub")}
    ${text(466, 196, "Illustrative proportions", "v-sub", "end")}`;
  },
  build(root) {
    const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, defaults: { ease: "power2.inOut", immediateRender: false } });
    const say = statusSwapper(root, "st");
    const segs = $$(root, "[data-seg]");
    const levers = $$(root, "[data-lever]");
    const dots = $$(root, "[data-dot]");
    const pct = $(root, "pct");
    const saved = { v: 0 };
    const keepShare = 1 - COST_LEVERS.reduce((n, [, share]) => n + share, 0);
    tl.set(segs, { opacity: 1, x: 0 }, 0);
    tl.set(levers, { opacity: 0.35 }, 0);
    tl.set(dots, { attr: { class: "v-dim" } }, 0);
    tl.set($(root, "after"), { attr: { y: COST_FLOOR, height: 0 } }, 0);
    tl.set(saved, { v: 0, onComplete: () => (pct.textContent = "") }, 0);
    say(tl, "Nobody was watching cloud spend after the vendor left", 0, "v-text");
    say(tl, "Reviewed every resource, one lever at a time", 1.3, "v-text");
    segs.forEach((seg, i) => {
      const t = 1.6 + i * 0.75;
      tl.to(levers[i], { opacity: 1, duration: 0.3 }, t);
      tl.set(dots[i], { attr: { class: "v-good" } }, t + 0.1);
      tl.to(seg, { x: 18, opacity: 0, duration: 0.5, ease: "power2.in" }, t + 0.15);
    });
    const end = 1.6 + segs.length * 0.75;
    tl.to($(root, "after"), { attr: { y: COST_FLOOR - keepShare * COST_BASE, height: keepShare * COST_BASE }, duration: 0.8, ease: "power3.out" }, end);
    tl.to(saved, { v: 70, duration: 0.9, ease: "power2.out", onUpdate: () => (pct.textContent = `~${Math.round(saved.v)}% lower`) }, end);
    say(tl, "A phased plan to cut monthly cost by about 70%", end + 0.2, "v-text v-accent-text");
    tl.addLabel("final", end + 1.2);
    return tl;
  },
};

const VISUALS = { recovery, pipeline, reconcile, rls, automation, ocr, loyalty, cost, webapp };

// ---- Text fitting --------------------------------------------------------------------------
// Fonts differ between devices (SF Pro on Apple, Inter elsewhere), so after mounting, any label
// wider than its box, or running past the diagram's edge, is scaled down to fit.
function fitText(svg) {
  const viewWidth = svg.viewBox.baseVal.width;
  svg.querySelectorAll("text").forEach((node) => {
    if (!node.textContent) return;
    node.style.fontSize = "";
    const group = node.closest(".vb, g[transform]");
    const rect = group?.querySelector(":scope > rect");
    let available;
    if (rect && group.classList.contains("vb")) {
      available = rect.width.baseVal.value - 10;
    } else {
      const x = node.x.baseVal[0]?.value ?? 0;
      const anchor = node.getAttribute("text-anchor");
      const offset = group ? group.transform.baseVal.consolidate()?.matrix.e ?? 0 : 0;
      available = anchor === "middle" ? Infinity : viewWidth - 8 - (x + offset);
    }
    const width = node.getComputedTextLength();
    if (width > available && available > 0) {
      const size = parseFloat(getComputedStyle(node).fontSize);
      node.style.fontSize = `${Math.max(7, (size * available) / width).toFixed(2)}px`;
    }
  });
}

// ---- Mounting ------------------------------------------------------------------------------
function mount(container) {
  const viz = VISUALS[container.dataset.viz];
  if (!viz) return null;
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", viz.viewBox);
  svg.setAttribute("preserveAspectRatio", "xMidYMid meet");
  svg.setAttribute("focusable", "false");
  svg.innerHTML = viz.markup();
  container.append(svg);
  if (viz.caption) container.insertAdjacentHTML("beforeend", caption(viz.caption));
  fitText(svg);
  document.fonts?.ready.then(() => fitText(svg));
  const tl = viz.build(svg);
  tl.pause();
  return tl;
}

export function initProjectViz({ reducedMotion = false } = {}) {
  document.querySelectorAll(".project__viz[data-viz]").forEach((container) => {
    const tl = mount(container);
    if (!tl) return;
    if (reducedMotion) {
      // Show the resolved state of the story as a still image (events on, so status text is set).
      tl.seek("final", false).pause();
      return;
    }
    tl.seek("final", false).pause(); // a meaningful frame before it first plays
    ScrollTrigger.create({
      trigger: container,
      start: "top 85%",
      end: "bottom 10%",
      onEnter: () => tl.restart(),
      onEnterBack: () => tl.play(),
      onLeave: () => tl.pause(),
      onLeaveBack: () => tl.pause(),
    });
  });
}
