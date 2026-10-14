// Metadata panel: fetch, display, and update EXIF for the current image.
export function initMetadataPanel({ getState, toast, busy }) {
  const $ = (s) => document.querySelector(s);
  const basicEl = $("#meta-basic");
  const exifEl  = $("#meta-exif");
  const gpsEl   = $("#meta-gps");
  const fields  = document.querySelectorAll("[data-meta-field]");

  async function load(imageId) {
    if (!imageId) {
      basicEl.innerHTML = `<p class="hint">No image loaded.</p>`;
      exifEl.innerHTML = ""; gpsEl.innerHTML = "";
      return;
    }
    try {
      const r = await fetch(`/metadata/${imageId}`);
      if (!r.ok) throw new Error("Failed to read metadata");
      const meta = await r.json();
      render(meta);
    } catch (err) {
      toast(err.message, true);
    }
  }

  function render(meta) {
    const s = meta.size || {};
    basicEl.innerHTML = rows({
      Format: meta.format || "—",
      Mode:   meta.mode   || "—",
      Width:  s.width     ? `${s.width} px`  : "—",
      Height: s.height    ? `${s.height} px` : "—",
      ...(meta.info || {}),
    });

    exifEl.innerHTML = meta.exif && Object.keys(meta.exif).length
      ? rows(meta.exif) : `<p class="hint">No EXIF data.</p>`;

    gpsEl.innerHTML = meta.gps && Object.keys(meta.gps).length
      ? rows(meta.gps) : `<p class="hint">No GPS data.</p>`;

    // Populate editable fields from EXIF if present
    fields.forEach((f) => {
      const k = f.dataset.metaField;
      if (meta.exif && meta.exif[k] != null) f.value = String(meta.exif[k]);
    });
  }

  function rows(obj) {
    return Object.entries(obj).map(([k, v]) => `
      <div class="meta-row">
        <div class="meta-key">${escape(k)}</div>
        <div class="meta-val">${escape(format(v))}</div>
      </div>
    `).join("");
  }

  function format(v) {
    if (Array.isArray(v)) return v.join(", ");
    if (typeof v === "object" && v) return JSON.stringify(v);
    return String(v);
  }
  function escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
    }[c]));
  }

  $("#btn-save-meta").addEventListener("click", async () => {
    const state = getState();
    if (!state.uploadedId) return toast("Load an image first", true);
    const updates = {};
    fields.forEach((f) => { updates[f.dataset.metaField] = f.value.trim(); });

    busy(true);
    try {
      const r = await fetch("/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.uploadedId, updates }),
      });
      if (!r.ok) throw new Error("Save failed");
      const meta = await r.json();
      render(meta);
      toast("Metadata saved");
    } catch (err) {
      toast(err.message, true);
    } finally { busy(false); }
  });

  $("#btn-strip-meta").addEventListener("click", async () => {
    const state = getState();
    if (!state.uploadedId) return toast("Load an image first", true);
    if (!confirm("Remove all metadata from this image?")) return;

    busy(true);
    try {
      const r = await fetch("/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: state.uploadedId, strip: true }),
      });
      if (!r.ok) throw new Error("Strip failed");
      const meta = await r.json();
      render(meta);
      fields.forEach((f) => (f.value = ""));
      toast("Metadata stripped");
    } catch (err) {
      toast(err.message, true);
    } finally { busy(false); }
  });

  return { load };
}