from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64

from app.config import UPLOAD_DIR
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
    path = UPLOAD_DIR / f"{req.id}.png"
    if not path.exists():
        raise HTTPException(404, "Image not found")

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