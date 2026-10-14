from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from io import BytesIO
import base64

from app.config import UPLOAD_DIR
from app.services.metadata import read_metadata, write_metadata

router = APIRouter()


class MetadataUpdate(BaseModel):
    id: str
    updates: dict = {}
    strip: bool = False


@router.get("/metadata/{image_id}")
def get_metadata(image_id: str):
    path = UPLOAD_DIR / f"{image_id}.png"
    if not path.exists():
        raise HTTPException(404, "Image not found")
    with Image.open(path) as img:
        return read_metadata(img)


@router.post("/metadata")
def update_metadata(req: MetadataUpdate):
    path = UPLOAD_DIR / f"{req.id}.png"
    if not path.exists():
        raise HTTPException(404, "Image not found")

    with Image.open(path) as img:
        img.load()
        updated = write_metadata(img, req.updates, strip=req.strip)
        updated.save(path, "PNG")

    with Image.open(path) as img:
        return read_metadata(img)