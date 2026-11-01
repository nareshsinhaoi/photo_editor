from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from io import BytesIO

from app.services.collage import TEMPLATES, render_collage, dataurls_to_images

router = APIRouter()


class CellState(BaseModel):
    fit: str = "cover"
    zoom: float = 1.0
    panX: float = 0.0
    panY: float = 0.0


class CollageRenderRequest(BaseModel):
    images: list[str]                 # list of dataURLs
    template: str = "2-h"
    width: int = 1080
    height: int = 1080
    gap: int = 8
    border: int = 12
    radius: int = 8
    bg: list[int] = [255, 255, 255, 255]
    cells: list[CellState] = []
    format: str = "png"               # png | jpg
    quality: int = 92
    preview: bool = False             # if True, shrink output for faster preview


@router.get("/collage/templates")
def list_templates():
    return {"templates": list(TEMPLATES.keys())}


@router.post("/collage/render")
def render(req: CollageRenderRequest):
    if req.template not in TEMPLATES:
        raise HTTPException(400, f"Unknown template: {req.template}")
    if not req.images:
        raise HTTPException(400, "No images provided")
    if req.width < 64 or req.height < 64 or req.width > 8000 or req.height > 8000:
        raise HTTPException(400, "Output too small")
    if req.gap < 0 or req.gap > 500 or req.border < 0 or req.border > 500 or req.radius < 0 or req.radius > 500:
        raise HTTPException(400, "Invalid collage spacing or border")
    if req.quality < 1 or req.quality > 100:
        raise HTTPException(400, "Quality must be between 1 and 100")
    if len(req.bg) not in (3, 4) or any(v < 0 or v > 255 for v in req.bg):
        raise HTTPException(400, "Invalid background color")
    if len(req.images) > 20:
        raise HTTPException(400, "Too many collage images")
    if len(req.cells) > 20:
        raise HTTPException(400, "Too many collage cells")
    if req.format.lower() not in ("png", "jpg", "jpeg", "webp"):
        raise HTTPException(400, "Unsupported export format")

    try:
        images = dataurls_to_images(req.images)
    except (ValueError, OSError, TypeError) as exc:
        raise HTTPException(400, "Invalid collage image data") from exc
    cells = [c.model_dump() for c in req.cells]

    img = render_collage(
        images, req.template,
        out_w=req.width, out_h=req.height,
        gap=req.gap, border=req.border, radius=req.radius,
        bg=tuple(req.bg),
        cells_state=cells,
    )

    if req.preview:
        img.thumbnail((900, 900))

    fmt = req.format.lower()
    buf = BytesIO()
    if fmt in ("jpg", "jpeg"):
        img.convert("RGB").save(buf, "JPEG", quality=req.quality, optimize=True)
        media = "image/jpeg"; ext = "jpg"
    elif fmt == "webp":
        img.save(buf, "WEBP", quality=req.quality, method=6)
        media = "image/webp"; ext = "webp"
    else:
        img.save(buf, "PNG", optimize=True)
        media = "image/png"; ext = "png"

    return Response(buf.getvalue(), media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="collage.{ext}"'})