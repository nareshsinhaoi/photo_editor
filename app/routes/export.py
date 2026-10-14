from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from PIL import Image
from io import BytesIO

from app.services.layers import compose_layers

import base64

from app.config import UPLOAD_DIR
from app.services.transforms import crop, rotate, flip, resize

router = APIRouter()

class Layer(BaseModel):
    src: str               # dataURL of the layer image
    x: float
    y: float
    w: float
    h: float
    opacity: float = 100
    visible: bool = True
    rotation: float = 0

class LayersExportRequest(BaseModel):
    width: int
    height: int
    background: list[int] | None = None   # [r,g,b,a] or None for transparent
    layers: list[Layer]
    format: str = "png"                   # png | jpg
    quality: int = 92

class ExportRequest(BaseModel):
    id: str
    format: str = "png"          # png | jpg | webp
    quality: int = 90            # 1..100
    # Optional transforms applied on top of the client's rendered canvas:
    crop: list[int] | None = None       # [x, y, w, h]
    rotate: float | None = None
    flip: str | None = None             # "horizontal" | "vertical"
    resize: list[int] | None = None     # [w, h]
    # OR send the fully composited canvas as base64 (for text/stickers/draw):
    composite: str | None = None

@router.post("/export")
def export(req: ExportRequest):
    if req.composite:
        # strip data: prefix
        b64 = req.composite.split(",", 1)[-1]
        img = Image.open(BytesIO(base64.b64decode(b64)))
    else:
        path = UPLOAD_DIR / f"{req.id}.png"
        if not path.exists():
            raise HTTPException(404, "Image not found")
        img = Image.open(path)

    if req.crop:   img = crop(img, req.crop)
    if req.rotate: img = rotate(img, req.rotate)
    if req.flip:   img = flip(img, req.flip)
    if req.resize: img = resize(img, *req.resize)

    fmt = req.format.lower()
    buf = BytesIO()
    if fmt in ("jpg", "jpeg"):
        img.convert("RGB").save(buf, "JPEG", quality=req.quality, optimize=True)
        media = "image/jpeg"
        ext = "jpg"
    elif fmt == "webp":
        img.save(buf, "WEBP", quality=req.quality, method=6)
        media = "image/webp"
        ext = "webp"
    else:
        img.save(buf, "PNG", optimize=True)
        media = "image/png"
        ext = "png"

    return Response(
        buf.getvalue(),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="edited.{ext}"'},
    )

@router.post("/layers/export")
def layers_export(req: LayersExportRequest):
    print(f">>> /layers/export hit  size={req.width}x{req.height}  "
          f"layers={len(req.layers)}  format={req.format}  bg={req.background}")

    if req.width < 16 or req.height < 16:
        print(">>> ERROR: invalid canvas size")
        raise HTTPException(400, "Invalid canvas size")

    visible = [l for l in req.layers if l.visible]
    print(f">>> visible layers: {len(visible)}/{len(req.layers)}")

    try:
        bg = tuple(req.background) if req.background else None
        img = compose_layers(
            req.width, req.height, bg,
            [l.model_dump() for l in req.layers],
        )
        print(f">>> composed image: {img.size} mode={img.mode}")
    except Exception as e:
        print(f">>> ERROR during compose: {type(e).__name__}: {e}")
        raise HTTPException(500, f"Layer composition failed: {e}")

    fmt = req.format.lower()
    buf = BytesIO()
    if fmt in ("jpg", "jpeg"):
        img.convert("RGB").save(buf, "JPEG", quality=req.quality, optimize=True)
        media = "image/jpeg"
        ext = "jpg"
    else:
        img.save(buf, "PNG", optimize=True)
        media = "image/png"
        ext = "png"

    print(f">>> response: {len(buf.getvalue())} bytes as {media}")

    return Response(
        buf.getvalue(),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="layers.{ext}"'},
    )