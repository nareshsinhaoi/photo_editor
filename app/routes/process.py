from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64

from app.utils.validators import uploaded_image_path
from app.services.adjustments import apply_adjustments
from app.services.filters import apply_filter, vignette, grain

router = APIRouter()

class ProcessRequest(BaseModel):
    id: str
    adjustments: dict = {}
    filter: str | None = None
    vignette: float = 0
    grain: float = 0

@router.post("/process")
def process(req: ProcessRequest):
    path = uploaded_image_path(req.id)
    if not path.exists():
        raise HTTPException(404, "Image not found")
    if req.adjustments is None or not isinstance(req.adjustments, dict):
        raise HTTPException(400, "Invalid adjustments")
    if req.vignette < 0 or req.vignette > 100 or req.grain < 0 or req.grain > 100:
        raise HTTPException(400, "Effect values must be between 0 and 100")

    img = Image.open(path).convert("RGBA")
    alpha = img.getchannel("A")
    rgb = img.convert("RGB")

    rgb = apply_adjustments(rgb, req.adjustments)
    if req.filter and req.filter != "none":
        rgb = apply_filter(rgb, req.filter)
    if req.vignette:
        rgb = vignette(rgb, req.vignette)
    if req.grain:
        rgb = grain(rgb, req.grain)

    rgb.putalpha(alpha)

    buf = BytesIO()
    rgb.save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {"image": f"data:image/png;base64,{b64}"}