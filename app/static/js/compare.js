// Compare split-slider (Roadmap #14).
// Renders the base image before/after with a draggable divider.
// Works independently of the main editor canvas — draws into its own overlay
// element that sits on top of #canvas.

let active = false;
let hostEl = null;       // the absolutely-positioned container
let dividerEl = null;
let beforeCanvas = null; // off-screen copy of "before" state
let afterCanvas = null;  // off-screen copy of "after" state
let splitPct = 0.5;

export function initCompare({ getCanvas, getRoot }) {
  return { open, close, isActive: () => active };
}

export function openCompare({ beforeDataURL, afterDataURL, root }) {
  if (active) closeCompare();
  active = true;

  const rootEl = root || document.querySelector(".canvas-wrap");

  hostEl = document.createElement("div");
  hostEl.className = "compare-host";

  beforeCanvas = document.createElement("canvas");
  afterCanvas = document.createElement("canvas");
  beforeCanvas.className = "compare-layer compare-before";
  afterCanvas.className = "compare-layer compare-after";

  dividerEl = document.createElement("div");
  dividerEl.className = "compare-divider";
  dividerEl.innerHTML = `<div class="compare-handle" aria-hidden="true">⇔</div>`;

  const labelBefore = document.createElement("div");
  labelBefore.className = "compare-label compare-label-left";
  labelBefore.textContent = "Before";
  const labelAfter = document.createElement("div");
  labelAfter.className = "compare-label compare-label-right";
  labelAfter.textContent = "After";

  hostEl.appendChild(beforeCanvas);
  hostEl.appendChild(afterCanvas);
  hostEl.appendChild(dividerEl);
  hostEl.appendChild(labelBefore);
  hostEl.appendChild(labelAfter);

  const target = document.querySelector("#canvas");
  const rect = target.getBoundingClientRect();

  const loadImages = Promise.all([
    loadInto(beforeCanvas, beforeDataURL),
    loadInto(afterCanvas, afterDataURL),
  ]);

  loadImages.then(() => {
    // Match the on-screen canvas size + position
    const wrapper = document.querySelector(".canvas-inner");
    wrapper.appendChild(hostEl);

    hostEl.style.width = `${target.clientWidth}px`;
    hostEl.style.height = `${target.clientHeight}px`;

    // Display the after-layer full, and clip the before-layer to splitPct.
    applySplit(splitPct);

    bindDrag();
    window.addEventListener("resize", _onResize);
  });

  function _onResize() {
    if (!hostEl) return;
    const t = document.querySelector("#canvas");
    hostEl.style.width = `${t.clientWidth}px`;
    hostEl.style.height = `${t.clientHeight}px`;
    applySplit(splitPct);
  }
}

export function closeCompare() {
  if (!active) return;
  active = false;
  window.removeEventListener("resize", _onResizeCloseProxy);
  try { hostEl?.remove(); } catch {}
  hostEl = null;
  dividerEl = null;
  beforeCanvas = null;
  afterCanvas = null;
}

function _onResizeCloseProxy() { /* not used, kept for symmetry */ }

function loadInto(canvas, dataURL) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataURL;
  });
}

function applySplit(pct) {
  splitPct = Math.max(0.02, Math.min(0.98, pct));
  if (!hostEl || !beforeCanvas || !dividerEl) return;

  const w = hostEl.clientWidth;
  const x = w * splitPct;

  // Clip the "before" canvas to the left of the divider
  beforeCanvas.style.clipPath = `inset(0 ${(1 - splitPct) * 100}% 0 0)`;
  dividerEl.style.left = `${x}px`;
}

function bindDrag() {
  let dragging = false;

  const onDown = (e) => {
    dragging = true;
    dividerEl.classList.add("dragging");
    dividerEl.setPointerCapture?.(e.pointerId);
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!dragging || !hostEl) return;
    const rect = hostEl.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    applySplit(pct);
  };
  const onUp = (e) => {
    dragging = false;
    dividerEl?.classList.remove("dragging");
    try { dividerEl?.releasePointerCapture?.(e.pointerId); } catch {}
  };

  dividerEl.addEventListener("pointerdown", onDown);
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp);
  window.addEventListener("pointercancel", onUp);

  // Cleanup when compare closes
  const cleanup = () => {
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onUp);
    if (!active) cleanup();
    else requestAnimationFrame(cleanup);
  };
  cleanup();
}