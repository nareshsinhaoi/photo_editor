// Project persistence (Roadmap #16) + project file export/import (Roadmap #17).
// Everything is stored under outlookStudio.project.
//
// A "project" here is a snapshot of the editor state that is enough to restore
// the look of the image without re-uploading. Because layers hold their own
// canvas sources, we store them as dataURLs. Combined size can be large, so we
// keep a size budget and quietly skip persistence if it would exceed it.

const KEY = "outlookStudio.project";
const SCHEMA = 1;
const MAX_BYTES = 4.5 * 1024 * 1024;  // 4.5 MB — under the 5 MB localStorage cap

let saveTimer = null;

export function scheduleSave(snapshot, { delay = 900 } = {}) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      writeSnapshot(snapshot);
    } catch (e) {
      console.warn("[project] save skipped:", e.message);
    }
  }, delay);
}

export function clearSaved() {
  try { localStorage.removeItem(KEY); } catch {}
}

export function loadSaved() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.schema !== SCHEMA) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot) {
  const payload = {
    schema: SCHEMA,
    savedAt: Date.now(),
    ...snapshot,
  };
  const str = JSON.stringify(payload);
  const size = str.length * 2;   // UTF-16 → approximate bytes
  if (size > MAX_BYTES) {
    throw new Error(`Project too large to persist (${Math.round(size / 1024)} KB)`);
  }
  localStorage.setItem(KEY, str);
}

// ---------- File export/import (Roadmap #17) ----------
export function exportProjectFile(snapshot) {
  const payload = {
    schema: SCHEMA,
    kind: "outlookstudio.project",
    exportedAt: new Date().toISOString(),
    ...snapshot,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outlook-project-${Date.now()}.outlookstudio`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importProjectFile(file) {
  const text = await file.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Not a valid project file");
  }
  if (!parsed || parsed.schema !== SCHEMA) {
    throw new Error("Unsupported project file version");
  }
  return parsed;
}