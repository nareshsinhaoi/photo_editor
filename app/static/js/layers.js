// Layers panel: multi-image composition on a fixed-size canvas.
export function initLayersPanel({ getRootCanvas, toast, busy }) {
  const $ = (s) => document.querySelector(s);
  const overlay = $("#overlay");

  let canvas = {
    width: 1080, height: 1080,
    background: { mode: "color", color: "#ffffff" },
  };
  let layers = [];
  let selectedId = null;
  let nextId = 1;
  const sources = new Map();

  function getSelected() { return layers.find((l) => l.id === selectedId) || null; }
  function uid() { return `L${nextId++}`; }

  // ------------- create canvas -------------
  $("#new-bg-mode").addEventListener("change", (e) => {
    $("#new-bg-color-row").classList.toggle("hidden", e.target.value !== "color");
  });

  document.querySelectorAll("[data-new-preset]").forEach((b) => {
    b.addEventListener("click", () => {
      const [w, h] = b.dataset.newPreset.split("x").map(Number);
      $("#new-w").value = w;
      $("#new-h").value = h;
    });
  });

  $("#btn-create-canvas").addEventListener("click", () => {
    const w = parseInt($("#new-w").value, 10);
    const h = parseInt($("#new-h").value, 10);
    if (!w || !h || w < 16 || h < 16) return toast("Enter valid dimensions (min 16px)", true);
    if (w > 8000 || h > 8000) return toast("Max 8000px per side", true);

    canvas.width = w;
    canvas.height = h;
    const bgMode = $("#new-bg-mode").value;
    canvas.background = bgMode === "transparent"
      ? { mode: "transparent" }
      : { mode: "color", color: $("#new-bg-color").value };

    layers = [];
    selectedId = null;
    sources.clear();
    nextId = 1;
    renderAll();
    toast(`Canvas created: ${w}×${h}`);
  });

  // ------------- add image layer -------------
  $("#layer-file").addEventListener("change", async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) await addImageLayer(f);
    e.target.value = "";
  });

  async function addImageLayer(file) {
    if (!file.type.startsWith("image/")) return toast("Not an image", true);
    if (file.size > 25 * 1024 * 1024) return toast("File > 25 MB", true);

    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    URL.revokeObjectURL(url);

    const cw = canvas.width, ch = canvas.height;
    const r = Math.min(cw / img.naturalWidth, ch / img.naturalHeight, 1);
    const w = Math.round(img.naturalWidth * r);
    const h = Math.round(img.naturalHeight * r);

    const layer = {
      id: uid(),
      name: file.name.replace(/\.[^.]+$/, "").slice(0, 24) || "Layer",
      sourceCanvas: imgToCanvas(img),
      x: Math.round((cw - w) / 2),
      y: Math.round((ch - h) / 2),
      w, h,
      rotation: 0,
      opacity: 100,
      visible: true,
    };
    sources.set(layer.id, img);
    layers.push(layer);
    selectedId = layer.id;
    renderAll();
    toast(`Added "${layer.name}"`);
  }

  function imgToCanvas(img) {
    const c = document.createElement("canvas");
    c.width = img.naturalWidth;
    c.height = img.naturalHeight;
    c.getContext("2d").drawImage(img, 0, 0);
    return c;
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  // ------------- render -------------
  function renderAll() {
    const target = getRootCanvas();
    target.width = canvas.width;
    target.height = canvas.height;

    const ctx = target.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (canvas.background.mode === "color") {
      ctx.fillStyle = canvas.background.color;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    for (const l of layers) {
      if (!l.visible) continue;
      ctx.save();
      ctx.globalAlpha = l.opacity / 100;
      ctx.drawImage(l.sourceCanvas, l.x, l.y, l.w, l.h);
      ctx.restore();
    }

    renderLayerList();
    renderSelectedControls();
    drawSelectionBox(target);
    syncOverlay();
  }

  function syncOverlay() {
    const target = getRootCanvas();
    overlay.width = target.width;
    overlay.height = target.height;
    const rect = target.getBoundingClientRect();
    overlay.style.position = "absolute";
    overlay.style.left = "0";
    overlay.style.top = "0";
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
  }

  window.addEventListener("resize", () => {
    if (overlay.classList.contains("active")) syncOverlay();
  });

  function drawSelectionBox(target) {
    const l = getSelected();
    if (!l) return;
    const ctx = target.getContext("2d");
    ctx.save();
    ctx.strokeStyle = "#4f46e5";
    ctx.setLineDash([6, 4]);
    ctx.lineWidth = Math.max(1, canvas.width / 800);
    ctx.strokeRect(l.x, l.y, l.w, l.h);

    const s = Math.max(6, canvas.width / 120);
    ctx.setLineDash([]);
    ctx.fillStyle = "#4f46e5";
    for (const [cx, cy] of [
      [l.x, l.y], [l.x + l.w, l.y],
      [l.x, l.y + l.h], [l.x + l.w, l.y + l.h],
    ]) {
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }
    ctx.restore();
  }

  function renderLayerList() {
    const list = $("#layer-list");
    if (!layers.length) {
      list.innerHTML = `<p class="hint">No layers yet.</p>`;
      return;
    }
    list.innerHTML = "";
    [...layers].reverse().forEach((l) => {
      const row = document.createElement("div");
      row.className = "layer-item" + (l.id === selectedId ? " active" : "");
      const thumbUrl = l.sourceCanvas.toDataURL("image/png");
      row.innerHTML = `
        <div class="eye" title="Toggle visibility">${l.visible ? "👁" : "—"}</div>
        <div class="thumb" style="background-image:url('${thumbUrl}')"></div>
        <div class="name" title="${l.name}">${l.name}</div>
        <div class="actions">
          <button title="Rename">✎</button>
          <button title="Delete">✕</button>
        </div>
      `;
      row.addEventListener("click", (e) => {
        if (e.target.closest(".eye")) { l.visible = !l.visible; renderAll(); return; }
        if (e.target.closest("button[title='Rename']")) {
          const n = prompt("Layer name:", l.name);
          if (n) { l.name = n.slice(0, 40); renderAll(); }
          return;
        }
        if (e.target.closest("button[title='Delete']")) { deleteLayer(l.id); return; }
        selectedId = l.id;
        renderAll();
      });
      list.appendChild(row);
    });
  }

  function renderSelectedControls() {
    const l = getSelected();
    const dis = !l;
    ["#layer-opacity", "#layer-x", "#layer-y", "#layer-w", "#layer-h"].forEach((s) => $(s).disabled = dis);
    if (!l) return;
    $("#layer-opacity").value = l.opacity;
    $("#layer-x").value = Math.round(l.x);
    $("#layer-y").value = Math.round(l.y);
    $("#layer-w").value = Math.round(l.w);
    $("#layer-h").value = Math.round(l.h);
  }

  function deleteLayer(id) {
    layers = layers.filter((l) => l.id !== id);
    sources.delete(id);
    if (selectedId === id) selectedId = layers[layers.length - 1]?.id ?? null;
    renderAll();
  }

  // ------------- selected-layer controls -------------
  $("#layer-opacity").addEventListener("input", (e) => {
    const l = getSelected();
    if (!l) return;
    l.opacity = parseInt(e.target.value, 10);
    renderAll();
  });

  [["#layer-x", "x"], ["#layer-y", "y"], ["#layer-w", "w"], ["#layer-h", "h"]].forEach(([sel, key]) => {
    $(sel).addEventListener("change", (e) => {
      const l = getSelected();
      if (!l) return;
      const v = parseFloat(e.target.value);
      if (isNaN(v)) return;
      if (key === "w" || key === "h") {
        if (v < 4) return;
        const ar = l.w / l.h;
        if (key === "w") { l.w = v; l.h = Math.round(v / ar); }
        else { l.h = v; l.w = Math.round(v * ar); }
      } else {
        l[key] = v;
      }
      renderAll();
    });
  });

  function bakeRotation(l, delta) {
    const c = document.createElement("canvas");
    const rad = (delta * Math.PI) / 180;
    const swap = Math.abs(delta) === 90;
    c.width = swap ? l.sourceCanvas.height : l.sourceCanvas.width;
    c.height = swap ? l.sourceCanvas.width : l.sourceCanvas.height;
    const x = c.getContext("2d");
    x.translate(c.width / 2, c.height / 2);
    x.rotate(rad);
    x.drawImage(l.sourceCanvas, -l.sourceCanvas.width / 2, -l.sourceCanvas.height / 2);
    l.sourceCanvas = c;
    l.rotation = 0;
  }

  function bakeFlip(l, axis) {
    const c = document.createElement("canvas");
    c.width = l.sourceCanvas.width;
    c.height = l.sourceCanvas.height;
    const x = c.getContext("2d");
    if (axis === "h") { x.translate(c.width, 0); x.scale(-1, 1); }
    else { x.translate(0, c.height); x.scale(1, -1); }
    x.drawImage(l.sourceCanvas, 0, 0);
    l.sourceCanvas = c;
  }

  $("#layer-rotate-l").addEventListener("click", () => { const l = getSelected(); if (l) { bakeRotation(l, -90); renderAll(); } });
  $("#layer-rotate-r").addEventListener("click", () => { const l = getSelected(); if (l) { bakeRotation(l, 90); renderAll(); } });
  $("#layer-flip-h").addEventListener("click", () => { const l = getSelected(); if (l) { bakeFlip(l, "h"); renderAll(); } });
  $("#layer-flip-v").addEventListener("click", () => { const l = getSelected(); if (l) { bakeFlip(l, "v"); renderAll(); } });

  function reorder(mode) {
    const l = getSelected();
    if (!l) return;
    const i = layers.indexOf(l);
    layers.splice(i, 1);
    if (mode === "front") layers.push(l);
    else if (mode === "back") layers.unshift(l);
    else if (mode === "forward") layers.splice(Math.min(layers.length, i + 1), 0, l);
    else if (mode === "backward") layers.splice(Math.max(0, i - 1), 0, l);
    renderAll();
  }
  $("#layer-front").addEventListener("click", () => reorder("front"));
  $("#layer-forward").addEventListener("click", () => reorder("forward"));
  $("#layer-backward").addEventListener("click", () => reorder("backward"));
  $("#layer-back").addEventListener("click", () => reorder("back"));

  $("#layer-rename").addEventListener("click", () => {
    const l = getSelected();
    if (!l) return;
    const n = prompt("Layer name:", l.name);
    if (n) { l.name = n.slice(0, 40); renderAll(); }
  });
  $("#layer-delete").addEventListener("click", () => { const l = getSelected(); if (l) deleteLayer(l.id); });

  // ------------- pointer drag -------------
  let drag = null;

  function pointInCanvas(e) {
    const rect = overlay.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    return { x: (e.clientX - rect.left) * sx, y: (e.clientY - rect.top) * sy, scale: sx };
  }

  function topLayerAt(p) {
    for (let i = layers.length - 1; i >= 0; i--) {
      const l = layers[i];
      if (!l.visible) continue;
      if (p.x >= l.x && p.x <= l.x + l.w && p.y >= l.y && p.y <= l.y + l.h) return l;
    }
    return null;
  }

  function handleAt(l, p) {
    const tol = 12 / (p.scale || 1);
    const nearL = Math.abs(p.x - l.x) < tol;
    const nearR = Math.abs(p.x - (l.x + l.w)) < tol;
    const nearT = Math.abs(p.y - l.y) < tol;
    const nearB = Math.abs(p.y - (l.y + l.h)) < tol;
    if (nearL && nearT) return "nw";
    if (nearR && nearT) return "ne";
    if (nearL && nearB) return "sw";
    if (nearR && nearB) return "se";
    if (nearL) return "w";
    if (nearR) return "e";
    if (nearT) return "n";
    if (nearB) return "s";
    return null;
  }

  overlay.addEventListener("pointerdown", (e) => {
    // Only active when the Layers panel is the visible one.
    const panel = document.querySelector('.panel-section[data-panel="layers"]');
    if (!panel || panel.classList.contains("hidden")) return;

    const p = pointInCanvas(e);

    // 1) If the currently selected layer has a handle under the cursor, grab it.
    let sel = getSelected();
    let handle = sel ? handleAt(sel, p) : null;

    if (handle && sel) {
      drag = { mode: handle, startX: p.x, startY: p.y, orig: { x: sel.x, y: sel.y, w: sel.w, h: sel.h } };
      try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
      e.preventDefault();
      e.stopPropagation();
      return;
    }

    // 2) Otherwise, pick the topmost layer under the cursor and start a move.
    const hit = topLayerAt(p);
    if (!hit) {
      selectedId = null;
      renderAll();
      return;
    }

    selectedId = hit.id;
    renderAll();

    drag = { mode: "move", startX: p.x, startY: p.y, orig: { x: hit.x, y: hit.y, w: hit.w, h: hit.h } };
    try { overlay.setPointerCapture(e.pointerId); } catch (_) {}
    e.preventDefault();
    e.stopPropagation();
  });

  overlay.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const l = getSelected();
    if (!l) return;
    const p = pointInCanvas(e);
    const dx = p.x - drag.startX;
    const dy = p.y - drag.startY;
    const o = drag.orig;

    if (drag.mode === "move") {
      l.x = Math.round(o.x + dx);
      l.y = Math.round(o.y + dy);
    } else {
      const ar = o.w / o.h;
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h;

      if (drag.mode.includes("e")) nw = Math.max(20, o.w + dx);
      if (drag.mode.includes("s")) nh = Math.max(20, o.h + dy);
      if (drag.mode.includes("w")) { nw = Math.max(20, o.w - dx); nx = o.x + (o.w - nw); }
      if (drag.mode.includes("n")) { nh = Math.max(20, o.h - dy); ny = o.y + (o.h - nh); }

      if (drag.mode === "nw" || drag.mode === "ne" || drag.mode === "sw" || drag.mode === "se") {
        if (Math.abs(nw - o.w) > Math.abs(nh - o.h)) {
          nh = nw / ar;
          if (drag.mode.includes("n")) ny = o.y + (o.h - nh);
        } else {
          nw = nh * ar;
          if (drag.mode.includes("w")) nx = o.x + (o.w - nw);
        }
      }

      l.x = Math.round(nx);
      l.y = Math.round(ny);
      l.w = Math.round(nw);
      l.h = Math.round(nh);
    }
    renderAll();
    e.preventDefault();
  });

  const endDrag = (e) => {
    if (!drag) return;
    drag = null;
    try { overlay.releasePointerCapture(e.pointerId); } catch (_) {}
  };
  overlay.addEventListener("pointerup", endDrag);
  overlay.addEventListener("pointercancel", endDrag);
  overlay.addEventListener("pointerleave", endDrag);

  // ------------- export -------------
  async function exportComposite(format = "png") {
    if (!layers.length) return toast("No layers to export", true);

    const payloadLayers = layers.map((l) => ({
      src: l.sourceCanvas.toDataURL("image/png"),
      x: l.x, y: l.y, w: l.w, h: l.h,
      opacity: l.opacity, visible: l.visible,
      rotation: 0,
    }));

    const bg = canvas.background.mode === "color"
      ? hexToRgba(canvas.background.color)
      : null;

    busy(true);
    try {
      const res = await fetch("/layers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          width: canvas.width, height: canvas.height,
          background: bg,
          layers: payloadLayers,
          format: format === "jpg" ? "jpg" : "png",
          quality: 92,
        }),
      });
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      downloadBlob(blob, `layers-${Date.now()}.${format === "jpg" ? "jpg" : "png"}`);
      toast("Exported layers");
    } catch (e) {
      toast(e.message, true);
    } finally { busy(false); }
  }

  function downloadBlob(blob, name) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function hexToRgba(hex) {
    const m = hex.replace("#", "");
    const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
  }

  return { renderAll, exportComposite, hasLayers: () => layers.length > 0 };
}