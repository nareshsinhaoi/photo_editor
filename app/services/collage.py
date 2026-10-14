"""Server-side collage renderer. Templates are pure grid rectangles (0..1)
that get scaled to the target canvas. Each cell has a fit/zoom/pan state."""
from PIL import Image, ImageDraw
import base64
from io import BytesIO


# Each template = list of (x, y, w, h) in normalized 0..1 coordinates.
TEMPLATES = {
    "2-h":      [(0, 0, .5, 1), (.5, 0, .5, 1)],
    "2-v":      [(0, 0, 1, .5), (0, .5, 1, .5)],
    "3-h":      [(0, 0, 1/3, 1), (1/3, 0, 1/3, 1), (2/3, 0, 1/3, 1)],
    "3-1plus2": [(0, 0, 1, .5), (0, .5, .5, .5), (.5, .5, .5, .5)],
    "4-grid":   [(0, 0, .5, .5), (.5, 0, .5, .5), (0, .5, .5, .5), (.5, .5, .5, .5)],
    "4-wide":   [(0, 0, 1, 2/3), (0, 2/3, 1/3, 1/3), (1/3, 2/3, 1/3, 1/3), (2/3, 2/3, 1/3, 1/3)],
    "6-grid":   [(x/3, y/2, 1/3, 1/2) for y in range(2) for x in range(3)],
    "9-grid":   [(x/3, y/3, 1/3, 1/3) for y in range(3) for x in range(3)],
    "asym-1":   [(0, 0, .6, 1), (.6, 0, .4, .5), (.6, .5, .4, .5)],
}


def _dataurl_to_image(dataurl: str) -> Image.Image:
    b64 = dataurl.split(",", 1)[-1]
    return Image.open(BytesIO(base64.b64decode(b64))).convert("RGBA")


def _rounded_mask(w: int, h: int, r: int) -> Image.Image:
    mask = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(mask)
    d.rounded_rectangle((0, 0, w - 1, h - 1), radius=r, fill=255)
    return mask


def _fit_to_cell(
    img: Image.Image,
    cell_w: int, cell_h: int,
    fit: str = "cover",
    zoom: float = 1.0,
    pan_x: float = 0.0,
    pan_y: float = 0.0,
) -> Image.Image:
    zoom = max(1.0, zoom)
    if fit == "contain":
        scale = min(cell_w / img.width, cell_h / img.height) * zoom
    else:  # cover
        scale = max(cell_w / img.width, cell_h / img.height) * zoom

    nw = max(1, int(img.width * scale))
    nh = max(1, int(img.height * scale))
    resized = img.resize((nw, nh), Image.LANCZOS)

    # pan_x / pan_y in [-100, 100] → offset as fraction of extra space
    extra_x = max(0, nw - cell_w)
    extra_y = max(0, nh - cell_h)
    off_x = int((pan_x / 100.0) * (extra_x / 2))
    off_y = int((pan_y / 100.0) * (extra_y / 2))

    # Start from centered fit
    cx = (nw - cell_w) // 2 + off_x
    cy = (nh - cell_h) // 2 + off_y
    cx = max(0, min(extra_x, cx))
    cy = max(0, min(extra_y, cy))

    cropped = resized.crop((cx, cy, cx + cell_w, cy + cell_h))

    # If fit=contain, letterbox into a transparent cell
    if fit == "contain" and (cropped.width < cell_w or cropped.height < cell_h):
        cell = Image.new("RGBA", (cell_w, cell_h), (0, 0, 0, 0))
        ox = (cell_w - cropped.width) // 2
        oy = (cell_h - cropped.height) // 2
        cell.alpha_composite(cropped, (ox, oy))
        return cell
    return cropped


def render_collage(
    images: list[Image.Image],
    template: str,
    out_w: int, out_h: int,
    gap: int = 8,
    border: int = 12,
    radius: int = 8,
    bg: tuple = (255, 255, 255, 255),
    cells_state: list[dict] | None = None,
) -> Image.Image:
    if template not in TEMPLATES:
        raise ValueError(f"Unknown template: {template}")

    rects = TEMPLATES[template]
    canvas = Image.new("RGBA", (out_w, out_h), bg)

    # Available area after outer border
    inner_x0 = border
    inner_y0 = border
    inner_w = out_w - 2 * border
    inner_h = out_h - 2 * border
    if inner_w < 1 or inner_h < 1:
        raise ValueError("Border too large for canvas")

    for i, (rx, ry, rw, rh) in enumerate(rects):
        if i >= len(images):
            break

        # Compute cell rectangle with half-gap inset on each side
        cell_x = inner_x0 + int(rx * inner_w) + (gap // 2 if i > 0 else 0)
        cell_y = inner_y0 + int(ry * inner_h) + (gap // 2 if i > 0 else 0)
        cell_w = int(rw * inner_w) - gap
        cell_h = int(rh * inner_h) - gap
        if cell_w < 4 or cell_h < 4:
            continue

        state = (cells_state[i] if cells_state and i < len(cells_state) else {}) or {}
        fitted = _fit_to_cell(
            images[i], cell_w, cell_h,
            fit=state.get("fit", "cover"),
            zoom=state.get("zoom", 1.0),
            pan_x=state.get("panX", 0.0),
            pan_y=state.get("panY", 0.0),
        )

        if radius > 0:
            mask = _rounded_mask(cell_w, cell_h, min(radius, cell_w // 2, cell_h // 2))
            fitted.putalpha(mask)

        canvas.alpha_composite(fitted, (cell_x, cell_y))

    return canvas


def dataurls_to_images(dataurls: list[str]) -> list[Image.Image]:
    return [_dataurl_to_image(u) for u in dataurls]