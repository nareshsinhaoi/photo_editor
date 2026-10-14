import { presetCss, temperatureToCss, exposureToCss } from "./filters.js";

export class CanvasRenderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.baseImage = null;
  }

  async loadFromUrl(url) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        this.baseImage = img;
        this.canvas.width = img.naturalWidth;
        this.canvas.height = img.naturalHeight;
        this.render({});
        resolve(img);
      };
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
  }

  async loadFromDataURL(dataUrl) {
    return this.loadFromUrl(dataUrl);
  }

  render(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.filter = "none";
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    if (!this.baseImage) { ctx.restore(); return; }

    const adj = state.adjustments || {};
    const filter = state.filter || "none";
    const parts = [
      `brightness(${1 + (adj.brightness || 0) / 100})`,
      `contrast(${1 + (adj.contrast || 0) / 100})`,
      `saturate(${1 + (adj.saturation || 0) / 100})`,
      adj.blur ? `blur(${adj.blur}px)` : "",
      exposureToCss(adj.exposure),
      temperatureToCss(adj.temperature),
      presetCss(filter),
    ].filter(Boolean);
    ctx.filter = parts.join(" ") || "none";
    ctx.drawImage(this.baseImage, 0, 0, this.canvas.width, this.canvas.height);
    ctx.filter = "none";

    if (adj.sharpness > 0) this._unsharp(adj.sharpness);
    if (adj.vignette) this._vignette(adj.vignette);
    if (adj.grain) this._grain(adj.grain);
    ctx.restore();
  }

  _unsharp(amount) {
    const { width: w, height: h } = this.canvas;
    const tmp = document.createElement("canvas");
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext("2d");
    tctx.filter = `blur(${Math.max(1, amount / 25)}px)`;
    tctx.drawImage(this.canvas, 0, 0);
    tctx.filter = "none";
    this.ctx.globalCompositeOperation = "difference";
    this.ctx.globalAlpha = Math.min(0.7, amount / 100);
    this.ctx.drawImage(tmp, 0, 0);
    this.ctx.globalAlpha = 1;
    this.ctx.globalCompositeOperation = "source-over";
  }

  _vignette(strength) {
    const { width: w, height: h } = this.canvas;
    const g = this.ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.hypot(w, h) / 2);
    g.addColorStop(0, "rgba(0,0,0,0)");
    g.addColorStop(1, `rgba(0,0,0,${strength / 100})`);
    this.ctx.fillStyle = g;
    this.ctx.fillRect(0, 0, w, h);
  }

  _grain(amount) {
    const { width: w, height: h } = this.canvas;
    const tmp = document.createElement("canvas");
    tmp.width = Math.max(64, Math.floor(w / 2));
    tmp.height = Math.max(64, Math.floor(h / 2));
    const tctx = tmp.getContext("2d");
    const img = tctx.createImageData(tmp.width, tmp.height);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 128 + (Math.random() - 0.5) * 255;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    tctx.putImageData(img, 0, 0);
    this.ctx.save();
    this.ctx.globalAlpha = (amount / 100) * 0.35;
    this.ctx.globalCompositeOperation = "overlay";
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(tmp, 0, 0, w, h);
    this.ctx.restore();
  }

  toDataURL(type = "image/png", quality = 0.92) {
    return this.canvas.toDataURL(type, quality);
  }
}