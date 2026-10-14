"""Canvas expansion (add borders / change aspect ratio without cropping)."""
from PIL import Image, ImageFilter, ImageOps


def _blurred_background(img: Image.Image, target_w: int, target_h: int) -> Image.Image:
    """Fill target canvas with a blurred, cover-scaled copy of the image."""
    # Scale the source so it covers the target (like CSS background-size: cover)
    ratio = max(target_w / img.width, target_h / img.height)
    new_size = (max(1, int(img.width * ratio)), max(1, int(img.height * ratio)))
    bg = img.resize(new_size, Image.LANCZOS)
    # Center-crop to target
    left = (bg.width - target_w) // 2
    top = (bg.height - target_h) // 2
    bg = bg.crop((left, top, left + target_w, top + target_h))
    return bg.filter(ImageFilter.GaussianBlur(radius=30))


def _solid_background(color: tuple, w: int, h: int) -> Image.Image:
    return Image.new("RGBA", (w, h), color)


def fit_to_canvas(
    img: Image.Image,
    target_w: int,
    target_h: int,
    mode: str = "blur",       # blur | color | transparent | contain | cover
    color: tuple = (255, 255, 255, 255),
    anchor: str = "center",   # center | top | bottom | left | right
) -> Image.Image:
    """Return a target_w × target_h image containing `img` positioned by `anchor`."""
    img = img.convert("RGBA")

    if mode == "transparent":
        canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
    elif mode == "color":
        canvas = _solid_background(color, target_w, target_h)
    elif mode == "blur":
        canvas = _blurred_background(img.convert("RGB"), target_w, target_h).convert("RGBA")
    elif mode in ("contain", "cover"):
        # "contain" = letterbox the image, "cover" = fill and crop (may crop)
        if mode == "contain":
            fitted = ImageOps.contain(img, (target_w, target_h), Image.LANCZOS)
            canvas = Image.new("RGBA", (target_w, target_h), (0, 0, 0, 0))
        else:
            fitted = ImageOps.fit(img, (target_w, target_h), Image.LANCZOS)
            return fitted
        x = (target_w - fitted.width) // 2
        y = (target_h - fitted.height) // 2
        canvas.paste(fitted, (x, y), fitted)
        return canvas
    else:
        raise ValueError(f"Unknown fit mode: {mode}")

    # Position source image on the canvas per anchor
    ox, oy = _anchor_offset(img.width, img.height, target_w, target_h, anchor)
    canvas.paste(img, (ox, oy), img)
    return canvas


def _anchor_offset(sw: int, sh: int, tw: int, th: int, anchor: str):
    if anchor == "center": return (tw - sw) // 2, (th - sh) // 2
    if anchor == "top":    return (tw - sw) // 2, 0
    if anchor == "bottom": return (tw - sw) // 2, th - sh
    if anchor == "left":   return 0, (th - sh) // 2
    if anchor == "right":  return tw - sw, (th - sh) // 2
    return (tw - sw) // 2, (th - sh) // 2