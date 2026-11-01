from fastapi import HTTPException, UploadFile
from app.config import ALLOWED_MIME, MAX_UPLOAD_BYTES
import re
from pathlib import Path
from app.config import UPLOAD_DIR

IMAGE_ID_RE = re.compile(r"^[0-9a-f]{32}$")

async def validate_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 25 MB)")
    if not data:
        raise HTTPException(400, "Empty file")
    return data


def validate_image_id(image_id: str) -> str:
    if not IMAGE_ID_RE.fullmatch(image_id):
        raise HTTPException(400, "Invalid image ID")
    return image_id


def uploaded_image_path(image_id: str) -> Path:
    validate_image_id(image_id)
    path = (UPLOAD_DIR / f"{image_id}.png").resolve()
    upload_root = UPLOAD_DIR.resolve()
    if upload_root != path.parent:
        raise HTTPException(400, "Invalid image ID")
    return path