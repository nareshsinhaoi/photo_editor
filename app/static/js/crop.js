// Interactive crop rectangle with drag handles on a dedicated overlay canvas.
export class CropTool {
  constructor(mainCanvas, overlayCanvas, onChange) {
    this.main = mainCanvas;
    this.overlay = overlayCanvas;
    this.ctx = overlayCanvas.getContext("2d");
    this.onChange = onChange;

    this.active = false;
    this.rect = null;      // {x, y, w, h} in canvas pixels
    this.ratio = null;     // null = free, else w/h (e.g. 1 for 1:1)
    this.drag = null;      // { mode, startX, startY, orig }

    // Bound once; added/removed as needed.
    this._onDown = this._onPointerDown.bind(this);
    this._onMove = this._onPointerMove.bind(this);
    this._onUp   = this._onPointerUp.bind(this);
  }

  // ------------ public API ------------
  start() {
    this.active = true;
    const W = this.main.width, H = this.main.height;
    this.overlay.width = W;
    this.overlay.height = H;

    // Make sure overlay is fully on top and interactive.
    this.overlay.classList.add("active");
    this.overlay.style.pointerEvents = "auto";
    this.overlay.style.cursor = "crosshair";

    const m = 0.1;
    this.rect = {
      x: Math.round(W * m),
      y: Math.round(H * m),
      w: Math.round(W * (1 - 2 * m)),
      h: Math.round(H * (1 - 2 * m)),
    };
    if (this.ratio) this._applyRatio();

    this._addListeners();
    this._draw();
    this._emit();
  }

  cancel() {
    this.active = false;
    this.drag = null;
    this.rect = null;

    this._removeListeners();
    this.overlay.classList.remove("active");
    this.overlay.style.pointerEvents = "";
    this.overlay.style.cursor = "";
    this.ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    this._emit();
  }

  setRatio(ratio) {
    this.ratio = ratio;
    if (!this.rect) return;
    if (ratio) this._applyRatio();
    this._draw();
    this._emit();
  }

  // Return a *copy* of the crop rect (caller shouldn't mutate internals).
  getRect() { return this.rect ? { ...this.rect } : null; }

  // ------------ internals ------------
  _addListeners() {
    this.overlay.addEventListener("pointerdown", this._onDown);
    window.addEventListener("pointermove", this._onMove);
    window.addEventListener("pointerup", this._onUp);
    window.addEventListener("pointercancel", this._onUp);
  }

  _removeListeners() {
    this.overlay.removeEventListener("pointerdown", this._onDown);
    window.removeEventListener("pointermove", this._onMove);
    window.removeEventListener("pointerup", this._onUp);
    window.removeEventListener("pointercancel", this._onUp);
  }

  // Convert client coords -> canvas pixel coords.
  _toCanvas(e) {
    const r = this.overlay.getBoundingClientRect();
    const sx = this.overlay.width / r.width;
    const sy = this.overlay.height / r.height;
    return {
      x: (e.clientX - r.left) * sx,
      y: (e.clientY - r.top) * sy,
      scaleX: sx,
      scaleY: sy,
    };
  }

  _onPointerDown(e) {
    if (!this.active || !this.rect) return;

    const p = this._toCanvas(e);
    const mode = this._hitTest(p);
    if (!mode) return;

    this.drag = {
      mode,
      startX: p.x,
      startY: p.y,
      orig: { ...this.rect },
    };

    // Capture is best-effort; even if it fails, window listeners keep the drag alive.
    try { this.overlay.setPointerCapture(e.pointerId); } catch (_) {}

    e.preventDefault();
  }

  _onPointerMove(e) {
    if (!this.active || !this.drag || !this.rect) return;
    const p = this._toCanvas(e);
    const dx = p.x - this.drag.startX;
    const dy = p.y - this.drag.startY;
    const o = this.drag.orig;
    const W = this.main.width, H = this.main.height;
    const MIN = 40;             // minimum crop size in canvas pixels

    let nx = o.x, ny = o.y, nw = o.w, nh = o.h;

    if (this.drag.mode === "move") {
      nx = clamp(o.x + dx, 0, W - o.w);
      ny = clamp(o.y + dy, 0, H - o.h);
    } else {
      if (this.drag.mode.includes("e")) nw = clamp(o.w + dx, MIN, W - o.x);
      if (this.drag.mode.includes("s")) nh = clamp(o.h + dy, MIN, H - o.y);
      if (this.drag.mode.includes("w")) {
        const newW = clamp(o.w - dx, MIN, o.x + o.w);
        nx = o.x + (o.w - newW);
        nw = newW;
      }
      if (this.drag.mode.includes("n")) {
        const newH = clamp(o.h - dy, MIN, o.y + o.h);
        ny = o.y + (o.h - newH);
        nh = newH;
      }

      // Enforce aspect ratio when a ratio is set.
      if (this.ratio) {
        if (this.drag.mode.includes("e") || this.drag.mode.includes("w")) {
          nh = nw / this.ratio;
          if (ny + nh > H) { nh = H - ny; nw = nh * this.ratio; }
          if (this.drag.mode.includes("w")) nx = o.x + (o.w - nw);
        } else if (this.drag.mode.includes("n") || this.drag.mode.includes("s")) {
          nw = nh * this.ratio;
          if (nx + nw > W) { nw = W - nx; nh = nw / this.ratio; }
          if (this.drag.mode.includes("n")) ny = o.y + (o.h - nh);
        }
        // Re-clamp after ratio adjustment.
        nx = clamp(nx, 0, W - nw);
        ny = clamp(ny, 0, H - nh);
      }
    }

    this.rect = { x: nx, y: ny, w: nw, h: nh };
    this._draw();
    this._emit();
    e.preventDefault();
  }

  _onPointerUp(e) {
    if (!this.drag) return;
    try { this.overlay.releasePointerCapture(e.pointerId); } catch (_) {}
    this.drag = null;
  }

  _applyRatio() {
    const W = this.main.width, H = this.main.height;
    let { x, y, w } = this.rect;
    let h = w / this.ratio;
    if (y + h > H) { h = H - y; w = h * this.ratio; }
    if (x + w > W) { w = W - x; h = w / this.ratio; }
    this.rect = { x: Math.round(x), y: Math.round(y), w: Math.round(w), h: Math.round(h) };
  }

  // Hit-test uses *screen pixel* tolerance scaled by the current canvas zoom.
  _hitTest(p) {
    const { x, y, w, h } = this.rect;
    // Scale tolerance to canvas units so it's ~14 screen pixels wide.
    const tolX = 14 / (p.scaleX || 1);
    const tolY = 14 / (p.scaleY || 1);

    const nearL = Math.abs(p.x - x) < tolX;
    const nearR = Math.abs(p.x - (x + w)) < tolX;
    const nearT = Math.abs(p.y - y) < tolY;
    const nearB = Math.abs(p.y - (y + h)) < tolY;
    const inside = p.x > x && p.x < x + w && p.y > y && p.y < y + h;

    if (nearL && nearT) return "nw";
    if (nearR && nearT) return "ne";
    if (nearL && nearB) return "sw";
    if (nearR && nearB) return "se";
    if (nearL) return "w";
    if (nearR) return "e";
    if (nearT) return "n";
    if (nearB) return "s";
    if (inside) return "move";
    return null;
  }

  _draw() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.overlay.width, this.overlay.height);
    if (!this.rect) return;

    const { x, y, w, h } = this.rect;
    const W = this.overlay.width, H = this.overlay.height;

    // Dim outside the crop area.
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    ctx.fillRect(0, 0, W, H);
    ctx.clearRect(x, y, w, h);

    // Crop border.
    ctx.strokeStyle = "#ff8c42";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, y, w, h);

    // Rule-of-thirds guides.
    ctx.strokeStyle = "rgba(255,255,255,0.35)";
    ctx.lineWidth = 1;
    for (let i = 1; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(x + (w * i) / 3, y); ctx.lineTo(x + (w * i) / 3, y + h);
      ctx.moveTo(x, y + (h * i) / 3); ctx.lineTo(x + w, y + (h * i) / 3);
      ctx.stroke();
    }

    // Corner handles (8px square).
    const s = 10;
    ctx.fillStyle = "#ff8c42";
    for (const [cx, cy] of [[x, y], [x + w, y], [x, y + h], [x + w, y + h]]) {
      ctx.fillRect(cx - s / 2, cy - s / 2, s, s);
    }

    // Edge handles (small tick marks, midpoints).
    const mw = Math.max(2, Math.min(6, w / 40));
    for (const [cx, cy] of [[x + w / 2, y], [x + w / 2, y + h], [x, y + h / 2], [x + w, y + h / 2]]) {
      ctx.fillRect(cx - s / 2, cy - mw / 2, s, mw);
    }
  }

  _emit() { this.onChange?.(this.rect); }
}

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));