// Sticker / emoji catalog. Every sticker becomes a canvas so it can enter
// the same layer pipeline as images: drag, resize, opacity, reorder, export.

export const EMOJIS = [
  "😀","😎","🤩","😂","😍","🥳",
  "👍","👏","🙌","💪","🙏","👌",
  "❤️","🧡","💛","💚","💙","💜",
  "⭐","✨","🔥","💥","⚡","🌈",
  "🎉","🎈","🎁","🏆","🥇","🎯",
  "☀️","🌙","☁️","🌊","🌿","🌸",
];

export const SHAPES = [
  { id: "heart",    label: "Heart",    draw: drawHeart },
  { id: "star",     label: "Star",     draw: drawStar },
  { id: "circle",   label: "Circle",   draw: drawCircle },
  { id: "square",   label: "Square",   draw: drawSquare },
  { id: "triangle", label: "Triangle", draw: drawTriangle },
  { id: "arrow",    label: "Arrow",    draw: drawArrow },
  { id: "badge",    label: "Badge",    draw: drawBadge },
  { id: "bubble",   label: "Bubble",   draw: drawBubble },
  { id: "burst",    label: "Burst",    draw: drawBurst },
];

const SIZE = 512;

export function emojiToCanvas(emoji, size = SIZE) {
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `${size * 0.8}px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif`;
  ctx.fillText(emoji, size / 2, size / 2 + size * 0.04);
  return c;
}

export function shapeToCanvas(shapeId, color = "#4f46e5", size = SIZE) {
  const shape = SHAPES.find((s) => s.id === shapeId);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (shape) shape.draw(ctx, size, color);
  return c;
}

function drawHeart(ctx, s, color) {
  ctx.fillStyle = color;
  const cx = s / 2, cy = s / 2, r = s * 0.42;
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.9);
  ctx.bezierCurveTo(cx - r * 1.4, cy - r * 0.4, cx - r * 0.6, cy - r * 1.2, cx, cy - r * 0.4);
  ctx.bezierCurveTo(cx + r * 0.6, cy - r * 1.2, cx + r * 1.4, cy - r * 0.4, cx, cy + r * 0.9);
  ctx.closePath();
  ctx.fill();
}
function drawStar(ctx, s, color) {
  ctx.fillStyle = color;
  const cx = s / 2, cy = s / 2;
  const outer = s * 0.45, inner = outer * 0.45;
  const spikes = 5;
  let rot = -Math.PI / 2;
  ctx.beginPath();
  for (let i = 0; i < spikes * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    ctx.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
    rot += Math.PI / spikes;
  }
  ctx.closePath();
  ctx.fill();
}
function drawCircle(ctx, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s * 0.42, 0, Math.PI * 2);
  ctx.fill();
}
function drawSquare(ctx, s, color) {
  ctx.fillStyle = color;
  const pad = s * 0.1;
  ctx.fillRect(pad, pad, s - pad * 2, s - pad * 2);
}
function drawTriangle(ctx, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(s / 2, s * 0.12);
  ctx.lineTo(s * 0.9, s * 0.88);
  ctx.lineTo(s * 0.1, s * 0.88);
  ctx.closePath();
  ctx.fill();
}
function drawArrow(ctx, s, color) {
  ctx.fillStyle = color;
  const y = s / 2;
  ctx.fillRect(s * 0.1, y - s * 0.06, s * 0.5, s * 0.12);
  ctx.beginPath();
  ctx.moveTo(s * 0.6, y - s * 0.18);
  ctx.lineTo(s * 0.9, y);
  ctx.lineTo(s * 0.6, y + s * 0.18);
  ctx.closePath();
  ctx.fill();
}
function drawBadge(ctx, s, color) {
  ctx.fillStyle = color;
  const cx = s / 2, cy = s / 2, r = s * 0.44;
  ctx.beginPath();
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
    const rr = i % 2 === 0 ? r : r * 0.78;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}
function drawBubble(ctx, s, color) {
  ctx.fillStyle = color;
  const x = s * 0.1, y = s * 0.14, w = s * 0.8, h = s * 0.55, r = s * 0.12;
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.lineTo(x + w * 0.4, y + h);
  ctx.lineTo(x + w * 0.32, y + h + s * 0.16);
  ctx.lineTo(x + w * 0.3, y + h);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fill();
}
function drawBurst(ctx, s, color) {
  ctx.fillStyle = color;
  const cx = s / 2, cy = s / 2;
  ctx.beginPath();
  for (let i = 0; i < 16; i++) {
    const a = (i / 16) * Math.PI * 2;
    const rr = i % 2 === 0 ? s * 0.46 : s * 0.24;
    ctx.lineTo(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}