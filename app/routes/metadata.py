from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from PIL import Image
from app.utils.validators import uploaded_image_path
from app.services.metadata import read_metadata, write_metadata

router = APIRouter()


class MetadataUpdate(BaseModel):
    id: str
    updates: dict = {}
    strip: bool = False


@router.get("/metadata/{image_id}")
def get_metadata(image_id: str):
    path = uploaded_image_path(image_id)
    if not path.exists():
        raise HTTPException(404, "Image not found")
    with Image.open(path) as img:
        return read_metadata(img)


@router.post("/metadata")
def update_metadata(req: MetadataUpdate):
    path = uploaded_image_path(req.id)
    if not path.exists():
        raise HTTPException(404, "Image not found")

    with Image.open(path) as img:
        img.load()
        updated = write_metadata(img, req.updates, strip=req.strip)
        save_kwargs = {}
        exif = updated.getexif()
        if not req.strip and exif:
            save_kwargs["exif"] = exif.tobytes()
        updated.save(path, "PNG", **save_kwargs)

    with Image.open(path) as img:
        return read_metadata(img)