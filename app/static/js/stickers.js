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

export const GRAPHICS = [
  { id: "roundedPanel", label: "Rounded panel", colors: ["#ffd7b1"] },
  { id: "outlinePanel", label: "Outline panel", colors: ["#ffffff", "#9db2c8"] },
  { id: "softBlob", label: "Soft blob", colors: ["#d8e1fa"] },
  { id: "purpleTape", label: "Purple tape", colors: ["#7023a0"] },
  { id: "greenStamp", label: "Green stamp", colors: ["#b5d98a"] },
  { id: "pinkBlock", label: "Pink block", colors: ["#e65a82"] },
  { id: "cloudDots", label: "Cloud dots", colors: ["#d8eff7", "#8ec6df"] },
  { id: "sunTriangle", label: "Sun triangle", colors: ["#f1c500", "#161616"] },
  { id: "aquaBlob", label: "Aqua blob", colors: ["#65d1d5"] },
  { id: "yellowBlock", label: "Yellow block", colors: ["#f4df00"] },
  { id: "orangeBurst", label: "Orange burst", colors: ["#f36f21"] },
  { id: "leaf", label: "Orange leaf", colors: ["#ef6a2e"] },
  { id: "goldPanel", label: "Gold panel", colors: ["#f7bd62"] },
  { id: "orangeFrame", label: "Orange frame", colors: ["#ff5b4d", "#ff9a3d"] },
  { id: "purpleFrame", label: "Purple frame", colors: ["#b26bdf", "#16181a"] },
  { id: "blueWave", label: "Blue wave", colors: ["#8dc9ef"] },
  { id: "redRibbon", label: "Red ribbon", colors: ["#e84a44"] },
  { id: "greenCurve", label: "Green curve", colors: ["#83af78"] },
  { id: "lightning", label: "Lightning", colors: ["#f6df6b"] },
  { id: "whiteSheet", label: "White sheet", colors: ["#f4f4f2"] },
  { id: "pinkRibbon", label: "Pink ribbon", colors: ["#e86573"] },
  { id: "creamOval", label: "Cream oval", colors: ["#edbdaa"] },
  { id: "blueArc", label: "Blue arc", colors: ["#b6d9f2"] },
  { id: "silverStrip", label: "Silver strip", colors: ["#d9d9d8"] },
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

export function graphicToCanvas(graphicId, size = SIZE) {
  const graphic = GRAPHICS.find((item) => item.id === graphicId);
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const ctx = c.getContext("2d");
  if (graphic) drawGraphic(ctx, size, graphic);
  return c;
}

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawGraphic(ctx, s, graphic) {
  const [color, second] = graphic.colors;

  if (graphic.id === "roundedPanel") {
    roundedRect(ctx, s * 0.12, s * 0.18, s * 0.76, s * 0.64, s * 0.12);
    ctx.fillStyle = color; ctx.fill();
  } else if (graphic.id === "outlinePanel") {
    roundedRect(ctx, s * 0.1, s * 0.2, s * 0.8, s * 0.56, s * 0.28);
    ctx.strokeStyle = second; ctx.lineWidth = s * 0.012; ctx.stroke();
  } else if (graphic.id === "softBlob") {
    ctx.beginPath();
    ctx.moveTo(s * 0.18, s * 0.22);
    ctx.bezierCurveTo(s * 0.38, s * 0.08, s * 0.52, s * 0.3, s * 0.76, s * 0.22);
    ctx.bezierCurveTo(s * 0.92, s * 0.42, s * 0.72, s * 0.68, s * 0.82, s * 0.82);
    ctx.bezierCurveTo(s * 0.52, s * 0.95, s * 0.34, s * 0.72, s * 0.16, s * 0.78);
    ctx.closePath(); ctx.fillStyle = color; ctx.fill();
  } else if (graphic.id === "purpleTape" || graphic.id === "redRibbon") {
    ctx.save(); ctx.translate(s * 0.5, s * 0.5); ctx.rotate(-0.08);
    ctx.fillStyle = color; ctx.fillRect(-s * 0.38, -s * 0.09, s * 0.76, s * 0.18); ctx.restore();
  } else if (graphic.id === "greenStamp") {
    ctx.fillStyle = color; ctx.fillRect(s * 0.12, s * 0.16, s * 0.76, s * 0.68);
    ctx.fillStyle = "#8abb67";
    for (let i = 0; i < 18; i++) {
      const x = s * 0.12 + (i / 17) * s * 0.76;
      ctx.beginPath(); ctx.arc(x, s * 0.16, s * 0.012, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(x, s * 0.84, s * 0.012, 0, Math.PI * 2); ctx.fill();
    }
  } else if (graphic.id === "pinkBlock") {
    roundedRect(ctx, s * 0.12, s * 0.14, s * 0.76, s * 0.72, s * 0.14); ctx.fillStyle = color; ctx.fill();
  } else if (graphic.id === "cloudDots") {
    ctx.fillStyle = second;
    for (let y = 0; y < 6; y++) for (let x = 0; x < 8; x++) {
      const px = s * 0.13 + x * s * 0.09 + Math.sin(y * 2) * s * 0.025;
      const py = s * 0.2 + y * s * 0.09;
      ctx.globalAlpha = 0.25 + y * 0.1; ctx.beginPath(); ctx.arc(px, py, s * (0.018 + y * 0.003), 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
  } else if (graphic.id === "sunTriangle" || graphic.id === "lightning") {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.82); ctx.lineTo(s * 0.92, s * 0.82); ctx.lineTo(s * 0.08, s * 0.08); ctx.closePath(); ctx.fill();
    ctx.fillStyle = second || "#161616";
    for (let x = 0; x < 10; x++) for (let y = 0; y < 7; y++) {
      const px = s * 0.12 + x * s * 0.07; const py = s * 0.22 + y * s * 0.07;
      if (px + py < s * 0.88 && x % 2 === 0) { ctx.beginPath(); ctx.arc(px, py, s * 0.008, 0, Math.PI * 2); ctx.fill(); }
    }
  } else if (graphic.id === "aquaBlob") {
    ctx.beginPath(); ctx.moveTo(s * 0.18, s * 0.18);
    ctx.quadraticCurveTo(s * 0.48, s * 0.06, s * 0.76, s * 0.18);
    ctx.quadraticCurveTo(s * 0.92, s * 0.48, s * 0.72, s * 0.82);
    ctx.quadraticCurveTo(s * 0.3, s * 0.92, s * 0.14, s * 0.68);
    ctx.quadraticCurveTo(s * 0.08, s * 0.42, s * 0.18, s * 0.18); ctx.closePath();
    ctx.fillStyle = color; ctx.fill();
  } else if (graphic.id === "yellowBlock") {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(s * 0.12, s * 0.14); ctx.lineTo(s * 0.72, s * 0.14);
    ctx.quadraticCurveTo(s * 0.88, s * 0.14, s * 0.88, s * 0.3); ctx.lineTo(s * 0.88, s * 0.86);
    ctx.lineTo(s * 0.12, s * 0.86); ctx.closePath(); ctx.fill();
  } else if (graphic.id === "orangeBurst") {
    ctx.fillStyle = color; ctx.beginPath();
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2, r = i % 2 ? s * 0.2 : s * 0.43;
      const px = s * 0.5 + Math.cos(a) * r, py = s * 0.5 + Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
  } else if (graphic.id === "leaf" || graphic.id === "greenCurve") {
    ctx.fillStyle = color; ctx.beginPath();
    ctx.moveTo(s * 0.08, s * 0.72); ctx.bezierCurveTo(s * 0.36, s * 0.7, s * 0.62, s * 0.12, s * 0.92, s * 0.18);
    ctx.bezierCurveTo(s * 0.9, s * 0.56, s * 0.62, s * 0.84, s * 0.08, s * 0.72); ctx.closePath(); ctx.fill();
  } else if (graphic.id === "goldPanel" || graphic.id === "whiteSheet") {
    roundedRect(ctx, s * 0.1, s * 0.18, s * 0.8, s * 0.64, s * 0.08); ctx.fillStyle = color; ctx.fill();
  } else if (graphic.id === "orangeFrame" || graphic.id === "purpleFrame") {
    roundedRect(ctx, s * 0.08, s * 0.18, s * 0.84, s * 0.58, s * 0.12); ctx.fillStyle = color; ctx.fill();
    ctx.strokeStyle = second; ctx.lineWidth = s * 0.025; ctx.stroke();
  } else if (graphic.id === "blueWave") {
    ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(s * 0.05, s * 0.38);
    ctx.bezierCurveTo(s * 0.25, s * 0.15, s * 0.38, s * 0.62, s * 0.55, s * 0.38);
    ctx.bezierCurveTo(s * 0.72, s * 0.16, s * 0.82, s * 0.42, s * 0.95, s * 0.28);
    ctx.lineTo(s * 0.95, s * 0.58); ctx.bezierCurveTo(s * 0.78, s * 0.72, s * 0.68, s * 0.48, s * 0.52, s * 0.68);
    ctx.bezierCurveTo(s * 0.34, s * 0.86, s * 0.22, s * 0.56, s * 0.05, s * 0.64); ctx.closePath(); ctx.fill();
  } else if (graphic.id === "pinkRibbon" || graphic.id === "creamOval" || graphic.id === "blueArc" || graphic.id === "silverStrip") {
    ctx.fillStyle = color; ctx.save(); ctx.translate(s * 0.5, s * 0.5); ctx.rotate(-0.08);
    roundedRect(ctx, -s * 0.38, -s * 0.12, s * 0.76, s * 0.24, s * 0.12); ctx.fill(); ctx.restore();
  }
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