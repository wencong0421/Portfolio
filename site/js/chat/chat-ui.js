import { gsap } from "../../vendor/gsap.min.js";
import { createChatEngine } from "./engine.js";
import { PROFILE } from "./knowledge.js";

// Chat panel for recruiters. All answers come from the local engine; nothing leaves the browser.
// Messages are built with DOM APIs (never innerHTML from user input), so typed text can't inject markup.

const STARTERS = ["Tell me about Ivan", "What's his tech stack?", "Show me his projects", "Why should we hire him?"];

const ICONS = {
  send: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  close: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>',
  reset: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4.5h4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
  chat: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H10l-4.5 4v-4H6.5A2.5 2.5 0 0 1 4 13.5z" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
};

function el(tag, className, attrs = {}) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// Renders "**bold**" segments as <strong>, everything else as plain text.
function appendRichText(parent, text) {
  String(text)
    .split(/(\*\*[^*]+\*\*)/g)
    .filter(Boolean)
    .forEach((part) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        const strong = document.createElement("strong");
        strong.textContent = part.slice(2, -2);
        parent.append(strong);
      } else {
        parent.append(document.createTextNode(part));
      }
    });
}

export function initChat({ scrollToSection, reducedMotion = false } = {}) {
  const root = document.getElementById("chat");
  if (!root) return null;
  const engine = createChatEngine(PROFILE);
  const avatarSrc = "assets/ivan.jpg";

  // ---- Structure -------------------------------------------------------------------------
  const launcher = el("button", "chat-launcher", { type: "button", "aria-expanded": "false", "aria-controls": "chatPanel" });
  const launchAvatar = el("img", "chat-launcher__avatar", { src: avatarSrc, alt: "", width: "28", height: "28" });
  const launchText = el("span", "chat-launcher__text");
  launchText.textContent = "Ask about Ivan";
  const launchDot = el("span", "chat-launcher__dot", { "aria-hidden": "true" });
  launcher.append(launchAvatar, launchText, launchDot);
  launcher.setAttribute("aria-label", "Open chat: ask about Ivan");

  const panel = el("section", "chat-panel", { id: "chatPanel", role: "dialog", "aria-label": "Ask about Ivan", "aria-modal": "false" });
  panel.hidden = true;

  const header = el("header", "chat-head");
  const headAvatar = el("img", "chat-head__avatar", { src: avatarSrc, alt: "", width: "36", height: "36" });
  const headText = el("div", "chat-head__text");
  const title = el("h2", "chat-head__title");
  title.textContent = "Ask about Ivan";
  const subtitle = el("p", "chat-head__sub");
  subtitle.textContent = "Instant answers from his portfolio";
  headText.append(title, subtitle);
  const resetBtn = el("button", "chat-icon", { type: "button", "aria-label": "Start a new conversation", title: "New conversation" });
  resetBtn.innerHTML = ICONS.reset;
  const closeBtn = el("button", "chat-icon", { type: "button", "aria-label": "Close chat", title: "Close" });
  closeBtn.innerHTML = ICONS.close;
  header.append(headAvatar, headText, resetBtn, closeBtn);

  const log = el("div", "chat-log", { role: "log", "aria-live": "polite", "aria-relevant": "additions", tabindex: "0" });
  const suggestions = el("div", "chat-suggest", { role: "group", "aria-label": "Suggested questions" });

  const form = el("form", "chat-form");
  const input = el("textarea", "chat-input", { rows: "1", placeholder: "Ask a question…", "aria-label": "Your question", maxlength: "400", enterkeyhint: "send" });
  const send = el("button", "chat-send", { type: "submit", "aria-label": "Send" });
  send.innerHTML = ICONS.send;
  form.append(input, send);

  const note = el("p", "chat-note");
  note.textContent = "Scripted assistant · no AI model · answers only from Ivan's portfolio";

  panel.append(header, log, suggestions, form, note);
  root.append(panel, launcher);

  // ---- Rendering -------------------------------------------------------------------------
  function scrollToEnd() {
    log.scrollTo({ top: log.scrollHeight, behavior: reducedMotion ? "auto" : "smooth" });
  }

  function animateIn(node) {
    if (reducedMotion) return;
    gsap.fromTo(node, { opacity: 0, y: 14, scale: 0.97 }, { opacity: 1, y: 0, scale: 1, duration: 0.5, ease: "expoOut" });
  }

  function addUser(text) {
    const row = el("div", "msg msg--user");
    const bubble = el("div", "msg__bubble");
    bubble.textContent = text;
    row.append(bubble);
    log.append(row);
    animateIn(row);
    scrollToEnd();
  }

  function renderAction(item) {
    const internal = item.href.startsWith("#");
    const link = el("a", "msg__action", { href: item.href });
    link.textContent = item.label;
    if (item.download) link.setAttribute("download", "");
    else if (!internal && !item.href.startsWith("mailto:")) {
      link.target = "_blank";
      link.rel = "noopener";
    }
    if (internal) {
      link.addEventListener("click", (event) => {
        event.preventDefault();
        if (window.matchMedia("(max-width: 560px)").matches) close();
        scrollToSection?.(item.href.slice(1));
      });
    }
    return link;
  }

  function addBot(reply) {
    const row = el("div", "msg msg--bot");
    const avatar = el("img", "msg__avatar", { src: avatarSrc, alt: "", width: "26", height: "26" });
    const bubble = el("div", "msg__bubble");
    for (const block of reply.blocks) {
      if (block.type === "p") {
        const p = el("p");
        appendRichText(p, block.text);
        bubble.append(p);
      } else if (block.type === "list") {
        const ul = el("ul");
        block.items.forEach((item) => {
          const li = el("li");
          appendRichText(li, item);
          ul.append(li);
        });
        bubble.append(ul);
      } else if (block.type === "actions") {
        const wrap = el("div", "msg__actions");
        block.items.forEach((item) => wrap.append(renderAction(item)));
        bubble.append(wrap);
      }
    }
    row.append(avatar, bubble);
    log.append(row);
    animateIn(row);
    scrollToEnd();
    setSuggestions(reply.suggestions || []);
  }

  function setSuggestions(items) {
    suggestions.replaceChildren();
    items.slice(0, 4).forEach((text, i) => {
      const chip = el("button", "chat-chip", { type: "button" });
      chip.textContent = text;
      chip.addEventListener("click", () => submit(text));
      suggestions.append(chip);
      if (!reducedMotion) gsap.fromTo(chip, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.05 * i, ease: "expoOut" });
    });
  }

  let typingRow = null;
  function showTyping() {
    typingRow = el("div", "msg msg--bot msg--typing", { "aria-hidden": "true" });
    const avatar = el("img", "msg__avatar", { src: avatarSrc, alt: "", width: "26", height: "26" });
    const bubble = el("div", "msg__bubble");
    bubble.innerHTML = '<span class="dot"></span><span class="dot"></span><span class="dot"></span>';
    typingRow.append(avatar, bubble);
    log.append(typingRow);
    scrollToEnd();
  }
  function hideTyping() {
    typingRow?.remove();
    typingRow = null;
  }

  // ---- Conversation ----------------------------------------------------------------------
  let busy = false;
  function submit(raw) {
    const text = String(raw || "").trim().slice(0, 400);
    if (!text || busy) return;
    busy = true;
    input.value = "";
    autosize();
    addUser(text);
    setSuggestions([]);
    const reply = engine.reply(text);
    const chars = reply.blocks.reduce((n, b) => n + (b.text?.length || 0) + (b.items?.join("").length || 0), 0);
    const delay = reducedMotion ? 0 : Math.min(1100, 380 + chars * 1.6);
    showTyping();
    setTimeout(() => {
      hideTyping();
      addBot(reply);
      busy = false;
    }, delay);
  }

  function greet() {
    addBot({
      blocks: [
        { type: "p", text: "Hi! I'm Ivan's portfolio assistant. Ask me anything a recruiter would: experience, skills, projects, education or how to reach him." },
      ],
      suggestions: STARTERS,
    });
  }

  function resetConversation() {
    engine.reset();
    log.replaceChildren();
    greet();
    input.focus();
  }

  // ---- Open / close ----------------------------------------------------------------------
  let isOpen = false;
  let greeted = false;

  function open() {
    if (isOpen) return;
    isOpen = true;
    panel.hidden = false;
    launcher.setAttribute("aria-expanded", "true");
    root.classList.add("is-open");
    if (!greeted) {
      greeted = true;
      greet();
    }
    if (!reducedMotion) {
      gsap.fromTo(panel, { opacity: 0, y: 24, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "expoOut" });
    }
    setTimeout(() => input.focus({ preventScroll: true }), reducedMotion ? 0 : 120);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    launcher.setAttribute("aria-expanded", "false");
    root.classList.remove("is-open");
    const finish = () => {
      panel.hidden = true;
      launcher.focus({ preventScroll: true });
    };
    if (reducedMotion) finish();
    else gsap.to(panel, { opacity: 0, y: 16, scale: 0.96, duration: 0.3, ease: "power2.in", onComplete: finish });
  }

  // ---- Wiring ----------------------------------------------------------------------------
  function autosize() {
    input.style.height = "auto";
    input.style.height = `${Math.min(input.scrollHeight, 120)}px`;
  }

  launcher.addEventListener("click", () => (isOpen ? close() : open()));
  closeBtn.addEventListener("click", close);
  resetBtn.addEventListener("click", resetConversation);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    submit(input.value);
  });
  input.addEventListener("input", autosize);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
      event.preventDefault();
      submit(input.value);
    }
  });
  panel.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.stopPropagation();
      close();
    }
  });

  return { open, close, ask: (q) => (open(), submit(q)) };
}
