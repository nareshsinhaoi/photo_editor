from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64

from app.config import UPLOAD_DIR
from app.services.canvas_fit import fit_to_canvas

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
    path = UPLOAD_DIR / f"{req.id}.png"
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