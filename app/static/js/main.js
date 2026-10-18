import { api } from "./api.js";
import { History } from "./history.js";
import { CanvasRenderer } from "./canvas.js";
import { CropTool } from "./crop.js";
import { initFitPanel } from "./fit.js";
import { initMetadataPanel } from "./metadata.js";
import { initLayersPanel } from "./layers.js";
import { initCollagePanel } from "./collage.js";
import {
  showSkeleton, hideSkeleton, pushToast,
  bindSliderReadouts, refreshSliderReadouts,
  setDocumentTitle,
} from "./ui.js";
import { EMOJIS, SHAPES, emojiToCanvas, shapeToCanvas } from "./stickers.js";
import { createTextCanvas } from "./text.js";
import { isBgAvailable, removeBackground } from "./bg.js";
import {
  listPresets, savePreset, deletePreset, getPreset,
  exportPresets, importPresets,
} from "./presets.js";
import { copyStyle, pasteStyle, hasStyle } from "./styleClipboard.js";
import { openCompare, closeCompare } from "./compare.js";
import {
  scheduleSave, loadSaved, clearSaved,
  exportProjectFile, importProjectFile,
} from "./project.js";

const $ = (s) => document.querySelector(s);
const canvas = $("#canvas");
const overlay = $("#overlay");
const renderer = new CanvasRenderer(canvas);
const crop = new CropTool(canvas, overlay, () => {});

let uploadedId = null;
let currentState = blankState();
let originalWidth = 0, originalHeight = 0;
let comparing = false;

function blankState() {
  return {
    adjustments: {
      brightness: 0, exposure: 0, contrast: 0, saturation: 0,
      temperature: 0, sharpness: 0, blur: 0, vignette: 0, grain: 0,
    },
    filter: "none",
  };
}

const history = new History((state, canUndo, canRedo) => {
  if (!state) return;
  currentState = structuredClone(state);
  renderer.render(currentState);
  $("#btn-undo").disabled = !canUndo;
  $("#btn-redo").disabled = !canRedo;
  updateDimReadout();
  schedulePersistence();
});

const toast = (msg, isError = false) => pushToast(msg, isError);
function busy(on) { $("#loader").classList.toggle("hidden", !on); }
function setStatus(msg) { $("#status").textContent = msg; }
function updateDimReadout() {
  const el = $("#dim-readout");
  if (!renderer.baseImage) { el.textContent = "—"; return; }
  el.textContent = `${canvas.width} × ${canvas.height} px`;
}

// ---------- Sub-panels ----------
const fitPanel = initFitPanel({
  getState: () => ({ uploadedId, originalWidth, originalHeight }),
  setBaseImageFromDataURL: async (dataUrl) => {
    await renderer.loadFromUrl(dataUrl);
    history.push(currentState);
    updateDimReadout();
  },
  toast, busy,
});
const metadataPanel = initMetadataPanel({
  getState: () => ({ uploadedId }),
  toast, busy,
});
const layersPanel = initLayersPanel({
  getRootCanvas: () => canvas,
  toast, busy,
});
const collagePanel = initCollagePanel({ toast, busy });

// ---------- Slider readouts ----------
bindSliderReadouts(
  () => currentState,
  (key, value, kind) => {
    currentState.adjustments[key] = value;
    if (kind === "input") renderer.render(currentState);
    else history.push(currentState);
  }
);

// ---------- Panels ----------
document.querySelectorAll(".tool[data-panel]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    document.querySelectorAll(".tool").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".panel-section").forEach((p) => {
      p.classList.toggle("hidden", p.dataset.panel !== btn.dataset.panel);
    });
    const p = btn.dataset.panel;

    if (p === "crop") {
      if (renderer.baseImage) crop.start();
    } else {
      crop.cancel();
    }

    if (p === "layers") {
      overlay.classList.add("active");
      overlay.style.pointerEvents = "auto";
      layersPanel.renderAll();
    } else if (p === "crop") {
      overlay.classList.remove("active");
    } else {
      overlay.classList.remove("active");
      overlay.style.pointerEvents = "";
      overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
    }

    if (p === "metadata") await metadataPanel.load(uploadedId);
    if (p === "fit" && renderer.baseImage) {
      $("#fit-w").value = $("#fit-w").value || canvas.width;
      $("#fit-h").value = $("#fit-h").value || canvas.height;
    }
    if (p === "collage") collagePanel.onShow();
  });
});

// ---------- Filters ----------
document.querySelectorAll("[data-filter]").forEach((btn) => {
  btn.addEventListener("click", () => {
    currentState.filter = btn.dataset.filter;
    document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b === btn));
    renderer.render(currentState);
    history.push(currentState);
  });
});

// ---------- Transform ----------
document.querySelectorAll("[data-tr]").forEach((btn) => {
  btn.addEventListener("click", () => {
    if (!renderer.baseImage) return toast("Upload an image first", true);
    const t = btn.dataset.tr;
    if (t === "rotate-cw") transformCanvas(90);
    else if (t === "rotate-ccw") transformCanvas(-90);
    else if (t === "flip-h") flipCanvas("horizontal");
    else if (t === "flip-v") flipCanvas("vertical");
  });
});

function transformCanvas(deg) {
  const src = renderer.baseImage;
  const rad = (deg * Math.PI) / 180;
  const swap = Math.abs(deg) === 90;
  const W = swap ? src.naturalHeight : src.naturalWidth;
  const H = swap ? src.naturalWidth : src.naturalHeight;
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const o = off.getContext("2d");
  o.translate(W / 2, H / 2);
  o.rotate(rad);
  o.drawImage(src, -src.naturalWidth / 2, -src.naturalHeight / 2);
  const img = new Image();
  img.onload = () => {
    renderer.baseImage = img;
    canvas.width = W; canvas.height = H;
    renderer.render(currentState);
    if (crop.active) crop.start();
    history.push(currentState);
  };
  img.src = off.toDataURL("image/png");
}

function flipCanvas(direction) {
  const src = renderer.baseImage;
  const W = src.naturalWidth, H = src.naturalHeight;
  const off = document.createElement("canvas");
  off.width = W; off.height = H;
  const o = off.getContext("2d");
  if (direction === "horizontal") { o.translate(W, 0); o.scale(-1, 1); }
  else { o.translate(0, H); o.scale(1, -1); }
  o.drawImage(src, 0, 0);
  const img = new Image();
  img.onload = () => {
    renderer.baseImage = img;
    canvas.width = W; canvas.height = H;
    renderer.render(currentState);
    if (crop.active) crop.start();
    history.push(currentState);
  };
  img.src = off.toDataURL("image/png");
}

// ---------- Crop ----------
document.querySelectorAll("[data-ratio]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const r = btn.dataset.ratio;
    const ratio = r === "free" ? null : r.split(":").map(Number).reduce((a, b) => a / b);
    crop.setRatio(ratio);
    document.querySelectorAll("[data-ratio]").forEach((b) => b.classList.toggle("active", b === btn));
  });
});
$("#btn-apply-crop").addEventListener("click", () => {
  if (!crop.rect) return;
  const { x, y, w, h } = crop.rect;
  const off = document.createElement("canvas");
  off.width = w; off.height = h;
  off.getContext("2d").drawImage(canvas, x, y, w, h, 0, 0, w, h);
  const img = new Image();
  img.onload = () => {
    renderer.baseImage = img;
    canvas.width = w; canvas.height = h;
    renderer.render(currentState);
    crop.cancel();
    history.push(currentState);
  };
  img.src = off.toDataURL("image/png");
});
$("#btn-cancel-crop").addEventListener("click", () => crop.cancel());

// ---------- Upload ----------
$("#file-input").addEventListener("change", (e) => e.target.files[0] && handleFile(e.target.files[0]));
const dropZone = $("#drop-zone");

["dragenter", "dragover"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    // Context-aware (Roadmap #18): let collage own drops when it's active.
    if (isCollageActive()) return;
    e.preventDefault();
    dropZone.classList.add("drag");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    if (isCollageActive()) return;
    e.preventDefault();
    dropZone.classList.remove("drag");
  })
);
dropZone.addEventListener("drop", (e) => {
  // Context-aware (Roadmap #18)
  const files = Array.from(e.dataTransfer.files || []);
  if (!files.length) return;

  if (isCollageActive()) {
    e.preventDefault();
    // Forward to the collage uploader: it has its own drop handler on drop-zone.
    return;
  }

  if (isLayersActive()) {
    e.preventDefault();
    // Add each image as a new layer
    handleLayerFiles(files);
    return;
  }

  // Default: single-file upload into the main image
  e.preventDefault();
  handleFile(files[0]);
});

function isCollageActive() {
  const p = document.querySelector('.panel-section[data-panel="collage"]');
  return p && !p.classList.contains("hidden");
}
function isLayersActive() {
  const p = document.querySelector('.panel-section[data-panel="layers"]');
  return p && !p.classList.contains("hidden");
}

async function handleLayerFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith("image/")) {
      toast(`Skipped non-image: ${f.name}`, true);
      continue;
    }
    const url = URL.createObjectURL(f);
    const img = await new Promise((res) => {
      const i = new Image();
      i.onload = () => res(i);
      i.src = url;
    });
    URL.revokeObjectURL(url);

    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    layersPanel.addSourceCanvasLayer(c, f.name.replace(/\.[^.]+$/, "").slice(0, 24));
  }
  toast(`Added ${files.length} layer${files.length === 1 ? "" : "s"}`);
}

const MAX_MB = 25;
async function handleFile(file) {
  if (!file.type.startsWith("image/")) return toast("Not an image file", true);
  if (file.size > MAX_MB * 1024 * 1024) return toast(`File too large (max ${MAX_MB} MB)`, true);

  busy(true);
  showSkeleton();
  try {
    const info = await api.upload(file);
    uploadedId = info.id;
    await renderer.loadFromUrl(info.url);
    $("#placeholder").classList.add("hidden");
    currentState = blankState();
    resetSliders();
    history.push(currentState);
    originalWidth = info.width;
    originalHeight = info.height;
    $("#fit-w").value = originalWidth;
    $("#fit-h").value = originalHeight;
    updateDimReadout();
    setDocumentTitle([`${info.width}×${info.height}`]);
    toast("Image loaded");
    const metaPanel = document.querySelector('.panel-section[data-panel="metadata"]');
    if (metaPanel && !metaPanel.classList.contains("hidden")) {
      await metadataPanel.load(uploadedId);
    }
  } catch (err) {
    toast(err.message || "Upload failed", true);
  } finally {
    hideSkeleton();
    busy(false);
  }
}

function resetSliders() {
  refreshSliderReadouts(blankState());
  document.querySelectorAll("[data-filter]").forEach((b) => b.classList.toggle("active", b.dataset.filter === "none"));
}

// ---------- History ----------
$("#btn-undo").addEventListener("click", () => history.undo());
$("#btn-redo").addEventListener("click", () => history.redo());
$("#btn-reset").addEventListener("click", async () => {
  if (!uploadedId) return;
  await renderer.loadFromUrl(`/static/uploads/${uploadedId}.png`);
  currentState = blankState();
  resetSliders();
  history.push(currentState);
  toast("Reset to original");
});

// ---------- Compare (Roadmap #14) ----------
$("#btn-compare").addEventListener("click", () => {
  if (!renderer.baseImage) return toast("Upload an image first", true);
  if (comparing) { closeCompare(); comparing = false; return; }

  // Before = original upload; After = current rendered canvas.
  const afterDataURL = canvas.toDataURL("image/png");
  const beforeDataURL = `/static/uploads/${uploadedId}.png`;

  openCompare({
    beforeDataURL,
    afterDataURL,
    root: document.querySelector(".canvas-wrap"),
  });
  comparing = true;

  const closeOnce = () => {
    closeCompare();
    comparing = false;
    window.removeEventListener("keydown", keyHandler);
  };
  const keyHandler = (e) => { if (e.key === "Escape") closeOnce(); };
  window.addEventListener("keydown", keyHandler);

  // Auto-close after the user clicks anywhere else (other than the divider).
  setTimeout(() => {
    const anyClick = (e) => {
      if (e.target.closest(".compare-divider")) return;
      if (e.target.closest(".compare-handle")) return;
      closeOnce();
      document.removeEventListener("pointerdown", anyClick, true);
    };
    document.addEventListener("pointerdown", anyClick, true);
  }, 100);
});

// ---------- Export ----------
const modal = $("#export-modal");
$("#btn-export").addEventListener("click", () => {
  if (!renderer.baseImage && !layersPanel.hasLayers()) return toast("Nothing to export", true);
  modal.classList.remove("hidden");
});
$("#btn-cancel-export").addEventListener("click", () => modal.classList.add("hidden"));
$("#export-quality").addEventListener("input", (e) => ($("#quality-val").textContent = e.target.value));

$("#btn-do-export").addEventListener("click", async () => {
  const format = $("#export-format").value;
  const quality = parseInt($("#export-quality").value, 10);

  const layersPanelVisible = !document.querySelector('.panel-section[data-panel="layers"]').classList.contains("hidden");
  if (layersPanelVisible && layersPanel.hasLayers()) {
    modal.classList.add("hidden");
    return layersPanel.exportComposite(format === "jpg" ? "jpg" : "png");
  }

  const mime = format === "jpg" ? "image/jpeg" : format === "webp" ? "image/webp" : "image/png";

  busy(true);
  try {
    const composite = renderer.toDataURL(mime, quality / 100);
    const blob = await api.export({ id: uploadedId, format, quality, composite });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `outlook-studio-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    modal.classList.add("hidden");
    toast("Exported");
  } catch (err) {
    toast(err.message || "Export failed", true);
  } finally { busy(false); }
});

// ---------- Text tool ----------
let textAlign = "left";
let textShadow = false;
let textOutline = false;

const textSpacingInput = $("#text-spacing");
const textSpacingReadout = document.querySelector('.adj-value[data-for="text-spacing"]');
textSpacingInput.addEventListener("input", () => {
  textSpacingReadout.textContent = textSpacingInput.value;
});
textSpacingInput.addEventListener("dblclick", () => {
  textSpacingInput.value = 0;
  textSpacingReadout.textContent = "0";
});

document.querySelectorAll(".text-align").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".text-align").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    textAlign = btn.id.replace("text-align-", "");
  });
});

$("#text-shadow-toggle").addEventListener("click", (e) => {
  textShadow = !textShadow;
  e.target.textContent = `Shadow: ${textShadow ? "On" : "Off"}`;
});
$("#text-outline-toggle").addEventListener("click", (e) => {
  textOutline = !textOutline;
  e.target.textContent = `Outline: ${textOutline ? "On" : "Off"}`;
});

$("#btn-add-text").addEventListener("click", () => {
  const text = $("#text-input").value.trim();
  if (!text) return toast("Type something first", true);

  const sourceCanvas = createTextCanvas({
    text,
    font: $("#text-font").value,
    weight: $("#text-weight").value,
    size: parseInt($("#text-size").value, 10) || 72,
    color: $("#text-color").value,
    align: textAlign,
    letterSpacing: parseInt(textSpacingInput.value, 10) || 0,
    shadow: textShadow,
    outline: textOutline,
  });

  layersPanel.addSourceCanvasLayer(sourceCanvas, text.slice(0, 24));
  toast("Text layer added");
  document.querySelector('.tool[data-panel="layers"]').click();
});

// ---------- Stickers ----------
function buildStickerGrid() {
  const emojiGrid = $("#sticker-emoji");
  const shapeGrid = $("#sticker-shapes");

  EMOJIS.forEach((emoji) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = emoji;
    b.title = emoji;
    b.setAttribute("aria-label", `Add ${emoji}`);
    b.addEventListener("click", () => {
      const sourceCanvas = emojiToCanvas(emoji, 512);
      layersPanel.addSourceCanvasLayer(sourceCanvas, emoji);
      toast("Emoji added");
      document.querySelector('.tool[data-panel="layers"]').click();
    });
    emojiGrid.appendChild(b);
  });

  SHAPES.forEach((shape) => {
    const b = document.createElement("button");
    b.type = "button";
    b.classList.add("shape-btn");
    b.title = shape.label;
    b.setAttribute("aria-label", `Add ${shape.label}`);

    const preview = document.createElement("canvas");
    preview.width = 48;
    preview.height = 48;
    const c = shapeToCanvas(shape.id, $("#sticker-color").value, 48);
    preview.getContext("2d").drawImage(c, 0, 0);
    b.appendChild(preview);

    b.addEventListener("click", () => {
      const color = $("#sticker-color").value || "#4f46e5";
      const sourceCanvas = shapeToCanvas(shape.id, color, 512);
      layersPanel.addSourceCanvasLayer(sourceCanvas, shape.label);
      toast(`${shape.label} added`);
      document.querySelector('.tool[data-panel="layers"]').click();
    });
    shapeGrid.appendChild(b);
  });

  $("#sticker-color").addEventListener("input", (e) => {
    const color = e.target.value;
    SHAPES.forEach((shape, i) => {
      const btn = shapeGrid.children[i];
      if (!btn) return;
      const c = shapeToCanvas(shape.id, color, 48);
      const pv = btn.querySelector("canvas");
      pv.getContext("2d").clearRect(0, 0, 48, 48);
      pv.getContext("2d").drawImage(c, 0, 0);
    });
  });
}
buildStickerGrid();

// ---------- Preset save/load ----------
function renderPresetList() {
  const list = $("#preset-list");
  const presets = listPresets();

  list.innerHTML = "";
  if (!presets.length) {
    list.innerHTML = `<p class="hint" id="preset-empty">No saved presets yet.</p>`;
    return;
  }

  presets.forEach((p) => {
    const item = document.createElement("div");
    item.className = "preset-item";
    item.title = "Click to apply";

    const swatch = document.createElement("div");
    swatch.className = "preset-swatch";
    swatch.style.background = swatchBackground(p.state.filter);
    item.appendChild(swatch);

    const name = document.createElement("div");
    name.className = "preset-name";
    name.textContent = p.name;
    item.appendChild(name);

    const actions = document.createElement("div");
    actions.className = "preset-actions";

    const del = document.createElement("button");
    del.textContent = "✕";
    del.title = "Delete";
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deletePreset(p.id);
      renderPresetList();
    });
    actions.appendChild(del);
    item.appendChild(actions);

    item.addEventListener("click", () => {
      const preset = getPreset(p.id);
      if (!preset) return;
      currentState.adjustments = { ...currentState.adjustments, ...preset.state.adjustments };
      currentState.filter = preset.state.filter || "none";
      refreshSliderReadouts(currentState);
      document.querySelectorAll("[data-filter]").forEach((b) =>
        b.classList.toggle("active", b.dataset.filter === currentState.filter)
      );
      renderer.render(currentState);
      history.push(currentState);
      toast(`Applied preset "${preset.name}"`);
    });

    list.appendChild(item);
  });
}

function swatchBackground(filter) {
  switch (filter) {
    case "bw":      return "linear-gradient(135deg, #444, #bbb)";
    case "sepia":   return "linear-gradient(135deg, #a3703b, #e6cba5)";
    case "vintage": return "linear-gradient(135deg, #7c5f3f, #d9c1a3)";
    case "vivid":   return "linear-gradient(135deg, #ff5e7e, #ffd166)";
    case "cool":    return "linear-gradient(135deg, #4a90e2, #b6d7ff)";
    case "warm":    return "linear-gradient(135deg, #ff8c42, #ffd7a3)";
    default:        return "linear-gradient(135deg, #e6e8ec, #f4f5f7)";
  }
}

$("#btn-save-preset").addEventListener("click", () => {
  const name = prompt("Preset name:");
  if (!name) return;
  try {
    savePreset(name, currentState);
    renderPresetList();
    toast(`Saved preset "${name}"`);
  } catch (err) {
    toast(err.message, true);
  }
});

$("#btn-export-presets").addEventListener("click", () => {
  if (!listPresets().length) return toast("No presets to export", true);
  exportPresets();
  toast("Presets exported");
});

$("#btn-import-preset").addEventListener("click", () => $("#preset-import").click());
$("#preset-import").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    await importPresets(f);
    renderPresetList();
    toast("Presets imported");
  } catch (err) {
    toast(`Import failed: ${err.message}`, true);
  }
  e.target.value = "";
});

renderPresetList();

// ---------- Copy/paste style ----------
function refreshStyleButtons() {
  $("#btn-copy-style").disabled = !renderer.baseImage;
  const pasteBtn = $("#btn-paste-style");
  pasteBtn.disabled = !renderer.baseImage || !hasStyle();
  pasteBtn.classList.toggle("ready", hasStyle());
}

$("#btn-copy-style").addEventListener("click", () => {
  if (!renderer.baseImage) return;
  const style = {
    adjustments: { ...currentState.adjustments },
    filter: currentState.filter || "none",
  };
  copyStyle(style);
  refreshStyleButtons();
  toast("Style copied");
});

$("#btn-paste-style").addEventListener("click", () => {
  const style = pasteStyle();
  if (!style) return toast("Nothing copied yet", true);
  currentState.adjustments = { ...currentState.adjustments, ...style.adjustments };
  currentState.filter = style.filter || "none";
  refreshSliderReadouts(currentState);
  document.querySelectorAll("[data-filter]").forEach((b) =>
    b.classList.toggle("active", b.dataset.filter === currentState.filter)
  );
  renderer.render(currentState);
  history.push(currentState);
  toast("Style pasted");
});

// ---------- Background removal ----------
(async function initBgPanel() {
  const card = $("#bg-card");
  const status = $("#bg-status");
  const btn = $("#btn-remove-bg");
  const replaceSel = $("#bg-replace");
  const colorRow = $("#bg-color-row");
  const colorInput = $("#bg-color");

  replaceSel.addEventListener("change", () => {
    colorRow.classList.toggle("hidden", replaceSel.value !== "color");
  });

  const available = await isBgAvailable();
  if (!available) {
    card.classList.add("unavailable");
    status.textContent = "Background removal is not installed on the server.";
    btn.disabled = true;
    return;
  }
  status.textContent = "Available. First run downloads the model (~4–176 MB).";

  btn.addEventListener("click", async () => {
    if (!renderer.baseImage) return toast("Upload an image first", true);

    const src = renderer.baseImage.src;
    const model = $("#bg-model").value;

    const opts = { model };
    if (replaceSel.value === "color") {
      const hex = colorInput.value.replace("#", "");
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      opts.bgColor = [r, g, b, 255];
    }

    card.classList.add("busy");
    busy(true);
    try {
      const blob = await removeBackground(src, opts);
      const url = URL.createObjectURL(blob);
      await renderer.loadFromUrl(url);
      URL.revokeObjectURL(url);
      history.push(currentState);
      updateDimReadout();
      toast("Background removed");
    } catch (err) {
      toast(err.message || "Background removal failed", true);
    } finally {
      card.classList.remove("busy");
      busy(false);
    }
  });
})();

// ---------- Project persistence (Roadmap #16) ----------
function schedulePersistence() {
  if (!uploadedId) return;
  scheduleSave(buildProjectSnapshot());
}

function buildProjectSnapshot() {
  return {
    uploadedId,
    originalWidth,
    originalHeight,
    adjustments: { ...currentState.adjustments },
    filter: currentState.filter,
    layers: layersPanel.hasLayers() ? layersPanel.getState() : null,
  };
}

// Restore on load
(async function restoreOnLoad() {
  const saved = loadSaved();
  if (!saved) return;
  if (!saved.uploadedId) return;

  try {
    // Only restore if the upload still exists server-side
    const r = await fetch(`/metadata/${saved.uploadedId}`);
    if (!r.ok) return;
  } catch {
    return;
  }

  const restore = confirm(
    `Restore your previous project from ${new Date(saved.savedAt).toLocaleString()}?`
  );
  if (!restore) { clearSaved(); return; }

  try {
    uploadedId = saved.uploadedId;
    originalWidth = saved.originalWidth || 0;
    originalHeight = saved.originalHeight || 0;

    await renderer.loadFromUrl(`/static/uploads/${uploadedId}.png`);
    $("#placeholder").classList.add("hidden");
    canvas.width = renderer.baseImage.naturalWidth;
    canvas.height = renderer.baseImage.naturalHeight;

    currentState = blankState();
    currentState.adjustments = { ...currentState.adjustments, ...(saved.adjustments || {}) };
    currentState.filter = saved.filter || "none";
    refreshSliderReadouts(currentState);
    document.querySelectorAll("[data-filter]").forEach((b) =>
      b.classList.toggle("active", b.dataset.filter === currentState.filter)
    );
    renderer.render(currentState);

    if (saved.layers) {
      await layersPanel.setState(saved.layers);
    }

    history.push(currentState);
    updateDimReadout();
    toast("Project restored");
  } catch (e) {
    toast(`Restore failed: ${e.message}`, true);
  }
})();

// ---------- Project file (Roadmap #17) ----------
$("#btn-save-project").addEventListener("click", () => {
  if (!uploadedId && !layersPanel.hasLayers()) {
    return toast("Nothing to save", true);
  }
  exportProjectFile(buildProjectSnapshot());
  toast("Project file downloaded");
});

$("#btn-open-project").addEventListener("click", () => $("#project-input").click());
$("#project-input").addEventListener("change", async (e) => {
  const f = e.target.files[0];
  if (!f) return;
  e.target.value = "";

  try {
    const data = await importProjectFile(f);

    if (data.uploadedId) {
      const r = await fetch(`/metadata/${data.uploadedId}`);
      if (!r.ok) {
        toast("The original image for this project isn't on the server", true);
        return;
      }
      uploadedId = data.uploadedId;
      originalWidth = data.originalWidth || 0;
      originalHeight = data.originalHeight || 0;
      await renderer.loadFromUrl(`/static/uploads/${uploadedId}.png`);
      $("#placeholder").classList.add("hidden");
      canvas.width = renderer.baseImage.naturalWidth;
      canvas.height = renderer.baseImage.naturalHeight;
    }

    currentState = blankState();
    currentState.adjustments = { ...currentState.adjustments, ...(data.adjustments || {}) };
    currentState.filter = data.filter || "none";
    refreshSliderReadouts(currentState);
    document.querySelectorAll("[data-filter]").forEach((b) =>
      b.classList.toggle("active", b.dataset.filter === currentState.filter)
    );
    renderer.render(currentState);

    if (data.layers) await layersPanel.setState(data.layers);

    history.push(currentState);
    updateDimReadout();
    toast("Project loaded");
  } catch (err) {
    toast(err.message || "Could not load project", true);
  }
});

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;

  if (e.shiftKey && (e.key === "C" || e.key === "c")) { e.preventDefault(); $("#btn-copy-style").click(); return; }
  if (e.shiftKey && (e.key === "V" || e.key === "v")) { e.preventDefault(); $("#btn-paste-style").click(); return; }

  if (e.key === "z" && !e.shiftKey) { e.preventDefault(); history.undo(); }
  else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); history.redo(); }
  else if (e.key === "s" && !e.shiftKey) { e.preventDefault(); $("#btn-export").click(); }
  else if (e.key === "s" && e.shiftKey) { e.preventDefault(); $("#btn-save-project").click(); }
  else if (e.key === "o") { e.preventDefault(); $("#file-input").click(); }
  else if (e.key === "l") { e.preventDefault(); document.querySelector('.tool[data-panel="layers"]').click(); }
  else if (e.key === "k") { e.preventDefault(); document.querySelector('.tool[data-panel="collage"]').click(); }
  else if (e.key === "t") { e.preventDefault(); document.querySelector('.tool[data-panel="text"]').click(); }
});

$("#placeholder").classList.add("hidden");
setDocumentTitle();

const origHandleFile = handleFile;
handleFile = async function (file) {
  await origHandleFile(file);
  refreshStyleButtons();
};
refreshStyleButtons();