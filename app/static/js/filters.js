// Client-side preview filters. Keep in sync with server-side services/filters.py.
export function presetCss(name) {
  switch (name) {
    case "bw":      return "grayscale(1)";
    case "sepia":   return "sepia(0.85)";
    case "vintage": return "sepia(0.5) contrast(0.9) brightness(1.05)";
    case "vivid":   return "saturate(1.6) contrast(1.15)";
    case "cool":    return "hue-rotate(-10deg) saturate(1.1)";
    case "warm":    return "hue-rotate(10deg) saturate(1.15)";
    default:        return "";
  }
}

// Cheap client-side approximations of adjustments not expressible as CSS filters.
export function temperatureToCss(value) {
  if (!value) return "";
  const deg = value / 10; // -10..+10 deg hue shift
  return `hue-rotate(${deg}deg)`;
}

export function exposureToCss(value) {
  if (!value) return "";
  const b = 1 + value / 150;
  return `brightness(${b})`;
}