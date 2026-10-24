import { burst } from "./bursts.js";
import { getController } from "./micro.js";

// Contact form backed by Netlify Forms. Submits with fetch so the visitor stays on the page,
// validates inline, and falls back to a mailto link if sending fails.

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const FALLBACK_EMAIL = "wencong0421@gmail.com";

const RULES = {
  name: (v) => (v.trim().length >= 2 ? "" : "Please tell me your name."),
  email: (v) => (EMAIL_PATTERN.test(v.trim()) ? "" : "Please enter a valid email address."),
  message: (v) => (v.trim().length >= 10 ? "" : "A few more words, please (at least 10 characters)."),
};

function fieldOf(input) {
  return input.closest(".field");
}

function setError(input, message) {
  const field = fieldOf(input);
  const error = document.getElementById(input.getAttribute("aria-describedby"));
  field.classList.toggle("is-invalid", Boolean(message));
  input.setAttribute("aria-invalid", message ? "true" : "false");
  if (error) error.textContent = message;
}

function validate(input) {
  const rule = RULES[input.name];
  const message = rule ? rule(input.value) : "";
  setError(input, message);
  return !message;
}

export function initContactForm() {
  const form = document.querySelector(".cform");
  if (!form) return;
  const status = form.querySelector(".cform__status");
  const submit = form.querySelector(".cform__submit");
  const label = submit.querySelector(".cform__label");
  const inputs = Array.from(form.querySelectorAll("input[name]:not([type=hidden]):not([name=bot-field]), textarea[name]"));

  // Validate a field once the visitor leaves it, then live while they fix it.
  for (const input of inputs) {
    input.addEventListener("blur", () => {
      if (input.value) validate(input);
    });
    input.addEventListener("input", () => {
      if (fieldOf(input).classList.contains("is-invalid")) validate(input);
    });
  }

  function setStatus(message, tone) {
    status.innerHTML = message;
    status.dataset.tone = tone || "";
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const invalid = inputs.filter((input) => !validate(input));
    if (invalid.length) {
      invalid.forEach((input, i) => setTimeout(() => getController(fieldOf(input))?.shake(), i * 70));
      invalid[0].focus();
      setStatus("Please check the highlighted fields.", "error");
      return;
    }

    submit.disabled = true;
    form.classList.add("is-sending");
    label.textContent = "Sending…";
    setStatus("", "");

    try {
      // Netlify's AJAX endpoint is the site root; the form's action is only the no-JS fallback.
      const response = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams(new FormData(form)).toString(),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      form.reset();
      inputs.forEach((input) => setError(input, ""));
      label.textContent = "Message sent ✓";
      setStatus("Thanks! I'll get back to you soon.", "success");
      const rect = submit.getBoundingClientRect();
      burst(rect.left + rect.width / 2, rect.top + rect.height / 2, { count: 46, speed: [120, 380], size: [3, 9] });
      getController(submit)?.pop();
      setTimeout(() => {
        label.textContent = "Send message";
      }, 3200);
    } catch (error) {
      console.warn("[contact form] submit failed", error);
      label.textContent = "Send message";
      setStatus(
        `Sorry, that didn't go through. Please email me at <a href="mailto:${FALLBACK_EMAIL}">${FALLBACK_EMAIL}</a>.`,
        "error"
      );
      getController(submit)?.shake(300);
    } finally {
      submit.disabled = false;
      form.classList.remove("is-sending");
    }
  });
}
