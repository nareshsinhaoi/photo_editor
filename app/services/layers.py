"""Server-side layer composition. Mirrors the JS layout in /static/js/layers.js."""
from PIL import Image
import base64
from io import BytesIO


def _dataurl_to_image(dataurl: str) -> Image.Image:
    b64 = dataurl.split(",", 1)[-1]
    return Image.open(BytesIO(base64.b64decode(b64))).convert("RGBA")


def compose_layers(
    canvas_w: int,
    canvas_h: int,
    background: tuple | None,        # (r,g,b,a) or None for transparent
    layers: list[dict],
) -> Image.Image:
    """Render top-level layer stack.
    `layers` is ordered bottom → top. Each item:
      { src: dataURL, x, y, w, h, opacity, visible, rotation }
    """
    canvas = Image.new("RGBA", (canvas_w, canvas_h), background or (0, 0, 0, 0))

    for layer in layers:
        if not layer.get("visible", True):
            continue
        img = _dataurl_to_image(layer["src"])
        if img.width != layer["w"] or img.height != layer["h"]:
            img = img.resize((int(layer["w"]), int(layer["h"])), Image.LANCZOS)

        rot = layer.get("rotation", 0) or 0
        if rot:
            img = img.rotate(-rot, expand=True, resample=Image.BICUBIC)

        opacity = max(0, min(100, layer.get("opacity", 100))) / 100.0
        if opacity < 1.0:
            alpha = img.getchannel("A").point(lambda v, o=opacity: int(v * o))
            img.putalpha(alpha)

        canvas.alpha_composite(img, (int(layer["x"]), int(layer["y"])))

    return canvas