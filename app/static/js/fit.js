// Canvas-fit panel logic: change canvas dimensions without cropping the source.
export function initFitPanel({ getState, setBaseImageFromDataURL, toast, busy }) {
  const $ = (s) => document.querySelector(s);
  const widthInput  = $("#fit-w");
  const heightInput = $("#fit-h");
  const modeSelect  = $("#fit-mode");
  const colorRow    = $("#fit-color-row");
  const colorInput  = $("#fit-color");
  const anchorSel   = $("#fit-anchor");

  let originalW = 0, originalH = 0;

  function syncFromState(state) {
    originalW = state.originalWidth  || 0;
    originalH = state.originalHeight || 0;
    if (widthInput.value === "")  widthInput.value  = originalW || "";
    if (heightInput.value === "") heightInput.value = originalH || "";
  }

  function toggleColorRow() {
    colorRow.classList.toggle("hidden", modeSelect.value !== "color");
  }
  modeSelect.addEventListener("change", toggleColorRow);
  toggleColorRow();

  document.querySelectorAll("[data-fit]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const w = parseInt(widthInput.value, 10) || originalW;
      const h = parseInt(heightInput.value, 10) || originalH;
      if (!w || !h) return toast("Load an image first", true);

      let nw = w, nh = h;
      switch (btn.dataset.fit) {
        case "square":            nw = Math.max(w, h); nh = nw; break;
        case "landscape-16-9":    nh = Math.round(w * 9 / 16); break;
        case "landscape-4-3":     nh = Math.round(w * 3 / 4);  break;
        case "portrait-9-16":     nw = Math.round(h * 9 / 16); break;
        case "portrait-3-4":      nw = Math.round(h * 3 / 4);  break;
        case "swap":              nw = h; nh = w; break;
      }
      widthInput.value = nw;
      heightInput.value = nh;
    });
  });

  $("#btn-reset-fit").addEventListener("click", () => {
    widthInput.value = originalW;
    heightInput.value = originalH;
  });

  $("#btn-apply-fit").addEventListener("click", async () => {
    const state = getState();
    if (!state.uploadedId) return toast("Load an image first", true);

    const width  = parseInt(widthInput.value, 10);
    const height = parseInt(heightInput.value, 10);
    if (!width || !height || width < 16 || height < 16) {
      return toast("Enter valid dimensions (min 16px)", true);
    }
    if (width > 8000 || height > 8000) return toast("Max size is 8000px", true);

    const mode = modeSelect.value;
    const [r, g, b] = hexToRgb(colorInput.value);
    const color = mode === "color" ? [r, g, b, 255] : [255, 255, 255, 255];

    busy(true);
    try {
      const res = await fetch("/fit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: state.uploadedId,
          width, height,
          mode,
          color,
          anchor: anchorSel.value,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).detail || "Fit failed");
      const data = await res.json();
      await setBaseImageFromDataURL(data.image);
      toast(`Canvas resized to ${data.width}×${data.height}`);
    } catch (err) {
      toast(err.message || "Fit failed", true);
    } finally {
      busy(false);
    }
  });

  return { syncFromState };
}

function hexToRgb(hex) {
  const m = hex.replace("#", "");
  const n = parseInt(m.length === 3 ? m.split("").map((c) => c + c).join("") : m, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}