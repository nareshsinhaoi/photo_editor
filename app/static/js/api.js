// REST client. Every call surfaces the server's error message.
export const api = {
  async upload(file) {
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/upload", { method: "POST", body: fd });
    if (!r.ok) throw new Error((await safeJson(r)).detail || `Upload failed (${r.status})`);
    return r.json();
  },

  async process(payload) {
    const r = await fetch("/process", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error((await safeJson(r)).detail || `Process failed (${r.status})`);
    return r.json();
  },

  async export(payload) {
    const r = await fetch("/export", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!r.ok) throw new Error(`Export failed (${r.status})`);
    return r.blob();
  },
};

async function safeJson(r) {
  try { return await r.json(); } catch { return {}; }
}