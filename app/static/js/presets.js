// Preset save/load for the current adjustment + filter stack.
// Stored in localStorage under outlookStudio.presets.
//
// Exports:
//   listPresets()          -> Preset[]
//   savePreset(name, state)-> Preset       (overwrites same-name preset)
//   deletePreset(id)       -> void
//   getPreset(id)          -> Preset | null
//   exportPresets()        -> void         (triggers download of .json)
//   importPresets(file)    -> Promise<Preset[]>  (merges by name)

const KEY = "outlookStudio.presets";
const MAX_PRESETS = 200;
const MAX_NAME_LEN = 40;

function readAll() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeAll(list) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch (e) {
    // Quota exceeded or storage disabled (private mode).
    console.warn("[presets] write failed:", e);
    throw new Error("Could not save preset (storage full or blocked)");
  }
}

function normalizeState(state) {
  return {
    adjustments: { ...(state && state.adjustments ? state.adjustments : {}) },
    filter: (state && state.filter) || "none",
  };
}

function makeId() {
  return `p_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function listPresets() {
  return readAll();
}

export function savePreset(name, state) {
  const trimmed = String(name || "").trim().slice(0, MAX_NAME_LEN);
  if (!trimmed) throw new Error("Preset name is required");

  const existing = readAll();
  const preset = {
    id: makeId(),
    name: trimmed,
    createdAt: Date.now(),
    state: normalizeState(state),
  };

  // Overwrite a preset with the same name so we don't accumulate duplicates.
  const idx = existing.findIndex((p) => p.name === trimmed);
  if (idx >= 0) {
    preset.id = existing[idx].id;      // keep stable id
    existing[idx] = preset;
    writeAll(existing);
    return preset;
  }

  if (existing.length >= MAX_PRESETS) {
    throw new Error(`Preset limit reached (${MAX_PRESETS})`);
  }

  existing.push(preset);
  writeAll(existing);
  return preset;
}

export function deletePreset(id) {
  const all = readAll().filter((p) => p.id !== id);
  writeAll(all);
}

export function getPreset(id) {
  return readAll().find((p) => p.id === id) || null;
}

export function exportPresets() {
  const all = readAll();
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `outlook-studio-presets-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export async function importPresets(file) {
  const text = await file.text();
  let incoming;
  try {
    incoming = JSON.parse(text);
  } catch {
    throw new Error("File is not valid JSON");
  }
  if (!Array.isArray(incoming)) throw new Error("Preset file must contain an array");

  const merged = readAll();

  for (const p of incoming) {
    if (!p || typeof p !== "object") continue;
    if (!p.name || !p.state) continue;

    const name = String(p.name).trim().slice(0, MAX_NAME_LEN);
    if (!name) continue;

    const entry = {
      id: typeof p.id === "string" && p.id ? p.id : makeId(),
      name,
      createdAt: typeof p.createdAt === "number" ? p.createdAt : Date.now(),
      state: normalizeState(p.state),
    };

    const idx = merged.findIndex((x) => x.name === name);
    if (idx >= 0) merged[idx] = entry;
    else merged.push(entry);
  }

  // Trim if we blew past the cap during import.
  const trimmed = merged.slice(-MAX_PRESETS);
  writeAll(trimmed);
  return trimmed;
}