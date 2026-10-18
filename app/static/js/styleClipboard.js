// In-memory clipboard for copy/paste style (adjustments + filter + opacity).
// Deliberately not persisted — a "style clipboard" that survives reloads would
// confuse more than help.

let clipboard = null;

export function copyStyle(style) {
  if (!style) return false;
  clipboard = JSON.parse(JSON.stringify(style));
  return true;
}

export function pasteStyle() {
  if (!clipboard) return null;
  return JSON.parse(JSON.stringify(clipboard));
}

export function hasStyle() {
  return clipboard !== null;
}

export function clearStyle() {
  clipboard = null;
}