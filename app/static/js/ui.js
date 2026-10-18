// Shared UI helpers: skeleton, toasts, slider readouts, title.
// Keeps main.js focused on orchestration.

// ---------- Skeleton (roadmap #1) ----------
export function showSkeleton() {
  const el = document.getElementById("canvas-skeleton");
  if (el) el.classList.remove("hidden");
}
export function hideSkeleton() {
  const el = document.getElementById("canvas-skeleton");
  if (el) el.classList.add("hidden");
}

// ---------- Toast queue (roadmap #5) ----------
const MAX_TOASTS = 3;
const TOAST_TTL = 2600;

export function pushToast(message, isError = false) {
  const container = document.getElementById("toast-container");
  if (!container) return;

  const el = document.createElement("div");
  el.className = "toast" + (isError ? " error" : "");
  el.textContent = message;
  container.appendChild(el);

  // Cap at MAX_TOASTS: remove oldest if over.
  while (container.children.length > MAX_TOASTS) {
    container.removeChild(container.firstElementChild);
  }

  setTimeout(() => {
    el.classList.add("leaving");
    el.addEventListener("animationend", () => el.remove(), { once: true });
  }, TOAST_TTL);
}

// ---------- Slider live readouts (roadmap #2) + dbl-click reset (roadmap #3) ----------
export function bindSliderReadouts(getState, onChange) {
  const sliders = document.querySelectorAll("[data-adj]");

  sliders.forEach((input) => {
    const key = input.dataset.adj;
    const readout = document.querySelector(`.adj-value[data-for="${key}"]`);

    const syncReadout = () => {
      if (readout) readout.textContent = input.value;
    };

    // Live update while dragging.
    input.addEventListener("input", () => {
      syncReadout();
      if (typeof onChange === "function") onChange(key, parseFloat(input.value), "input");
    });

    // Commit to history on release.
    input.addEventListener("change", () => {
      if (typeof onChange === "function") onChange(key, parseFloat(input.value), "change");
    });

    // Double-click resets to default (0 for all current sliders).
    input.addEventListener("dblclick", () => {
      input.value = 0;
      syncReadout();
      if (typeof onChange === "function") onChange(key, 0, "change");
    });

    // Editable readout: click, type a value, Enter to apply.
    if (readout) {
      readout.setAttribute("contenteditable", "true");
      readout.setAttribute("spellcheck", "false");
      readout.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const v = parseFloat(readout.textContent.replace(/[^\d.\-]/g, "")) || 0;
          const min = parseFloat(input.min) || 0;
          const max = parseFloat(input.max) || 100;
          const clamped = Math.max(min, Math.min(max, v));
          input.value = String(clamped);
          readout.textContent = String(clamped);
          if (typeof onChange === "function") onChange(key, clamped, "change");
          readout.blur();
        } else if (e.key === "Escape") {
          readout.textContent = input.value;
          readout.blur();
        }
      });
    }

    // Initial sync.
    syncReadout();
  });
}

// Refresh all readouts from the current state (e.g. after Reset).
export function refreshSliderReadouts(state) {
  document.querySelectorAll("[data-adj]").forEach((input) => {
    const key = input.dataset.adj;
    const v = state.adjustments?.[key] ?? 0;
    input.value = String(v);
    const readout = document.querySelector(`.adj-value[data-for="${key}"]`);
    if (readout) readout.textContent = String(v);
  });
}

// ---------- Dynamic tab title (roadmap #7) ----------
const BASE_TITLE = "Outlook Studio — Advanced Photo Editor";

export function setDocumentTitle(parts = []) {
  const suffix = parts.filter(Boolean).join(" · ");
  document.title = suffix ? `${suffix} — Outlook Studio` : BASE_TITLE;
}

// ---------- Cursor styles for canvas regions (roadmap #4) ----------
// Map a crop mode to a CSS cursor.
export function cursorForMode(mode) {
  return ({
    nw: "nwse-resize", se: "nwse-resize",
    ne: "nesw-resize", sw: "nesw-resize",
    n: "ns-resize",   s: "ns-resize",
    e: "ew-resize",   w: "ew-resize",
    move: "move",
  })[mode] || "crosshair";
}