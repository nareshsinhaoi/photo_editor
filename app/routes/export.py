from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import binascii

from app.services.layers import compose_layers

import base64

from app.services.transforms import crop, rotate, flip, resize
from app.utils.validators import uploaded_image_path

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
    background: list[int] | None = None
    layers: list[Layer]
    format: str = "png"                   # png | jpg | webp
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
    fmt = req.format.lower()
    if fmt not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported export format")
    if req.quality < 1 or req.quality > 100:
        raise HTTPException(400, "Quality must be between 1 and 100")
    if req.crop is not None and (len(req.crop) != 4 or any(v < 0 for v in req.crop) or req.crop[2] < 1 or req.crop[3] < 1):
        raise HTTPException(400, "Invalid crop")
    if req.resize is not None and (len(req.resize) != 2 or req.resize[0] < 16 or req.resize[1] < 16 or req.resize[0] > 8000 or req.resize[1] > 8000):
        raise HTTPException(400, "Invalid resize dimensions")
    if req.flip is not None and req.flip not in ("horizontal", "vertical"):
        raise HTTPException(400, "Invalid flip direction")
    if req.composite:
        if "," not in req.composite or not req.composite.startswith("data:image/"):
            raise HTTPException(400, "Invalid composite image data")
        b64 = req.composite.split(",", 1)[-1]
        try:
            img = Image.open(BytesIO(base64.b64decode(b64, validate=True)))
            img.load()
            if img.width < 16 or img.height < 16 or img.width > 8000 or img.height > 8000:
                raise HTTPException(400, "Invalid composite dimensions")
        except (binascii.Error, ValueError, OSError) as exc:
            raise HTTPException(400, "Invalid composite image data") from exc
    else:
        path = uploaded_image_path(req.id)
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
    if req.width < 16 or req.height < 16 or req.width > 8000 or req.height > 8000:
        raise HTTPException(400, "Invalid canvas size")
    if req.quality < 1 or req.quality > 100:
        raise HTTPException(400, "Quality must be between 1 and 100")
    if req.format.lower() not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported export format")

    if req.background is not None and (
        len(req.background) != 4 or any(v < 0 or v > 255 for v in req.background)
    ):
        raise HTTPException(400, "Invalid background color")

    for layer in req.layers:
        if not str(layer.src).startswith("data:image/png;base64,"):
            raise HTTPException(400, "Invalid layer image data")
        if layer.w < 4 or layer.h < 4 or layer.opacity < 0 or layer.opacity > 100:
            raise HTTPException(400, "Invalid layer properties")

    try:
        bg = tuple(req.background) if req.background else None
        img = compose_layers(
            req.width, req.height, bg,
            [l.model_dump() for l in req.layers],
        )
    except (ValueError, OSError, TypeError) as e:
        raise HTTPException(400, "Layer composition failed") from e

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
        headers={"Content-Disposition": f'attachment; filename="layers.{ext}"'},
    )