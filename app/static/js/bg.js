// Background removal client. Talks to /remove-bg (server-side rembg).
// Returns a Blob (PNG) the caller can turn into a base image.

const statusCache = { checked: false, available: false };

export async function isBgAvailable() {
  if (statusCache.checked) return statusCache.available;
  try {
    const r = await fetch("/bg/status");
    if (!r.ok) throw new Error();
    const data = await r.json();
    statusCache.available = !!data.available;
  } catch {
    statusCache.available = false;
  }
  statusCache.checked = true;
  return statusCache.available;
}

/**
 * Send an image (File, Blob, or dataURL string) to the server for bg removal.
 * @param {File|Blob|string} source
 * @param {Object} opts
 * @param {string} [opts.model]      "u2netp" | "u2net" | "isnet-general-use"
 * @param {boolean} [opts.alphaMatting]
 * @param {[number,number,number,number]} [opts.bgColor]  RGBA tuple
 * @returns {Promise<Blob>} PNG blob
 */
export async function removeBackground(source, opts = {}) {
  const form = new FormData();

  // Normalize source to a Blob we can attach.
  let blob;
  if (typeof source === "string") {
    // dataURL
    const r = await fetch(source);
    blob = await r.blob();
  } else if (source instanceof Blob) {
    blob = source;
  } else {
    throw new Error("Unsupported source for background removal");
  }
  form.append("file", blob, "input.png");

  if (opts.model) form.append("model", opts.model);
  if (opts.alphaMatting) form.append("alpha_matting", "true");
  if (opts.bgColor) form.append("bg_color", opts.bgColor.join(","));

  const res = await fetch("/remove-bg", { method: "POST", body: form });
  if (!res.ok) {
    let detail = `Background removal failed (${res.status})`;
    try { detail = (await res.json()).detail || detail; } catch {}
    throw new Error(detail);
  }
  return res.blob();
}