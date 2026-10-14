from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
UPLOAD_DIR = STATIC_DIR / "uploads"
TEMPLATES_DIR = BASE_DIR / "templates"

UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_MIME = {"image/jpeg", "image/png", "image/webp", "image/bmp"}
MAX_UPLOAD_BYTES = 25 * 1024 * 1024  # 25 MB