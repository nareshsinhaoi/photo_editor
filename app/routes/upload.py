import uuid
from fastapi import APIRouter, UploadFile, File
from fastapi import HTTPException
from PIL import Image, UnidentifiedImageError
from io import BytesIO

from app.config import UPLOAD_DIR
from app.utils.validators import validate_image

router = APIRouter()

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    data = await validate_image(file)
    try:
        with Image.open(BytesIO(data)) as opened:
            opened.verify()
        with Image.open(BytesIO(data)) as img:
            img.load()
            if max(img.size) > 20000 or img.width * img.height > 100_000_000:
                raise HTTPException(413, "Image dimensions are too large")
            image_id = uuid.uuid4().hex
            path = UPLOAD_DIR / f"{image_id}.png"
            img.convert("RGBA").save(path, "PNG")
    except HTTPException:
        raise
    except (UnidentifiedImageError, OSError, ValueError) as exc:
        raise HTTPException(400, "Invalid or unsupported image data") from exc
    except Image.DecompressionBombError as exc:
        raise HTTPException(413, "Image dimensions are too large") from exc

    return {
        "id": image_id,
        "width": img.width,
        "height": img.height,
        "url": f"/static/uploads/{image_id}.png",
    }