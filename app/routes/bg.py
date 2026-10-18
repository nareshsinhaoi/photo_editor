from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from io import BytesIO

from app.config import MAX_UPLOAD_BYTES, ALLOWED_MIME
from app.services.bg import is_available, remove_background, pillow_from_bytes, pillow_to_png_bytes

router = APIRouter()


@router.get("/bg/status")
def bg_status():
    """Lets the frontend know if rembg is importable, so we can hide the button
    gracefully if the user hasn't installed the optional dependency."""
    return {"available": is_available()}


@router.post("/remove-bg")
async def remove_bg(
    file: UploadFile = File(...),
    model: str = Form("u2netp"),
    alpha_matting: bool = Form(False),
    bg_color: str | None = Form(None),   # "r,g,b,a" e.g. "255,255,255,255"
):
    if file.content_type not in ALLOWED_MIME:
        raise HTTPException(400, f"Unsupported type: {file.content_type}")

    data = await file.read()
    if not data:
        raise HTTPException(400, "Empty file")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "File too large")

    if not is_available():
        raise HTTPException(
            501,
            "Background removal is not installed on this server. "
            "Run: pip install rembg onnxruntime",
        )

    img = pillow_from_bytes(data)

    # Resize huge inputs to keep latency reasonable (rembg on 8K is slow).
    MAX_SIDE = 2048
    if max(img.size) > MAX_SIDE:
        scale = MAX_SIDE / max(img.size)
        img = img.resize(
            (max(1, int(img.width * scale)), max(1, int(img.height * scale))),
            # Pillow 10+ moved resampling constants; LANCZOS is fine here.
            resample=1,  # 1 == Image.LANCZOS in numeric form
        )

    bg_rgba = None
    if bg_color:
        try:
            parts = [int(x) for x in bg_color.split(",")]
            if len(parts) == 3:
                parts.append(255)
            if len(parts) != 4:
                raise ValueError
            bg_rgba = tuple(parts)  # type: ignore[assignment]
        except Exception:
            raise HTTPException(400, "bg_color must be 'r,g,b' or 'r,g,b,a'")

    try:
        out = remove_background(img, model=model, alpha_matting=alpha_matting, bg_color=bg_rgba)
    except Exception as e:
        raise HTTPException(500, f"Background removal failed: {e}")

    png = pillow_to_png_bytes(out)
    return Response(png, media_type="image/png")