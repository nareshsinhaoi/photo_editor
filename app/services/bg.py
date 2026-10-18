"""Background removal via rembg. Lazy-loads the ONNX session and caches it
across requests. Model files are stored under ~/.u2net by rembg itself."""
from __future__ import annotations

import io
import threading
from functools import lru_cache
from typing import Literal

from PIL import Image

# rembg is optional — importing only when first used.
_REMBG_AVAILABLE: bool | None = None
_rembg_lock = threading.Lock()


ModelName = Literal["u2netp", "u2net", "isnet-general-use"]


def _check_rembg() -> bool:
    global _REMBG_AVAILABLE
    if _REMBG_AVAILABLE is None:
        try:
            import rembg  # noqa: F401
            _REMBG_AVAILABLE = True
        except Exception:
            _REMBG_AVAILABLE = False
    return _REMBG_AVAILABLE


@lru_cache(maxsize=4)
def _get_session(model: str):
    """Cache one ONNX session per model name so repeated calls are fast."""
    from rembg import new_session
    return new_session(model)


def is_available() -> bool:
    return _check_rembg()


def remove_background(
    img: Image.Image,
    model: ModelName = "u2netp",
    alpha_matting: bool = False,
    bg_color: tuple[int, int, int, int] | None = None,
) -> Image.Image:
    """Return the image with its background removed.

    - If bg_color is None: transparent background (RGBA).
    - If bg_color is provided: the transparent regions are replaced with that
      solid color (still returns RGBA so downstream code is unchanged).
    """
    if not _check_rembg():
        raise RuntimeError(
            "rembg is not installed. Run `pip install rembg onnxruntime` "
            "or `pip install 'rembg[gpu]'` for CUDA support."
        )

    from rembg import remove

    session = _get_session(model)

    # rembg expects bytes or PIL Image; PIL is fine.
    with _rembg_lock:  # ONNX runtime isn't always thread-safe across models
        out = remove(
            img,
            session=session,
            alpha_matting=alpha_matting,
            alpha_matting_foreground_threshold=240,
            alpha_matting_background_threshold=10,
            alpha_matting_erode_size=10,
        )

    # rembg returns RGBA
    if out.mode != "RGBA":
        out = out.convert("RGBA")

    if bg_color is not None:
        # Flatten onto a solid color, keep RGBA shape.
        flat = Image.new("RGBA", out.size, tuple(bg_color))
        flat.alpha_composite(out)
        out = flat

    return out


def pillow_from_bytes(data: bytes) -> Image.Image:
    img = Image.open(io.BytesIO(data))
    img.load()
    return img


def pillow_to_png_bytes(img: Image.Image) -> bytes:
    buf = io.BytesIO()
    img.save(buf, "PNG", optimize=True)
    return buf.getvalue()