from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates

from app.config import TEMPLATES_DIR, UPLOAD_DIR
from app.utils.validators import IMAGE_ID_RE, validate_image_id

router = APIRouter()
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))


def _uploaded_files() -> list[dict]:
    files = []
    for path in UPLOAD_DIR.iterdir():
        if not path.is_file() or path.suffix.lower() != ".png":
            continue
        image_id = path.stem
        if not IMAGE_ID_RE.fullmatch(image_id):
            continue
        stat = path.stat()
        files.append({
            "id": image_id,
            "name": path.name,
            "size": stat.st_size,
            "modified": datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat(),
        })
    return sorted(files, key=lambda item: item["modified"], reverse=True)


@router.get("/admin/uploads", response_class=HTMLResponse)
def uploads_page(request: Request):
    return templates.TemplateResponse("admin_uploads.html", {
        "request": request,
        "year": datetime.now().year,
        "title": "Uploaded Files",
        "files": _uploaded_files(),
    })


@router.delete("/admin/uploads/{image_id}")
def delete_upload(image_id: str):
    validate_image_id(image_id)
    path = (UPLOAD_DIR / f"{image_id}.png").resolve()
    if path.parent != UPLOAD_DIR.resolve():
        raise HTTPException(400, "Invalid image ID")
    if not path.is_file():
        raise HTTPException(404, "Uploaded file not found")
    path.unlink()
    return {"deleted": image_id}


@router.delete("/admin/uploads")
def delete_all_uploads():
    deleted = 0
    for item in _uploaded_files():
        path = UPLOAD_DIR / item["name"]
        if path.is_file():
            path.unlink()
            deleted += 1
    return {"deleted": deleted}
