from fastapi import HTTPException, UploadFile
from app.config import ALLOWED_MIME, MAX_UPLOAD_BYTES

async def validate_image(file: UploadFile) -> bytes:
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")
    data = await file.read()
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large (max 25 MB)")
    if not data:
        raise HTTPException(400, "Empty file")
    return data