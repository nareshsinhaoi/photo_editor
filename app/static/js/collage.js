// Collage maker: multi-image upload + templates + export.
export function initCollagePanel({ toast, busy }) {
  const $ = (s) => document.querySelector(s);

  const state = {
    images: [],
    cells: [],
    template: "2-h",
    selected: -1,
    swapPick: -1,
  };

  // ------------- upload -------------
  $("#collage-files").addEventListener("change", async (e) => {
    await addFiles(Array.from(e.target.files || []));
    e.target.value = "";
  });

  const dropZone = $("#drop-zone");
  dropZone.addEventListener("drop", async (e) => {
    const panel = document.querySelector('.panel-section[data-panel="collage"]');
    if (!panel || panel.classList.contains("hidden")) return;
    const files = Array.from(e.dataTransfer.files || []).filter((f) => f.type.startsWith("image/"));
    if (files.length) {
      e.preventDefault();
      await addFiles(files);
    }
  });

  async function addFiles(files) {
    busy(true);
    try {
      for (const f of files) {
        if (!f.type.startsWith("image/")) { toast(`Skipped non-image: ${f.name}`, true); continue; }
        if (f.size > 25 * 1024 * 1024) { toast(`Skipped > 25 MB: ${f.name}`, true); continue; }
        const url = URL.createObjectURL(f);
        const img = await loadImage(url);
        URL.revokeObjectURL(url);
        state.images.push(img);
        state.cells.push({ fit: "cover", zoom: 1.0, panX: 0, panY: 0 });
      }
      renderThumbs();
      renderPreview();
    } finally { busy(false); }
  }

  function loadImage(src) {
    return new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = src;
    });
  }

  // ------------- thumbnails -------------
  function renderThumbs() {
    const wrap = $("#collage-thumbs");
    wrap.innerHTML = "";
    state.images.forEach((img, i) => {
      const d = document.createElement("div");
      d.className = "thumb-cell" + (state.selected === i ? " selected" : "");
      d.style.backgroundImage = `url('${img.src}')`;
      d.draggable = true;
      d.dataset.idx = i;

      d.addEventListener("click", () => {
        state.selected = i;
        renderThumbs();
        renderFrameControls();
      });
      d.addEventListener("dragstart", (e) => { e.dataTransfer.setData("text/idx", String(i)); });
      d.addEventListener("dragover", (e) => e.preventDefault());
      d.addEventListener("drop", (e) => {
        e.preventDefault();
        const from = parseInt(e.dataTransfer.getData("text/idx"), 10);
        if (isNaN(from) || from === i) return;
        swapImages(from, i);
      });

      const rm = document.createElement("button");
      rm.className = "rm";
      rm.textContent = "✕";
      rm.addEventListener("click", (e) => {
        e.stopPropagation();
        state.images.splice(i, 1);
        state.cells.splice(i, 1);
        if (state.selected >= state.images.length) state.selected = state.images.length - 1;
        renderThumbs();
        renderPreview();
        renderFrameControls();
      });
      d.appendChild(rm);
      wrap.appendChild(d);
    });
    $("#collage-count").textContent = `${state.images.length} image${state.images.length === 1 ? "" : "s"}`;
  }

  function swapImages(a, b) {
    [state.images[a], state.images[b]] = [state.images[b], state.images[a]];
    [state.cells[a], state.cells[b]] = [state.cells[b], state.cells[a]];
    renderThumbs();
    renderPreview();
  }

  // ------------- layout -------------
  document.querySelectorAll("#collage-templates button").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.template = btn.dataset.tpl;
      document.querySelectorAll("#collage-templates button").forEach((b) => b.classList.toggle("active", b === btn));
      renderPreview();
    });
  });

  // ------------- size + style -------------
  $("#collage-w").addEventListener("change", renderPreview);
  $("#collage-h").addEventListener("change", renderPreview);
  ["collage-gap", "collage-border", "collage-radius", "collage-bg"].forEach((id) => {
    $(`#${id}`).addEventListener("input", renderPreview);
  });
  document.querySelectorAll("[data-collage-preset]").forEach((b) => {
    b.addEventListener("click", () => {
      const [w, h] = b.dataset.collagePreset.split("x").map(Number);
      $("#collage-w").value = w;
      $("#collage-h").value = h;
      renderPreview();
    });
  });

  // ------------- frame controls -------------
  ["collage-fit", "collage-zoom", "collage-pan-x", "collage-pan-y"].forEach((id) => {
    $(`#${id}`).addEventListener("input", () => {
      const i = state.selected;
      if (i < 0) return;
      state.cells[i] = {
        fit: $("#collage-fit").value,
        zoom: parseInt($("#collage-zoom").value, 10) / 100,
        panX: parseInt($("#collage-pan-x").value, 10),
        panY: parseInt($("#collage-pan-y").value, 10),
      };
      renderPreview();
    });
  });

  function renderFrameControls() {
    const i = state.selected;
    const cell = i >= 0 ? state.cells[i] : { fit: "cover", zoom: 1, panX: 0, panY: 0 };
    $("#collage-fit").value = cell.fit;
    $("#collage-zoom").value = Math.round(cell.zoom * 100);
    $("#collage-pan-x").value = cell.panX;
    $("#collage-pan-y").value = cell.panY;
  }

  $("#collage-swap").addEventListener("click", () => {
    if (state.selected < 0) return toast("Select a frame first", true);
    if (state.swapPick < 0) {
      state.swapPick = state.selected;
      toast(`Swap: pick second frame (currently #${state.swapPick + 1})`);
    } else if (state.swapPick === state.selected) {
      state.swapPick = -1;
      toast("Swap cancelled");
    } else {
      swapImages(state.swapPick, state.selected);
      state.swapPick = -1;
      toast("Swapped");
    }
  });
  $("#collage-clear-sel").addEventListener("click", () => {
    state.selected = -1;
    state.swapPick = -1;
    renderThumbs();
    renderFrameControls();
  });

  // ------------- preview -------------
  let previewTimer = null;
  function renderPreview() {
    clearTimeout(previewTimer);
    previewTimer = setTimeout(doPreview, 120);
  }

  async function doPreview() {
    if (!state.images.length) return;
    const w = parseInt($("#collage-w").value, 10) || 1080;
    const h = parseInt($("#collage-h").value, 10) || 1080;

    const maxCells = maxCellsFor(state.template);
    const payload = {
      images: state.images.slice(0, maxCells).map((img) => imgToDataURL(img, 900)),
      template: state.template,
      width: w, height: h,
      gap: parseInt($("#collage-gap").value, 10),
      border: parseInt($("#collage-border").value, 10),
      radius: parseInt($("#collage-radius").value, 10),
      bg: hexToRgba($("#collage-bg").value),
      cells: state.cells.slice(0, maxCells),
      format: "png",
      preview: true,
    };

    busy(true);
    try {
      const res = await fetch("/collage/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Preview failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const img = await loadImage(url);
      URL.revokeObjectURL(url);
      const target = document.querySelector("#canvas");
      target.width = img.naturalWidth;
      target.height = img.naturalHeight;
      const ctx = target.getContext("2d");
      ctx.clearRect(0, 0, target.width, target.height);
      ctx.drawImage(img, 0, 0);
    } catch (e) {
      toast(e.message || "Preview failed", true);
    } finally { busy(false); }
  }

  function imgToDataURL(img, maxDim = 900) {
    const c = document.createElement("canvas");
    const r = Math.min(1, maxDim / Math.max(img.naturalWidth, img.naturalHeight));
    c.width = Math.max(1, Math.round(img.naturalWidth * r));
    c.height = Math.max(1, Math.round(img.naturalHeight * r));
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    return c.toDataURL("image/jpeg", 0.9);
  }

  function maxCellsFor(t) {
    if (t === "9-grid") return 9;
    if (t === "6-grid") return 6;
    if (t === "4-grid" || t === "4-wide") return 4;
    if (t === "3-h" || t === "3-1plus2") return 3;
    if (t === "asym-1") return 3;
    return 2;
  }

  // ------------- export -------------
  $("#collage-export").addEventListener("click", async () => {
    if (state.images.length < 1) return toast("Add images first", true);
    const w = parseInt($("#collage-w").value, 10);
    const h = parseInt($("#collage-h").value, 10);
    if (w < 64 || h < 64) return toast("Output too small", true);

    const maxCells = maxCellsFor(state.template);
    const payload = {
      images: state.images.slice(0, maxCells).map((img) => imgToDataURL(img, 4000)),
      template: state.template,
      width: w, height: h,
      gap: parseInt($("#collage-gap").value, 10),
      border: parseInt($("#collage-border").value, 10),
      radius: parseInt($("#collage-radius").value, 10),
      bg: hexToRgba($("#collage-bg").value),
      cells: state.cells.slice(0, maxCells),
      format: "png",
      preview: false,
      quality: 95,
    };

    busy(true);
    try {
      const res = await fetch("/collage/render", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Render failed");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `collage-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast("Collage exported");
    } catch (e) {
      toast(e.message, true);
    } finally { busy(false); }
  });

  function onShow() {
    renderThumbs();
    renderFrameControls();
  }

  return { onShow };
}

function hexToRgba(hex) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}