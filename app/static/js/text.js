// Text layer renderer for roadmap #8.
// Produces a canvas at high resolution so the layer model treats it identically
// to an image layer: draggable, resizable, reorderable, exportable.

const SUPERSAMPLE = 2;   // render text at 2x for crisp edges after scaling

export function createTextCanvas(opts) {
  const {
    text = "Hello",
    font = "Inter, system-ui, sans-serif",
    weight = "700",
    size = 72,
    color = "#111111",
    align = "left",
    letterSpacing = 0,
    shadow = false,
    outline = false,
  } = opts;

  // Split on newlines so multi-line text works.
  const lines = String(text).split("\n");

  // Measure at supersampled size.
  const measure = document.createElement("canvas").getContext("2d");
  const ss = SUPERSAMPLE;
  const fontSpec = `${weight} ${size * ss}px ${font}`;
  measure.font = fontSpec;

  const spacingPx = letterSpacing * ss;
  const lineHeight = size * ss * 1.2;

  // Width = max of measured widths + letter spacing.
  let maxW = 0;
  for (const line of lines) {
    const w = measure.measureText(line).width + Math.max(0, line.length - 1) * spacingPx;
    if (w > maxW) maxW = w;
  }

  const pad = size * ss * 0.25;   // a little breathing room
  const W = Math.ceil(maxW + pad * 2);
  const H = Math.ceil(lineHeight * lines.length + pad * 2);

  const c = document.createElement("canvas");
  c.width = Math.max(4, W);
  c.height = Math.max(4, H);
  const ctx = c.getContext("2d");
  ctx.textBaseline = "top";
  ctx.font = fontSpec;
  ctx.fillStyle = color;
  ctx.strokeStyle = "#000";
  ctx.lineWidth = Math.max(2, size * ss * 0.06);

  const originFor = (w) => {
    if (align === "center") return (c.width - w) / 2;
    if (align === "right")  return c.width - pad - w;
    return pad;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineW = measure.measureText(line).width + Math.max(0, line.length - 1) * spacingPx;
    const x = originFor(lineW);
    const y = pad + i * lineHeight;

    if (shadow) {
      ctx.save();
      ctx.shadowColor = "rgba(0,0,0,0.55)";
      ctx.shadowBlur = size * ss * 0.18;
      ctx.shadowOffsetX = size * ss * 0.05;
      ctx.shadowOffsetY = size * ss * 0.05;
      drawSpaced(ctx, line, x, y, spacingPx);
      ctx.restore();
    } else {
      drawSpaced(ctx, line, x, y, spacingPx);
    }

    if (outline) {
      drawSpaced(ctx, line, x, y, spacingPx, /* stroke */ true);
    }
  }

  return c;
}

function drawSpaced(ctx, line, x, y, spacing, stroke = false) {
  if (spacing === 0) {
    if (stroke) ctx.strokeText(line, x, y);
    else ctx.fillText(line, x, y);
    return;
  }
  let cx = x;
  for (const ch of line) {
    if (stroke) ctx.strokeText(ch, cx, y);
    else ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}