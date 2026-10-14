import { api } from "./api.js";
import { History } from "./history.js";
import { CanvasRenderer } from "./canvas.js";
import { CropTool } from "./crop.js";
import { initFitPanel } from "./fit.js";
import { initMetadataPanel } from "./metadata.js";
import { initLayersPanel } from "./layers.js";
import { initCollagePanel } from "./collage.js";

const $ = (s) => document.querySelector(s);
const canvas = $("#canvas");
const overlay = $("#overlay");
const renderer = new CanvasRenderer(canvas);
const crop = new CropTool(canvas, overlay, () => {});

let uploadedId = null;
let currentState = blankState();
let originalWidth = 0, originalHeight = 0;

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
});

let toastTimer;
function toast(msg, isError = false) {
  const el = $("#toast");
  el.textContent = msg;
  el.classList.toggle("error", isError);
  el.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.add("hidden"), 2600);
  setStatus(msg);
}
function busy(on) { $("#loader").classList.toggle("hidden", !on); }
function setStatus(msg) { $("#status").textContent = msg; }
function updateDimReadout() {
  const el = $("#dim-readout");
  if (!renderer.baseImage) { el.textContent = "—"; return; }
  el.textContent = `${canvas.width} × ${canvas.height} px`;
}

// ---------- Init sub-panels ----------
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
    } else {
      overlay.classList.remove("active");
      overlay.style.pointerEvents = "";
      overlay.getContext("2d").clearRect(0, 0, overlay.width, overlay.height);
      // Release any stale pointer capture the crop tool may be holding.
      try { overlay.releasePointerCapture?.(0); } catch (_) {}
    }

    if (p === "metadata") await metadataPanel.load(uploadedId);
    if (p === "fit" && renderer.baseImage) {
      $("#fit-w").value = $("#fit-w").value || canvas.width;
      $("#fit-h").value = $("#fit-h").value || canvas.height;
    }
    if (p === "collage") collagePanel.onShow();
  });
});

// ---------- Adjustments ----------
document.querySelectorAll("[data-adj]").forEach((input) => {
  input.addEventListener("input", () => {
    currentState.adjustments[input.dataset.adj] = parseFloat(input.value);
    renderer.render(currentState);
  });
  input.addEventListener("change", () => history.push(currentState));
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
    // Don't hijack drops intended for the collage panel
    const collage = document.querySelector('.panel-section[data-panel="collage"]');
    if (collage && !collage.classList.contains("hidden")) return;
    e.preventDefault();
    dropZone.classList.add("drag");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropZone.addEventListener(ev, (e) => {
    const collage = document.querySelector('.panel-section[data-panel="collage"]');
    if (collage && !collage.classList.contains("hidden")) return;
    e.preventDefault();
    dropZone.classList.remove("drag");
  })
);
dropZone.addEventListener("drop", (e) => {
  const collage = document.querySelector('.panel-section[data-panel="collage"]');
  if (collage && !collage.classList.contains("hidden")) return;
  const f = e.dataTransfer.files[0];
  if (f) handleFile(f);
});

const MAX_MB = 25;
async function handleFile(file) {
  if (!file.type.startsWith("image/")) return toast("Not an image file", true);
  if (file.size > MAX_MB * 1024 * 1024) return toast(`File too large (max ${MAX_MB} MB)`, true);

  busy(true);
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
    toast("Image loaded");
    const metaPanel = document.querySelector('.panel-section[data-panel="metadata"]');
    if (metaPanel && !metaPanel.classList.contains("hidden")) {
      await metadataPanel.load(uploadedId);
    }
  } catch (err) {
    toast(err.message || "Upload failed", true);
  } finally {
    busy(false);
  }
}

function resetSliders() {
  document.querySelectorAll("[data-adj]").forEach((i) => (i.value = 0));
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

// ---------- Compare ----------
const btnCompare = $("#btn-compare");
["mousedown", "touchstart"].forEach((ev) =>
  btnCompare.addEventListener(ev, () => renderer.render(blankState()))
);
["mouseup", "mouseleave", "touchend"].forEach((ev) =>
  btnCompare.addEventListener(ev, () => renderer.render(currentState))
);

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

  // If Layers panel is active and has layers, use the layers exporter
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
    a.download = `pixelstudio-${Date.now()}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
    modal.classList.add("hidden");
    toast("Exported");
  } catch (err) {
    toast(err.message || "Export failed", true);
  } finally { busy(false); }
});

// ---------- Keyboard shortcuts ----------
document.addEventListener("keydown", (e) => {
  const ctrl = e.ctrlKey || e.metaKey;
  if (!ctrl) return;
  if (e.key === "z" && !e.shiftKey) { e.preventDefault(); history.undo(); }
  else if (e.key === "y" || (e.key === "z" && e.shiftKey)) { e.preventDefault(); history.redo(); }
  else if (e.key === "s") { e.preventDefault(); $("#btn-export").click(); }
  else if (e.key === "o") { e.preventDefault(); $("#file-input").click(); }
  else if (e.key === "l") { e.preventDefault(); document.querySelector('.tool[data-panel="layers"]').click(); }
  else if (e.key === "k") { e.preventDefault(); document.querySelector('.tool[data-panel="collage"]').click(); }
});

$("#placeholder").classList.add("hidden");