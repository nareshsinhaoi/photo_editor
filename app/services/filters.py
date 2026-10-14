"""One-click preset filters + vignette/grain."""
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def _to_array(img):
    return np.asarray(img.convert("RGB")).astype(np.float32)

def _from_array(arr):
    return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8))

def black_white(img):
    return ImageEnhance.Color(img).enhance(0.0)

def sepia(img):
    arr = _to_array(img)
    r = arr[..., 0] * 0.393 + arr[..., 1] * 0.769 + arr[..., 2] * 0.189
    g = arr[..., 0] * 0.349 + arr[..., 1] * 0.686 + arr[..., 2] * 0.168
    b = arr[..., 0] * 0.272 + arr[..., 1] * 0.534 + arr[..., 2] * 0.131
    return _from_array(np.stack([r, g, b], axis=-1))

def vintage(img):
    out = sepia(img)
    out = ImageEnhance.Contrast(out).enhance(0.9)
    out = ImageEnhance.Brightness(out).enhance(1.05)
    return vignette(out, 60)

def vivid(img):
    out = ImageEnhance.Color(img).enhance(1.6)
    out = ImageEnhance.Contrast(out).enhance(1.15)
    return out

def cool(img):
    arr = _to_array(img)
    arr[..., 0] -= 15  # less red
    arr[..., 2] += 20  # more blue
    return _from_array(arr)

def warm(img):
    arr = _to_array(img)
    arr[..., 0] += 20
    arr[..., 2] -= 15
    return _from_array(arr)

def vignette(img, strength: float = 50):
    """strength 0..100"""
    arr = _to_array(img)
    h, w = arr.shape[:2]
    y, x = np.ogrid[:h, :w]
    cx, cy = w / 2, h / 2
    dist = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    max_dist = np.sqrt(cx ** 2 + cy ** 2)
    mask = 1 - (strength / 100.0) * (dist / max_dist) ** 2
    return _from_array(arr * mask[..., None])

def grain(img, amount: float = 20):
    """amount 0..100"""
    arr = _to_array(img)
    noise = np.random.normal(0, amount, arr.shape)
    return _from_array(arr + noise)

PRESETS = {
    "bw": black_white,
    "sepia": sepia,
    "vintage": vintage,
    "vivid": vivid,
    "cool": cool,
    "warm": warm,
}

def apply_filter(img: Image.Image, name: str) -> Image.Image:
    if name not in PRESETS:
        raise ValueError(f"Unknown filter: {name}")
    return PRESETS[name](img)