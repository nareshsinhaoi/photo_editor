"""Pixel-level adjustments using Pillow + NumPy.
All functions take and return a PIL Image in RGB(A) mode."""
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

def brightness(img: Image.Image, value: float) -> Image.Image:
    # value in [-100, 100] → factor [0, 2]
    factor = 1.0 + value / 100.0
    return ImageEnhance.Brightness(img).enhance(factor)

def contrast(img: Image.Image, value: float) -> Image.Image:
    factor = 1.0 + value / 100.0
    return ImageEnhance.Contrast(img).enhance(factor)

def saturation(img: Image.Image, value: float) -> Image.Image:
    factor = 1.0 + value / 100.0
    return ImageEnhance.Color(img).enhance(factor)

def sharpness(img: Image.Image, value: float) -> Image.Image:
    # value in [-100, 100] → factor [0, 3]
    factor = 1.0 + value / 50.0
    return ImageEnhance.Sharpness(img).enhance(factor)

def blur(img: Image.Image, radius: float) -> Image.Image:
    if radius <= 0:
        return img
    return img.filter(ImageFilter.GaussianBlur(radius=radius))

def exposure(img: Image.Image, value: float) -> Image.Image:
    """value in [-100, 100]; +100 ≈ 1 stop brighter."""
    arr = np.asarray(img).astype(np.float32)
    factor = 2.0 ** (value / 100.0)
    arr = np.clip(arr * factor, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))

def temperature(img: Image.Image, value: float) -> Image.Image:
    """value in [-100, 100]; negative = cooler (blue), positive = warmer (orange)."""
    arr = np.asarray(img).astype(np.float32)
    shift = value * 0.5  # 0..50 per channel
    arr[..., 0] = np.clip(arr[..., 0] + shift, 0, 255)      # R
    arr[..., 2] = np.clip(arr[..., 2] - shift, 0, 255)      # B
    return Image.fromarray(arr.astype(np.uint8))

def apply_adjustments(img: Image.Image, params: dict) -> Image.Image:
    """Apply all adjustments in a fixed order."""
    if params.get("brightness"):  img = brightness(img, params["brightness"])
    if params.get("exposure"):    img = exposure(img, params["exposure"])
    if params.get("contrast"):    img = contrast(img, params["contrast"])
    if params.get("saturation"):  img = saturation(img, params["saturation"])
    if params.get("temperature"): img = temperature(img, params["temperature"])
    if params.get("sharpness"):   img = sharpness(img, params["sharpness"])
    if params.get("blur"):        img = blur(img, params["blur"])
    return img