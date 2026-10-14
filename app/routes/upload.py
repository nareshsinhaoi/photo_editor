import uuid
from fastapi import APIRouter, UploadFile, File
from PIL import Image
from io import BytesIO

from app.config import UPLOAD_DIR
from app.utils.validators import validate_image

router = APIRouter()

@router.post("/upload")
async def upload(file: UploadFile = File(...)):
    data = await validate_image(file)
    img = Image.open(BytesIO(data))
    img.load()

    image_id = uuid.uuid4().hex
    path = UPLOAD_DIR / f"{image_id}.png"
    img.convert("RGBA").save(path, "PNG")

    return {
        "id": image_id,
        "width": img.width,
        "height": img.height,
        "url": f"/static/uploads/{image_id}.png",
    }