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
    images: list[str]
    template: str = "2-h"
    width: int = 1080
    height: int = 1080
    gap: int = 8
    border: int = 12
    radius: int = 8
    bg: list[int] = [255, 255, 255, 255]
    cells: list[CellState] = []
    format: str = "png"
    quality: int = 92
    preview: bool = False


@router.get("/collage/templates")
def list_templates():
    return {"templates": list(TEMPLATES.keys())}


@router.post("/collage/render")
def render(req: CollageRenderRequest):
    if req.template not in TEMPLATES:
        raise HTTPException(400, f"Unknown template: {req.template}")
    if not req.images:
        raise HTTPException(400, "No images provided")
    if req.width < 64 or req.height < 64:
        raise HTTPException(400, "Output too small")

    images = dataurls_to_images(req.images)
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
    else:
        img.save(buf, "PNG", optimize=True)
        media = "image/png"; ext = "png"

    return Response(buf.getvalue(), media_type=media,
                    headers={"Content-Disposition": f'attachment; filename="collage.{ext}"'})