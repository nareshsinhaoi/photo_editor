from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64

from app.services.canvas_fit import fit_to_canvas
from app.utils.validators import uploaded_image_path

router = APIRouter()


class FitRequest(BaseModel):
    id: str
    width: int
    height: int
    mode: str = "blur"                      # blur | color | transparent | contain
    color: list[int] = [255, 255, 255, 255] # RGBA
    anchor: str = "center"


@router.post("/fit")
def fit(req: FitRequest):
    if req.width < 16 or req.height < 16 or req.width > 8000 or req.height > 8000:
        raise HTTPException(400, "Dimensions must be between 16 and 8000 pixels")
    if req.mode not in ("blur", "color", "transparent", "contain"):
        raise HTTPException(400, "Invalid fit mode")
    if req.anchor not in ("center", "north", "south", "east", "west"):
        raise HTTPException(400, "Invalid fit anchor")
    if len(req.color) != 4 or any(v < 0 or v > 255 for v in req.color):
        raise HTTPException(400, "Invalid canvas color")
    path = uploaded_image_path(req.id)
    if not path.exists():
        raise HTTPException(404, "Image not found")

    img = Image.open(path)
    result = fit_to_canvas(
        img,
        target_w=req.width,
        target_h=req.height,
        mode=req.mode,
        color=tuple(req.color),
        anchor=req.anchor,
    )
    result.save(path, "PNG")

    buf = BytesIO()
    result.save(buf, "PNG")
    b64 = base64.b64encode(buf.getvalue()).decode()
    return {
        "image": f"data:image/png;base64,{b64}",
        "width": result.width,
        "height": result.height,
    }